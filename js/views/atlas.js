import { COUNTRIES, REGIONS, BY_ID } from '../data.js';
import { store, masteryOf, setMastery, masteredCount } from '../store.js';
import { shell, pageHead } from '../layout.js';
import { icon } from '../icons.js';
import { t, isZh, regionName, subregionName, regionLabel, locale } from '../i18n.js';
import {
  countryName, capitalName, fmtPop, fmtArea, fmtDate, fmtNumber, flagImg,
  escapeHtml, mapMarker, factText, pct,
} from '../utils.js';
import { openModal, toast } from '../ui.js';
import { session } from '../session.js';
import { sfx } from '../audio.js';

let atlasState = { q: '', region: 'world', mastery: 'all', sort: 'name' };

function matches(c, state) {
  if (state.region !== 'world' && c.region !== state.region) return false;
  if (state.mastery === 'mastered' && masteryOf(c.id) < 3) return false;
  if (state.mastery === 'learning' && masteryOf(c.id) >= 3) return false;
  const q = state.q.trim().toLowerCase();
  if (!q) return true;
  return [c.name, c.nameZh, c.nameEs, c.nameFr, c.capital, c.capitalZh, c.capitalEs, c.capitalFr, c.id, c.regionZh, c.subregion]
    .some((v) => (v || '').toLowerCase().includes(q));
}

function sorted(list, sort) {
  const items = [...list];
  if (sort === 'population') items.sort((a, b) => b.population - a.population);
  else if (sort === 'area') items.sort((a, b) => b.area - a.area);
  else if (sort === 'mastery') items.sort((a, b) => masteryOf(b.id) - masteryOf(a.id) || a.name.localeCompare(b.name));
  else items.sort((a, b) => countryName(a).localeCompare(countryName(b), locale()));
  return items;
}

function masteryPips(c) {
  const m = masteryOf(c.id);
  return `<span class="mastery" aria-label="${t('熟练度', 'Mastery')} ${m}/3">${[0, 1, 2].map((i) => `<i class="${i < m ? 'on' : ''}"></i>`).join('')}</span>`;
}

function card(c) {
  return `<button class="country-card" data-country="${c.id}" aria-label="${escapeHtml(countryName(c))}">
    <span class="cc-flag">${flagImg(c)}</span>
    <span>
      <span class="cc-name">${escapeHtml(countryName(c))}</span>
      <span class="cc-sub">${escapeHtml(capitalName(c))}<span class="dot"></span>${escapeHtml(regionName(c))}</span>
    </span>
    <span class="cc-foot">${masteryPips(c)}<span class="cc-pop">${fmtPop(c.population)}</span></span>
  </button>`;
}

function detailContent(c) {
  const m = masteryOf(c.id);
  const independence = c.independence
    ? `<div><span>${t('独立日', 'INDEPENDENCE')}</span><b>${fmtDate(c.independence)}</b></div>` : '';
  return `<div class="detail-hero">
    <div class="detail-flag">${flagImg(c)}</div>
    <div class="detail-name grow">
      <h2>${escapeHtml(countryName(c))}</h2>
      <p>${escapeHtml(c.name)} · ${escapeHtml(c.official)}</p>
      <div class="detail-tags">
        <span class="tag blue">${escapeHtml(regionName(c))}</span>
        <span class="tag ${m >= 3 ? 'teal' : 'gold'}">${m >= 3 ? t('已掌握', 'Mastered') : t('熟练度', 'Mastery') + ' ' + m + '/3'}</span>
        <span class="tag">${escapeHtml(c.id)}</span>
      </div>
      <div class="mastery" style="margin-top:12px">${[0, 1, 2].map((i) => `<i class="${i < m ? 'on' : ''}"></i>`).join('')}</div>
    </div>
  </div>
  <div class="detail-facts">
    <div><span>${t('首都', 'CAPITAL')}</span><b>${escapeHtml(capitalName(c))}</b></div>
    <div><span>${t('人口', 'POPULATION')}</span><b>${fmtPop(c.population, true)}</b></div>
    <div><span>${t('面积', 'AREA')}</span><b>${fmtArea(c)}</b></div>
    <div><span>${t('大区', 'REGION')}</span><b>${escapeHtml(regionName(c))} · ${escapeHtml(subregionName(c))}</b></div>
    <div><span>${t('人口排名', 'POP. RANK')}</span><b>#${c.populationRank || '—'}</b></div>
    <div><span>${t('面积排名', 'AREA RANK')}</span><b>#${c.areaRank || '—'}</b></div>
    <div><span>${t('陆地邻国', 'NEIGHBOURS')}</span><b>${c.borders ? `${c.borders}${t(' 个', '')}` : t('无', 'None')}${c.landlocked ? ` · ${t('内陆国', 'Landlocked')}` : ''}</b></div>
    ${independence}
  </div>
  <div class="detail-fact-text">${icon('sparkle')} ${escapeHtml(factText(c))}</div>
  <div class="detail-map">
    <img src="/assets/world-map.svg" alt="">
    ${mapMarker(c)}
  </div>
  <div class="modal-actions detail-actions">
    <button class="btn ${m >= 3 ? 'btn-ghost' : 'btn-primary'}" data-master>${icon(m >= 3 ? 'refresh' : 'check')}${m >= 3 ? t('取消掌握标记', 'Reset mastery') : t('标记为已掌握', 'Mark as mastered')}</button>
    <a class="btn btn-ghost" href="#/learn?region=${c.region}">${icon('graduation')}${t('开始闪卡学习', 'Study with flashcards')}</a>
  </div>`;
}

