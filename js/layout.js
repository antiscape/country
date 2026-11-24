/* App shell: top bar, desktop nav, mobile tabs. */
import { icon } from './icons.js';
import { store, levelInfo, dailyState } from './store.js';
import { t, countryName, isZh, getLang } from './i18n.js';
import { fmtNumber, escapeHtml } from './utils.js';

export function logoMark() {
  return `<svg class="brand-mark" viewBox="0 0 64 64" aria-hidden="true">
    <circle cx="32" cy="32" r="25" fill="none" stroke="currentColor" stroke-width="1.6" opacity=".38"/>
    <ellipse cx="32" cy="32" rx="11.5" ry="25" fill="none" stroke="currentColor" stroke-width="1.6" opacity=".55"/>
    <path d="M8 24h48M8 40h48" fill="none" stroke="currentColor" stroke-width="1.4" opacity=".4"/>
    <path d="M32 7.5 36.7 22 51 26.7 36.7 31.4 32 46l-4.7-14.6L13 26.7 27.3 22z" fill="currentColor"/>
    <circle cx="32" cy="32" r="2.3" fill="#07111f"/>
  </svg>`;
}

const NAV = [
  { key: 'home', href: '#/home', labelZh: '探险', labelEn: 'Explore', icon: 'compass' },
  { key: 'atlas', href: '#/atlas', labelZh: '图鉴', labelEn: 'Atlas', icon: 'book' },
  { key: 'stats', href: '#/stats', labelZh: '成就', labelEn: 'Progress', icon: 'trophy' },
  { key: 'settings', href: '#/settings', labelZh: '设置', labelEn: 'Settings', icon: 'settings' },
];

export function shell(content, active = 'home') {
  const lv = levelInfo();
  const daily = dailyState();
  const rawName = store.profile.name || '探险家';
  const defaultNames = { zh: '探险家', en: 'Explorer', es: 'Explorador', fr: 'Explorateur' };
  const name = (rawName === '探险家' && getLang() !== 'zh') ? defaultNames[getLang()] : rawName;
  const initial = escapeHtml(name.slice(0, 1).toUpperCase());
  return `
    <header class="topbar">
      <div class="container topbar-inner">
        <a class="brand" href="#/home" aria-label="GEOQUEST home">
          ${logoMark()}
          <span class="brand-text">
            <span class="brand-en">GEOQUEST</span>
            <span class="brand-zh">${t('环球地理', 'WORLD GEO')}</span>
          </span>
        </a>
        <nav class="main-nav" aria-label="Main">
          ${NAV.map((n) => `<a href="${n.href}" class="${active === n.key ? 'active' : ''}">${icon(n.icon)}${t(n.labelZh, n.labelEn)}</a>`).join('')}
        </nav>
        <div class="top-actions">
          ${daily.streak > 0 ? `<span class="pill streak"><span style="color:var(--orange)">${icon('flame')}</span>${t('{n} 天', '{n} d', { n: daily.streak })}</span>` : ''}
          <span class="pill gold coins" title="${t('金币', 'Coins')}">${icon('coin')}${fmtNumber(store.profile.coins)}</span>
          <a class="profile-chip" href="#/stats" aria-label="${t('个人档案', 'Profile')}">
            <span class="avatar">${initial}</span>
            <span class="meta"><b>${t('Lv.', 'Lv.')}${lv.level}</b><span>${escapeHtml(name)}</span></span>
          </a>
        </div>
      </div>
    </header>
    <main class="container page">${content}</main>
    <nav class="mobile-tabs" aria-label="Mobile">
      ${NAV.map((n) => `<a href="${n.href}" class="${active === n.key ? 'active' : ''}">${icon(n.icon)}<span>${t(n.labelZh, n.labelEn)}</span></a>`).join('')}
    </nav>`;
}

export function pageHead({ eyebrow, title, subtitle, action = '' }) {
  return `<div class="page-head">
    <div>
      ${eyebrow ? `<div class="eyebrow">${eyebrow}</div>` : ''}
      <h1>${title}</h1>
      ${subtitle ? `<p>${subtitle}</p>` : ''}
    </div>
    ${action}
  </div>`;
}

export function heroFlags(codes = ['us', 'br', 'jp', 'fr', 'za']) {
  return codes.map((c, i) => `<span class="orbit-flag f${i + 1}"><img src="/assets/flags/${c}.png" alt="" loading="lazy"></span>`).join('');
}

export { NAV };
export { countryName };
