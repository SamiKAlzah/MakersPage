// Catalog queries: search, filter and sort. Pure functions, unit-tested in Node.

const TASHKEEL = /[ً-ٰٟـ]/g;

/** Fold Arabic spelling variants and case so "اردوينو" finds "أردوينو" and "esp32" finds "ESP32". */
export function normalize(text) {
  return String(text ?? '')
    .toLowerCase()
    .replace(TASHKEEL, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Attach a normalized search string to each product (once, at load). */
export function indexProducts(products, categoryNames = {}) {
  return products.map((p) => ({
    ...p,
    _search: normalize([p.name, p.desc, p.spec, p.type, categoryNames[p.cat] ?? '', `#${p.id}`].join(' ')),
  }));
}

function matchesQuery(product, query) {
  const terms = normalize(query).split(' ').filter(Boolean);
  return terms.every((t) => product._search.includes(t));
}

export function filterProducts(products, { cat = 'all', type = 'all', query = '' } = {}) {
  return products.filter(
    (p) =>
      (cat === 'all' || p.cat === cat) &&
      (type === 'all' || p.type === type) &&
      (!query.trim() || matchesQuery(p, query)),
  );
}

/** Product count per category for the current search/type (ignores the category filter itself). */
export function countByCategory(products, { type = 'all', query = '' } = {}) {
  const counts = { all: 0 };
  for (const p of filterProducts(products, { type, query })) {
    counts.all += 1;
    counts[p.cat] = (counts[p.cat] ?? 0) + 1;
  }
  return counts;
}

export function sortProducts(list, sort = 'default') {
  const out = [...list];
  if (sort === 'price-asc') out.sort((a, b) => a.price - b.price || a.id - b.id);
  else if (sort === 'price-desc') out.sort((a, b) => b.price - a.price || a.id - b.id);
  else if (sort === 'name') out.sort((a, b) => a.name.localeCompare(b.name, 'ar') || a.id - b.id);
  return out;
}
