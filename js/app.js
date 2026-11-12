// Site wiring: loads the catalog, routes between the home screen, the store, product pages and
// the service pages, and keeps every add-to-cart control and the cart drawer in sync with the cart.

import * as Cart from './cart.js';
import { indexProducts, filterProducts, countByCategory, sortProducts } from './catalog.js';
import * as V from './views.js';
import * as P from './pages.js';
import { formatSar } from './money.js';
import { orderUrl } from './order.js';
import { FORMS, COURSES_TOPIC, readValues, validate, requestUrl, contactUrl } from './requests.js';
import { WHATSAPP_NUMBER } from './config.js';

const SITE_TITLE = 'صانع — متجر إلكترونيات IoT و STEAM';
const DEFAULT_FILTERS = { cat: 'all', type: 'all', query: '', sort: 'default' };

const $ = (selector, root = document) => root.querySelector(selector);
const main = $('#main');
const header = $('#site-header');
const drawer = $('#cart');
const pageChrome = [header, main, $('#site-footer'), $('#cart-bar')];

const state = {
  products: [],
  byId: new Map(),
  categories: [],
  catById: new Map(),
  types: [],
  cart: [],
  filters: { ...DEFAULT_FILTERS },
  keepQuery: false,
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
const catName = (id) => state.catById.get(id).name;

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
  $('#main-nav').innerHTML = P.NAV.map((n) => `<a href="${n.href}" data-nav="${n.id}">${n.label}</a>`).join('');
  $('#footer-nav').innerHTML = P.NAV.map((n) => `<a href="${n.href}">${n.label}</a>`).join('');
  bindEvents();
  renderCart();
  onRoute();
}

/* ---------- Routing ---------- */

