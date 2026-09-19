import type { Request, Response } from 'express';

export function healthCheck(_req: Request, res: Response): void {
  res.json({ status: 200, message: 'Alban Zaman Dairy API is running.', time: new Date().toISOString() });
}