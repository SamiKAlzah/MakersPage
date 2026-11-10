// Turns the cart into a prefilled WhatsApp message. Pure functions, unit-tested in Node.
// Nothing is sent from here: the link opens WhatsApp with the text typed in, and the customer presses send.

import { formatSar } from './money.js';
import { unitLabel, unitsLabel } from './views.js';

/** Keep the link comfortably inside what browsers and WhatsApp accept. */
export const MAX_URL_LENGTH = 6000;

/** '+966 5X XXX XXXX' -> '9665XXXXXXXX'. Returns '' unless it is a full international number. */
export function normalizeNumber(raw) {
  const digits = String(raw ?? '').replace(/[^\d]/g, '').replace(/^00/, '');
  return /^[1-9]\d{7,14}$/.test(digits) ? digits : '';
}

function shorten(name, max) {
  if (name.length <= max) return name;
  return `${name.slice(0, max).replace(/\s+\S*$/, '')}…`;
}

/**
 * The order summary the shop receives. Every line carries the product number, so the shop can
 * identify the exact item even when several products share a name.
 * nameMax = 0 leaves names out and lists product numbers only.
 */
export function buildOrderMessage(lines, totals, { nameMax = 60 } = {}) {
  const items = lines.map(({ product, qty, unitPrice, lineTotal }, i) => {
    const title = nameMax > 0 ? `${shorten(product.name, nameMax)} (#${product.id})` : `منتج رقم #${product.id}`;
    const unit = unitLabel(product);
    return `${i + 1}) ${title}\nالكمية: ${qty} × ${formatSar(unitPrice)}${unit ? ` ${unit}` : ''} = ${formatSar(lineTotal)}`;
  });
  return [
    'مرحباً صانع، أرغب في طلب المنتجات التالية:',
    '',
    items.join('\n\n'),
    '',
    `عدد القطع: ${unitsLabel(totals.units)}`,
    `*الإجمالي: ${formatSar(totals.total)}*`,
    '',
    'طريقة الدفع: تحويل بنكي',
  ].join('\n');
}

export function whatsAppUrl(number, message) {
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

/**
 * The link for the cart's order button, or null when there is nothing to order or no valid number.
 * Long carts fall back to shorter product names, then to product numbers only, so the link always fits.
 */
export function orderUrl(rawNumber, lines, totals) {
  const number = normalizeNumber(rawNumber);
  if (!number || !lines.length) return null;
  let url = '';
  for (const nameMax of [60, 28, 0]) {
    url = whatsAppUrl(number, buildOrderMessage(lines, totals, { nameMax }));
    if (url.length <= MAX_URL_LENGTH) break;
  }
  return url;
}
