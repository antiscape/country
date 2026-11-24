/* Shared sitemap.xml / robots.txt / ads.txt generator.
   Used by `npm run build` and by `npm run seo`.
*/
import fs from 'node:fs';
import path from 'node:path';
import { COUNTRIES } from '../js/data.js';

export const LANGS = ['zh', 'en', 'es', 'fr'];
export const LOCALES = { zh: 'zh-CN', en: 'en-US', es: 'es-ES', fr: 'fr-FR' };
export const MODE_IDS = ['flags', 'capitals', 'countries', 'population', 'independence'];

export function normalizeDomain(value) {
  return String(value || '').trim().replace(/\/+$/, '');
}

export function normalizeAdsClient(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const pub = raw.replace(/^ca-/, '');
  return /^pub-[0-9A-Za-z]+$/.test(pub) ? pub : '';
}

function countryPath(lang, country) {
  return `/${lang}/atlas/${country.id.toLowerCase()}/`;
}

/** All indexable pages, with their language alternates. */
export function buildSeoEntries() {
  const entries = [];
  const homeAlternates = LANGS.map((l) => `/${l}/`);
  entries.push({ path: '/', priority: '0.9', alternates: homeAlternates });

  for (const lang of LANGS) {
    const pages = [
      [`/${lang}/`, '1.0'],
      ...MODE_IDS.map((id) => [`/${lang}/${id}/`, '0.9']),
      [`/${lang}/atlas/`, '0.9'],
      [`/${lang}/guides/`, '0.7'],
      [`/${lang}/guides/how-to-play/`, '0.7'],
      [`/${lang}/guides/flags-of-the-world/`, '0.7'],
      [`/${lang}/about/`, '0.5'],
      [`/${lang}/privacy/`, '0.3'],
      [`/${lang}/terms/`, '0.3'],
      [`/${lang}/contact/`, '0.3'],
    ];
    for (const country of COUNTRIES) pages.push([countryPath(lang, country), '0.6']);

    for (const [p, priority] of pages) {
      const basePath = p.replace(/^\/[a-z]{2}\//, '');
      entries.push({
        path: p,
        priority,
        alternates: LANGS.map((l) => `/${l}/${basePath}`),
      });
    }
  }
  return entries;
}

function xmlEscape(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[ch]));
}

export function renderSitemap(domain, entries = buildSeoEntries(), today = new Date().toISOString().slice(0, 10)) {
  const base = normalizeDomain(domain);
  const lines = entries.map(({ path: p, priority, alternates }) => {
    const loc = `${base}${p}`;
    const links = LANGS.map((l, i) =>
      `<xhtml:link rel="alternate" hreflang="${LOCALES[l]}" href="${base}${alternates[i]}"/>`,
    ).join('');
    const xDefault = `<xhtml:link rel="alternate" hreflang="x-default" href="${base}${p === '/' ? '/en/' : alternates[LANGS.indexOf('en')]}"/>`;
    return `<url><loc>${xmlEscape(loc)}</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>${priority}</priority>${links}${xDefault}</url>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${lines.join('\n')}\n</urlset>\n`;
}

export function renderRobots(domain) {
  const base = normalizeDomain(domain);
  return `# GEOQUEST robots.txt\nUser-agent: *\nAllow: /\n\n# The game shell at /play/ is intentionally noindex; the atlas and guides are indexable.\nSitemap: ${base}/sitemap.xml\n`;
}

export function renderAdsTxt(client) {
  const pub = normalizeAdsClient(client);
  if (!pub) {
    return `# Add your AdSense publisher ID to site.config.json (adsense.client) and rebuild.\n# Example:\n# google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0\n`;
  }
  return `# Google AdSense\n# https://support.google.com/adsense/answer/12171612\ngoogle.com, ${pub}, DIRECT, f08c47fec0942fa0\n`;
}

export function writeSeoFiles({
  domain = 'https://navpage.win',
  adsClient = '',
  outDir = path.resolve('dist'),
  today = new Date().toISOString().slice(0, 10),
} = {}) {
  const base = normalizeDomain(domain);
  if (!/^https?:\/\/[^/]+$/.test(base)) throw new Error(`Invalid domain: ${domain}`);
  const entries = buildSeoEntries();
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'sitemap.xml'), renderSitemap(base, entries, today));
  fs.writeFileSync(path.join(outDir, 'robots.txt'), renderRobots(base));
  fs.writeFileSync(path.join(outDir, 'ads.txt'), renderAdsTxt(adsClient));
  return { domain: base, pages: entries.length, adsClient: normalizeAdsClient(adsClient) ? 'configured' : 'placeholder', outDir };
}
