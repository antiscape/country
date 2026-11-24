#!/usr/bin/env node
/* Build the SEO content site + a production copy of the game app.
   Output: dist/
   - /{zh,en,es,fr}/...   static, server-rendered HTML
   - /play/               the existing vanilla game SPA
   - sitemap.xml, robots.txt, ads.txt
*/
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { COUNTRIES, REGIONS, BY_ID } from '../js/data.js';
import { MODES, MODE_ORDER, LEVELS } from '../js/modes.js';
import { icon } from '../js/icons.js';
import { SITE } from '../site/content.mjs';
import { writeSeoFiles } from './seo_files.mjs';
import { factsFor, isCurated } from '../site/country-facts.mjs';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const DIST = path.join(ROOT, 'dist');
const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'site.config.json'), 'utf8'));
const BASE = String(process.env.SITE_BASE_URL || config.baseUrl || 'https://geoquest.example').replace(/\/+$/, '');
const EMAIL = config.contactEmail || 'hello@geoquest.example';
const ADS = config.adsense || {};
const TODAY = new Date().toISOString().slice(0, 10);
const UPDATED = String(config.contentUpdated || TODAY);
const LANGS = ['zh', 'en', 'es', 'fr'];
const LOCALES = { zh: 'zh-CN', en: 'en-US', es: 'es-ES', fr: 'fr-FR' };
const OG_LOCALES = { zh: 'zh_CN', en: 'en_US', es: 'es_ES', fr: 'fr_FR' };

function esc(value = '') {
  return String(value).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}
