const { catalogUrl, ordersUrl } = window.APP_CONFIG;
const $ = id => document.getElementById(id);
const money = value => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
let products = [];
const cart = new Map();
let placing = false;
function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}
function message(id, text, error = false) { $(id).textContent = text; $(id).classList.toggle('error', error); }
async function request(base, path, options) {
  let response;
  try { response = await fetch(`${base.replace(/\/$/, '')}${path}`, { ...options, signal: AbortSignal.timeout(10000) }); }
  catch { throw new Error('Unable to reach the store. Check that the services are running, then refresh.'); }
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || `Request failed (${response.status}).`);
  return body;
}
async function loadProducts() {
  $('reload').disabled = true;
  try {
    products = await request(catalogUrl, '/products');
    $('products').replaceChildren();
    for (const product of products) {
      const card = element('article');
      const art = element('div', undefined, `product-art ${product.color}`);
      art.setAttribute('aria-hidden', 'true');
      art.append(element('span', product.symbol));
      const bottom = element('div', undefined, 'product-bottom');
      const add = element('button', 'Add to bag +', 'add');
      add.type = 'button';
      add.setAttribute('aria-label', `Add ${product.name} to bag`);
      add.onclick = () => { if (placing) return; cart.set(product.id, Math.min(99, (cart.get(product.id) || 0) + 1)); renderCart(); };
      bottom.append(element('strong', money(product.price), 'price'), add);
      card.append(art, element('p', product.category, 'category'), element('h3', product.name), element('p', product.description, 'description'), bottom);
      $('products').append(card);
    }
    message('catalog-message', '');
    renderCart();
  } catch (error) { message('catalog-message', error.message, true); }
  finally { $('reload').disabled = false; }
}
function renderCart() {
  $('cart').replaceChildren();
  let total = 0, count = 0;
  for (const [id, quantity] of cart) {
    const product = products.find(p => p.id === id);
    if (!product) continue;
    total += product.price * quantity;
    count += quantity;
    const row = element('div', undefined, 'cart-row');
    const controls = element('div', undefined, 'cart-controls');
    const stepper = element('div', undefined, 'quantity');
    for (const [label, delta] of [['−', -1], ['+', 1]]) {
      const button = element('button', label);
      button.type = 'button';
      button.disabled = placing || (delta === 1 && quantity === 99);
      button.setAttribute('aria-label', `${delta === 1 ? 'Increase' : 'Decrease'} ${product.name} quantity`);
      button.onclick = () => { const next = quantity + delta; next ? cart.set(id, next) : cart.delete(id); renderCart(); };
      if (delta === 1) stepper.append(element('span', String(quantity)));
      stepper.append(button);
    }
    controls.append(stepper, element('span', money(product.price * quantity)));
    row.append(element('div', product.name, 'cart-name'), controls);
    $('cart').append(row);
  }
  if (!count) $('cart').append(element('p', 'Your bag has room for something good. Add an item to get started.', 'empty'));
  $('bag-count').textContent = `${count} ${count === 1 ? 'item' : 'items'}`;
  $('total').textContent = money(total);
  $('place-order').disabled = !count || placing;
}
async function loadOrders() {
  $('refresh-orders').disabled = true;
  try {
    const orders = await request(ordersUrl, '/orders');
    $('orders').replaceChildren();
    message('orders-message', orders.length ? '' : 'Your first order will appear here.');
    for (const order of orders.slice(0, 10)) {
      const row = element('article', undefined, 'order');
      const identity = element('div');
      identity.append(element('strong', order.customer), element('p', `#${order.id.slice(0, 8)} · ${new Date(order.createdAt).toLocaleString()}`));
      const total = element('div', undefined, 'order-total');
      total.append(element('strong', money(order.total)), element('span', 'Order placed'));
      row.append(identity, element('div', order.items.map(item => `${item.quantity} × ${item.name}`).join(' · '), 'order-items'), total);
      $('orders').append(row);
    }
  } catch (error) { message('orders-message', error.message, true); }
  finally { $('refresh-orders').disabled = false; }
}
$('checkout').onsubmit = async event => {
  event.preventDefault();
  if (placing || !cart.size) return;
  const customer = $('customer').value.trim();
  if (!customer) return message('checkout-message', 'Enter your name to place an order.', true);
  placing = true;
  renderCart();
  message('checkout-message', 'Placing your order…');
  try {
    const order = await request(ordersUrl, '/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ customer, items: [...cart].map(([productId, quantity]) => ({ productId, quantity })) }) });
    cart.clear();
    message('checkout-message', `Order #${order.id.slice(0, 8)} placed. Thank you, ${order.customer}!`);
    await loadOrders();
  } catch (error) { message('checkout-message', `${error.message} Refresh recent orders before retrying to avoid placing the same order twice.`, true); }
  finally { placing = false; renderCart(); }
};
$('reload').onclick = loadProducts;
$('refresh-orders').onclick = loadOrders;
renderCart();
loadProducts();
loadOrders();
