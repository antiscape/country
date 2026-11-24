import { store, modeStats, modeStarsTotal, mistakeList, startRunMeta } from '../store.js';
import { MODES, LEVELS, levelConfig, modeText, levelText } from '../modes.js';
import { COUNTRIES, REGIONS } from '../data.js';
import { shell } from '../layout.js';
import { icon } from '../icons.js';
import { t, isZh, regionLabel } from '../i18n.js';
import {
  starIcons, fmtNumber, fmtPop, countryName, flagImg, factText, escapeHtml,
} from '../utils.js';
import { createRun } from '../engine.js';
import { session } from '../session.js';
import { toast } from '../ui.js';
import { sfx } from '../audio.js';

function modePool(mode, region, level) {
  const cfg = levelConfig(level);
  let pool = COUNTRIES.filter((c) => cfg.tiers.includes(c.tier));
  if (region !== 'world') pool = pool.filter((c) => c.region === region);
  if (mode === 'independence') pool = pool.filter((c) => c.independence);
  if (pool.length < 8) {
    pool = COUNTRIES.filter((c) => (region === 'world' ? true : c.region === region));
    if (mode === 'independence') pool = pool.filter((c) => c.independence);
  }
  return pool;
}

function bestScore(p) {
  return Math.max(0, ...Object.values(p.best || {}));
}