function attrs(value = '') { return esc(value).replace(/\n/g, ' '); }
function format(text, vars = {}) {
  return String(text).replace(/\{(\w+)\}/g, (m, key) => (vars[key] !== undefined ? vars[key] : m));
}
function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
function logoMark() {
  return `<svg class="brand-mark" viewBox="0 0 64 64" aria-hidden="true">
    <circle cx="32" cy="32" r="25" fill="none" stroke="currentColor" stroke-width="1.6" opacity=".38"/>
    <ellipse cx="32" cy="32" rx="11.5" ry="25" fill="none" stroke="currentColor" stroke-width="1.6" opacity=".55"/>
    <path d="M8 24h48M8 40h48" fill="none" stroke="currentColor" stroke-width="1.4" opacity=".4"/>
    <path d="M32 7.5 36.7 22 51 26.7 36.7 31.4 32 46l-4.7-14.6L13 26.7 27.3 22z" fill="currentColor"/>
    <circle cx="32" cy="32" r="2.3" fill="#07111f"/>
  </svg>`;
}
function countryName(c, lang) {
  if (lang === 'zh') return c.nameZh;
  if (lang === 'es') return c.nameEs || c.name;
  if (lang === 'fr') return c.nameFr || c.name;
  return c.name;
}
// English short names that take a definite article in running text.
const EN_ARTICLE = new Set(['US', 'GB', 'NL', 'PH', 'AE', 'DO', 'BS', 'GM', 'MV', 'CD', 'CG', 'CF', 'KM', 'SC', 'SB', 'VC', 'KN']);
function nameInSentence(c, lang) {
  const name = countryName(c, lang);
  if (lang === 'en' && EN_ARTICLE.has(c.id)) return `the ${name}`;
  return name;
}
function sentenceStart(value) {
  const s = String(value || '');
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function capitalName(c, lang) {
  if (lang === 'zh') return c.capitalZh;
  if (lang === 'es') return c.capitalEs || c.capital;
  if (lang === 'fr') return c.capitalFr || c.capital;
  return c.capital;
}
function regionName(c, lang) {
  if (lang === 'zh') return c.regionZh;
  if (lang === 'en') return c.regionEn || c.region;
  if (lang === 'es') return c.regionEs;
  if (lang === 'fr') return c.regionFr;
  return c.region;
}
function subregionName(c, lang) {
  if (lang === 'zh') return c.subregionZh;
  if (lang === 'es') return c.subregionEs;
  if (lang === 'fr') return c.subregionFr;
  return c.subregion;
}
function regionLabel(r, lang) { return r[lang] || r.en; }
function modeField(m, field, lang) {
  const suffix = { zh: 'Zh', en: 'En', es: 'Es', fr: 'Fr' }[lang] || 'En';
  return m[`${field}${suffix}`] || m[`${field}En`];
}
function fmtNum(n, lang) {
  const locale = LOCALES[lang];
  if (lang === 'zh') {
    if (n >= 1e8) return `${(n / 1e8).toFixed(n >= 1e9 ? 2 : 1).replace(/\.0$/, '')} 亿`;
    if (n >= 1e4) return `${Math.round(n / 1e4).toLocaleString('zh-CN')} 万`;
    return n.toLocaleString('zh-CN');
  }
  if (lang === 'es') {
    if (n >= 1e9) return `${(n / 1e9).toLocaleString(locale, { maximumFractionDigits: 2 })} mil millones`;
    if (n >= 1e6) return `${(n / 1e6).toLocaleString(locale, { maximumFractionDigits: 2 })} M`;
    if (n >= 1e3) return `${(n / 1e3).toLocaleString(locale, { maximumFractionDigits: 1 })} mil`;
    return n.toLocaleString(locale);
  }
  if (lang === 'fr') {
    if (n >= 1e9) return `${(n / 1e9).toLocaleString(locale, { maximumFractionDigits: 2 })} Md`;
    if (n >= 1e6) return `${(n / 1e6).toLocaleString(locale, { maximumFractionDigits: 2 })} M`;
    if (n >= 1e3) return `${(n / 1e3).toLocaleString(locale, { maximumFractionDigits: 1 })} k`;
    return n.toLocaleString(locale);
  }
  if (n >= 1e9) return `${(n / 1e9).toFixed(2).replace(/\.00$/, '')}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1e3) return `${Math.round(n / 1e3)}K`;
  return String(n);
}
function fmtFull(n, lang) { return Number(n).toLocaleString(LOCALES[lang]); }
function fmtArea(c, lang) {
  if (lang === 'zh') return c.areaTextZh;
  if (lang === 'es') return c.area >= 1e6
    ? `${(c.area / 1e6).toLocaleString('es-ES', { maximumFractionDigits: 1 })} millones de km²`
    : `${c.area.toLocaleString('es-ES', { maximumFractionDigits: c.area < 10 ? 2 : 0 })} km²`;
  if (lang === 'fr') return c.area >= 1e6
    ? `${(c.area / 1e6).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} millions de km²`
    : `${c.area.toLocaleString('fr-FR', { maximumFractionDigits: c.area < 10 ? 2 : 0 })} km²`;
  return `${c.area < 1 ? c.area.toFixed(2) : Math.round(c.area).toLocaleString('en-US')} km²`;
}
function fmtDate(iso, lang) {
  if (!iso) return '—';
  const d = new Date(`${iso}T12:00:00`);
  return new Intl.DateTimeFormat(LOCALES[lang], { year: 'numeric', month: 'long', day: 'numeric' }).format(d);
}
function factText(c, lang) {
  if (lang === 'zh') return c.factZh || `${countryName(c, lang)}位于${c.subregionZh}，面积约${c.areaTextZh}，人口约${fmtNum(c.population, lang)}。`;
  if (lang === 'es') return `Se encuentra en ${c.subregionEs || c.subregion}. Su capital es ${c.capitalEs || c.capital}, su superficie es de ${fmtArea(c, lang)} y su población ronda los ${fmtNum(c.population, lang)}.`;
  if (lang === 'fr') return `Situé en ${c.subregionFr || c.subregion}, il couvre ${fmtArea(c, lang)} et compte environ ${fmtNum(c.population, lang)} habitants. Sa capitale est ${c.capitalFr || c.capital}.`;
  return `${countryName(c, lang)} is in ${c.subregion}. Its capital is ${c.capital}, it covers ${fmtArea(c, lang)} and has a population of about ${fmtNum(c.population, lang)}.`;
}
function langPath(lang, sub = '') { return `/${lang}/${sub}`; }
function absUrl(p) { return `${BASE}${p}`; }
function playUrl(lang, mode = '') { return `/play/?lang=${lang}${mode ? `&mode=${mode}` : ''}`; }
function atlasPath(lang) { return langPath(lang, 'atlas/'); }
function countryPath(lang, c) { return langPath(lang, `atlas/${c.id.toLowerCase()}/`); }
function modePath(lang, mode) { return langPath(lang, `${mode}/`); }
function guidePath(lang, slug) { return langPath(lang, `guides/${slug}/`); }
function legalPath(lang, type) { return langPath(lang, `${type}/`); }

function pageHead({
  lang, pathName, title, description, image = '/assets/icon-512.png', jsonld = [], noindex = false,
}) {
  const canonical = absUrl(pathName);
  const alternates = LANGS.map((l) => `<link rel="alternate" hreflang="${LOCALES[l]}" href="${absUrl(`/${l}/${pathName.replace(/^\/[a-z]{2}\//, '')}`)}">`).join('\n');
  const xDefault = `<link rel="alternate" hreflang="x-default" href="${absUrl(`/en/${pathName.replace(/^\/[a-z]{2}\//, '')}`)}">`;
  const ogImage = image.startsWith('http') ? image : absUrl(image);
  const json = jsonld.map((obj) => `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`).join('\n');
  const ga = '';
  return `<!doctype html>
<html lang="${LOCALES[lang]}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${attrs(description)}">
<meta name="robots" content="${noindex ? 'noindex,follow' : 'index,follow,max-image-preview:large'}">
<link rel="canonical" href="${canonical}">
${alternates}
${xDefault}
<meta property="og:type" content="${pathName.includes('/atlas/') && pathName.split('/').filter(Boolean).length >= 3 ? 'article' : 'website'}">
<meta property="og:site_name" content="GEOQUEST">
<meta property="og:locale" content="${OG_LOCALES[lang]}">
<meta property="og:title" content="${attrs(title)}">
<meta property="og:description" content="${attrs(description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${ogImage}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${attrs(title)}">
<meta name="twitter:description" content="${attrs(description)}">
<meta name="twitter:image" content="${ogImage}">
<meta name="theme-color" content="#07111f">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/assets/icon-192.png">
<link rel="stylesheet" href="/css/base.css">
<link rel="stylesheet" href="/css/site.css">
${adsenseHead()}
${ga}
${json}
</head>`;
}

function siteHeader(lang, active, pathName) {
  const t = SITE[lang];
  const pathWithoutLang = pathName.replace(/^\/[a-z]{2}\//, '');
  const navItems = [
    ['modes', `/${lang}/#modes`, t.nav.modes],
    ['atlas', atlasPath(lang), t.nav.atlas],
    ['guides', langPath(lang, 'guides/'), t.nav.guides],
    ['about', legalPath(lang, 'about'), t.nav.about],
  ];
  const langLinks = LANGS.map((l) => `<a href="/${l}/${pathWithoutLang}" class="${l === lang ? 'on' : ''}" data-set-lang="${l}">${SITE[l].label}<span>${l.toUpperCase()}</span></a>`).join('');
  return `<header class="site-header">
  <div class="site-wrap site-header-inner">
    <a class="site-brand" href="/${lang}/" aria-label="GEOQUEST">
      ${logoMark()}
      <span class="site-brand-text"><span class="site-brand-en">GEOQUEST</span><span class="site-brand-sub">${esc(t.brandSub)}</span></span>
    </a>
    <nav class="site-nav" aria-label="Main">
      ${navItems.map(([key, href, label]) => `<a href="${href}" class="${active === key ? 'active' : ''}">${esc(label)}</a>`).join('')}
    </nav>
    <div class="site-header-right">
      <details class="lang-menu">
        <summary>${esc(t.label)} ${icon('chevron-down')}</summary>
        <div class="lang-list">${langLinks}</div>
      </details>
      <a class="btn btn-primary" href="${playUrl(lang)}">${esc(t.common.play)} ${icon('play')}</a>
    </div>
  </div>
  <nav class="site-mobile-nav" aria-label="Mobile">
    ${navItems.map(([key, href, label]) => `<a href="${href}" class="${active === key ? 'active' : ''}">${esc(label)}</a>`).join('')}
    <a class="site-mobile-play" href="${playUrl(lang)}">${esc(t.common.play)}</a>
  </nav>
</header>`;
}

