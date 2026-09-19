import { env } from './config/env';
import { initSchema } from './db/schema';
import { seedIfEmpty } from './db/seed';
import { createApp } from './app';

async function start(): Promise<void> {
  initSchema();
  await seedIfEmpty();

  const app = createApp();
  app.listen(env.port, () => {
    console.log(`[server] Alban Zaman Dairy API running on http://localhost:${env.port}`);
    console.log(`[server] Database: ${env.dbPath}`);
  });
}

start().catch((err) => {
  console.error('[server] Fatal startup error:', err);
  process.exit(1);
});