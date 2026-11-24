import { COUNTRIES, REGIONS } from '../data.js';
import { store, masteryOf, setMastery, masteredCount } from '../store.js';
import { shell, pageHead } from '../layout.js';
import { icon } from '../icons.js';
import { t, isZh, regionLabel, altName, regionName } from '../i18n.js';
import {
  countryName, capitalName, fmtPop, fmtArea, flagImg, factText, escapeHtml, shuffle, pct,
} from '../utils.js';
import { sfx } from '../audio.js';

const REGION_IDS = new Set(REGIONS.map((r) => r.id));

function deckFor(region) {
  const list = COUNTRIES.filter((c) => region === 'world' || c.region === region);
  // low mastery first, with a little randomness so repeat sessions vary
  return shuffle(list)
    .sort((a, b) => masteryOf(a.id) - masteryOf(b.id))
    .slice(0, 20);
}

function regionLabelForId(region) {
  const r = REGIONS.find((x) => x.id === region) || REGIONS[0];
  return regionLabel(r);
}

function cardHTML(c, idx, total, flipped, region) {
  return `<div class="flash-stage">
    <div class="flash-card ${flipped ? 'flipped' : ''}" data-card tabindex="0" role="button" aria-label="${t('点击翻面', 'Click to flip')}">
      <div class="flash-face front">
        <span class="hint">${t('点击翻面', 'CLICK TO FLIP')}</span>
        <div class="flash-front-flag">${flagImg(c)}</div>
        <div class="sub" style="margin-top:18px">${regionLabelForId(region)} · ${idx + 1} / ${total}</div>
      </div>
      <div class="flash-face back">
        <span class="hint">${t('答案', 'ANSWER')}</span>
        <h2>${escapeHtml(countryName(c))}</h2>
        <div class="sub">${escapeHtml(altName(c))} · ${escapeHtml(c.official)}</div>
        <div class="flash-facts">
          <div><span>${t('首都', 'CAPITAL')}</span><b>${escapeHtml(capitalName(c))}</b></div>
          <div><span>${t('人口', 'POPULATION')}</span><b>${fmtPop(c.population)}</b></div>
          <div><span>${t('面积', 'AREA')}</span><b>${fmtArea(c)}</b></div>
          <div><span>${t('大区', 'REGION')}</span><b>${escapeHtml(regionName(c))}</b></div>
        </div>
        <p class="tiny muted" style="margin-top:14px;text-align:center">${escapeHtml(factText(c))}</p>
      </div>
    </div>
  </div>
  <div class="flash-controls">
    <button class="btn btn-ghost" data-flip>${icon('refresh')}${t('翻面', 'Flip')}</button>
    <button class="btn btn-ghost danger-btn" data-rate="no" ${flipped ? '' : 'disabled'}>${t('还不熟', 'Not yet')}</button>
    <button class="btn btn-primary" data-rate="yes" ${flipped ? '' : 'disabled'}>${t('认识了', 'Got it')} ${icon('check')}</button>
  </div>
  <p class="center tiny muted" style="margin-top:14px">${t('空格翻面 · 按 1 不认识 · 按 2 认识', 'Space to flip · 1 = not yet · 2 = got it')}</p>`;
}

