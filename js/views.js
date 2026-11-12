// HTML templates. Every value that comes from the workbook is escaped before it reaches the page.

import { toHalalas, formatAmount, CURRENCY_LABEL } from './money.js';

/** Each category wears one of the shapes from the صانع logo (four shapes plus the dashed frame). */
export const CATEGORY_STYLE = {
  arduino: { shape: 'dots', tone: 'blue' },
  sensors: { shape: 'rings', tone: 'teal' },
  kits: { shape: 'scallop', tone: 'yellow' },
  games: { shape: 'x', tone: 'red' },
  accessories: { shape: 'frame', tone: 'green' },
};

/** The logo mark redrawn as vector art in the logo's colours, for use on the dark hero. */
export function heroMarkHTML() {
  const ring = (cx, cy, radius, count, r) =>
    Array.from({ length: count }, (_, i) => {
      const a = (2 * Math.PI * i) / count - Math.PI / 2;
      return `<circle cx="${(cx + radius * Math.cos(a)).toFixed(1)}" cy="${(cy + radius * Math.sin(a)).toFixed(1)}" r="${r}"/>`;
    }).join('');
  return `
    <svg class="hero-mark" viewBox="0 0 200 200" aria-hidden="true">
      <defs>
        <linearGradient id="hm-frame" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stop-color="#6ea0ff"/><stop offset="0.55" stop-color="#6ea0ff"/><stop offset="1" stop-color="#68fd43"/>
        </linearGradient>
        <linearGradient id="hm-dots" gradientUnits="userSpaceOnUse" x1="28" y1="28" x2="90" y2="90">
          <stop offset="0" stop-color="#68fd43"/><stop offset="1" stop-color="#4f8dff"/>
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="192" height="192" rx="18" fill="none" stroke="url(#hm-frame)" stroke-width="2.6" stroke-dasharray="15 9"/>
      <g fill="url(#hm-dots)">${ring(58, 58, 27, 8, 10.6)}</g>
      <g fill="none" stroke="#8ffbe3" stroke-width="5.2"><circle cx="142" cy="58" r="33"/><circle cx="142" cy="58" r="21.500"/></g>
      <path d="M33 117l50 50M83 117l-50 50" fill="none" stroke="#fe2901" stroke-width="18"/>
      <g fill="#fdd913"><circle cx="142" cy="142" r="28"/>${ring(142, 142, 26.5, 12, 7.5)}</g>
    </svg>`;
}

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ESCAPES[c]);

export const icon = (name) => `<svg class="icon" aria-hidden="true"><use href="#i-${name}"/></svg>`;

/** One of the logo shapes by name, in a brand tone. */
export function shapeSvg(shape, tone) {
  return `<svg class="shape tone-${tone}" aria-hidden="true"><use href="#s-${shape}"/></svg>`;
}

export function shapeIcon(catId) {
  const style = CATEGORY_STYLE[catId] ?? { shape: 'frame', tone: 'blue' };
  return `<svg class="shape tone-${style.tone}" aria-hidden="true"><use href="#s-${style.shape}"/></svg>`;
}

export function countLabel(n) {
  if (n === 0) return 'لا توجد منتجات';
  if (n === 1) return 'منتج واحد';
  if (n === 2) return 'منتجان';
  return n <= 10 ? `${n} منتجات` : `${n} منتجاً`;
}

export function unitsLabel(n) {
  if (n === 1) return 'قطعة واحدة';
  if (n === 2) return 'قطعتان';
  return n <= 10 ? `${n} قطع` : `${n} قطعة`;
}

/** What one unit of price buys, when the workbook says it is not simply "one of the item". */
export function unitLabel(product, long = false) {
  if (product.unit && !/^1\s/.test(product.unit)) {
    return long ? `السعر لـ ${product.unit}` : `/ ${product.unit}`;
  }
  if (product.perPiece) return long ? 'يُباع بالقطعة — السعر للقطعة الواحدة' : '/ للقطعة';
  return '';
}

export function priceHTML(halalas, extraClass = '') {
  return `<span class="price ${extraClass}"><span class="amount">${formatAmount(halalas)}</span> <span class="cur">${CURRENCY_LABEL}</span></span>`;
}

