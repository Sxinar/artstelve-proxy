import { app } from './app.js';
import { closeBrowser } from './browserPool.js';

const port = Number(process.env.PORT ?? 8787);
const server = app.listen(port, () => {
  process.stdout.write(`listening on http://localhost:${port}\n`);
});

async function shutdown() {
  server.close(() => {});
  await closeBrowser().catch(() => {});
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
