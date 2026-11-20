// Templates for the home screen and the service pages (build a project, consultation, showcase).

import { esc, icon, shapeSvg, shapeIcon, heroMarkHTML, countLabel } from './views.js';
import { FORMS } from './requests.js';

export const NAV = [
  { id: 'home', label: 'الرئيسية', href: '#/' },
  { id: 'store', label: 'المتجر', href: '#/store' },
  { id: 'build', label: 'بناء المشاريع', href: '#/build' },
  { id: 'consult', label: 'اطلب استشارة', href: '#/consult' },
  { id: 'showcase', label: 'اعرض مشروعك', href: '#/showcase' },
];

const SERVICES = [
  {
    shape: 'dots', tone: 'blue', title: 'اطلب أدواتك',
    text: (total) => `لوحات تطوير، حساسات، حقائب روبوتات وإكسسوارات — ${total} منتجاً جاهزاً للطلب من المتجر.`,
    cta: 'تصفّح المتجر', href: '#/store',
  },
  {
    shape: 'scallop', tone: 'yellow', title: 'بناء المشاريع',
    text: () => 'للطلاب والمهندسين: نبني مشروعك معك من الفكرة حتى النموذج الأولي، ونوفّر أدواته.',
    cta: 'اطلب بناء مشروعك', href: '#/build',
  },
  {
    shape: 'rings', tone: 'teal', title: 'الاستشارات',
    text: () => 'محتار في اختيار القطع أو طريقة التنفيذ؟ اسألنا قبل أن تبدأ.',
    cta: 'اطلب استشارة', href: '#/consult',
  },
  {
    shape: 'frame', tone: 'green', title: 'الدورات التدريبية والمدربون',
    text: () => 'دورات تدريبية في مجالات إنترنت الأشياء و STEAM، ومدربون لتقديمها.',
    cta: 'اسأل عن الدورات', href: '#/consult/courses',
  },
  {
    shape: 'x', tone: 'red', title: 'اعرض مشروعك التقني',
    text: () => 'أنجزت مشروعاً؟ شاركه معنا لنعرضه للمبتكرين الآخرين.',
    cta: 'اعرض مشروعك', href: '#/showcase',
  },
];

/** Home-screen banners. The heading, subtitle and button are drawn into each image, so alt repeats them. */
const BANNERS = [
  { file: 'build', href: '#/build', alt: 'بناء المشاريع — من فكرتك إلى أول نموذج يعمل. اطلب بناء مشروعك' },
  { file: 'courses', href: '#/consult/courses', alt: 'الدورات التدريبية والمدربون — تعلّم إنترنت الأشياء بالتطبيق العملي. استكشف الدورات' },
  { file: 'showcase', href: '#/showcase', alt: 'اعرض مشروعك التقني — شارك ابتكارك مع مجتمع صانع. اعرض مشروعك' },
];

/**
 * شركاء النجاح. Files are 240px tall; w is each file's width. Logos are sized so they carry equal
 * visual weight (equal area) rather than equal height, which makes wide wordmarks tiny and tall marks huge.
 * scale nudges a logo whose lettering is small for its overall size.
 */
const PARTNERS = [
  { file: 'sunnaa', name: 'صنّاع', w: 1089 },
  { file: 'iot', name: 'نورتك IoT', w: 408 },
  { file: 'king-khalid-foundation', name: 'مؤسسة الملك خالد', w: 450, scale: 1.25 },
  { file: 'saudi-energy', name: 'السعودية للطاقة', w: 288 },
  { file: 'green-opportunities', name: 'الفرص الخضراء', w: 239 },
];
const LOGO_AREA = 13500; // target logo area in CSS px² on desktop
const logoWidth = (p) => Math.round(Math.sqrt(LOGO_AREA * (p.w / 240)) * (p.scale ?? 1));

/**
 * The banners as a slider: one banner at a time, advanced every few seconds by app.js (setupCarousel).
 * Controls sit under the banner so they never cover the text drawn into the images.
 */
