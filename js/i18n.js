/* Four-language helper: zh / en / es / fr.
   UI strings are keyed by their English source so the code stays readable. */
import { ES } from './locales/es.js';
import { FR } from './locales/fr.js';

export const LANGS = [
  { id: 'zh', label: '中文', short: '中', locale: 'zh-CN' },
  { id: 'en', label: 'English', short: 'EN', locale: 'en-US' },
  { id: 'es', label: 'Español', short: 'ES', locale: 'es-ES' },
  { id: 'fr', label: 'Français', short: 'FR', locale: 'fr-FR' },
];
const LANG_IDS = new Set(LANGS.map((l) => l.id));
const DICTS = { es: ES, fr: FR };
let current = 'zh';

export function normalizeLang(lang) {
  const v = String(lang || '').toLowerCase().slice(0, 2);
  return LANG_IDS.has(v) ? v : 'zh';
}

export function setLang(lang) {
  current = normalizeLang(lang);
  if (typeof document !== 'undefined') {
    document.documentElement.lang = LANGS.find((l) => l.id === current)?.locale || 'zh-CN';
  }
}

export function getLang() { return current; }
export function isZh() { return current === 'zh'; }
export function locale() {
  return LANGS.find((l) => l.id === current)?.locale || 'en-US';
}

export function interpolate(text, vars) {
  if (!vars) return text;
  return String(text).replace(/\{(\w+)\}/g, (m, key) => (vars[key] !== undefined ? vars[key] : m));
}

/** Pick a bilingual pair, then translate it to es/fr when needed. */
export function t(zh, en, vars) {
  let value;
  if (current === 'zh') value = zh;
  else if (current === 'en') value = en;
  else value = DICTS[current]?.[en] || en;
  return interpolate(value, vars);
}

export function countryName(c) {
  if (current === 'zh') return c.nameZh;
  if (current === 'es') return c.nameEs || c.name;
  if (current === 'fr') return c.nameFr || c.name;
  return c.name;
}

export function capitalName(c) {
  if (current === 'zh') return c.capitalZh;
  if (current === 'es') return c.capitalEs || c.capital;
  if (current === 'fr') return c.capitalFr || c.capital;
  return c.capital;
}

export function altCapital(c) {
  if (current === 'zh') return c.capital;
  if (current === 'en') return c.capitalZh;
  return c.capital;
}

export function regionLabel(r) {
  return r[current] || r.en || r.zh;
}

export function altName(c) {
  if (current === 'zh') return c.name;
  if (current === 'en') return c.nameZh;
  return c.name;
}

export function regionName(c) {
  if (current === 'zh') return c.regionZh;
  if (current === 'en') return c.regionEn || c.region;
  if (current === 'es') return c.regionEs || c.region;
  if (current === 'fr') return c.regionFr || c.region;
  return c.region;
}

export function subregionName(c) {
  if (current === 'zh') return c.subregionZh || c.subregion;
  if (current === 'es') return c.subregionEs || c.subregion;
  if (current === 'fr') return c.subregionFr || c.subregion;
  return c.subregion;
}

export function translate(key, vars) {
  if (current === 'zh') return interpolate(key.zh, vars);
  if (current === 'en') return interpolate(key.en, vars);
  return interpolate(DICTS[current]?.[key.en] || key.en, vars);
}