export function atlasView() {
  const mastered = masteredCount();
  const total = COUNTRIES.length;

  const content = `${pageHead({
    eyebrow: t('世界国家图鉴', 'THE WORLD ATLAS'),
    title: t('认识每一个国家', 'Meet every country'),
    subtitle: t('194 个国家的国旗、首都、人口与地理数据。搜索、筛选，并把它们变成你的长期记忆。', 'Flags, capitals, populations and geography for 194 countries. Search, filter and make them stick.'),
    action: `<div class="row gap-8"><a class="btn btn-ghost" href="#/learn">${icon('graduation')}${t('闪卡学习', 'Flashcards')}</a><button class="btn btn-primary" data-random>${icon('sparkle')}${t('随机一国', 'Random')}</button></div>`,
  })}
    <div class="atlas-summary">
      <div class="sum"><b data-mastered-count>${mastered}</b><span>${t('已掌握', 'MASTERED')}</span></div>
      <div class="sum"><b data-todo-count>${total - mastered}</b><span>${t('待掌握', 'TO MASTER')}</span></div>
      <div class="sum"><b data-count>${COUNTRIES.length}</b><span>${t('当前显示', 'SHOWING')}</span></div>
      <div class="bar"><span data-mastery-bar style="width:${pct(mastered, total)}%"></span></div>
      <span class="tiny muted" data-mastery-pct>${pct(mastered, total)}%</span>
    </div>

    <div class="atlas-toolbar">
      <div class="input-wrap">
        ${icon('search')}
        <input class="input" data-search placeholder="${t('搜索国家、首都或代码…', 'Search country, capital or code…')}" value="${escapeHtml(atlasState.q)}" autocomplete="off">
      </div>
      <select class="input select" data-sort aria-label="${t('排序', 'Sort')}">
        <option value="name" ${atlasState.sort === 'name' ? 'selected' : ''}>${t('按名称', 'Name')}</option>
        <option value="population" ${atlasState.sort === 'population' ? 'selected' : ''}>${t('按人口', 'Population')}</option>
        <option value="area" ${atlasState.sort === 'area' ? 'selected' : ''}>${t('按面积', 'Area')}</option>
        <option value="mastery" ${atlasState.sort === 'mastery' ? 'selected' : ''}>${t('按熟练度', 'Mastery')}</option>
      </select>
      <div class="segmented" data-mastery-filter>
        <button data-m="all" class="${atlasState.mastery === 'all' ? 'on' : ''}">${t('全部', 'All')}</button>
        <button data-m="learning" class="${atlasState.mastery === 'learning' ? 'on' : ''}">${t('学习中', 'Learning')}</button>
        <button data-m="mastered" class="${atlasState.mastery === 'mastered' ? 'on' : ''}">${t('已掌握', 'Mastered')}</button>
      </div>
    </div>

    <div class="row wrap gap-8" data-regions style="margin-bottom:16px">
      ${REGIONS.map((r) => `<button class="chip ${atlasState.region === r.id ? 'on' : ''}" data-region="${r.id}">${regionLabel(r)}</button>`).join('')}
    </div>

    <div class="country-grid" data-grid></div>`;

  return {
    html: shell(content, 'atlas'),
    mount() {
      const grid = document.querySelector('[data-grid]');
      const countEl = document.querySelector('[data-count]');
      const input = document.querySelector('[data-search]');
      const sortEl = document.querySelector('[data-sort]');
      const regionBtns = [...document.querySelectorAll('[data-region]')];
      const masteryBtns = [...document.querySelectorAll('[data-mastery-filter] button')];

      const updateSummary = () => {
        const nowMastered = masteredCount();
        const mEl = document.querySelector('[data-mastered-count]');
        const tEl = document.querySelector('[data-todo-count]');
        const bEl = document.querySelector('[data-mastery-bar]');
        const pEl = document.querySelector('[data-mastery-pct]');
        if (mEl) mEl.textContent = nowMastered;
        if (tEl) tEl.textContent = COUNTRIES.length - nowMastered;
        if (bEl) bEl.style.width = `${pct(nowMastered, COUNTRIES.length)}%`;
        if (pEl) pEl.textContent = `${pct(nowMastered, COUNTRIES.length)}%`;
      };

      const openCountry = (c) => {
        openModal({
          title: '',
          content: detailContent(c),
          wide: true,
          onMount(el, close) {
            el.querySelector('[data-master]')?.addEventListener('click', () => {
              const next = masteryOf(c.id) >= 3 ? 0 : 3;
              setMastery(c.id, next);
              sfx(next ? 'star' : 'click');
              toast(next ? t('{country} 已标记为掌握', '{country} marked as mastered', { country: countryName(c) }) : t('已取消掌握标记', 'Mastery reset'), next ? 'good' : '', 'check');
              close();
              refresh();
            });
          },
        });
      };

      const refresh = () => {
        const list = sorted(COUNTRIES.filter((c) => matches(c, atlasState)), atlasState.sort);
        grid.innerHTML = list.length ? list.map(card).join('')
          : `<div class="empty" style="grid-column:1/-1">${icon('search')}<p>${t('没有找到匹配的国家。试试别的关键词。', 'No countries found. Try another search.')}</p></div>`;
        if (countEl) countEl.textContent = list.length;
        updateSummary();
      };

      let timer = null;
      input.addEventListener('input', () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
          atlasState.q = input.value;
          refresh();
        }, 120);
      });
      sortEl.addEventListener('change', () => {
        atlasState.sort = sortEl.value;
        refresh();
      });
      regionBtns.forEach((btn) => btn.addEventListener('click', () => {
        atlasState.region = btn.dataset.region;
        regionBtns.forEach((b) => b.classList.toggle('on', b === btn));
        sfx('click');
        refresh();
      }));
      masteryBtns.forEach((btn) => btn.addEventListener('click', () => {
        atlasState.mastery = btn.dataset.m;
        masteryBtns.forEach((b) => b.classList.toggle('on', b === btn));
        sfx('click');
        refresh();
      }));

      grid.addEventListener('click', (e) => {
        const cardEl = e.target.closest('[data-country]');
        if (!cardEl) return;
        const c = BY_ID[cardEl.dataset.country];
        if (!c) return;
        sfx('click');
        openCountry(c);
      });

      document.querySelector('[data-random]')?.addEventListener('click', () => {
        const c = COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)];
        sfx('click');
        openCountry(c);
      });

      const onKey = (e) => {
        if (e.key === '/' && document.activeElement !== input) {
          e.preventDefault();
          input.focus();
        }
      };
      document.addEventListener('keydown', onKey);
      refresh();
      this.cleanup = () => {
        document.removeEventListener('keydown', onKey);
        clearTimeout(timer);
      };
    },
  };
}