function carouselHTML() {
  const n = BANNERS.length;
  return `
    <div class="carousel" id="banner-carousel" role="region" aria-roledescription="carousel" aria-label="خدمات صانع المميزة">
      <div class="carousel-viewport">
        <div class="carousel-track" id="carousel-track" aria-live="off">
          ${BANNERS.map(
            (b, i) => `
            <div class="carousel-slide" role="group" aria-roledescription="slide" aria-label="${i + 1} من ${n}"${i === 0 ? '' : ' inert'}>
              <a class="banner" href="${b.href}" draggable="false">
                <img src="assets/banners/${b.file}-1000.webp"
                  srcset="assets/banners/${b.file}-1000.webp 1000w, assets/banners/${b.file}-2000.webp 2000w"
                  sizes="(max-width: 599px) 205vw, (min-width: 1240px) 1192px, 100vw"
                  width="2000" height="667" alt="${esc(b.alt)}" decoding="async" draggable="false">
              </a>
            </div>`,
          ).join('')}
        </div>
      </div>
      <div class="carousel-controls">
        <button type="button" class="carousel-btn" data-carousel="prev" aria-label="الشريحة السابقة">${icon('chevron')}</button>
        <div class="carousel-dots">
          ${BANNERS.map(
            (b, i) => `<button type="button" class="carousel-dot" data-carousel-dot="${i}" aria-label="عرض الشريحة ${i + 1}"${i === 0 ? ' aria-current="true"' : ''}></button>`,
          ).join('')}
        </div>
        <button type="button" class="carousel-btn carousel-next" data-carousel="next" aria-label="الشريحة التالية">${icon('chevron')}</button>
        <button type="button" class="carousel-btn carousel-toggle" data-carousel="toggle" aria-label="إيقاف التمرير التلقائي">${icon('pause')}</button>
      </div>
    </div>`;
}

/** Round icon links to the social accounts. */
export function socialHTML(social) {
  return social
    .map(
      (s) => `<a class="social-link" href="${esc(s.url)}" target="_blank" rel="noopener" aria-label="${esc(s.label)}" title="${esc(s.label)}">${icon(s.id)}</a>`,
    )
    .join('');
}

/** Commercial registration and VAT numbers, laid out like the official badges. */
export function legalHTML(business) {
  const item = (img, w, h, label, value) => `
    <div class="legal-item">
      <img src="${img}" alt="" width="${w}" height="${h}" loading="lazy">
      <div>
        <span class="legal-label">${esc(label)}</span>
        <span class="legal-value" dir="ltr">${esc(value)}</span>
      </div>
    </div>`;
  const items = [
    business.cr ? item('assets/legal/cr.webp', 160, 160, 'السجل التجاري', business.cr) : '',
    business.vat ? item('assets/legal/vat.png', 55, 63, 'الرقم الضريبي', business.vat) : '',
  ].join('');
  if (!items && !business.name) return '';
  return `
    ${business.name ? `<p class="legal-name">${esc(business.name)}</p>` : ''}
    <div class="legal-items">${items}</div>`;
}

/** The WhatsApp button used on the home screen and service pages; switched off until a number is set. */
function whatsAppButtonHTML(link, label) {
  return link
    ? `<a class="btn btn-whatsapp btn-lg btn-inline" href="${esc(link)}" target="_blank" rel="noopener">${icon('whatsapp')} ${esc(label)}</a>`
    : `<button type="button" class="btn btn-whatsapp btn-lg btn-inline" disabled>${icon('whatsapp')} ${esc(label)} <span class="pill">قريباً</span></button>`;
}