function siteFooter(lang) {
  const t = SITE[lang];
  return `<footer class="site-footer">
  <div class="site-wrap">
    <div class="site-footer-grid">
      <div>
        <a class="site-brand" href="/${lang}/">
          ${logoMark()}
          <span class="site-brand-text"><span class="site-brand-en">GEOQUEST</span><span class="site-brand-sub">${esc(t.brandSub)}</span></span>
        </a>
        <p>${esc(t.footer.tagline)}</p>
      </div>
      <div><h4>${esc(t.nav.modes)}</h4><ul>${MODE_ORDER.map((id) => `<li><a href="${modePath(lang, id)}">${esc(modeField(MODES[id], 'name', lang))}</a></li>`).join('')}</ul></div>
      <div><h4>${esc(t.nav.atlas)}</h4><ul>
        <li><a href="${atlasPath(lang)}">${esc(t.nav.atlas)}</a></li>
        <li><a href="${langPath(lang, 'guides/')}">${esc(t.nav.guides)}</a></li>
        <li><a href="${playUrl(lang)}">${esc(t.common.play)}</a></li>
      </ul></div>
      <div><h4>${esc(t.legal.aboutTitle)}</h4><ul>
        <li><a href="${legalPath(lang, 'about')}">${esc(t.legal.aboutTitle)}</a></li>
        <li><a href="${legalPath(lang, 'privacy')}">${esc(t.legal.privacyTitle)}</a></li>
        <li><a href="${legalPath(lang, 'terms')}">${esc(t.legal.termsTitle)}</a></li>
        <li><a href="${legalPath(lang, 'contact')}">${esc(t.legal.contactTitle)}</a></li>
        <li><a href="/?choose=1">${esc(t.languageTitle)}</a></li>
        ${ADS.enabled && ADS.client ? `<li><button type="button" class="linklike" data-consent-open>${esc(t.common.cookieSettings)}</button></li>` : ''}
      </ul></div>
    </div>
    <div class="site-footer-bottom">
      <span>${esc(t.footer.data)}</span>
      <span>${esc(t.footer.rights)}</span>
    </div>
  </div>
</footer>`;
}

function adsenseHead() {
  if (!ADS.enabled || !ADS.client) return '';
  const client = encodeURIComponent(ADS.client);
  // The AdSense tag must be in the served HTML so AdSense can verify the site
  // and so Auto ads can run. Consent gating happens through Consent Mode, not
  // by hiding the tag.
  const tag = `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}" crossorigin="anonymous"></script>`;
  // A Google-certified CMP (Funding Choices) sets consent itself, so adding our
  // own defaults on top of it would fight the CMP. Only emit them for the
  // built-in banner.
  if (String(ADS.cmp || 'custom') === 'google') return tag;
  const defaults = `<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('consent','default',{'ad_storage':'denied','ad_user_data':'denied','ad_personalization':'denied','analytics_storage':'denied','wait_for_update':500});</script>`;
  return `${defaults}
${tag}`;
}

function adSlot(lang, key, format = 'auto') {
  if (!ADS.enabled || !ADS.client) return '';
  const slot = ADS.slots?.[key] || ADS.slots?.home;
  if (!slot) return '';
  return `<div class="ad-slot" data-format="${format}">
    <span class="ad-label">${esc(SITE[lang].common.ad)}</span>
    <ins class="adsbygoogle" style="display:block" data-ad-client="${attrs(ADS.client)}" data-ad-slot="${attrs(slot)}" data-ad-format="auto" data-full-width-responsive="true"></ins>
  </div>`;
}

function page(lang, pathName, title, description, body, opts = {}) {
  const head = pageHead({ lang, pathName, title, description, image: opts.image, jsonld: opts.jsonld, noindex: opts.noindex });
  return `${head}
<body class="site-body">
<a class="site-skip" href="#main">Skip to content</a>
${siteHeader(lang, opts.active || '', pathName)}
<main id="main">${body}</main>
${siteFooter(lang)}
<script>window.__SITE_CONFIG__=${JSON.stringify({ baseUrl: BASE, adsense: ADS }).replace(/</g, '\\u003c')};</script>
<script src="/js/site.js" defer></script>
</body>
</html>`;
}

function crumb(lang, items) {
  return `<div class="site-wrap"><nav class="site-breadcrumbs" aria-label="Breadcrumb">${items.map(([label, href], i) => `${i ? '<span class="sep">/</span>' : ''}${href ? `<a href="${href}">${esc(label)}</a>` : `<span>${esc(label)}</span>`}`).join('')}</nav></div>`;
}

function countryCard(c, lang) {
  const search = [c.name, c.nameZh, c.nameEs, c.nameFr, c.capital, c.capitalZh, c.capitalEs, c.capitalFr, c.id].join(' ').toLowerCase();
  return `<a class="site-country-card" href="${countryPath(lang, c)}" data-country-card data-region="${c.region}" data-search="${attrs(search)}">
    <span class="flag"><img src="${c.flag}" alt="${attrs(countryName(c, lang))} flag" loading="lazy" width="320" height="180"></span>
    <span><b>${esc(countryName(c, lang))}</b><br><span>${esc(capitalName(c, lang))}</span></span>
    <span class="meta"><span>${esc(regionLabel(REGIONS.find((r) => r.id === c.region), lang))}</span><span class="pop">${fmtNum(c.population, lang)}</span></span>
  </a>`;
}

function modeCard(m, lang, feature = false) {
  const flags = feature ? `<span class="mode-flag-strip"><img src="/assets/flags/us.png" alt=""><img src="/assets/flags/br.png" alt=""><img src="/assets/flags/jp.png" alt=""><img src="/assets/flags/fr.png" alt=""></span>` : '';
  return `<a class="site-mode-card ${feature ? 'feature' : ''}" href="${modePath(lang, m.id)}" style="--accent:${m.accent}">
    <span class="mode-icon">${icon(m.icon)}</span>
    ${flags}
    <h3>${esc(modeField(m, 'name', lang))}</h3>
    <p>${esc(modeField(m, 'desc', lang))}</p>
    <span class="mode-cta">${esc(SITE[lang].common.playMode)} ${icon('arrow-right')}</span>
  </a>`;
}

