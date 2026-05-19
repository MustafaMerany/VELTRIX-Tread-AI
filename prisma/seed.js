import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const plans = [
    { name: 'Starter', priceUsd: 29, maxMarkets: 10, maxRiskPct: 1, maxDailyTrades: 5 },
    { name: 'Pro AI', priceUsd: 79, maxMarkets: 999, maxRiskPct: 3, maxDailyTrades: 10 },
    { name: 'Elite', priceUsd: 149, maxMarkets: 999, maxRiskPct: 5, maxDailyTrades: 15 }
  ];
  for (const p of plans) {
    await prisma.plan.upsert({ where: { name: p.name }, update: p, create: p });
  }

  const wallets = [
    { coin: 'USDT', network: 'TRC20', address: 'TX9DemoWalletAddressVeltrix123456789' },
    { coin: 'BNB', network: 'BSC', address: '0xBnbDemoVeltrixWallet123456789ABC' },
    { coin: 'ETH', network: 'ERC20', address: '0xEthDemoVeltrixWallet987654321ABC' },
    { coin: 'BTC', network: 'BTC', address: 'bc1qdemoveltrixwalletaddress123456789' }
  ];
  for (const w of wallets) {
    await prisma.cryptoWallet.upsert({ where: { address: w.address }, update: w, create: w });
  }

  const email = process.env.ADMIN_EMAIL || 'admin@veltrix.local';
  const password = process.env.ADMIN_PASSWORD || 'ChangeMe123!';
  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.upsert({
    where: { email },
    update: { role: 'ADMIN', passwordHash },
    create: { name: 'VELTRIX Admin', email, passwordHash, role: 'ADMIN' }
  });

  await prisma.tradeSignal.createMany({
    data: [
      { symbol: 'EUR/USD', action: 'BUY', confidencePct: 84, reason: 'Demo momentum signal' },
      { symbol: 'XAU/USD', action: 'BUY', confidencePct: 82, reason: 'Demo trend continuation' },
      { symbol: 'USD/JPY', action: 'SELL', confidencePct: 77, reason: 'Demo resistance rejection' }
    ],
    skipDuplicates: true
  });
}

main().finally(() => prisma.$disconnect());
