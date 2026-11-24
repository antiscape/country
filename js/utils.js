/* Shared utilities: formatting, randomness, DOM shortcuts. */
import {
  getLang, isZh, locale, countryName, capitalName, altName, regionName, subregionName,
} from './i18n.js';

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[ch]));
}

export function flagImg(country, cls = '') {
  return `<img class="${cls}" src="${country.flag}" alt="${escapeHtml(countryName(country))} flag" loading="lazy" decoding="async" draggable="false">`;
}

export { countryName, capitalName, altName, regionName, subregionName };

export function fmtPop(n, full = false) {
  if (!n) return '—';
  const lang = getLang();
  if (full) return Number(n).toLocaleString(locale());
  if (lang === 'zh') {
    if (n >= 1e8) return `${(n / 1e8).toFixed(n >= 1e9 ? 2 : 1).replace(/\.0$/, '')} 亿`;
    if (n >= 1e4) return `${Math.round(n / 1e4).toLocaleString('zh-CN')} 万`;
    return n.toLocaleString('zh-CN');
  }
  if (lang === 'es') {
    if (n >= 1e9) return `${(n / 1e9).toLocaleString('es-ES', { maximumFractionDigits: 2 })} mil millones`;
    if (n >= 1e6) return `${(n / 1e6).toLocaleString('es-ES', { maximumFractionDigits: 2 })} M`;
    if (n >= 1e3) return `${(n / 1e3).toLocaleString('es-ES', { maximumFractionDigits: 1 })} mil`;
    return n.toLocaleString('es-ES');
  }
  if (lang === 'fr') {
    if (n >= 1e9) return `${(n / 1e9).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} Md`;
    if (n >= 1e6) return `${(n / 1e6).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} M`;
    if (n >= 1e3) return `${(n / 1e3).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} k`;
    return n.toLocaleString('fr-FR');
  }
  if (n >= 1e9) return `${(n / 1e9).toFixed(2).replace(/\.00$/, '')}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1e3) return `${Math.round(n / 1e3)}K`;
  return String(n);
}

export function fmtArea(c) {
  const lang = getLang();
  if (lang === 'zh') return c.areaTextZh || `${Math.round(c.area).toLocaleString('zh-CN')} 平方公里`;
  if (lang === 'es') {
    if (c.area >= 1e6) return `${(c.area / 1e6).toLocaleString('es-ES', { maximumFractionDigits: 1 })} millones de km²`;
    return `${c.area.toLocaleString('es-ES', { maximumFractionDigits: c.area < 10 ? 2 : 0 })} km²`;
  }
  if (lang === 'fr') {
    if (c.area >= 1e6) return `${(c.area / 1e6).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} millions de km²`;
    return `${c.area.toLocaleString('fr-FR', { maximumFractionDigits: c.area < 10 ? 2 : 0 })} km²`;
  }
  const rounded = c.area < 1 ? c.area.toFixed(2) : Math.round(c.area).toLocaleString('en-US');
  return `${rounded} km²`;
}

export function fmtAreaShort(c) {
  const lang = getLang();
  if (lang === 'zh') return c.areaTextZh || `${Math.round(c.area).toLocaleString('zh-CN')} 平方公里`;
  if (lang === 'es') {
    if (c.area >= 1e6) return `${(c.area / 1e6).toLocaleString('es-ES', { maximumFractionDigits: 1 })} M km²`;
    return `${c.area.toLocaleString('es-ES', { maximumFractionDigits: c.area < 10 ? 2 : 0 })} km²`;
  }
  if (lang === 'fr') {
    if (c.area >= 1e6) return `${(c.area / 1e6).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} M km²`;
    return `${c.area.toLocaleString('fr-FR', { maximumFractionDigits: c.area < 10 ? 2 : 0 })} km²`;
  }
  if (c.area >= 1e6) return `${(c.area / 1e6).toFixed(2)}M km²`;
  const rounded = c.area < 1 ? c.area.toFixed(2) : Math.round(c.area).toLocaleString('en-US');
  return `${rounded} km²`;
}

export function fmtDate(iso, short = false) {
  if (!iso) return '—';
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  if (short) {
    return new Intl.DateTimeFormat(locale(), { month: 'short', day: 'numeric' }).format(d);
  }
  return new Intl.DateTimeFormat(locale(), {
    year: 'numeric', month: 'long', day: 'numeric',
  }).format(d);
}

export function fmtDateParts(iso) {
  if (!iso) return { year: '', month: '', day: '' };
  const [year, month, day] = iso.split('-');
  return { year, month: Number(month), day: Number(day) };
}

export function fmtDuration(seconds) {
  const s = Math.max(0, Math.round(seconds));
  if (s >= 3600) {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return `${h}:${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  }
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

export function fmtNumber(n) {
  return Number(n || 0).toLocaleString(locale());
}

export function clamp(n, min, max) { return Math.min(max, Math.max(min, n)); }
export function pct(part, total) { return total ? Math.round((part / total) * 100) : 0; }

export function shuffle(arr, rng = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function sampleN(arr, count, rng = Math.random) {
  return shuffle(arr, rng).slice(0, count);
}

export function sampleOne(arr, rng = Math.random) {
  return arr[Math.floor(rng() * arr.length)];
}

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function todayKey(date = new Date()) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function yesterdayKey(date = new Date()) {
  const d = new Date(date);
  d.setDate(d.getDate() - 1);
  return todayKey(d);
}

export function timeUntilMidnight() {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  return next.getTime() - now.getTime();
}

export function debounce(fn, ms = 150) {
  let id;
  return (...args) => {
    clearTimeout(id);
    id = setTimeout(() => fn(...args), ms);
  };
}

export function starsMarkup(count, total = 3, cls = '') {
  let out = '';
  for (let i = 0; i < total; i++) {
    out += `<span class="${cls} ${i < count ? 'on' : ''}"></span>`;
  }
  return out;
}

export function starIcons(count, total = 3) {
  const icon = (on) => `<svg class="ic ${on ? 'on' : ''}" viewBox="0 0 24 24" fill="${on ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/></svg>`;
  return Array.from({ length: total }, (_, i) => icon(i < count)).join('');
}

export function factText(c) {
  if (!c) return '';
  const lang = getLang();
  if (lang === 'zh') {
    if (c.factZh) return c.factZh;
    return `位于${c.subregionZh}，面积约${c.areaTextZh}，人口约${fmtPop(c.population)}。`;
  }
  if (lang === 'en') {
    return `Located in ${c.subregion}, covering about ${fmtAreaShort(c)} with a population of roughly ${fmtPop(c.population)}.`;
  }
  if (lang === 'es') {
    return `Se encuentra en ${c.subregionEs || c.subregion}. Su capital es ${c.capitalEs || c.capital}, su superficie es de ${fmtAreaShort(c)} y su población ronda los ${fmtPop(c.population)}.`;
  }
  return `Situé en ${c.subregionFr || c.subregion}, il couvre ${fmtAreaShort(c)} et compte environ ${fmtPop(c.population)} habitants. Sa capitale est ${c.capitalFr || c.capital}.`;
}

export function shortFact(c) {
  if (isZh()) return `${c.regionZh} · ${c.capitalZh} · ${fmtPop(c.population)}人`;
  if (getLang() === 'es') return `${c.regionEs} · ${c.capitalEs || c.capital} · ${fmtPop(c.population)} habitantes`;
  if (getLang() === 'fr') return `${c.regionFr} · ${c.capitalFr || c.capital} · ${fmtPop(c.population)} habitants`;
  return `${c.subregion} · ${c.capital} · ${fmtPop(c.population)} people`;
}

export const isTouch = () => window.matchMedia('(pointer: coarse)').matches;
export const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function mapMarker(country) {
  const left = Math.min(98.5, Math.max(1.5, ((country.lng + 180) / 360) * 100));
  const top = Math.min(98, Math.max(2, ((90 - country.lat) / 180) * 100));
  return `<span class="map-pin" style="left:${left.toFixed(2)}%;top:${top.toFixed(2)}%"></span>`;
}