/* ---------------- pages ---------------- */
function homePage(lang) {
  const t = SITE[lang];
  const h = t.home;
  const popular = ['US', 'BR', 'JP', 'FR', 'ZA', 'EG'].map((id) => BY_ID[id]).filter(Boolean);
  const body = `<section class="site-hero site-wrap">
  <div>
    <div class="site-eyebrow">${esc(h.eyebrow)}</div>
    <h1 class="site-h1">${esc(h.title)}</h1>
    <p class="site-lead">${esc(h.lead)}</p>
    <div class="site-actions">
      <a class="btn btn-primary" href="${playUrl(lang)}">${icon('play')}${esc(h.cta)}</a>
      <a class="btn btn-ghost" href="${atlasPath(lang)}">${icon('book')}${esc(h.secondary)}</a>
    </div>
    <div class="site-stats">${h.stats.map(([n, label]) => `<div class="site-stat"><b>${esc(n)}</b><span>${esc(label)}</span></div>`).join('')}</div>
  </div>
  <div class="site-hero-visual">
    <div class="site-glow"></div>
    <div class="site-globe"><img src="/assets/world-map.svg" alt=""></div>
    <span class="site-orbit f1"><img src="/assets/flags/us.png" alt=""></span>
    <span class="site-orbit f2"><img src="/assets/flags/br.png" alt=""></span>
    <span class="site-orbit f3"><img src="/assets/flags/jp.png" alt=""></span>
    <span class="site-orbit f4"><img src="/assets/flags/fr.png" alt=""></span>
  </div>
</section>
<div class="site-wrap">${adSlot(lang, 'home')}</div>
<section class="site-section site-wrap" id="modes">
  <div class="site-section-head"><div><div class="site-eyebrow">${esc(t.common.modes)}</div><h2 class="site-h2">${esc(h.modesTitle)}</h2><p>${esc(h.modesLead)}</p></div><a class="site-link" href="${playUrl(lang)}">${esc(t.common.play)} ${icon('arrow-right')}</a></div>
  <div class="site-mode-grid">${MODE_ORDER.map((id, i) => modeCard({ ...MODES[id], id }, lang, i === 0)).join('')}</div>
</section>
${adSlot(lang, 'home')}
<section class="site-section site-wrap">
  <div class="site-section-head"><div><div class="site-eyebrow">GEOQUEST</div><h2 class="site-h2">${esc(h.whyTitle)}</h2></div></div>
  <div class="site-why-grid">${h.why.map(([title, text], i) => `<div class="site-why">${icon(['target', 'refresh', 'map'][i] || 'sparkle')}<h3>${esc(title)}</h3><p>${esc(text)}</p></div>`).join('')}</div>
</section>
<section class="site-section site-wrap">
  <div class="site-section-head"><div><div class="site-eyebrow">${esc(t.common.countries)}</div><h2 class="site-h2">${esc(h.popularTitle)}</h2><p>${esc(h.popularLead)}</p></div><a class="site-link" href="${atlasPath(lang)}">${esc(t.common.exploreAtlas)} ${icon('arrow-right')}</a></div>
  <div class="site-country-grid">${popular.map((c) => countryCard(c, lang)).join('')}</div>
</section>
<section class="site-section site-wrap">
  <div class="site-cta">
    ${icon('book')}
    <div><h2>${esc(h.atlasTitle)}</h2><p>${esc(h.atlasLead)}</p></div>
    <a class="btn btn-ghost" href="${atlasPath(lang)}">${esc(t.common.exploreAtlas)} ${icon('arrow-right')}</a>
  </div>
</section>`;
  const title = `${t.home.title} | GEOQUEST`;
  const jsonld = [
    { '@context': 'https://schema.org', '@type': 'WebSite', name: 'GEOQUEST', url: absUrl(`/${lang}/`), inLanguage: LOCALES[lang] },
    { '@context': 'https://schema.org', '@type': 'WebApplication', name: 'GEOQUEST', applicationCategory: 'GameApplication', operatingSystem: 'Any', url: absUrl(`/${lang}/`), inLanguage: LOCALES[lang], offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' }, description: t.home.lead },
  ];
  return page(lang, `/${lang}/`, title, h.lead, body, { active: '', jsonld, image: '/assets/icon-512.png' });
}

function modePage(lang, id) {
  const t = SITE[lang];
  const m = MODES[id];
  const copy = t.modes[id];
  const samples = {
    flags: ['US', 'BR', 'JP', 'FR', 'ZA', 'IN'],
    capitals: ['FR', 'JP', 'EG', 'BR', 'CA', 'IN'],
    countries: ['AU', 'CA', 'FR', 'JP', 'BR', 'ZA'],
    population: ['CN', 'IN', 'US', 'ID', 'BR', 'NG'],
    independence: ['US', 'MX', 'BR', 'IN', 'ZA', 'EG'],
  }[id].map((x) => BY_ID[x]).filter(Boolean);
  const related = MODE_ORDER.filter((x) => x !== id).slice(0, 2);
  const body = `${crumb(lang, [[t.common.home, `/${lang}/`], [t.nav.modes, `/${lang}/#modes`], [modeField(m, 'name', lang), null]])}
<section class="site-hero site-wrap" style="padding-top:32px;padding-bottom:12px">
  <div>
    <div class="site-eyebrow">${esc(modeField(m, 'tag', lang))}</div>
    <h1 class="site-h1">${esc(modeField(m, 'name', lang))}</h1>
    <p class="site-lead">${esc(copy.intro)}</p>
    <div class="site-actions">
      <a class="btn btn-primary" href="${playUrl(lang, id)}">${icon('play')}${esc(t.modePage.play)}</a>
      <a class="btn btn-ghost" href="${atlasPath(lang)}">${icon('book')}${esc(t.common.exploreAtlas)}</a>
    </div>
  </div>
  <div class="site-hero-visual" style="min-height:250px">
    <div class="site-glow"></div>
    <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center">${samples.slice(0, 4).map((c) => `<img src="${c.flag}" alt="${attrs(countryName(c, lang))} flag" style="width:120px;height:78px;object-fit:contain;border-radius:8px;border:1px solid var(--line-2);background:#071420">`).join('')}</div>
  </div>
</section>
${adSlot(lang, 'mode')}
<section class="site-section tight site-wrap">
  <div class="site-section-head"><h2 class="site-h2">${esc(t.modePage.howTitle)}</h2></div>
  <div class="site-why-grid">${t.how.steps.map(([title, text], i) => `<div class="site-why">${icon(['route', 'eye', 'target', 'sparkle'][i] || 'sparkle')}<h3>${esc(title)}</h3><p>${esc(text)}</p></div>`).join('')}</div>
</section>
<section class="site-section tight site-wrap">
  <div class="site-section-head"><div><h2 class="site-h2">${esc(t.modePage.levels)}</h2><p>${esc(t.how.levelsBody)}</p></div></div>
  <div class="site-region-chips">${LEVELS.map((l) => `<span class="chip">${esc(l[lang] || l.en)}</span>`).join('')}</div>
</section>
<section class="site-section tight site-wrap">
  <div class="site-section-head"><div><h2 class="site-h2">${esc(t.modePage.faqTitle)}</h2></div></div>
  <div class="faq-list">${t.modePage.faq.map(([q, a]) => `<details class="faq-item"><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</div>
</section>
<section class="site-section tight site-wrap">
  <div class="site-section-head"><div><h2 class="site-h2">${esc(t.modePage.sample)}</h2></div><a class="site-link" href="${atlasPath(lang)}">${esc(t.common.exploreAtlas)} ${icon('arrow-right')}</a></div>
  <div class="site-country-grid">${samples.map((c) => countryCard(c, lang)).join('')}</div>
</section>
${adSlot(lang, 'mode')}
<section class="site-section tight site-wrap">
  <div class="site-section-head"><h2 class="site-h2">${esc(t.common.allModes)}</h2></div>
  <div class="site-mode-grid">${related.map((x) => modeCard({ ...MODES[x], id: x }, lang)).join('')}</div>
</section>`;
  const title = `${modeField(m, 'name', lang)} — ${copy.tagline} | GEOQUEST`;
  const jsonld = [
    { '@context': 'https://schema.org', '@type': 'WebPage', name: title, url: absUrl(modePath(lang, id)), description: copy.intro, inLanguage: LOCALES[lang] },
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: t.modePage.faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: t.common.home, item: absUrl(`/${lang}/`) },
      { '@type': 'ListItem', position: 2, name: modeField(m, 'name', lang), item: absUrl(modePath(lang, id)) },
    ] },
  ];
  return page(lang, modePath(lang, id), title, copy.intro, body, { active: 'modes', jsonld, image: samples[0].flag });
}