function stepperHTML(product, qty, size = '') {
  // At the stock limit the + button stays focusable (so keyboard focus never jumps to "remove")
  // and pressing it explains why nothing happens.
  const atMax = qty >= product.stock;
  return `
    <div class="stepper ${size}" role="group" aria-label="كمية ${esc(product.name)}">
      <button type="button" class="step" data-dec="${product.id}" aria-label="${qty === 1 ? 'إزالة من السلة' : 'إنقاص الكمية'}">${icon(qty === 1 ? 'trash' : 'minus')}</button>
      <span class="step-qty"><span class="visually-hidden">الكمية: </span>${qty}</span>
      <button type="button" class="step" data-inc="${product.id}" aria-label="زيادة الكمية"${atMax ? ' aria-disabled="true" title="هذه كل الكمية المتوفرة"' : ''}>${icon('plus')}</button>
    </div>`;
}

/** The add-to-cart control. Shows a button until the product is in the cart, then a quantity stepper. */
export function actionHTML(product, qty, variant = 'card') {
  if (product.stock <= 0) {
    return `<button type="button" class="btn btn-add" disabled>غير متوفر حالياً</button>`;
  }
  if (variant === 'detail') {
    if (qty === 0) {
      return `<button type="button" class="btn btn-primary btn-lg" data-add="${product.id}">${icon('cart')} أضف إلى السلة</button>`;
    }
    const maxNote = qty >= product.stock ? ' — هذه كل الكمية المتوفرة' : '';
    return `
      <div class="buy-row">
        ${stepperHTML(product, qty, 'stepper-lg')}
        <button type="button" class="btn btn-ghost btn-lg" data-open-cart>عرض السلة</button>
      </div>
      <p class="in-cart-note">${icon('check')} في سلتك: ${unitsLabel(qty)}${maxNote}</p>`;
  }
  if (qty === 0) {
    return `<button type="button" class="btn btn-add" data-add="${product.id}" aria-label="أضف ${esc(product.name)} إلى السلة">${icon('plus')} أضف للسلة</button>`;
  }
  return stepperHTML(product, qty);
}

export function cardHTML(product, qty, catName) {
  const img = product.images[0];
  const unit = unitLabel(product);
  return `
    <li class="card">
      <a class="card-media" href="#/p/${product.id}" tabindex="-1" aria-hidden="true">
        ${img ? `<img src="${esc(img.s)}" alt="" width="420" height="420" loading="lazy" decoding="async">` : shapeIcon(product.cat)}
      </a>
      <div class="card-body">
        <span class="card-cat">${shapeIcon(product.cat)} ${esc(catName)}</span>
        <h3 class="card-title"><a href="#/p/${product.id}">${esc(product.name)}</a></h3>
        ${product.sub ? `<p class="card-sub">${esc(product.sub)}</p>` : ''}
        <div class="card-foot">
          <div class="price-row">${priceHTML(toHalalas(product.price))}${unit ? ` <span class="per">${esc(unit)}</span>` : ''}</div>
          <div class="action" data-action-for="${product.id}" data-variant="card">${actionHTML(product, qty, 'card')}</div>
        </div>
      </div>
    </li>`;
}

export function chipsHTML(categories, counts, active) {
  const chip = (id, name, href, shape) => `
    <a class="chip${active === id ? ' is-active' : ''}" href="${href}"${active === id ? ' aria-current="page"' : ''}>
      ${shape}<span>${esc(name)}</span><span class="chip-count">${counts[id] ?? 0}</span>
    </a>`;
  return (
    chip('all', 'الكل', '#/store', '') +
    categories.map((c) => chip(c.id, c.name, `#/c/${c.id}`, shapeIcon(c.id))).join('')
  );
}

export function storeShellHTML({ types, filters }) {
  const option = (value, label, current) =>
    `<option value="${esc(value)}"${value === current ? ' selected' : ''}>${esc(label)}</option>`;
  return `
    <div class="list-view" id="list-view">
      <section class="store-head">
        <div class="wrap store-head-inner">
          <div class="store-head-copy">
            <h1>المتجر</h1>
            <p>أدوات إنترنت الأشياء، لوحات التطوير، الحساسات وحقائب الروبوتات.</p>
          </div>
          <form class="search" role="search" id="search-form">
            <label class="visually-hidden" for="q">ابحث في المنتجات</label>
            ${icon('search')}
            <input id="q" type="search" inputmode="search" enterkeyhint="search" autocomplete="off"
              placeholder="ابحث عن منتج، حساس، لوحة…" value="${esc(filters.query)}">
          </form>
        </div>
      </section>

      <nav class="cats" aria-label="تصنيفات المنتجات">
        <div class="wrap"><div class="chips" id="chips"></div></div>
      </nav>

      <section class="wrap listing" aria-labelledby="list-title">
        <div class="toolbar">
          <div class="toolbar-title">
            <h2 id="list-title"></h2>
            <span class="list-count" id="list-count" role="status"></span>
          </div>
          <div class="toolbar-controls">
            <label class="select"><span class="visually-hidden">نوع المنتج</span>
              <select id="filter-type">
                ${option('all', 'كل الأنواع', filters.type)}
                ${types.map((t) => option(t, t, filters.type)).join('')}
              </select>
            </label>
            <label class="select"><span class="visually-hidden">الترتيب</span>
              <select id="sort">
                ${option('default', 'الترتيب الافتراضي', filters.sort)}
                ${option('price-asc', 'السعر: من الأقل', filters.sort)}
                ${option('price-desc', 'السعر: من الأعلى', filters.sort)}
                ${option('name', 'الاسم', filters.sort)}
              </select>
            </label>
          </div>
        </div>
        <ul class="grid" id="grid"></ul>
        <div class="empty" id="empty" hidden></div>
      </section>
    </div>`;
}

