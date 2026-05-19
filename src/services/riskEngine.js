export function evaluateRisk({ profile, plan, accountBalanceUsd, openTradesToday = 0, dailyLossPct = 0, newsHighImpact = false }) {
  const violations = [];
  if (!profile?.botEnabled) violations.push('BOT_DISABLED');
  if (accountBalanceUsd < profile.minBalanceUsd) violations.push('BALANCE_BELOW_MINIMUM');
  if (profile.riskPerTradePct > plan.maxRiskPct) violations.push('RISK_ABOVE_PLAN_LIMIT');
  if (dailyLossPct >= profile.maxDailyLossPct) violations.push('DAILY_LOSS_LIMIT_REACHED');
  if (openTradesToday >= profile.maxDailyTrades) violations.push('DAILY_TRADE_LIMIT_REACHED');
  if (newsHighImpact && profile.newsProtectionEnabled) violations.push('HIGH_IMPACT_NEWS_PROTECTION');

  return {
    allowed: violations.length === 0,
    violations,
    safeRiskPct: Math.min(profile.riskPerTradePct, plan.maxRiskPct, Number(process.env.MAX_RISK_PER_TRADE_PERCENT || 3))
  };
}