function atlasPage(lang) {
  const t = SITE[lang];
  const groups = REGIONS.filter((r) => r.id !== 'world').map((r) => ({
    r, list: COUNTRIES.filter((c) => c.region === r.id).sort((a, b) => countryName(a, lang).localeCompare(countryName(b, lang), LOCALES[lang])),
  }));
  const body = `${crumb(lang, [[t.common.home, `/${lang}/`], [t.nav.atlas, null]])}
<section class="site-section tight site-wrap">
  <div class="site-eyebrow">${esc(t.atlas.eyebrow)}</div>
  <h1 class="site-h1" style="font-size:clamp(34px,4.6vw,56px)">${esc(t.atlas.title)}</h1>
  <p class="site-lead">${esc(t.atlas.lead)}</p>
  <div class="site-atlas-toolbar">
    <div class="site-atlas-search">${icon('search')}<input type="search" data-atlas-search placeholder="${attrs(t.atlas.search)}" aria-label="${attrs(t.atlas.search)}"></div>
    <div class="site-region-chips"><button class="on" data-region-filter="world">${esc(t.atlas.all)}</button>${REGIONS.filter((r) => r.id !== 'world').map((r) => `<button data-region-filter="${r.id}">${esc(regionLabel(r, lang))}</button>`).join('')}</div>
  </div>
  <div class="site-atlas-count">${esc(t.atlas.showing)} <b data-atlas-count>${COUNTRIES.length}</b> ${esc(t.atlas.countLabel)}</div>
  ${adSlot(lang, 'atlas')}
  <p class="site-empty" data-atlas-empty hidden style="color:var(--muted);padding:20px 0">${esc(t.atlas.empty)}</p>
  ${groups.map(({ r, list }) => `<section class="site-region-block" data-region-block><h2>${esc(regionLabel(r, lang))} <span>${list.length} ${esc(t.atlas.countLabel)}</span></h2><div class="site-country-grid">${list.map((c) => countryCard(c, lang)).join('')}</div></section>`).join('')}
  <div class="site-cta">${icon('play')}<div><h2>${esc(t.atlas.playTitle)}</h2><p>${esc(t.atlas.playLead)}</p></div><a class="btn btn-primary" href="${playUrl(lang)}">${esc(t.common.play)} ${icon('arrow-right')}</a></div>
</section>`;
  const title = `${t.atlas.title} | GEOQUEST`;
  const jsonld = [
    { '@context': 'https://schema.org', '@type': 'CollectionPage', name: t.atlas.title, url: absUrl(atlasPath(lang)), description: t.atlas.lead, inLanguage: LOCALES[lang] },
    { '@context': 'https://schema.org', '@type': 'ItemList', itemListElement: COUNTRIES.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: countryName(c, lang), url: absUrl(countryPath(lang, c)) })) },
  ];
  return page(lang, atlasPath(lang), title, t.atlas.lead, body, { active: 'atlas', jsonld, image: '/assets/world-map.svg' });
}

