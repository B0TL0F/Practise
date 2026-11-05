import http from 'node:http';
import { readFile } from 'node:fs/promises';

const files = { '/': ['index.html', 'text/html'], '/app.js': ['app.js', 'text/javascript'], '/styles.css': ['styles.css', 'text/css'] };
export const server = http.createServer(async (req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname;
  if (req.method !== 'GET') { res.writeHead(405); return res.end(); }
  if (path === '/health') { res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end('{"status":"ok","service":"ui"}'); }
  if (path === '/config.js') {
    res.writeHead(200, { 'Content-Type': 'text/javascript', 'Cache-Control': 'no-store' });
    const config = JSON.stringify({ catalogUrl: process.env.PUBLIC_CATALOG_URL || 'http://localhost:4001', ordersUrl: process.env.PUBLIC_ORDERS_URL || 'http://localhost:4002' }).replaceAll('<', '\\u003c');
    return res.end(`window.APP_CONFIG = ${config};`);
  }
  const file = files[path];
  if (!file) { res.writeHead(404); return res.end('Not found'); }
  try {
    const content = await readFile(new URL(`./public/${file[0]}`, import.meta.url));
    res.writeHead(200, { 'Content-Type': `${file[1]}; charset=utf-8`, 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' });
    res.end(content);
  } catch { res.writeHead(500); res.end('Unable to load page'); }
});
server.listen(Number(process.env.PORT || 3000), process.env.HOST || '0.0.0.0', () => console.log(`UI listening on port ${server.address().port}`));
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => server.close(() => process.exit(0)));
