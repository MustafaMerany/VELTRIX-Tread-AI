import express from 'express';
import { prisma } from '../config/db.js';
const router = express.Router();

router.get('/', async (req, res) => {
  const plans = await prisma.plan.findMany({ where: { isActive: true }, orderBy: { priceUsd: 'asc' } });
  res.json({ plans });
});

export default router;