function countryPage(lang, c) {
  const t = SITE[lang];
  const name = countryName(c, lang);
  const cap = capitalName(c, lang);
  const reg = regionName(c, lang);
  const sub = subregionName(c, lang);
  const sentenceName = nameInSentence(c, lang);
  const subject = sentenceStart(sentenceName);
  const intro = format(t.country.intro, { name: subject, region: reg, capital: cap, pop: fmtNum(c.population, lang), area: fmtArea(c, lang) });
  const vars = { name: sentenceName, capital: cap, region: reg, subregion: sub, pop: fmtNum(c.population, lang) };
  const faq = t.country.faq.map(([q, a], i) => {
    // "more precisely in North America" repeated the region for countries whose
    // subregion equals the region. Use the subregion only when it adds detail.
    if (i === 2) {
      const where = sub && sub !== reg ? t.country.whereSub : t.country.whereRegion;
      return [format(q, vars), sentenceStart(format(where, vars))];
    }
    return [format(q, vars), format(a, { ...vars, capital: cap.replace(/\.+$/, '') })];
  });
  const highlights = factsFor(c.id, lang);
  const indexable = isCurated(c.id);
  const related = COUNTRIES.filter((x) => x.region === c.region && x.id !== c.id).sort((a, b) => b.population - a.population).slice(0, 6);
  const independence = c.independence ? fmtDate(c.independence, lang) : '—';
  const borders = c.borders ? `${c.borders}${lang === 'zh' ? ' 个' : ''}` : (lang === 'zh' ? '无' : lang === 'es' ? 'Ninguna' : lang === 'fr' ? 'Aucune' : 'None');
  const markerLeft = Math.min(98.5, Math.max(1.5, ((c.lng + 180) / 360) * 100)).toFixed(2);
  const markerTop = Math.min(98, Math.max(2, ((90 - c.lat) / 180) * 100)).toFixed(2);
  const body = `${crumb(lang, [[t.common.home, `/${lang}/`], [t.nav.atlas, atlasPath(lang)], [name, null]])}
<section class="site-wrap country-hero">
  <div class="country-flag-large"><img src="${c.flag}" alt="${attrs(name)} flag" width="320" height="180"></div>
  <div>
    <div class="site-eyebrow">${esc(t.country.eyebrow)} · ${esc(reg)}</div>
    <h1>${esc(name)}</h1>
    <p class="lead">${esc(intro)}</p>
    <div class="site-actions"><a class="btn btn-primary" href="${playUrl(lang, 'flags')}">${icon('play')}${esc(format(t.country.playTitle, { name: subject }))}</a><a class="btn btn-ghost" href="${atlasPath(lang)}">${icon('arrow-left')}${esc(t.country.atlasBack)}</a></div>
    <div class="country-map"><img src="/assets/world-map.svg" alt=""><span class="map-pin" style="left:${markerLeft}%;top:${markerTop}%"></span></div>
  </div>
</section>
<section class="site-wrap">
  <div class="country-facts">
    <div><span>${esc(t.country.capital)}</span><b>${esc(cap)}</b></div>
    <div><span>${esc(t.country.population)}</span><b>${esc(fmtNum(c.population, lang))}</b></div>
    <div><span>${esc(t.country.area)}</span><b>${esc(fmtArea(c, lang))}</b></div>
    <div><span>${esc(t.country.region)}</span><b>${esc(reg)}</b></div>
    <div><span>${esc(t.country.independence)}</span><b>${esc(independence)}</b></div>
    <div><span>${esc(t.country.borders)}</span><b>${esc(borders)}${c.landlocked ? ` · ${lang === 'zh' ? '内陆国' : lang === 'es' ? 'Sin litoral' : lang === 'fr' ? 'Enclavé' : 'Landlocked'}` : ''}</b></div>
    <div><span>${esc(t.country.rank)}</span><b>#${c.populationRank || '—'}</b></div>
    <div><span>ISO</span><b>${esc(c.id)}</b></div>
  </div>
  <div class="country-body">
    <div>
      ${highlights.length
        ? `<div class="site-eyebrow">${esc(t.country.highlightsTitle)}</div>
      <ul class="country-highlights">${highlights.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>`
        : `<div class="site-eyebrow">${esc(t.country.factTitle)}</div>
      <p class="site-lead" style="margin:12px 0 24px">${esc(factText(c, lang))}</p>`}
      <h2 class="site-h2" style="font-size:22px;margin-bottom:12px">${esc(t.country.faqTitle)}</h2>
      <div class="faq-list">${faq.map(([q, a]) => `<details class="faq-item"><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</div>
      ${adSlot(lang, 'country', 'rectangle')}
      <div class="site-section-head" style="margin-top:30px"><h2 class="site-h2" style="font-size:22px">${esc(t.country.relatedTitle)}</h2><a class="site-link" href="${atlasPath(lang)}">${esc(t.country.atlasBack)} ${icon('arrow-right')}</a></div>
      <div class="site-country-grid">${related.map((x) => countryCard(x, lang)).join('')}</div>
    </div>
    <aside class="country-aside">
      <h3>${esc(t.country.playTitle.replace('{name}', subject))}</h3>
      <p>${esc(format(t.country.playLead, { name: subject }))}</p>
      <a class="btn btn-primary btn-block" style="margin-top:14px" href="${playUrl(lang, 'flags')}">${icon('play')}${esc(t.common.play)}</a>
      <a class="btn btn-ghost btn-block" style="margin-top:8px" href="${atlasPath(lang)}">${icon('book')}${esc(t.common.exploreAtlas)}</a>
    </aside>
  </div>
</section>`;
  const title = `${format(t.country.title, { name })} | GEOQUEST`;
  const description = format(t.country.intro, { name: subject, region: reg, capital: cap, pop: fmtNum(c.population, lang), area: fmtArea(c, lang) });
  const jsonld = [
    { '@context': 'https://schema.org', '@type': 'Country', name, url: absUrl(countryPath(lang, c)), description, capital: { '@type': 'City', name: cap }, containedInPlace: { '@type': 'Place', name: reg }, additionalProperty: [
      { '@type': 'PropertyValue', name: 'population', value: c.population },
      { '@type': 'PropertyValue', name: 'area', value: c.area },
    ] },
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: t.common.home, item: absUrl(`/${lang}/`) },
      { '@type': 'ListItem', position: 2, name: t.nav.atlas, item: absUrl(atlasPath(lang)) },
      { '@type': 'ListItem', position: 3, name, item: absUrl(countryPath(lang, c)) },
    ] },
  ];
  return page(lang, countryPath(lang, c), title, description, body, { active: 'atlas', jsonld, image: c.flag, noindex: !indexable });
}

function guideIndexPage(lang) {
  const t = SITE[lang];
  const guides = [
    ['how-to-play', t.guides.howTo, t.guides.howToLead, 'compass'],
    ['flags-of-the-world', t.guides.flags, t.guides.flagsLead, 'flag'],
  ];
  const body = `${crumb(lang, [[t.common.home, `/${lang}/`], [t.nav.guides, null]])}
<section class="site-section tight site-wrap">
  <div class="site-eyebrow">${esc(t.nav.guides)}</div>
  <h1 class="site-h1">${esc(t.guides.title)}</h1>
  <p class="site-lead">${esc(t.guides.lead)}</p>
  <div class="site-why-grid" style="margin-top:28px">${guides.map(([slug, title, lead, ic]) => `<a class="site-why" href="${guidePath(lang, slug)}">${icon(ic)}<h3>${esc(title)}</h3><p>${esc(lead)}</p><span class="site-link" style="margin-top:12px">${esc(t.common.readGuide)} ${icon('arrow-right')}</span></a>`).join('')}</div>
  ${adSlot(lang, 'guide')}
  <div class="site-cta">${icon('play')}<div><h2>${esc(t.home.modesTitle)}</h2><p>${esc(t.home.modesLead)}</p></div><a class="btn btn-primary" href="${playUrl(lang)}">${esc(t.common.play)} ${icon('arrow-right')}</a></div>
</section>`;
  return page(lang, langPath(lang, 'guides/'), `${t.guides.title} | GEOQUEST`, t.guides.lead, body, { active: 'guides', image: '/assets/icon-512.png' });
}

function guidePage(lang, slug) {
  const t = SITE[lang];
  const isHow = slug === 'how-to-play';
  const title = isHow ? t.guides.howTo : t.guides.flags;
  const lead = isHow ? t.guides.howToLead : t.guides.flagsLead;
  const sections = isHow ? t.guides.sections.howTo : t.guides.sections.flags;
  const body = `${crumb(lang, [[t.common.home, `/${lang}/`], [t.nav.guides, langPath(lang, 'guides/')], [title, null]])}
<section class="site-section tight site-wrap"><div class="prose">
  <div class="site-eyebrow">${esc(t.nav.guides)}</div>
  <h1>${esc(title)}</h1>
  <p class="site-lead">${esc(lead)}</p>
  ${sections.map(([h, p]) => `<h2>${esc(h)}</h2><p>${esc(p)}</p>`).join('')}
  ${adSlot(lang, 'guide')}
  <div class="site-cta" style="margin-top:30px">${icon('play')}<div><h2>${esc(t.home.cta)}</h2><p>${esc(t.home.lead)}</p></div><a class="btn btn-primary" href="${playUrl(lang)}">${esc(t.common.play)} ${icon('arrow-right')}</a></div>
</div></section>`;
  const jsonld = [
    { '@context': 'https://schema.org', '@type': 'Article', headline: title, description: lead, inLanguage: LOCALES[lang], mainEntityOfPage: absUrl(guidePath(lang, slug)), author: { '@type': 'Organization', name: 'GEOQUEST' } },
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: t.common.home, item: absUrl(`/${lang}/`) },
      { '@type': 'ListItem', position: 2, name: t.nav.guides, item: absUrl(langPath(lang, 'guides/')) },
      { '@type': 'ListItem', position: 3, name: title, item: absUrl(guidePath(lang, slug)) },
    ] },
  ];
  return page(lang, guidePath(lang, slug), `${title} | GEOQUEST`, lead, body, { active: 'guides', jsonld, image: '/assets/icon-512.png' });
}

function rich(text, vars = {}) {
  const email = vars.email || EMAIL;
  const body = esc(format(text, { ...vars, email: '\u0000EMAIL\u0000' }));
  return body
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, (m, label, url) => `<a href="${url}" rel="noopener noreferrer" target="_blank">${label}</a>`)
    .replace(/\u0000EMAIL\u0000/g, `<a href="mailto:${esc(email)}">${esc(email)}</a>`);
}

function plainText(block) {
  const value = typeof block === 'string' ? block : (block.p || block.h || '');
  return value.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\{email\}/g, EMAIL);
}

function legalPage(lang, type) {
  const t = SITE[lang].legal;
  const map = {
    privacy: [t.privacyTitle, t.privacy],
    terms: [t.termsTitle, t.terms],
    about: [t.aboutTitle, t.about],
    contact: [t.contactTitle, t.contact],
  };
  const [title, blocks] = map[type];
  const body = `${crumb(lang, [[SITE[lang].common.home, `/${lang}/`], [title, null]])}
<section class="site-section tight site-wrap"><div class="prose">
  <div class="site-eyebrow">GEOQUEST</div>
  <h1>${esc(title)}</h1>
  <p class="updated">${esc(SITE[lang].common.updated)} · ${UPDATED}</p>
  ${blocks.map((block) => {
    if (typeof block === 'string') return `<p>${rich(block, { email: EMAIL })}</p>`;
    const heading = block.h ? `<h2>${esc(block.h)}</h2>` : '';
    return `${heading}<p>${rich(block.p || '', { email: EMAIL })}</p>`;
  }).join('')}
  <p style="margin-top:24px"><a href="${playUrl(lang)}">${esc(SITE[lang].common.play)}</a> · <a href="${atlasPath(lang)}">${esc(SITE[lang].nav.atlas)}</a></p>
</div></section>`;
  return page(lang, legalPath(lang, type), `${title} | GEOQUEST`, plainText(blocks[0]), body, { image: '/assets/icon-512.png' });
}

function languageHub() {
  const cards = LANGS.map((l) => `<a href="/${l}/"><span>${esc(SITE[l].label)}</span><small>${l.toUpperCase()}</small></a>`).join('');
  const title = 'GEOQUEST — World geography quiz in 4 languages';
  const desc = 'A free geography quiz in English, Chinese, Spanish and French. Flags, capitals, countries, population and independence days.';
  const alternates = LANGS.map((l) => `<link rel="alternate" hreflang="${LOCALES[l]}" href="${absUrl(`/${l}/`)}">`).join('\n') + `\n<link rel="alternate" hreflang="x-default" href="${absUrl('/en/')}">`;
  const autoLang = `(() => {
    const supported = ['zh', 'en', 'es', 'fr'];
    const params = new URLSearchParams(location.search);
    if (params.get('choose') === '1') return;
    let lang = params.get('lang');
    if (lang !== null) {
      // An explicit but unsupported language falls back to English.
      if (!supported.includes(lang)) lang = 'en';
    } else {
      try { lang = localStorage.getItem('geoquest_lang') || ''; } catch { lang = ''; }
      if (!supported.includes(lang)) {
        const list = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language];
        for (const item of list) {
          const code = String(item || '').toLowerCase().slice(0, 2);
          if (supported.includes(code)) { lang = code; break; }
        }
      }
      if (!supported.includes(lang)) lang = 'en';
    }
    location.replace('/' + lang + '/');
  })();`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><title>${title}</title><meta name="description" content="${desc}"><meta name="robots" content="index,follow"><link rel="canonical" href="${absUrl('/')}">${alternates}<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="/css/base.css"><link rel="stylesheet" href="/css/site.css"><script>${autoLang}</script></head><body class="site-body"><main class="lang-hub"><div class="lang-hub-card">${logoMark()}<h1>GEOQUEST</h1><p>${esc(SITE.en.languageLead)}</p><div class="lang-hub-grid">${cards}</div></div></main></body></html>`;
}

