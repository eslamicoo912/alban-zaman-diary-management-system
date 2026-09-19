import fs from 'fs';
import path from 'path';
import express from 'express';
import { env } from './config/env';
import routes from './routes';
import { errorHandler } from './middlewares/errorHandler';

export function createApp(): express.Express {
  const app = express();

  app.use(express.json({ limit: env.jsonBodyLimit, strict: false }));
  app.use(express.urlencoded({ extended: true }));

  app.use('/api', routes);

  if (fs.existsSync(env.distPath)) {
    app.use(express.static(env.distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(env.distPath, 'index.html'));
    });
  }

  app.use(errorHandler);

  return app;
}