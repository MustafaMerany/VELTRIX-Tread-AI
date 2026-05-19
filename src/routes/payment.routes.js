import express from 'express';
import { z } from 'zod';
import { prisma } from '../config/db.js';
import { requireAuth } from '../middleware/auth.js';
import { verifyCryptoPayment } from '../services/paymentVerifier.js';

const router = express.Router();
router.use(requireAuth);

router.get('/wallets', async (req, res) => {
  const wallets = await prisma.cryptoWallet.findMany({ where: { isActive: true } });
  res.json({ wallets });
});

router.post('/create', async (req, res, next) => {
  try {
    const schema = z.object({ planId: z.string(), walletId: z.string() });
    const data = schema.parse(req.body);
    const plan = await prisma.plan.findUniqueOrThrow({ where: { id: data.planId } });
    const wallet = await prisma.cryptoWallet.findUniqueOrThrow({ where: { id: data.walletId } });
    const sub = await prisma.subscription.create({ data: { userId: req.user.id, planId: plan.id } });
    const payment = await prisma.payment.create({
      data: { userId: req.user.id, subscriptionId: sub.id, walletId: wallet.id, amountUsd: plan.priceUsd, coin: wallet.coin, network: wallet.network }
    });
    res.status(201).json({ payment, wallet, plan });
  } catch (err) { next(err); }
});

router.post('/:paymentId/submit-txid', async (req, res, next) => {
  try {
    const schema = z.object({ txid: z.string().min(8) });
    const { txid } = schema.parse(req.body);
    const payment = await prisma.payment.findFirst({
      where: { id: req.params.paymentId, userId: req.user.id },
      include: { wallet: true, subscription: true }
    });
    if (!payment) return res.status(404).json({ error: 'Payment not found' });

    const duplicate = await prisma.payment.findFirst({ where: { txid, NOT: { id: payment.id } } });
    if (duplicate) return res.status(409).json({ error: 'TXID already used' });

    const result = await verifyCryptoPayment({
      coin: payment.coin,
      network: payment.network,
      txid,
      expectedAddress: payment.wallet.address,
      expectedAmountUsd: payment.amountUsd
    });

    const updated = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        txid,
        status: result.status,
        confirmations: result.confirmations,
        verifiedAt: result.ok ? new Date() : null
      }
    });

    if (result.ok && payment.subscriptionId) {
      const now = new Date();
      const ends = new Date(now);
      ends.setMonth(ends.getMonth() + 1);
      await prisma.subscription.update({ where: { id: payment.subscriptionId }, data: { status: 'ACTIVE', startsAt: now, endsAt: ends } });
    }

    res.json({ payment: updated, verification: result });
  } catch (err) { next(err); }
});

export default router;