export function emptyListHTML(query) {
  return `
    <div class="empty-shapes" aria-hidden="true">${shapeIcon('games')}${shapeIcon('arduino')}${shapeIcon('kits')}</div>
    <h3>${query ? `لا توجد نتائج لـ «${esc(query)}»` : 'لا توجد منتجات بهذه الخيارات'}</h3>
    <p>جرّب كلمة أخرى أو اعرض كل المنتجات.</p>
    <button type="button" class="btn btn-ghost" data-reset-filters>عرض كل المنتجات</button>`;
}

function stockHTML(product) {
  if (product.stock <= 0) return `<p class="stock stock-out">غير متوفر حالياً</p>`;
  if (product.stock <= 2) {
    return `<p class="stock stock-low">كمية محدودة — ${product.stock === 1 ? 'قطعة واحدة متبقية' : 'قطعتان متبقيتان'}</p>`;
  }
  return `<p class="stock stock-ok">متوفر — ${product.stock} في المخزون</p>`;
}

export function detailHTML({ product, qty, category, related, qtyOf }) {
  const unit = unitLabel(product, true);
  const [first] = product.images;
  const thumbs =
    product.images.length > 1
      ? `<div class="thumbs" role="group" aria-label="صور المنتج">
          ${product.images
            .map(
              (im, i) => `
            <button type="button" class="thumb" data-thumb="${i}" aria-label="الصورة ${i + 1}"${i === 0 ? ' aria-current="true"' : ''}>
              <img src="${esc(im.s)}" alt="" width="120" height="120" loading="lazy">
            </button>`,
            )
            .join('')}
        </div>`
      : '';
  return `
    <div class="wrap detail">
      <nav class="crumbs" aria-label="مسار التنقل">
        <a href="#/store">المتجر</a><span aria-hidden="true">‹</span><a href="#/c/${category.id}">${esc(category.name)}</a>
      </nav>
      <article class="detail-grid">
        <div class="gallery">
          <div class="gallery-main">
            ${first ? `<img id="gallery-img" src="${esc(first.l)}" alt="${esc(product.name)}" width="${first.w}" height="${first.h}">` : shapeIcon(product.cat)}
          </div>
          ${thumbs}
        </div>
        <div class="info">
          <div class="tags">
            <a class="tag" href="#/c/${category.id}">${shapeIcon(product.cat)} ${esc(category.name)}</a>
            ${product.type ? `<span class="tag tag-plain">${esc(product.type)}</span>` : ''}
          </div>
          <h1 class="detail-title">${esc(product.name)}</h1>
          <div class="detail-price">
            ${priceHTML(toHalalas(product.price), 'price-lg')}
            ${unit ? `<span class="unit-note">${esc(unit)}</span>` : ''}
          </div>
          ${stockHTML(product)}
          <div class="action action-detail" data-action-for="${product.id}" data-variant="detail">${actionHTML(product, qty, 'detail')}</div>
          <dl class="specs">
            ${product.spec ? `<div><dt>المواصفة</dt><dd>${esc(product.spec)}</dd></div>` : ''}
            ${product.type ? `<div><dt>النوع</dt><dd>${esc(product.type)}</dd></div>` : ''}
            <div><dt>رقم المنتج</dt><dd>#${product.id}</dd></div>
          </dl>
          ${product.desc ? `<section class="desc"><h2>وصف المنتج</h2><p>${esc(product.desc)}</p></section>` : ''}
          ${product.usage ? `<section class="desc"><h2>الاستخدام المقترح</h2><p>${esc(product.usage)}</p></section>` : ''}
        </div>
      </article>
      ${
        related.length
          ? `<section class="related" aria-labelledby="related-title">
              <h2 id="related-title">من تصنيف ${esc(category.name)} أيضاً</h2>
              <ul class="grid">${related.map((p) => cardHTML(p, qtyOf(p.id), category.name)).join('')}</ul>
            </section>`
          : ''
      }
    </div>`;
}