export function homeHTML({ categories, total, contactLink, email, social = [] }) {
  return `
    <div class="home">
      <section class="hero" aria-labelledby="hero-title">
        <div class="wrap hero-inner">
          <div class="hero-copy">
            <p class="eyebrow">صانع | متجر إلكترونيات IoT و STEAM</p>
            <h1 id="hero-title">نحوّل أفكار المبتكرين إلى نماذج أولية</h1>
            <p class="lead">نوفر أدوات إنترنت الأشياء والحلول الإلكترونية لدعم المبتكرين في تحويل أفكارهم إلى نماذج أولية مبتكرة.</p>
            <div class="hero-actions">
              <a class="btn btn-light btn-lg" href="#/store">اطلب أدواتك</a>
              <a class="btn btn-outline-light btn-lg" href="#/build">اطلب بناء مشروعك</a>
            </div>
          </div>
          ${heroMarkHTML()}
        </div>
      </section>

      <div class="wrap home-search">
        <form class="search search-lg" role="search" id="home-search">
          <label class="visually-hidden" for="home-q">ابحث في المتجر</label>
          ${icon('search')}
          <input id="home-q" name="q" type="search" inputmode="search" enterkeyhint="search" autocomplete="off"
            placeholder="ابحث في المتجر عن قطعة، حساس أو لوحة…">
          <button type="submit" class="btn btn-primary">بحث</button>
        </form>
      </div>

      <section class="wrap section">
        ${carouselHTML()}
      </section>

      <section class="wrap section" aria-labelledby="services-title">
        <header class="section-head">
          <h2 id="services-title">خدمات صانع</h2>
          <p>من توفير الأدوات إلى بناء المشروع كاملاً — اختر ما تحتاجه.</p>
        </header>
        <ul class="services">
          ${SERVICES.map(
            (s) => `
            <li class="service">
              <span class="service-icon">${shapeSvg(s.shape, s.tone)}</span>
              <h3>${esc(s.title)}</h3>
              <p>${esc(s.text(total))}</p>
              <a class="service-link" href="${s.href}">${esc(s.cta)} <span aria-hidden="true">‹</span></a>
            </li>`,
          ).join('')}
        </ul>
      </section>

      <section class="wrap section" aria-labelledby="offers-title">
        <div class="offers">
          <div>
            <p class="offers-tag">عروض حصرية</p>
            <h2 id="offers-title">عروض صانع الحصرية</h2>
            <p>ستظهر هنا العروض الحصرية فور إطلاقها. حتى ذلك الحين، كل المنتجات متاحة في المتجر.</p>
          </div>
          <a class="btn btn-light btn-lg" href="#/store">تصفّح المتجر</a>
        </div>
      </section>

      <section class="wrap section" aria-labelledby="cats-title">
        <header class="section-head">
          <h2 id="cats-title">أقسام المتجر</h2>
        </header>
        <ul class="cat-tiles">
          ${categories
            .map(
              (c) => `
            <li><a class="cat-tile" href="#/c/${c.id}">
              ${shapeIcon(c.id)}
              <span class="cat-tile-name">${esc(c.name)}</span>
              <span class="cat-tile-count">${countLabel(c.count)}</span>
            </a></li>`,
            )
            .join('')}
        </ul>
      </section>

      <section class="wrap section" aria-labelledby="showcase-title">
        <div class="panel panel-split">
          <div>
            <h2 id="showcase-title">مشاريع المشاركين</h2>
            <p>هنا نعرض مشاريع المبتكرين المشاركين مع صانع. كن أول من يعرض مشروعه التقني.</p>
          </div>
          <a class="btn btn-primary btn-lg" href="#/showcase">اعرض مشروعك التقني</a>
        </div>
      </section>

      <section class="wrap section" aria-labelledby="contact-title">
        <div class="panel panel-split panel-tint">
          <div>
            <h2 id="contact-title">تواصل معنا</h2>
            <p>لأي سؤال عن منتج أو خدمة، راسلنا على واتساب${email ? ' أو عبر البريد الإلكتروني' : ''}.</p>
            ${social.length ? `<div class="social social-contact" aria-label="حساباتنا على وسائل التواصل">${socialHTML(social)}</div>` : ''}
          </div>
          <div class="contact-actions">
            ${whatsAppButtonHTML(contactLink, 'راسلنا على واتساب')}
            ${email ? `<a class="btn btn-ghost btn-lg btn-inline" href="mailto:${esc(email)}" dir="ltr">${esc(email)}</a>` : ''}
          </div>
        </div>
      </section>

      <section class="partners-band" aria-labelledby="partners-title">
        <div class="wrap">
          <header class="partners-head">
            <h2 id="partners-title">شركاء النجاح</h2>
            <p>جهات نفخر بشراكتها ودعمها لمسيرة صانع</p>
          </header>
          <!-- A continuous strip: the logo set is repeated three times so the loop never shows a gap.
               Only the first copy is announced to screen readers. -->
          <div class="marquee" id="partners-marquee">
            <div class="marquee-track">
              ${[0, 1, 2].map((copy) => `
              <ul class="marquee-set"${copy ? ' aria-hidden="true"' : ''}>
                ${PARTNERS.map(
                  (p) => `
                  <li><img src="assets/partners/${p.file}.webp" alt="${copy ? '' : esc(p.name)}"${copy ? '' : ` title="${esc(p.name)}"`}
                    width="${p.w}" height="240" style="--logo-w: ${logoWidth(p)}px" decoding="async"></li>`,
                ).join('')}
              </ul>`).join('')}
            </div>
          </div>
          <button type="button" class="marquee-toggle" data-marquee-toggle aria-label="إيقاف حركة الشعارات">${icon('pause')}</button>
        </div>
      </section>
    </div>`;
}