export function learnView({ query }) {
  const requested = query?.region;
  const region = REGION_IDS.has(requested) ? requested : 'world';
  let deck = deckFor(region);
  let idx = 0;
  let flipped = false;
  let known = 0;
  let review = 0;

  const content = `${pageHead({
    eyebrow: t('闪卡学习', 'FLASHCARDS'),
    title: t('先认识，再挑战', 'Learn first, play later'),
    subtitle: t('一次 20 张卡。翻开看答案，诚实评价自己——不熟的国家会优先再次出现。', '20 cards per round. Flip, answer honestly, and low-mastery countries come back first.'),
    action: `<a class="btn btn-ghost" href="#/atlas">${icon('book')}${t('返回图鉴', 'Back to atlas')}</a>`,
  })}
    <div class="flash-wrap">
      <div class="flash-progress">
        <span data-flash-count>1 / ${deck.length}</span>
        <div class="bar"><span data-flash-bar style="width:0%"></span></div>
        <span data-flash-known>${icon('check')} 0</span>
      </div>
      <div data-flash-body></div>
    </div>`;

  return {
    html: shell(content, 'atlas'),
    mount() {
      const body = document.querySelector('[data-flash-body]');
      const count = document.querySelector('[data-flash-count]');
      const bar = document.querySelector('[data-flash-bar]');
      const knownEl = document.querySelector('[data-flash-known]');

      const updateChrome = () => {
        count.textContent = `${Math.min(idx + 1, deck.length)} / ${deck.length}`;
        bar.style.width = `${(idx / deck.length) * 100}%`;
        knownEl.innerHTML = `${icon('check')} ${known}`;
      };

      const render = () => {
        updateChrome();
        if (idx >= deck.length) {
          const p = deck.length ? Math.round((known / deck.length) * 100) : 0;
          body.innerHTML = `<div class="panel flash-summary">
            <div class="eyebrow" style="justify-content:center">${t('本组完成', 'ROUND COMPLETE')}</div>
            <h2 style="font:800 30px/1.15 var(--font-display);margin:12px 0 8px">${t('又认识了一些国家', 'A few more countries learned')}</h2>
            <p class="muted" style="font-size:12.5px">${t('本组认识 {known} 个，还需要复习 {review} 个。', '{known} learned, {review} to revisit.', { known, review })}</p>
            <div class="stat-grid" style="max-width:520px;margin:22px auto 0">
              <div class="stat-card">${icon('check')}<b>${known}</b><span>${t('认识', 'LEARNED')}</span></div>
              <div class="stat-card">${icon('refresh')}<b>${review}</b><span>${t('待复习', 'REVIEW')}</span></div>
              <div class="stat-card">${icon('graduation')}<b>${masteredCount()}</b><span>${t('总掌握', 'MASTERED')}</span></div>
              <div class="stat-card">${icon('target')}<b>${p}%</b><span>${t('本组正确', 'THIS ROUND')}</span></div>
            </div>
            <div class="flash-controls">
              <button class="btn btn-primary" data-again>${icon('refresh')}${t('再来一组', 'Another round')}</button>
              <a class="btn btn-ghost" href="#/atlas">${icon('book')}${t('去图鉴', 'Open atlas')}</a>
            </div>
          </div>`;
          body.querySelector('[data-again]')?.addEventListener('click', () => {
            deck = deckFor(region);
            idx = 0; flipped = false; known = 0; review = 0;
            render();
            sfx('start');
          });
          return;
        }
        const c = deck[idx];
        body.innerHTML = cardHTML(c, idx, deck.length, flipped, region);
        const card = body.querySelector('[data-card]');
        const flip = () => {
          flipped = !flipped;
          card.classList.toggle('flipped', flipped);
          body.querySelectorAll('[data-rate]').forEach((b) => { b.disabled = !flipped; });
          sfx('click');
        };
        card.addEventListener('click', flip);
        body.querySelector('[data-flip]')?.addEventListener('click', flip);
        body.querySelectorAll('[data-rate]').forEach((btn) => {
          btn.addEventListener('click', () => {
            if (!flipped) return;
            const yes = btn.dataset.rate === 'yes';
            if (yes) {
              known += 1;
              setMastery(c.id, Math.min(3, masteryOf(c.id) + 1));
              sfx('correct');
            } else {
              review += 1;
              setMastery(c.id, Math.max(0, masteryOf(c.id) - 1));
              sfx('wrong');
            }
            idx += 1;
            flipped = false;
            render();
          });
        });
      };

      const onKey = (e) => {
        if (e.target.closest('input,textarea,select')) return;
        if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); body.querySelector('[data-flip]')?.click(); }
        if (e.key === '1') body.querySelector('[data-rate="no"]')?.click();
        if (e.key === '2') body.querySelector('[data-rate="yes"]')?.click();
      };
      document.addEventListener('keydown', onKey);
      render();
      this.cleanup = () => document.removeEventListener('keydown', onKey);
    },
  };
}
