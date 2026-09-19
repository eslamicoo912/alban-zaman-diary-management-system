import type { NextFunction, Request, Response } from 'express';
import { badRequest } from '../utils/httpError';

/**
 * Rejects requests whose JSON body is missing or not decodable before any
 * controller runs, so the business layer never receives garbage input.
 */
export function validateJsonBody(req: Request, _res: Response, next: NextFunction): void {
  if (req.body === undefined) {
    next(badRequest('A JSON body is required'));
    return;
  }
  next();
}