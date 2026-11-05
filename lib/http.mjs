import http from 'node:http';

export function send(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

export async function readJson(req) {
  if (!req.headers['content-type']?.startsWith('application/json')) throw Object.assign(new Error('Use Content-Type: application/json.'), { status: 415 });
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 16384) throw Object.assign(new Error('Request exceeds 16 KB.'), { status: 413 });
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString()); }
  catch { throw Object.assign(new Error('Invalid JSON.'), { status: 400 }); }
}

export function serve(name, port, handler) {
  const server = http.createServer(async (req, res) => {
    const start = Date.now();
    res.on('finish', () => console.log(JSON.stringify({ service: name, method: req.method, path: req.url, status: res.statusCode, durationMs: Date.now() - start })));
    res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || 'http://localhost:3000');
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
    try {
      const path = new URL(req.url, 'http://localhost').pathname;
      if (req.method === 'GET' && path === '/health') return send(res, 200, { service: name, status: 'ok' });
      await handler(req, res, path);
    } catch (error) {
      console.error(JSON.stringify({ service: name, error: error.message }));
      if (!res.headersSent) send(res, error.status || 500, { error: error.status ? error.message : 'An internal error occurred.' });
      else res.end();
    }
  });
  server.listen(Number(process.env.PORT || port), process.env.HOST || '0.0.0.0', () => console.log(`${name} listening on port ${server.address().port}`));
  for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => server.close(() => process.exit(0)));
  return server;
}