/* ---------------- write ---------------- */
function write(rel, content) {
  const target = path.join(DIST, rel);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}
function copy(src, dest = src) {
  fs.cpSync(path.join(ROOT, src), path.join(DIST, dest), { recursive: true });
}

function main() {
  fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(DIST, { recursive: true });

  write('index.html', languageHub());
  for (const lang of LANGS) {
    write(`${lang}/index.html`, homePage(lang));
    for (const id of MODE_ORDER) write(`${lang}/${id}/index.html`, modePage(lang, id));
    write(`${lang}/atlas/index.html`, atlasPage(lang));
    for (const c of COUNTRIES) write(`${lang}/atlas/${c.id.toLowerCase()}/index.html`, countryPage(lang, c));
    write(`${lang}/guides/index.html`, guideIndexPage(lang));
    write(`${lang}/guides/how-to-play/index.html`, guidePage(lang, 'how-to-play'));
    write(`${lang}/guides/flags-of-the-world/index.html`, guidePage(lang, 'flags-of-the-world'));
    for (const type of ['privacy', 'terms', 'about', 'contact']) write(`${lang}/${type}/index.html`, legalPage(lang, type));
  }

  // Copy the game app and shared assets
  copy('css');
  copy('js');
  copy('assets');
  copy('sw.js');
  fs.mkdirSync(path.join(DIST, 'play'), { recursive: true });
  fs.copyFileSync(path.join(ROOT, 'index.html'), path.join(DIST, 'play', 'index.html'));
  let playHtml = fs.readFileSync(path.join(DIST, 'play', 'index.html'), 'utf8');
  playHtml = playHtml.replace('<title>GEOQUEST 环球地理 · 国旗、首都与人口挑战</title>', '<title>GEOQUEST · Play</title>');
  playHtml = playHtml.replace('</head>', '<meta name="robots" content="noindex,follow">\n</head>');
  write('play/index.html', playHtml);

  // manifest points at the app route
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.webmanifest'), 'utf8'));
  manifest.start_url = '/play/';
  manifest.scope = '/';
  write('manifest.webmanifest', JSON.stringify(manifest, null, 2));

  // service worker: add the app shell to the core cache
  let sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
  sw = sw.replace("'./', './index.html',", "'./', './index.html', './play/', './play/index.html',");
  sw = sw.replace(/const CACHE = 'geoquest-v[0-9]+';/, `const CACHE = 'geoquest-site-${Date.now()}';`);
  write('sw.js', sw);

  // sitemap.xml + robots.txt + ads.txt (shared with npm run seo)
  const seo = writeSeoFiles({ domain: BASE, adsClient: ADS.client, outDir: DIST, today: UPDATED });

  // Cloudflare Pages: headers + redirects + branded 404
  write('_headers', `/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin

/assets/*
  Cache-Control: public, max-age=604800

/css/*
  Cache-Control: public, max-age=3600

/js/*
  Cache-Control: public, max-age=3600

/sw.js
  Cache-Control: no-cache

/*.html
  Cache-Control: public, max-age=0, must-revalidate

/sitemap.xml
  Content-Type: application/xml
`);
  write('_redirects', `/play /play/ 301
/zh /zh/ 301
/en /en/ 301
/es /es/ 301
/fr /fr/ 301
`);
  write('404.html', `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>Page not found | GEOQUEST</title><link rel="icon" href="/assets/favicon.svg"><link rel="stylesheet" href="/css/base.css"><link rel="stylesheet" href="/css/site.css"></head><body class="site-body"><main class="lang-hub"><div class="lang-hub-card">${logoMark()}<h1>404</h1><p>This page doesn't exist. Pick a language or head back to the game.</p><div class="lang-hub-grid"><a href="/en/"><span>English</span><small>EN</small></a><a href="/zh/"><span>中文</span><small>ZH</small></a><a href="/es/"><span>Español</span><small>ES</small></a><a href="/fr/"><span>Français</span><small>FR</small></a><a href="/play/?lang=en"><span>Play GEOQUEST</span><small>→</small></a><a href="/en/atlas/"><span>World atlas</span><small>→</small></a></div></div></main></body></html>`);

  console.log(`Built ${seo.pages} indexable pages in ${path.relative(ROOT, DIST)}/`);
  console.log(`  baseUrl: ${BASE}${BASE.includes('example') ? '  ← change this in site.config.json before deploy' : ''}`);
  console.log(`  AdSense: ${ADS.enabled && ADS.client ? 'enabled' : 'disabled (set adsense.enabled + client + slot IDs)'}`);
  console.log(`  app: /play/ (noindex)`);
}

main();