function fieldHTML(kind, field, preset) {
  const id = `${kind}-${field.name}`;
  const described = `${field.hint ? `${id}-hint ` : ''}${id}-error`;
  const common = `id="${id}" name="${field.name}" aria-describedby="${described}"${field.required ? ' required aria-required="true"' : ''}`;
  const optional = field.required ? '' : ' <span class="optional">اختياري</span>';
  const hint = field.hint ? `<p class="hint" id="${id}-hint">${esc(field.hint)}</p>` : '';
  const error = `<p class="field-error" id="${id}-error" hidden></p>`;

  if (field.type === 'checkbox') {
    return `
      <div class="field field-check" data-field="${field.name}">
        <label class="check"><input type="checkbox" ${common}> <span>${esc(field.label)}</span></label>
        ${error}
      </div>`;
  }

  let control;
  if (field.type === 'select') {
    control = `<select ${common}>
        <option value="">اختر…</option>
        ${field.options.map((o) => `<option value="${esc(o)}"${o === preset ? ' selected' : ''}>${esc(o)}</option>`).join('')}
      </select>`;
  } else if (field.type === 'textarea') {
    control = `<textarea ${common} rows="5" maxlength="${field.max}"></textarea>`;
  } else {
    const dir = field.type === 'url' ? ' dir="ltr" inputmode="url"' : '';
    control = `<input type="${field.type === 'url' ? 'url' : 'text'}" ${common} maxlength="${field.max}"${
      field.autocomplete ? ` autocomplete="${field.autocomplete}"` : ''
    }${dir}>`;
  }
  return `
    <div class="field" data-field="${field.name}">
      <label for="${id}">${esc(field.label)}${optional}</label>
      ${control}
      ${hint}
      ${error}
    </div>`;
}

const PAGE_SHAPE = {
  build: ['scallop', 'yellow'],
  consult: ['rings', 'teal'],
  showcase: ['x', 'red'],
};

/** A service page: intro, the request form, and how the request is handled. */
export function requestPageHTML(kind, { enabled, presets = {} }) {
  const form = FORMS[kind];
  const [shape, tone] = PAGE_SHAPE[kind];
  return `
    <div class="wrap page">
      <header class="page-head">
        <span class="service-icon">${shapeSvg(shape, tone)}</span>
        <div>
          <h1>${esc(form.title)}</h1>
          <p>${esc(form.lead)}</p>
        </div>
      </header>
      <div class="page-grid">
        <form class="request-form" data-request="${kind}" novalidate>
          ${form.fields.map((f) => fieldHTML(kind, f, presets[f.name])).join('')}
          <button type="submit" class="btn btn-whatsapp btn-lg"${enabled ? '' : ' disabled'}>
            ${icon('whatsapp')} ${esc(form.submit)}${enabled ? '' : ' <span class="pill">قريباً</span>'}
          </button>
          <p class="fine">${
            enabled
              ? 'يفتح واتساب برسالة جاهزة فيها بياناتك — اضغط «إرسال» هناك. لا نحفظ بياناتك في الموقع.'
              : 'الإرسال عبر واتساب غير مفعّل بعد.'
          }</p>
          <p class="form-status" role="status" aria-live="polite"></p>
        </form>
        <aside class="steps" aria-label="كيف تتم الخدمة">
          <h2>كيف تتم الخدمة؟</h2>
          <ol>
            <li>املأ النموذج بما تعرفه عن طلبك.</li>
            <li>يفتح واتساب برسالة جاهزة، فتضغط «إرسال».</li>
            <li>نتواصل معك في المحادثة نفسها لتأكيد التفاصيل.</li>
          </ol>
          ${form.after ? `<p class="steps-note">${esc(form.after)}</p>` : ''}
        </aside>
      </div>
    </div>`;
}
