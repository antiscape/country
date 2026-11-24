import { store, modeStats, modeStarsTotal, masteredCount, levelInfo, dailyState, mistakeCount } from '../store.js';
import { MODES, MODE_ORDER, modeText } from '../modes.js';
import { shell, heroFlags, logoMark } from '../layout.js';
import { icon } from '../icons.js';
import { t, isZh } from '../i18n.js';
import { fmtNumber, starIcons } from '../utils.js';

function modeCard(id, index) {
  const m = MODES[id];
  const p = modeStats(id);
  const stars = modeStarsTotal(id);
  const maxStars = 18;
  // progress toward max stars
  const pct = Math.round((stars / maxStars) * 100);
  const featureFlags = id === 'flags'
    ? `<div class="mode-flags"><span><img src="/assets/flags/us.png" alt=""></span><span><img src="/assets/flags/br.png" alt=""></span><span><img src="/assets/flags/jp.png" alt=""></span><span><img src="/assets/flags/fr.png" alt=""></span></div>`
    : '';
  return `<a class="mode-card ${id === 'flags' ? 'feature' : ''}" href="#/play/${id}" style="--accent:${m.accent}" data-index="0${index}">
    <div class="mode-top">
      <div class="mode-icon">${icon(m.icon)}</div>
      ${featureFlags}
      ${id !== 'flags' ? `<div class="mode-arrow">${icon('arrow-up-right')}</div>` : ''}
    </div>
    <div>
      <div class="mode-name">${modeText(m, 'name')}<small>${modeText(m, 'short')}</small></div>
      <div class="mode-desc">${modeText(m, 'desc')}</div>
      <div class="mode-foot">
        <div class="mode-stars">${starIcons(Math.min(3, Math.ceil(stars / 6)), 3)}</div>
        <span class="tiny">${t('等级', 'Lv.')} ${p.maxLevel} · ${stars}/${maxStars}</span>
        <span class="tag ${m.color}" style="margin-left:auto">${modeText(m, 'tag')}</span>
      </div>
    </div>
  </a>`;
}

