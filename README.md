# VELTRIX TREAD AI Backend

Backend starter for an automated trading subscription platform.

## What this includes

- Secure Express API
- JWT authentication
- bcrypt password hashing
- Prisma database schema
- Users, plans, subscriptions
- Crypto wallets and payment records
- Demo blockchain payment verification
- Admin API and simple admin page
- Risk engine
- MT4/MT5 bridge API endpoint
- MT5 Expert Advisor skeleton

## Important safety note

This project must not be marketed as guaranteed profit. Forex and crypto trading are high risk and can lose capital. This starter keeps live trading disabled by default.

## Local setup

```bash
cp .env.example .env
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run seed
npm run dev
```

Backend:

```text
http://localhost:8080
```

Admin page:

```text
http://localhost:8080/admin
```

Default admin from `.env.example`:

```text
admin@veltrix.local
ChangeMe123!
```

Change these immediately before production.

## Test payment flow

In development only, any TXID starting with `demo` will be confirmed automatically.

Example:

```text
demo-txid-123456789
```

Production verification must be implemented in:

```text
src/services/paymentVerifier.js
```

You need to verify:

- Receiver wallet address
- Amount
- Token contract
- Network
- Confirmations
- Duplicate TXID prevention

## MT5 bridge flow

1. User creates trading account from `/api/trading/accounts`.
2. Backend returns a one-time `bridgeToken`.
3. User puts the token inside `mt5-ea/VeltrixBridgeEA.mq5`.
4. EA polls `/api/trading/bridge/poll`.
5. Backend checks subscription and risk limits.
6. Backend returns commands only if live trading is enabled and risk rules pass.

Live trading is disabled unless this is set:

```env
ENABLE_LIVE_TRADING=true
```

Do not enable real trading until the system is audited and tested on demo accounts.

## API overview

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`

### Plans

- `GET /api/plans`

### Payments

- `GET /api/payments/wallets`
- `POST /api/payments/create`
- `POST /api/payments/:paymentId/submit-txid`

### Trading

- `GET /api/trading/signals`
- `GET /api/trading/risk`
- `PUT /api/trading/risk`
- `POST /api/trading/accounts`
- `POST /api/trading/bridge/poll`

### Admin

- `GET /api/admin/stats`
- `GET /api/admin/users`
- `POST /api/admin/plans`
- `PUT /api/admin/plans/:id`
- `POST /api/admin/wallets`
- `GET /api/admin/payments`
- `POST /api/admin/signals`

## Production checklist

- Use PostgreSQL instead of SQLite.
- Use HTTPS only.
- Put backend behind a reverse proxy.
- Use strong JWT secret.
- Add refresh tokens or session rotation.
- Add email verification.
- Add 2FA for admin.
- Add real blockchain verification.
- Add audit logs for all admin actions.
- Never store broker passwords as plain text.
- Use MT bridge token with rotation and revocation.
- Add monitoring and alerting.
- Add legal terms, risk disclosure, privacy policy, KYC/AML review where required.
