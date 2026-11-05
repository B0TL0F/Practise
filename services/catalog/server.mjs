import { send, serve } from '../../lib/http.mjs';

const products = [
  { id: 'field-notebook', name: 'Field notebook', category: 'Stationery', description: 'Dotted pages for plans, sketches, and the next good idea.', price: 249, symbol: '▤', color: 'blue' },
  { id: 'studio-mug', name: 'Studio mug', category: 'Desk essentials', description: 'A generous ceramic mug for a slower coffee break.', price: 499, symbol: '◡', color: 'pink' },
  { id: 'everyday-tote', name: 'Everyday tote', category: 'Carry goods', description: 'Heavy cotton, long handles, room for daily essentials.', price: 699, symbol: '∪', color: 'yellow' },
  { id: 'desk-planter', name: 'Desk planter', category: 'Desk essentials', description: 'A little home for something green. Plant not included.', price: 399, symbol: '♧', color: 'green' }
];
export const server = serve('catalog-api', 4001, async (req, res, path) => {
  if (req.method === 'GET' && path === '/ready') return send(res, 200, { status: 'ready' });
  if (req.method === 'GET' && path === '/products') return send(res, 200, products);
  if (req.method === 'GET' && path.startsWith('/products/')) {
    const product = products.find(item => item.id === path.slice('/products/'.length));
    return send(res, product ? 200 : 404, product || { error: 'Product not found.' });
  }
  send(res, 404, { error: 'Route not found.' });
});
