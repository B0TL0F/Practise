import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile, rename, access, constants } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readJson, send, serve } from '../../lib/http.mjs';

const catalogUrl = (process.env.CATALOG_URL || 'http://localhost:4001').replace(/\/$/, '');
const dataDir = resolve(process.env.DATA_DIR || fileURLToPath(new URL('./data/', import.meta.url)));
const dataFile = resolve(dataDir, 'orders.json');
await mkdir(dataDir, { recursive: true });
let orders;
try {
  orders = JSON.parse(await readFile(dataFile, 'utf8'));
  if (!Array.isArray(orders)) throw new Error('Orders file must contain an array.');
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
  orders = [];
}
let writes = Promise.resolve();
async function catalog(path) {
  try { return await fetch(`${catalogUrl}${path}`, { signal: AbortSignal.timeout(3000) }); }
  catch { throw Object.assign(new Error('Catalog is unavailable. Try again shortly.'), { status: 503 }); }
}
export const server = serve('orders-api', 4002, async (req, res, path) => {
  if (req.method === 'GET' && path === '/ready') {
    const dependency = await catalog('/health');
    await access(dataDir, constants.W_OK);
    return send(res, dependency.ok ? 200 : 503, { status: dependency.ok ? 'ready' : 'unavailable' });
  }
  if (req.method === 'GET' && path === '/orders') return send(res, 200, [...orders].reverse());
  if (req.method === 'POST' && path === '/orders') {
    const input = await readJson(req);
    if (!input || typeof input.customer !== 'string' || !input.customer.trim() || input.customer.trim().length > 80 || !Array.isArray(input.items) || input.items.length < 1 || input.items.length > 20) return send(res, 400, { error: 'Provide a customer name (1–80 characters) and 1–20 items.' });
    const ids = new Set();
    for (const item of input.items) {
      if (!item || typeof item.productId !== 'string' || !/^[a-z0-9-]{1,60}$/.test(item.productId) || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99 || ids.has(item.productId)) return send(res, 400, { error: 'Each item needs a unique productId and a whole quantity from 1 to 99.' });
      ids.add(item.productId);
    }
    const items = [];
    for (const item of input.items) {
      const response = await catalog(`/products/${item.productId}`);
      if (response.status === 404) return send(res, 400, { error: `Unknown product: ${item.productId}` });
      if (!response.ok) return send(res, 503, { error: 'Catalog is unavailable.' });
      const product = await response.json();
      items.push({ productId: product.id, name: product.name, quantity: item.quantity, unitPrice: product.price });
    }
    const order = { id: randomUUID(), customer: input.customer.trim(), items, total: items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0), status: 'placed', createdAt: new Date().toISOString() };
    const write = writes.then(async () => {
      const next = [...orders, order];
      await writeFile(`${dataFile}.tmp`, JSON.stringify(next, null, 2));
      await rename(`${dataFile}.tmp`, dataFile);
      orders = next;
    });
    writes = write.catch(() => {});
    await write;
    return send(res, 201, order);
  }
  send(res, 404, { error: 'Route not found.' });
});
