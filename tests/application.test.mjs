import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
let generation = 0;
async function start(file, env = {}) {
  Object.assign(process.env, { PORT: '0', HOST: '127.0.0.1', ...env });
  const { server } = await import(new URL(`../${file}?run=${generation++}`, import.meta.url));
  if (!server.listening) await once(server, 'listening');
  return { server, url: `http://127.0.0.1:${server.address().port}` };
}
async function stop(service) {
  if (!service?.server.listening) return;
  await new Promise((resolve, reject) => service.server.close(error => error ? reject(error) : resolve()));
}
function post(url, body) {
  return fetch(`${url}/orders`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
}
const valid = { customer: 'Practice User', items: [{ productId: 'field-notebook', quantity: 2 }] };

test('three-component application', { timeout: 30000 }, async t => {
  const originalEnv = { ...process.env };
  const dataDir = await mkdtemp(join(tmpdir(), 'pocket-shop-test-'));
  let catalog, orders, ui;
  try {
    catalog = await start('services/catalog/server.mjs');
    orders = await start('services/orders/server.mjs', { CATALOG_URL: catalog.url, DATA_DIR: dataDir, CORS_ORIGIN: 'http://localhost:3000' });
    ui = await start('ui/server.mjs', { PUBLIC_CATALOG_URL: catalog.url, PUBLIC_ORDERS_URL: orders.url });
    await t.test('serves UI assets and runtime API configuration', async () => {
      const page = await fetch(ui.url);
      assert.equal(page.status, 200);
      assert.match(await page.text(), /Your bag/);
      for (const path of ['/app.js', '/styles.css', '/health']) assert.equal((await fetch(ui.url + path)).status, 200);
      const config = await (await fetch(`${ui.url}/config.js`)).text();
      assert.ok(config.includes(catalog.url));
      assert.ok(config.includes(orders.url));
      assert.equal((await fetch(`${ui.url}/missing`)).status, 404);
    });
    await t.test('catalog discovery, CORS, and readiness', async () => {
      const response = await fetch(`${catalog.url}/products`);
      assert.equal(response.headers.get('access-control-allow-origin'), 'http://localhost:3000');
      assert.equal((await response.json()).length, 4);
      assert.equal((await fetch(`${catalog.url}/products/missing`)).status, 404);
      assert.equal((await fetch(`${orders.url}/ready`)).status, 200);
      assert.equal((await fetch(`${orders.url}/orders`, { method: 'OPTIONS' })).status, 204);
    });
    await t.test('validates bodies, products, and quantities', async () => {
      for (const body of [null, {}, { ...valid, customer: ' ' }, { ...valid, items: [{ productId: 'field-notebook', quantity: 0 }] }, { ...valid, items: [{ productId: 'field-notebook', quantity: 1.5 }] }, { ...valid, items: [...valid.items, ...valid.items] }, { ...valid, items: [{ productId: 'missing', quantity: 1 }] }]) {
        assert.equal((await post(orders.url, body)).status, 400);
      }
      assert.equal((await fetch(`${orders.url}/orders`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' })).status, 400);
      assert.equal((await fetch(`${orders.url}/orders`, { method: 'POST', body: '{}' })).status, 415);
      assert.equal((await post(orders.url, { ...valid, customer: 'a'.repeat(17000) })).status, 413);
    });
    await t.test('calculates prices from catalog and serializes simultaneous orders', async () => {
      const responses = await Promise.all(Array.from({ length: 5 }, () => post(orders.url, { ...valid, total: 1, items: [{ ...valid.items[0], unitPrice: 1 }] })));
      for (const response of responses) {
        assert.equal(response.status, 201);
        const order = await response.json();
        assert.equal(order.total, 498);
        assert.equal(order.items[0].unitPrice, 249);
      }
      assert.equal((await (await fetch(`${orders.url}/orders`)).json()).length, 5);
    });
    await t.test('retains orders after restart', async () => {
      await stop(orders);
      orders = await start('services/orders/server.mjs', { CATALOG_URL: catalog.url, DATA_DIR: dataDir });
      assert.equal((await (await fetch(`${orders.url}/orders`)).json()).length, 5);
    });
    await t.test('catalog outage fails checkout and readiness but preserves reads and liveness', async () => {
      await stop(catalog);
      assert.equal((await post(orders.url, valid)).status, 503);
      assert.equal((await fetch(`${orders.url}/ready`)).status, 503);
      assert.equal((await fetch(`${orders.url}/health`)).status, 200);
      assert.equal((await (await fetch(`${orders.url}/orders`)).json()).length, 5);
    });
  } finally {
    await Promise.all([stop(ui), stop(orders), stop(catalog)]);
    await rm(dataDir, { recursive: true, force: true });
    for (const key of Object.keys(process.env)) if (!(key in originalEnv)) delete process.env[key];
    Object.assign(process.env, originalEnv);
  }
});