export function playView({ mode }) {
  if (mode === 'review') return reviewView();
  const m = MODES[mode];
  if (!m) return null;

  const p = modeStats(mode);
  const stars = modeStarsTotal(mode);
  const last = session.lastPlay?.mode === mode ? session.lastPlay : { level: p.maxLevel, region: 'world' };
  let region = last.region || 'world';
  let level = Math.min(p.maxLevel, Math.max(1, last.level || p.maxLevel));

  const accuracy = p.answered ? Math.round((p.correct / p.answered) * 100) : 0;
  const regionChips = REGIONS.map((r) => {
    const count = r.id === 'world'
      ? COUNTRIES.length
      : COUNTRIES.filter((c) => c.region === r.id).length;
    return `<button class="chip ${r.id === region ? 'on' : ''}" data-region="${r.id}">${regionLabel(r)}<span style="opacity:.45;font-size:10px">${count}</span></button>`;
  }).join('');

  const levelNodes = LEVELS.map((l) => {
    const unlocked = l.n <= p.maxLevel;
    const starCount = p.stars[l.n] || 0;
    return `<button class="level-node ${l.n === level ? 'on' : ''} ${!unlocked ? 'locked' : ''} ${l.n === p.maxLevel ? 'current' : ''}"
      data-level="${l.n}" ${!unlocked ? 'disabled' : ''} aria-label="Level ${l.n}">
      <span class="knob">${unlocked ? l.n : icon('lock')}</span>
      <span class="lbl">${levelText(l)}</span>
      <span class="stars">${starIcons(starCount, 3)}</span>
    </button>`;
  }).join('');

  const content = `
    <a class="back-link" href="#/home">${icon('arrow-left')}${t('返回探险', 'Back to explore')}</a>
    <section class="play-banner" style="--accent:${m.accent}">
      <div class="mode-icon">${icon(m.icon)}</div>
      <div class="grow">
        <div class="row gap-8" style="margin-bottom:7px">
          <span class="tag ${m.color}">${modeText(m, 'tag')}</span>
          <span class="tiny" style="color:var(--muted)">${modeText(m, 'short')}</span>
        </div>
        <h1>${modeText(m, 'name')}</h1>
        <p>${modeText(m, 'desc')}</p>
      </div>
      <div class="banner-stats">
        <div><b>${stars}</b><span>${t('星星 / 18', 'STARS / 18')}</span></div>
        <div><b>Lv.${p.maxLevel}</b><span>${t('当前进度', 'PROGRESS')}</span></div>
        <div><b>${p.plays}</b><span>${t('游玩次数', 'PLAYS')}</span></div>
      </div>
    </section>

    <div class="play-layout">
      <section class="play-main panel">
        <div class="label">${icon('map-pin')} ${t('选择出题范围', 'Choose a region')}</div>
        <div class="region-grid" data-regions>${regionChips}</div>

        <div class="label" style="margin-top:26px">${icon('route')} ${t('选择关卡', 'Choose a level')}</div>
        <div class="level-path" data-levels>${levelNodes}</div>
        <div class="level-note" data-level-note>${icon('info')}<span></span></div>

        <div class="play-start">
          <button class="btn btn-primary btn-lg" data-start>${icon('play')}${t('开始第 {n} 关', 'Start level {n}', { n: level })}</button>
          <a class="btn btn-ghost" href="#/atlas">${icon('book')}${t('先看图鉴', 'Study the atlas')}</a>
          <span class="tiny muted" style="margin-left:auto">${t('10 道题 · 3 颗心', '10 questions · 3 lives')}</span>
        </div>
      </section>

      <aside class="play-side">
        <div class="panel record-card">
          <h3>${icon('trophy')} ${t('本模式记录', 'Your record')}</h3>
          <div class="record-big">${fmtNumber(bestScore(p))}<span class="record-unit">${t('分', 'pts')}</span><small>${t('最高分', 'BEST SCORE')}</small></div>
          <div class="record-rows">
            <div class="record-row"><span>${t('正确率', 'Accuracy')}</span><b>${accuracy}%</b></div>
            <div class="record-row"><span>${t('已答题数', 'Answered')}</span><b>${fmtNumber(p.answered)}</b></div>
            <div class="record-row"><span>${t('收集星星', 'Stars earned')}</span><b>${stars} / 18</b></div>
          </div>
        </div>
        <div class="panel tip-card">
          ${icon('lightbulb')}
          <p>${mode === 'independence'
            ? t('提示：独立日模式从 154 个有明确独立日期的国家中出题。', 'Tip: Independence Day uses the 154 countries with a documented independence date.')
            : mode === 'population'
              ? t('提示：人口数据来自世界银行 2023 年统计。', 'Tip: Population figures come from World Bank 2023 data.')
              : mode === 'flags'
                ? t('提示：高关卡会出现同地区、颜色相近的“迷惑国旗”。', 'Tip: Higher levels use same-region flags with similar colours as decoys.')
                : t('提示：答得越快，时间加成越高；连续答对还有连击倍率。', 'Tip: Faster answers earn bigger time bonuses. Build a streak for a combo multiplier.')}</p>
        </div>
      </aside>
    </div>`;

  return {
    html: shell(content, 'home'),
    mount() {
      const root = document.querySelector('.play-main');
      const note = root.querySelector('[data-level-note] span');
      const startBtn = root.querySelector('[data-start]');
      const levelBtns = [...root.querySelectorAll('[data-level]')];
      const regionBtns = [...root.querySelectorAll('[data-region]')];

      const updateNote = () => {
        const cfg = levelConfig(level);
        const pool = modePool(mode, region, level);
        note.textContent = t(
          `第 ${level} 关 · 从 ${pool.length} 个国家中出题 · 每题 ${cfg.secs} 秒 · ${methodOptions(mode, level)} 个选项`,
          `Level ${level} · ${pool.length} countries in the pool · ${cfg.secs}s per question · ${methodOptions(mode, level)} options`,
        );
        startBtn.innerHTML = `${icon('play')}${t('开始第 {n} 关', 'Start level {n}', { n: level })}`;
      };

      regionBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
          region = btn.dataset.region;
          regionBtns.forEach((b) => b.classList.toggle('on', b === btn));
          sfx('click');
          updateNote();
        });
      });
      levelBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
          if (btn.disabled) return;
          level = Number(btn.dataset.level);
          levelBtns.forEach((b) => b.classList.toggle('on', b === btn));
          sfx('click');
          updateNote();
        });
      });
      startBtn.addEventListener('click', () => {
        session.lastPlay = { mode, level, region };
        const run = createRun({ mode, level, region });
        if (!run.questions.length) {
          toast(t('这个范围没有可用题目，换一个试试。', 'No questions available in this range.'), 'bad');
          return;
        }
        startRunMeta({ mode, level, region, kind: mode });
        session.run = run;
        session.result = null;
        sfx('start');
        location.hash = '#/game';
      });
      updateNote();
    },
  };
}

function methodOptions(mode, level) {
  if (mode === 'flags') return levelConfig(level).options;
  if (mode === 'independence') return 4;
  return 4;
}

