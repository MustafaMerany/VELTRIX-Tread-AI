import express from 'express';
import { z } from 'zod';
import { prisma } from '../config/db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = express.Router();
router.use(requireAuth, requireAdmin);

router.get('/stats', async (req, res) => {
  const [users, activeSubscriptions, pendingPayments, accounts] = await Promise.all([
    prisma.user.count(),
    prisma.subscription.count({ where: { status: 'ACTIVE' } }),
    prisma.payment.count({ where: { status: { in: ['PENDING', 'CONFIRMING'] } } }),
    prisma.tradingAccount.count()
  ]);
  res.json({ users, activeSubscriptions, pendingPayments, accounts });
});

router.get('/users', async (req, res) => {
  const users = await prisma.user.findMany({ orderBy: { createdAt: 'desc' }, take: 100, include: { subscriptions: { include: { plan: true }, take: 1, orderBy: { createdAt: 'desc' } } } });
  res.json({ users: users.map(({ passwordHash, ...u }) => u) });
});

router.post('/plans', async (req, res, next) => {
  try {
    const schema = z.object({ name: z.string().min(2), priceUsd: z.number().positive(), maxMarkets: z.number().int().positive(), maxRiskPct: z.number().positive(), maxDailyTrades: z.number().int().positive(), isActive: z.boolean().default(true) });
    const data = schema.parse(req.body);
    const plan = await prisma.plan.create({ data });
    res.status(201).json({ plan });
  } catch (err) { next(err); }
});

router.put('/plans/:id', async (req, res, next) => {
  try {
    const schema = z.object({ name: z.string().min(2).optional(), priceUsd: z.number().positive().optional(), maxMarkets: z.number().int().positive().optional(), maxRiskPct: z.number().positive().optional(), maxDailyTrades: z.number().int().positive().optional(), isActive: z.boolean().optional() });
    const data = schema.parse(req.body);
    const plan = await prisma.plan.update({ where: { id: req.params.id }, data });
    res.json({ plan });
  } catch (err) { next(err); }
});

router.post('/wallets', async (req, res, next) => {
  try {
    const schema = z.object({ coin: z.string().min(2), network: z.string().min(2), address: z.string().min(8), isActive: z.boolean().default(true) });
    const data = schema.parse(req.body);
    const wallet = await prisma.cryptoWallet.create({ data });
    res.status(201).json({ wallet });
  } catch (err) { next(err); }
});

router.get('/payments', async (req, res) => {
  const payments = await prisma.payment.findMany({ orderBy: { createdAt: 'desc' }, take: 100, include: { user: true, wallet: true, subscription: { include: { plan: true } } } });
  res.json({ payments: payments.map(p => ({ ...p, user: { id: p.user.id, email: p.user.email, name: p.user.name } })) });
});

router.post('/signals', async (req, res, next) => {
  try {
    const schema = z.object({ symbol: z.string().min(3), action: z.enum(['BUY', 'SELL', 'WAIT', 'CLOSE']), confidencePct: z.number().min(0).max(100), entry: z.number().optional(), stopLoss: z.number().optional(), takeProfit: z.number().optional(), reason: z.string().optional(), isActive: z.boolean().default(true) });
    const data = schema.parse(req.body);
    const signal = await prisma.tradeSignal.create({ data });
    res.status(201).json({ signal });
  } catch (err) { next(err); }
});

export default router;
