import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './routes/auth.routes.js';
import planRoutes from './routes/plan.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import tradingRoutes from './routes/trading.routes.js';
import adminRoutes from './routes/admin.routes.js';
import { notFound, errorHandler } from './middleware/error.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') || '*', credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 300 }));

app.use('/admin', express.static(path.join(__dirname, '../public/admin')));

app.get('/health', (req, res) => res.json({ ok: true, service: 'veltrix-backend', liveTrading: process.env.ENABLE_LIVE_TRADING === 'true' }));
app.use('/api/auth', authRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/trading', tradingRoutes);
app.use('/api/admin', adminRoutes);

app.use(notFound);
app.use(errorHandler);

const port = Number(process.env.PORT || 8080);
app.listen(port, () => console.log(`VELTRIX backend running on http://localhost:${port}`));
