// Storefront wiring: loads the catalog, routes between the product list and product pages,
// and keeps every add-to-cart control and the cart drawer in sync with the cart.

import * as Cart from './cart.js';
import { indexProducts, filterProducts, countByCategory, sortProducts } from './catalog.js';
import * as V from './views.js';
import { formatSar } from './money.js';
import { orderUrl } from './order.js';
import { WHATSAPP_NUMBER } from './config.js';

const SITE_TITLE = 'صانع — متجر الإلكترونيات والروبوتات التعليمية';
const DEFAULT_FILTERS = { cat: 'all', type: 'all', query: '', sort: 'default' };

const $ = (selector, root = document) => root.querySelector(selector);
const main = $('#main');
const drawer = $('#cart');
const searchInput = $('#q');
const pageChrome = [$('#site-header'), main, $('#site-footer'), $('#cart-bar')];

const state = {
  products: [],
  byId: new Map(),
  categories: [],
  catById: new Map(),
  types: [],
  cart: [],
  filters: { ...DEFAULT_FILTERS },
  route: null,
  listScroll: { cat: null, y: 0 },
};

const storage = (() => {
  try {
    return window.localStorage;
  } catch {
    return { getItem: () => null, setItem: () => {} };
  }
})();

const qtyOf = (id) => Cart.qtyOf(state.cart, id);

init();