export function homeView() {
  const lv = levelInfo();
  const daily = dailyState();
  const mastered = masteredCount();
  const explored = Object.values(store.mastery).filter((v) => v > 0).length;
  const mistakes = mistakeCount();
  const lastMode = store.lastMode && MODES[store.lastMode] ? store.lastMode : 'flags';
  const lastLevel = modeStats(lastMode).maxLevel;
  const bestStreak = store.stats.bestStreak;
  const accuracy = store.stats.answered ? Math.round((store.stats.correct / store.stats.answered) * 100) : 0;
  const tournamentBest = store.tournament.bestRank;

  const content = `
    <section class="hero">
      <div class="hero-copy">
        <div class="eyebrow">${t('每日 5 分钟 · 走遍 194 个国家', 'Five minutes a day · 194 countries')}</div>
        <h1 class="display">${t('用一面旗，', 'One flag,')}<br><span class="accent">${t('认识整个世界。', 'the whole world.')}</span></h1>
        <p class="hero-sub">${t(
          '国旗、首都、国家、人口与独立日——五种玩法，把地理知识变成一场环球探险。',
          'Flags, capitals, countries, population and independence days — five ways to turn geography into an adventure.',
        )}</p>
        <div class="hero-actions">
          <a class="btn btn-primary btn-lg" href="#/play/${lastMode}">${icon('compass')}${store.profile.xp ? t('继续探险', 'Continue') : t('开始探险', 'Start exploring')}</a>
          <a class="btn btn-ghost btn-lg" href="#/daily">${icon('calendar')}${t('每日挑战', 'Daily challenge')}</a>
        </div>
        <div class="hero-proof">
          <div class="proof-item"><b>${mastered}<span style="color:var(--muted-2);font-size:13px"> / 194</span></b><span>${t('已掌握国家', 'COUNTRIES MASTERED')}</span></div>
          <div class="sep"></div>
          <div class="proof-item"><b>Lv.${lv.level}</b><span>${t('探险家等级', 'EXPLORER LEVEL')}</span></div>
          <div class="sep"></div>
          <div class="proof-item"><b>${bestStreak}</b><span>${t('最高连击', 'BEST STREAK')}</span></div>
          <div class="sep"></div>
          <div class="proof-item"><b>${accuracy}%</b><span>${t('总正确率', 'ACCURACY')}</span></div>
        </div>
      </div>
      <div class="hero-visual">
        <div class="globe-scene">
          <div class="globe-halo"></div>
          <div class="globe-ring r3"></div>
          <div class="globe-ring"></div>
          <div class="globe-ring r2"></div>
          <div class="globe">
            <img src="/assets/world-map.svg" alt="">
            <div class="globe-label"><span class="dot"></span>${t('正在环游世界', 'AROUND THE WORLD')}</div>
          </div>
          ${heroFlags()}
          <div class="hero-badge">${icon('sparkle')}<span>${t('已认识', 'Explored')} <b>${explored}</b> ${t('个国家', 'countries')}</span></div>
        </div>
      </div>
    </section>

    <section class="home-section">
      <div class="section-head">
        <div>
          <div class="eyebrow" style="margin-bottom:8px">${t('五种玩法', 'FIVE WAYS TO PLAY')}</div>
          <h2 class="section-title">${t('选择你的探险', 'Choose your expedition')}</h2>
        </div>
        <a class="section-link" href="#/atlas">${t('浏览国家图鉴', 'Browse the atlas')} ${icon('arrow-right')}</a>
      </div>
      <div class="mode-grid">
        ${MODE_ORDER.map((id, i) => modeCard(id, i + 1)).join('')}
      </div>
    </section>

    <section class="home-lower">
      <a class="daily-card" href="#/daily">
        <div class="daily-icon">${icon(daily.done ? 'check' : 'calendar')}</div>
        <div class="daily-body">
          <div class="row gap-8" style="margin-bottom:6px">
            <span class="tag teal">${t('每日挑战', 'DAILY')}</span>
            ${daily.streak ? `<span class="tag gold">${icon('flame')} ${daily.streak} ${t('天连胜', 'day streak')}</span>` : ''}
          </div>
          <h3>${daily.done ? t('今日挑战已完成', "Today's challenge is done") : t('今天的环球小测', "Today's world quiz")}</h3>
          <p>${daily.done
            ? t('拿到 {score} 分，明天再来刷新纪录。', 'You scored {score}. Come back tomorrow to beat it.', { score: daily.score })
            : t('12 道混合题，覆盖全部玩法。每天一次，保持连胜。', '12 mixed questions across every mode. One attempt a day — keep the streak alive.')}</p>
          <div class="daily-meta">
            <span class="pill plain">${icon('target')}${t('12 题', '12 questions')}</span>
            <span class="pill plain">${icon('clock')}${t('约 3 分钟', '~3 min')}</span>
            ${daily.done ? `<span class="pill plain">${icon('trophy')} ${daily.score} ${t('分', 'pts')}</span>` : ''}
          </div>
        </div>
        <div class="daily-cta"><span class="btn ${daily.done ? 'btn-ghost' : 'btn-primary'}">${daily.done ? t('查看战绩', 'View result') : t('开始挑战', 'Play now')} ${icon('arrow-right')}</span></div>
      </a>

      <a class="review-card" href="${mistakes ? '#/play/review' : '#/atlas'}">
        <div class="review-top">
          <span class="tag rose">${t('错题复习', 'REVIEW')}</span>
          ${icon('refresh')}
        </div>
        <div>
          <div class="review-count">${mistakes}</div>
          <h3>${mistakes ? t('个国家等待复习', 'countries to review') : t('错题本是空的', 'Your review list is empty')}</h3>
          <p>${mistakes ? t('把错题变成长期记忆', 'Turn mistakes into long-term memory') : t('继续挑战，或去图鉴认识新朋友', 'Keep playing, or meet new countries in the atlas')}</p>
        </div>
        <span class="btn btn-ghost btn-sm">${mistakes ? t('开始复习', 'Start review') : t('打开图鉴', 'Open atlas')} ${icon('arrow-right')}</span>
      </a>
    </section>

    <section class="home-section">
      <a class="tournament-banner" href="#/tournament">
        <div class="tb-emblem">${icon('trophy')}</div>
        <div class="tb-copy">
          <span class="tag gold">${t('环球锦标赛', 'WORLD TOURNAMENT')}</span>
          <h3>${t('和七位探险家争夺冠军', 'Take on seven explorers for the crown')}</h3>
          <p>${t('15 道混合题 · 3 个赛段 · 4 颗生命。答得越快，得分越高。', '15 mixed questions · 3 stages · 4 lives. Answer fast, score higher.')}</p>
        </div>
        <div class="tb-best">
          <b>${tournamentBest ? `#${tournamentBest}` : '—'}</b>
          <span>${t('历史最佳', 'BEST RANK')}</span>
        </div>
        <span class="btn btn-primary">${t('进入赛场', 'Enter arena')} ${icon('arrow-right')}</span>
      </a>
    </section>

    <footer style="margin-top:42px;padding-top:20px;border-top:1px solid var(--line);display:flex;gap:14px;justify-content:space-between;flex-wrap:wrap;color:var(--muted-2);font-size:10.5px">
      <span>${logoMark()} <span style="vertical-align:middle">GEOQUEST · ${t('用一面旗，认识整个世界', 'Know the world, one flag at a time')}</span></span>
      <span>${t('国旗来自 flagcdn · 数据来自 world-countries 与世界银行（2023）', 'Flags by flagcdn · Data from world-countries & World Bank (2023)')}</span>
    </footer>`;

  return {
    html: shell(content, 'home'),
    mount() {
      // No extra bindings: links are native. Add subtle parallax on the globe.
      const scene = document.querySelector('.globe-scene');
      if (!scene || window.matchMedia('(pointer: coarse)').matches) return;
      const onMove = (e) => {
        const r = scene.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        const globe = scene.querySelector('.globe');
        if (globe) globe.style.transform = `translate(${x * 8}px, ${y * 8}px)`;
      };
      const onLeave = () => {
        const globe = scene.querySelector('.globe');
        if (globe) globe.style.transform = '';
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseleave', onLeave);
      this.cleanup = () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseleave', onLeave);
      };
    },
  };
}