function reviewView() {
  const mistakes = mistakeList();
  const list = mistakes.slice(0, 5);
  const accuracy = store.stats.answered ? Math.round((store.stats.correct / store.stats.answered) * 100) : 0;
  const content = `
    <a class="back-link" href="#/home">${icon('arrow-left')}${t('返回探险', 'Back to explore')}</a>
    <section class="play-banner" style="--accent:var(--rose)">
      <div class="mode-icon">${icon('refresh')}</div>
      <div class="grow">
        <div class="row gap-8" style="margin-bottom:7px"><span class="tag rose">${t('错题本', 'REVIEW')}</span></div>
        <h1>${t('错题复习', 'Mistake review')}</h1>
        <p>${t('从最近答错的国家中抽题，答对就能把它们从复习清单里划掉。', 'Questions drawn from your recent mistakes. A correct answer removes it from the list.')}</p>
      </div>
      <div class="banner-stats">
        <div><b>${mistakes.length}</b><span>${t('待复习国家', 'TO REVIEW')}</span></div>
        <div><b>${accuracy}%</b><span>${t('总正确率', 'ACCURACY')}</span></div>
      </div>
    </section>

    <div class="play-layout">
      <section class="play-main panel">
        <div class="label">${icon('brain')} ${t('复习清单', 'Review queue')}</div>
        ${mistakes.length ? `
          <div class="review-queue">
            ${list.map((item) => {
              const c = COUNTRIES.find((x) => x.id === item.id);
              if (!c) return '';
              return `<div class="review-queue-item">
                <span class="rq-flag">${flagImg(c)}</span>
                <div class="grow"><b>${escapeHtml(countryName(c))}</b><span>${t('错误', 'Missed')} ${item.count} ${t('次', 'x')} · ${factText(c)}</span></div>
                <span class="mastery">${[0, 1, 2].map((i) => `<i class="${i < (store.mastery[c.id] || 0) ? 'on' : ''}"></i>`).join('')}</span>
              </div>`;
            }).join('')}
          </div>
          ${mistakes.length > list.length ? `<p class="tiny muted" style="margin-top:12px">${t('还有 {n} 个国家在队列中', '{n} more in the queue', { n: mistakes.length - list.length })}</p>` : ''}
          <div class="play-start">
            <button class="btn btn-primary btn-lg" data-start-review>${icon('play')}${t('开始复习', 'Start review')}</button>
            <a class="btn btn-ghost" href="#/atlas">${icon('book')}${t('浏览图鉴', 'Open atlas')}</a>
            <span class="tiny muted" style="margin-left:auto">${t('最多 10 题 · 5 颗心', 'Up to 10 questions · 5 lives')}</span>
          </div>` : `
          <div class="empty">${icon('check')}<p>${t('复习清单是空的。继续挑战，新的错题会自动收集到这里。', 'Your review queue is empty. Keep playing — new mistakes are collected here.')}</p></div>
          <div class="play-start"><a class="btn btn-primary" href="#/home">${icon('compass')}${t('去探险', 'Keep exploring')}</a></div>`}
      </section>
      <aside class="play-side">
        <div class="panel tip-card">${icon('sparkle')}<p>${t('复习模式答对后，该国的熟练度会 +1；连续答对 3 次就变成“已掌握”。', 'Each correct review answer adds mastery. Three correct answers mark a country as mastered.')}</p></div>
        <div class="panel tip-card">${icon('heart')}<p>${t('复习模式有 5 颗心，答错不会立刻结束，适合慢慢回忆。', 'Review mode gives you 5 lives, so you can take your time.')}</p></div>
      </aside>
    </div>`;

  return {
    html: shell(content, 'home'),
    mount() {
      const btn = document.querySelector('[data-start-review]');
      if (!btn) return;
      btn.addEventListener('click', () => {
        const ids = mistakeList().slice(0, 10).map((m) => m.id);
        if (!ids.length) { toast(t('没有可复习的题目。', 'Nothing to review.'), 'bad'); return; }
        const run = createRun({ mode: 'review', level: 2, reviewIds: ids });
        if (!run.questions.length) { toast(t('复习题目生成失败。', 'Could not build a review run.'), 'bad'); return; }
        startRunMeta({ mode: 'flags', region: 'world', kind: 'review' });
        session.run = run;
        session.result = null;
        sfx('start');
        location.hash = '#/game';
      });
    },
  };
}

export { bestScore, modePool };
