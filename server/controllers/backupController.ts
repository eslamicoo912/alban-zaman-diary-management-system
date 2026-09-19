import type { Request, Response } from 'express';
import { createBackup } from '../services/backupService';

export function triggerBackup(_req: Request, res: Response): void {
  const result = createBackup();
  res.json({ status: 200, ...result });
}