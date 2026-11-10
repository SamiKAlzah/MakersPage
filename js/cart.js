// Cart logic. Pure functions over an immutable array of { id, qty } lines, in the order items were added.
// No DOM access here so it can be unit-tested in Node (tests/cart.test.mjs).

import { toHalalas } from './money.js';

export const STORAGE_KEY = 'sanea.cart.v1';

export function qtyOf(cart, id) {
  const line = cart.find((l) => l.id === id);
  return line ? line.qty : 0;
}

/** Set a product's quantity, clamped to 0..stock. Quantity 0 removes the line. */
export function setQty(cart, product, qty) {
  const max = Math.max(0, Math.floor(product.stock));
  const wanted = Number.isFinite(qty) ? Math.floor(qty) : 0;
  const next = Math.min(Math.max(wanted, 0), max);
  const exists = cart.some((l) => l.id === product.id);

  let out;
  if (next === 0) out = cart.filter((l) => l.id !== product.id);
  else if (exists) out = cart.map((l) => (l.id === product.id ? { id: l.id, qty: next } : l));
  else out = [...cart, { id: product.id, qty: next }];

  return { cart: out, qty: next, capped: wanted > max };
}

export function add(cart, product, n = 1) {
  return setQty(cart, product, qtyOf(cart, product.id) + n);
}

export function remove(cart, id) {
  return cart.filter((l) => l.id !== id);
}

/** Cart lines joined with their products and priced in halalas. */
export function lines(cart, productsById) {
  return cart
    .filter((l) => productsById.has(l.id))
    .map((l) => {
      const product = productsById.get(l.id);
      const unitPrice = toHalalas(product.price);
      return { product, qty: l.qty, unitPrice, lineTotal: unitPrice * l.qty };
    });
}

export function totals(cart, productsById) {
  const all = lines(cart, productsById);
  return {
    lines: all.length,
    units: all.reduce((n, l) => n + l.qty, 0),
    total: all.reduce((n, l) => n + l.lineTotal, 0),
  };
}

/** Drop anything that is not a known product with a valid quantity; clamp to current stock. */
export function sanitize(raw, productsById) {
  if (!Array.isArray(raw)) return [];
  let cart = [];
  for (const entry of raw) {
    const id = Number(entry && entry.id);
    const qty = Number(entry && entry.qty);
    const product = productsById.get(id);
    if (!product || !Number.isFinite(qty) || qty < 1) continue;
    cart = setQty(cart, product, qty).cart;
  }
  return cart;
}

export function load(storage, productsById) {
  try {
    return sanitize(JSON.parse(storage.getItem(STORAGE_KEY) || '[]'), productsById);
  } catch {
    return [];
  }
}

export function save(storage, cart) {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(cart));
  } catch {
    // Storage can be unavailable (private mode, quota). The cart still works for this visit.
  }
}
