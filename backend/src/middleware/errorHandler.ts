import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../services/logger';

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Please check the highlighted fields and try again.',
      details: err.errors.map(e => ({ field: e.path.join('.'), message: e.message })),
    });
    return;
  }

  if (err instanceof Error) {
    logger.error(err.message, { stack: err.stack });
    const status = (err as any).status || 500;
    const message = process.env.NODE_ENV === 'production' && status === 500
      ? 'Internal server error'
      : err.message;
    res.status(status).json({ error: message });
    return;
  }

  res.status(500).json({ error: 'Unknown error' });
}

export function createError(message: string, status: number) {
  const err = new Error(message) as any;
  err.status = status;
  return err;
}