export function notFoundHTML() {
  return `
    <div class="wrap empty empty-page">
      <div class="empty-shapes" aria-hidden="true">${shapeIcon('accessories')}</div>
      <h1>هذا المنتج غير موجود</h1>
      <p>ربما تغيّر الرابط أو لم يعد المنتج متوفراً.</p>
      <a class="btn btn-primary" href="#/store">تصفّح كل المنتجات</a>
    </div>`;
}

export function loadErrorHTML() {
  return `
    <div class="wrap empty empty-page" role="alert">
      <h1>تعذّر تحميل المنتجات</h1>
      <p>تحقّق من اتصالك بالإنترنت ثم أعد المحاولة.</p>
      <button type="button" class="btn btn-primary" onclick="location.reload()">إعادة المحاولة</button>
    </div>`;
}

export function cartBodyHTML(lines) {
  if (!lines.length) {
    return `
      <div class="empty cart-empty">
        <div class="empty-shapes" aria-hidden="true">${shapeIcon('games')}${shapeIcon('arduino')}${shapeIcon('kits')}${shapeIcon('sensors')}</div>
        <h3>سلتك فارغة</h3>
        <p>أضف المنتجات التي تحتاجها وستجدها هنا.</p>
        <button type="button" class="btn btn-ghost" data-close-cart>تصفّح المنتجات</button>
      </div>`;
  }
  return `
    <ul class="lines">
      ${lines
        .map(({ product, qty, unitPrice, lineTotal }) => {
          const img = product.images[0];
          const unit = unitLabel(product);
          return `
        <li class="line" data-line="${product.id}">
          <a class="line-img" href="#/p/${product.id}" tabindex="-1" aria-hidden="true">
            ${img ? `<img src="${esc(img.s)}" alt="" width="72" height="72" loading="lazy">` : shapeIcon(product.cat)}
          </a>
          <div class="line-main">
            <a class="line-name" href="#/p/${product.id}">${esc(product.name)}</a>
            <span class="line-unit">${formatAmount(unitPrice)} ${CURRENCY_LABEL}${unit ? ` ${esc(unit)}` : ''}</span>
            <div class="line-controls">
              ${stepperHTML(product, qty, 'stepper-sm')}
              <button type="button" class="link-btn" data-remove="${product.id}" aria-label="حذف ${esc(product.name)} من السلة">حذف</button>
            </div>
          </div>
          <div class="line-total">${priceHTML(lineTotal)}</div>
        </li>`;
        })
        .join('')}
    </ul>`;
}

/** orderLink is the prefilled WhatsApp link, or null while no WhatsApp number is configured. */
export function cartFootHTML(totals, orderLink = null) {
  if (!totals.lines) return '';
  const order = orderLink
    ? `<a class="btn btn-whatsapp btn-lg" href="${esc(orderLink)}" target="_blank" rel="noopener" data-order>
        ${icon('whatsapp')} إرسال الطلب عبر واتساب
      </a>
      <p class="fine">يفتح واتساب برسالة جاهزة فيها منتجاتك والإجمالي — اضغط «إرسال» هناك. نؤكّد الطلب معك ونرتّب الدفع بتحويل بنكي.</p>`
    : `<button type="button" class="btn btn-whatsapp btn-lg" disabled>
        ${icon('whatsapp')} إرسال الطلب عبر واتساب <span class="pill">قريباً</span>
      </button>
      <p class="fine">سيتم تأكيد الطلب عبر واتساب والدفع بتحويل بنكي. إرسال الطلب غير مفعّل بعد.</p>`;
  return `
    <dl class="sum">
      <div><dt>عدد القطع</dt><dd>${totals.units}</dd></div>
      <div class="sum-total"><dt>الإجمالي</dt><dd>${priceHTML(totals.total, 'price-lg')}</dd></div>
    </dl>
    ${order}
    <div class="foot-links">
      <button type="button" class="link-btn" data-close-cart>متابعة التسوق</button>
      <button type="button" class="link-btn link-danger" data-clear-cart>إفراغ السلة</button>
    </div>`;
}
