import type { Request, Response } from 'express';
import * as service from '../services/collectionService';
import { notFound } from '../utils/httpError';

export function getCollection(req: Request, res: Response): void {
  const data = service.getCollectionData(req.params.name);
  res.json(data);
}

export function replaceCollection(req: Request, res: Response): void {
  service.replaceCollection(req.params.name, req.body);
  res.json({ status: 200, message: 'Collection saved.' });
}

export function upsertItem(req: Request, res: Response): void {
  const result = service.upsertCollectionItem(req.params.name, req.body);
  res.json(result);
}

export function removeItem(req: Request, res: Response): void {
  const result = service.deleteCollectionItem(req.params.name, req.params.id);
  res.json(result);
}

export function getCollectionItem(req: Request, res: Response): void {
  const value = service.collectionWithId(req.params.name, req.params.id);
  if (value === undefined) {
    throw notFound('Not found');
  }
  res.json({ status: 200, data: value });
}