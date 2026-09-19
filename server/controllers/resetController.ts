import type { Request, Response } from 'express';
import { resetSystem } from '../services/resetService';

export function resetAll(_req: Request, res: Response): void {
  const result = resetSystem();
  res.json({ status: 200, ...result });
}