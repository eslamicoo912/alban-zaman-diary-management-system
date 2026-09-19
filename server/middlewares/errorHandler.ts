import type { NextFunction, Request, Response } from 'express';
import { HttpError } from '../utils/httpError';

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: 'Not found' });
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  const status = err instanceof HttpError ? err.status : 500;
  if (status >= 500) {
    console.error('[error]', err);
  }
  res.status(status).json({
    error: err instanceof Error ? err.message : 'Internal server error',
  });
}