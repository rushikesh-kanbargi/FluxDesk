import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { rateLimit } from 'express-rate-limit';

import { authRouter } from './routes/auth';
import { toolsRouter } from './routes/tools';
import { promptsRouter } from './routes/prompts';
import { apiKeysRouter } from './routes/apiKeys';
import { memoryRouter } from './routes/memory';
import { usersRouter } from './routes/users';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './services/logger';

const app = express();
const PORT = process.env.PORT || 4000;

// ── Security ──
app.use(helmet());
const allowedOrigins = [
  'http://localhost:3000',
  process.env.FRONTEND_URL,
].filter(Boolean) as string[]

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
}))

// ── Rate limiting ──
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please slow down.' },
}));

app.use('/api/tools/', rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Tool rate limit reached. Wait a minute.' },
}));

// ── Body parsing ──
app.use(compression());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Health ──
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Routes ──
app.use('/api/auth', authRouter);
app.use('/api/tools', toolsRouter);
app.use('/api/prompts', promptsRouter);
app.use('/api/keys', apiKeysRouter);
app.use('/api/memory', memoryRouter);
app.use('/api/users', usersRouter);

// ── Error handler (must be last) ──
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`FluxDesk API running on port ${PORT}`);
});

export default app;