async function init() {
  try {
    const res = await fetch('data/products.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    state.categories = data.categories;
    state.catById = new Map(data.categories.map((c) => [c.id, c]));
    state.types = data.types;
    const catNames = Object.fromEntries(data.categories.map((c) => [c.id, c.name]));
    state.products = indexProducts(data.products, catNames);
    state.byId = new Map(state.products.map((p) => [p.id, p]));
  } catch (err) {
    console.error('Catalog failed to load', err);
    main.innerHTML = V.loadErrorHTML();
    return;
  }
  state.cart = Cart.load(storage, state.byId);
  bindEvents();
  renderCart();
  onRoute();
}

/* ---------- Routing ---------- */

function parseRoute() {
  const [kind, value] = location.hash.replace(/^#\/?/, '').split('/');
  if (kind === 'p' && value) return { name: 'product', id: Number(value) };
  if (kind === 'c' && state.catById.has(value)) return { name: 'list', cat: value };
  return { name: 'list', cat: 'all' };
}

function onRoute() {
  const prev = state.route;
  const route = parseRoute();
  if (prev?.name === 'list' && route.name !== 'list') {
    state.listScroll = { cat: prev.cat, y: window.scrollY };
  }
  state.route = route;
  closeCart({ restoreFocus: false });

  if (route.name === 'product') {
    renderProduct(route.id);
    window.scrollTo(0, 0);
    return;
  }

  state.filters.cat = route.cat;
  if (prev?.name === 'list') {
    updateList();
    const listTop = $('#list-view .cats').offsetTop - $('#site-header').offsetHeight;
    if (window.scrollY > listTop) window.scrollTo(0, listTop);
  } else {
    main.innerHTML = V.listShellHTML({ total: state.products.length, types: state.types, filters: state.filters });
    updateList();
    const back = prev?.name === 'product' && state.listScroll.cat === route.cat;
    window.scrollTo(0, back ? state.listScroll.y : 0);
  }
}

/* ---------- Product list ---------- */

function updateList() {
  const f = state.filters;
  const query = f.query.trim();
  const list = sortProducts(filterProducts(state.products, f), f.sort);

  const chips = $('#chips');
  const chipScroll = chips.scrollLeft;
  chips.innerHTML = V.chipsHTML(state.categories, countByCategory(state.products, f), f.cat);
  chips.scrollLeft = chipScroll;
  $('.chip.is-active', chips)?.scrollIntoView({ block: 'nearest', inline: 'nearest' });

  $('#list-view').classList.toggle('is-searching', Boolean(query));
  $('#list-title').textContent = query
    ? `نتائج البحث عن «${query}»`
    : f.cat === 'all'
      ? 'كل المنتجات'
      : state.catById.get(f.cat).name;
  $('#list-count').textContent = V.countLabel(list.length);
  $('#grid').innerHTML = list.map((p) => V.cardHTML(p, qtyOf(p.id), state.catById.get(p.cat).name)).join('');

  const empty = $('#empty');
  empty.hidden = list.length > 0;
  empty.innerHTML = list.length ? '' : V.emptyListHTML(query);

  document.title = f.cat === 'all' ? SITE_TITLE : `${state.catById.get(f.cat).name} — صانع`;
}

function resetFilters() {
  state.filters = { ...DEFAULT_FILTERS };
  searchInput.value = '';
  if (state.route.name === 'list' && state.route.cat === 'all') {
    $('#filter-type').value = 'all';
    $('#sort').value = 'default';
    updateList();
  } else {
    location.hash = '#/';
  }
}

/* ---------- Product page ---------- */

function renderProduct(id) {
  const product = state.byId.get(id);
  if (!product) {
    main.innerHTML = V.notFoundHTML();
    document.title = SITE_TITLE;
    return;
  }
  const siblings = state.products.filter((p) => p.cat === product.cat);
  const at = siblings.indexOf(product);
  const related = [];
  for (let i = 1; i < siblings.length && related.length < 4; i += 1) {
    related.push(siblings[(at + i) % siblings.length]);
  }
  main.innerHTML = V.detailHTML({
    product,
    qty: qtyOf(id),
    category: state.catById.get(product.cat),
    related,
    qtyOf,
  });
  document.title = `${product.name} — صانع`;
}

function showGalleryImage(button) {
  const product = state.byId.get(state.route.id);
  const image = product?.images[Number(button.dataset.thumb)];
  if (!image) return;
  const img = $('#gallery-img');
  img.src = image.l;
  img.width = image.w;
  img.height = image.h;
  for (const thumb of document.querySelectorAll('.thumb')) {
    thumb.toggleAttribute('aria-current', thumb === button);
    if (thumb === button) thumb.setAttribute('aria-current', 'true');
  }
}

/* ---------- Cart ---------- */

function commit(cart) {
  state.cart = cart;
  Cart.save(storage, cart);
  for (const slot of document.querySelectorAll('[data-action-for]')) {
    const product = state.byId.get(Number(slot.dataset.actionFor));
    slot.innerHTML = V.actionHTML(product, qtyOf(product.id), slot.dataset.variant);
  }
  renderCart();
}

function renderCart() {
  const lines = Cart.lines(state.cart, state.byId);
  const totals = Cart.totals(state.cart, state.byId);

  $('#cart-title').textContent = totals.lines ? `سلة المشتريات (${totals.units})` : 'سلة المشتريات';
  $('#cart-body').innerHTML = V.cartBodyHTML(lines);
  $('#cart-foot').innerHTML = V.cartFootHTML(totals, orderUrl(WHATSAPP_NUMBER, lines, totals));

  const badge = $('#cart-count');
  badge.hidden = totals.units === 0;
  badge.textContent = totals.units;
  $('#cart-count-sr').textContent = totals.units ? `، ${V.unitsLabel(totals.units)} في السلة` : '، فارغة';

  const bar = $('#cart-bar');
  bar.hidden = totals.units === 0;
  $('#cart-bar-count').textContent = `عرض السلة · ${V.unitsLabel(totals.units)}`;
  $('#cart-bar-total').textContent = formatSar(totals.total);
  document.body.classList.toggle('has-cart', totals.units > 0);
}

/** Change a quantity, then put keyboard focus back on the equivalent control after re-rendering. */
function changeQty(button, kind, id, delta) {
  const product = state.byId.get(id);
  if (!product) return;
  const slot = button.closest('[data-action-for]');
  const inDrawer = drawer.contains(button);

  const result =
    kind === 'remove' ? { cart: Cart.remove(state.cart, id), qty: 0, capped: false } : Cart.add(state.cart, product, delta);
  commit(result.cart);

  if (result.capped) toast('هذه كل الكمية المتوفرة من هذا المنتج');
  else if (kind === 'add') toast('أُضيف إلى السلة');

  const scope = slot ?? (inDrawer ? $(`.line[data-line="${id}"]`, drawer) : null);
  const target =
    scope &&
    ($(`[data-${kind}]:not([disabled])`, scope) ??
      $('[data-inc]:not([disabled])', scope) ??
      $('button:not([disabled])', scope));
  (target ?? (inDrawer ? $('[data-close-cart]', drawer) : null))?.focus({ preventScroll: true });
}

let clearArmTimer = 0;
function clearCart(button) {
  if (button.dataset.armed) {
    clearTimeout(clearArmTimer);
    commit([]);
    $('[data-close-cart]', drawer).focus();
    return;
  }
  button.dataset.armed = 'true';
  button.textContent = 'اضغط مرة أخرى للتأكيد';
  clearArmTimer = setTimeout(() => {
    delete button.dataset.armed;
    button.textContent = 'إفراغ السلة';
  }, 3500);
}

let lastFocus = null;
function openCart(opener) {
  if (document.body.classList.contains('cart-open')) return;
  lastFocus = opener ?? document.activeElement;
  document.body.classList.add('cart-open');
  drawer.inert = false;
  for (const el of pageChrome) el.inert = true;
  $('[data-close-cart]', drawer).focus();
}

function closeCart({ restoreFocus = true } = {}) {
  if (!document.body.classList.contains('cart-open')) return;
  document.body.classList.remove('cart-open');
  drawer.inert = true;
  for (const el of pageChrome) el.inert = false;
  if (restoreFocus && lastFocus?.isConnected) lastFocus.focus();
  lastFocus = null;
}

let toastTimer = 0;
function toast(message) {
  const el = $('#toast');
  el.textContent = message;
  el.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('is-visible'), 2200);
}

/* ---------- Events ---------- */

function bindEvents() {
  window.addEventListener('hashchange', onRoute);

  // The search field is narrow on phones, so it gets a shorter hint there.
  const narrow = window.matchMedia('(max-width: 719px)');
  const setHint = () => {
    searchInput.placeholder = narrow.matches ? 'ابحث…' : 'ابحث عن منتج، حساس، لوحة…';
  };
  narrow.addEventListener('change', setHint);
  setHint();

  document.addEventListener('click', (event) => {
    const el = event.target.closest(
      '[data-add],[data-inc],[data-dec],[data-remove],[data-open-cart],[data-close-cart],[data-clear-cart],[data-thumb],[data-reset-filters]',
    );
    if (!el) return;
    const d = el.dataset;
    if (d.add) changeQty(el, 'add', Number(d.add), 1);
    else if (d.inc) changeQty(el, 'inc', Number(d.inc), 1);
    else if (d.dec) changeQty(el, 'dec', Number(d.dec), -1);
    else if (d.remove) changeQty(el, 'remove', Number(d.remove), 0);
    else if ('openCart' in d) openCart(el);
    else if ('closeCart' in d) closeCart();
    else if ('clearCart' in d) clearCart(el);
    else if ('thumb' in d) showGalleryImage(el);
    else if ('resetFilters' in d) resetFilters();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeCart();
  });

  document.addEventListener('change', (event) => {
    if (event.target.id === 'filter-type') state.filters.type = event.target.value;
    else if (event.target.id === 'sort') state.filters.sort = event.target.value;
    else return;
    updateList();
  });

  let searchTimer = 0;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      state.filters.query = searchInput.value;
      const onAllList = state.route.name === 'list' && state.route.cat === 'all';
      // A search looks across the whole catalog, so it always runs from the "all products" list.
      if (onAllList || !searchInput.value.trim()) {
        if (state.route.name === 'list') updateList();
      } else {
        location.hash = '#/';
      }
    }, 160);
  });

  $('#search-form').addEventListener('submit', (event) => {
    event.preventDefault();
    searchInput.blur();
  });
}