function parseRoute() {
  const [kind, value] = location.hash.replace(/^#\/?/, '').split('/');
  if (kind === 'p' && value) return { name: 'product', id: Number(value), nav: 'store' };
  if (kind === 'c' && state.catById.has(value)) return { name: 'list', cat: value, nav: 'store' };
  if (kind === 'store') return { name: 'list', cat: 'all', nav: 'store' };
  if (FORMS[kind]) return { name: 'request', kind, preset: value, nav: kind };
  return { name: 'home', nav: 'home' };
}

function onRoute() {
  const prev = state.route;
  const route = parseRoute();
  if (prev?.name === 'list' && route.name !== 'list') {
    state.listScroll = { cat: prev.cat, y: window.scrollY };
  }
  state.route = route;
  closeCart({ restoreFocus: false });
  closeMenu();
  for (const link of document.querySelectorAll('#main-nav [data-nav]')) {
    if (link.dataset.nav === route.nav) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }

  if (route.name === 'list') {
    showList(prev, route);
    return;
  }
  if (route.name === 'product') renderProduct(route.id);
  else if (route.name === 'request') renderRequest(route);
  else renderHome();
  window.scrollTo(0, 0);
}

/* ---------- Home and service pages ---------- */

function renderHome() {
  const featured = state.categories.flatMap((c) => state.products.filter((p) => p.cat === c.id).slice(0, 2)).slice(0, 8);
  main.innerHTML = P.homeHTML({
    categories: state.categories,
    total: state.products.length,
    featured,
    qtyOf,
    catName,
    contactLink: contactUrl(WHATSAPP_NUMBER),
  });
  document.title = SITE_TITLE;
}

function renderRequest(route) {
  const presets = route.kind === 'consult' && route.preset === 'courses' ? { topic: COURSES_TOPIC } : {};
  main.innerHTML = P.requestPageHTML(route.kind, { enabled: Boolean(contactUrl(WHATSAPP_NUMBER)), presets });
  document.title = `${FORMS[route.kind].title} — صانع`;
}

function setFieldError(form, name, message) {
  const wrap = $(`[data-field="${name}"]`, form);
  if (!wrap) return;
  const error = $('.field-error', wrap);
  const control = $('input, select, textarea', wrap);
  error.textContent = message ?? '';
  error.hidden = !message;
  if (message) control.setAttribute('aria-invalid', 'true');
  else control.removeAttribute('aria-invalid');
}

/** Validate a service form and, if it is complete, open WhatsApp with the request typed in. */
function submitRequest(form) {
  const kind = form.dataset.request;
  const raw = Object.fromEntries(new FormData(form));
  const errors = validate(kind, readValues(kind, raw));
  for (const field of FORMS[kind].fields) setFieldError(form, field.name, errors[field.name]);

  const status = $('.form-status', form);
  const firstBad = FORMS[kind].fields.find((f) => errors[f.name]);
  if (firstBad) {
    status.textContent = 'راجع الحقول المشار إليها ثم أعد الإرسال.';
    $(`[data-field="${firstBad.name}"] :is(input, select, textarea)`, form).focus();
    return;
  }
  const url = requestUrl(WHATSAPP_NUMBER, kind, raw);
  if (!url) {
    status.textContent = 'الإرسال عبر واتساب غير مفعّل بعد.';
    return;
  }
  const link = document.createElement('a');
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener';
  link.click();
  status.textContent = 'فُتح واتساب برسالة جاهزة — اضغط «إرسال» هناك لإتمام طلبك.';
}

/* ---------- Store list ---------- */

function showList(prev, route) {
  state.filters.cat = route.cat;
  if (prev?.name === 'list') {
    updateList();
    const listTop = $('#list-view .cats').offsetTop - header.offsetHeight;
    if (window.scrollY > listTop) window.scrollTo(0, listTop);
    return;
  }
  // Arriving from another section starts a fresh search, unless the home search sent us here
  // or we are coming back from a product page.
  if (prev?.name !== 'product' && !state.keepQuery) state.filters.query = '';
  state.keepQuery = false;
  main.innerHTML = V.storeShellHTML({ types: state.types, filters: state.filters });
  updateList();
  const back = prev?.name === 'product' && state.listScroll.cat === route.cat;
  window.scrollTo(0, back ? state.listScroll.y : 0);
}

function updateList() {
  const f = state.filters;
  const query = f.query.trim();
  const list = sortProducts(filterProducts(state.products, f), f.sort);

  const chips = $('#chips');
  const chipScroll = chips.scrollLeft;
  chips.innerHTML = V.chipsHTML(state.categories, countByCategory(state.products, f), f.cat);
  chips.scrollLeft = chipScroll;
  $('.chip.is-active', chips)?.scrollIntoView({ block: 'nearest', inline: 'nearest' });

  $('#list-title').textContent = query ? `نتائج البحث عن «${query}»` : f.cat === 'all' ? 'كل المنتجات' : catName(f.cat);
  $('#list-count').textContent = V.countLabel(list.length);
  $('#grid').innerHTML = list.map((p) => V.cardHTML(p, qtyOf(p.id), catName(p.cat))).join('');

  const empty = $('#empty');
  empty.hidden = list.length > 0;
  empty.innerHTML = list.length ? '' : V.emptyListHTML(query);

  document.title = f.cat === 'all' ? 'المتجر — صانع' : `${catName(f.cat)} — صانع`;
}

function resetFilters() {
  state.filters = { ...DEFAULT_FILTERS };
  if (state.route.name === 'list' && state.route.cat === 'all') {
    $('#q').value = '';
    $('#filter-type').value = 'all';
    $('#sort').value = 'default';
    updateList();
  } else {
    location.hash = '#/store';
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
    if (thumb === button) thumb.setAttribute('aria-current', 'true');
    else thumb.removeAttribute('aria-current');
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
  closeMenu();
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

/* ---------- Main menu (collapses behind a button on small screens) ---------- */

function setMenu(open) {
  header.classList.toggle('nav-open', open);
  $('#menu-toggle').setAttribute('aria-expanded', String(open));
}
const closeMenu = () => setMenu(false);

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

  document.addEventListener('click', (event) => {
    if (header.classList.contains('nav-open') && !event.target.closest('#main-nav, #menu-toggle')) closeMenu();

    const el = event.target.closest(
      '[data-add],[data-inc],[data-dec],[data-remove],[data-open-cart],[data-close-cart],[data-clear-cart],[data-thumb],[data-reset-filters],#menu-toggle,#main-nav a',
    );
    if (!el) return;
    const d = el.dataset;
    if (el.id === 'menu-toggle') setMenu(!header.classList.contains('nav-open'));
    else if (el.closest('#main-nav')) closeMenu();
    else if (d.add) changeQty(el, 'add', Number(d.add), 1);
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
    if (event.key !== 'Escape') return;
    if (header.classList.contains('nav-open')) {
      closeMenu();
      $('#menu-toggle').focus();
    } else {
      closeCart();
    }
  });

  document.addEventListener('change', (event) => {
    if (event.target.id === 'filter-type') state.filters.type = event.target.value;
    else if (event.target.id === 'sort') state.filters.sort = event.target.value;
    else return;
    updateList();
  });

  let searchTimer = 0;
  document.addEventListener('input', (event) => {
    const target = event.target;
    const form = target.closest('.request-form');
    if (form && target.name) setFieldError(form, target.name, '');
    if (target.id !== 'q') return;

    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      state.filters.query = target.value;
      if (state.route.name !== 'list') return;
      // A search looks across the whole catalog, so it always runs from the "all products" list.
      if (state.route.cat !== 'all' && target.value.trim()) location.hash = '#/store';
      else updateList();
    }, 160);
  });

  document.addEventListener('submit', (event) => {
    const form = event.target;
    if (form.id === 'search-form') {
      event.preventDefault();
      $('#q').blur();
    } else if (form.id === 'home-search') {
      event.preventDefault();
      state.filters = { ...DEFAULT_FILTERS, query: new FormData(form).get('q').trim() };
      state.keepQuery = true;
      location.hash = '#/store';
    } else if (form.dataset.request) {
      event.preventDefault();
      submitRequest(form);
    }
  });
}
