import express from 'express';
import { z } from 'zod';
import { prisma } from '../config/db.js';
import { requireAuth } from '../middleware/auth.js';
import { createBridgeToken, verifyBridgeToken } from '../services/mtBridge.js';
import { evaluateRisk } from '../services/riskEngine.js';

const router = express.Router();

router.get('/signals', requireAuth, async (req, res) => {
  const signals = await prisma.tradeSignal.findMany({ where: { isActive: true }, orderBy: { createdAt: 'desc' }, take: 20 });
  res.json({ signals });
});

router.get('/risk', requireAuth, async (req, res) => {
  const profile = await prisma.riskProfile.upsert({ where: { userId: req.user.id }, update: {}, create: { userId: req.user.id } });
  res.json({ profile });
});

router.put('/risk', requireAuth, async (req, res, next) => {
  try {
    const schema = z.object({
      riskPerTradePct: z.number().min(0.1).max(5),
      maxDailyLossPct: z.number().min(1).max(20),
      maxDailyTrades: z.number().int().min(1).max(30),
      minBalanceUsd: z.number().min(50).max(100000),
      newsProtectionEnabled: z.boolean(),
      tradingStart: z.string().regex(/^\d\d:\d\d$/),
      tradingEnd: z.string().regex(/^\d\d:\d\d$/),
      botEnabled: z.boolean()
    });
    const data = schema.parse(req.body);
    const profile = await prisma.riskProfile.upsert({ where: { userId: req.user.id }, update: data, create: { userId: req.user.id, ...data } });
    res.json({ profile });
  } catch (err) { next(err); }
});

router.post('/accounts', requireAuth, async (req, res, next) => {
  try {
    const schema = z.object({ platform: z.enum(['MT4', 'MT5']), brokerServer: z.string().min(2), loginId: z.string().min(2) });
    const data = schema.parse(req.body);
    const { rawToken, hash } = await createBridgeToken();
    const account = await prisma.tradingAccount.create({ data: { userId: req.user.id, ...data, bridgeTokenHash: hash, status: 'PENDING' } });
    res.status(201).json({ account, bridgeToken: rawToken, warning: 'Show this token once. Put it inside your MT bridge/EA settings. Do not share it.' });
  } catch (err) { next(err); }
});

// Endpoint used by the MT4/MT5 bridge/EA. It receives token in x-bridge-token.
router.post('/bridge/poll', async (req, res, next) => {
  try {
    const schema = z.object({ loginId: z.string(), balanceUsd: z.number().nonnegative(), openTradesToday: z.number().int().nonnegative().default(0), dailyLossPct: z.number().nonnegative().default(0), newsHighImpact: z.boolean().default(false) });
    const data = schema.parse(req.body);
    const rawToken = req.headers['x-bridge-token'];
    const account = await prisma.tradingAccount.findFirst({ where: { loginId: data.loginId }, include: { user: { include: { riskProfile: true, subscriptions: { where: { status: 'ACTIVE' }, include: { plan: true }, orderBy: { createdAt: 'desc' }, take: 1 } } } } });
    if (!account || !(await verifyBridgeToken(rawToken, account.bridgeTokenHash))) return res.status(401).json({ error: 'Invalid bridge token' });
    await prisma.tradingAccount.update({ where: { id: account.id }, data: { lastHeartbeatAt: new Date(), status: 'CONNECTED' } });

    const activeSub = account.user.subscriptions[0];
    if (!activeSub) return res.json({ allowed: false, commands: [], reason: ['NO_ACTIVE_SUBSCRIPTION'] });

    const profile = account.user.riskProfile || await prisma.riskProfile.create({ data: { userId: account.user.id } });
    const risk = evaluateRisk({ profile, plan: activeSub.plan, accountBalanceUsd: data.balanceUsd, openTradesToday: data.openTradesToday, dailyLossPct: data.dailyLossPct, newsHighImpact: data.newsHighImpact });
    if (!risk.allowed || process.env.ENABLE_LIVE_TRADING !== 'true') {
      return res.json({ allowed: false, commands: [], risk, liveTrading: false });
    }

    const signals = await prisma.tradeSignal.findMany({ where: { isActive: true, action: { in: ['BUY', 'SELL'] } }, orderBy: { confidencePct: 'desc' }, take: 3 });
    const commands = signals.map(s => ({ symbol: s.symbol, action: s.action, confidencePct: s.confidencePct, riskPct: risk.safeRiskPct, stopLoss: s.stopLoss, takeProfit: s.takeProfit, comment: `VELTRIX-${s.id}` }));
    res.json({ allowed: true, commands, risk });
  } catch (err) { next(err); }
});

export default router;
