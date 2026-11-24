import { COUNTRIES, REGIONS } from '../data.js';
import {
  store, levelInfo, overallAccuracy, masteredCount, achievementList, modeStats, achievementText,
} from '../store.js';
import { MODES, MODE_ORDER, modeText } from '../modes.js';
import { shell, pageHead } from '../layout.js';
import { icon } from '../icons.js';
import { t, isZh, regionLabel, getLang } from '../i18n.js';
import { fmtNumber, fmtDuration, pct, escapeHtml } from '../utils.js';

function modeAccuracy(mode) {
  const p = modeStats(mode);
  return p.answered ? Math.round((p.correct / p.answered) * 100) : 0;
}

export function statsView() {
  const lv = levelInfo();
  const s = store.stats;
  const accuracy = overallAccuracy();
  const mastered = masteredCount();
  const achievements = achievementList();
  const unlocked = achievements.filter((a) => a.done).length;
  const rawName = store.profile.name || '探险家';
  const defaultNames = { zh: '探险家', en: 'Explorer', es: 'Explorador', fr: 'Explorateur' };
  const name = (rawName === '探险家' && getLang() !== 'zh') ? defaultNames[getLang()] : rawName;
  const initial = name.slice(0, 1).toUpperCase();
  const daily = store.daily;

  const modeBars = MODE_ORDER.map((id) => {
    const m = MODES[id];
    const acc = modeAccuracy(id);
    return `<div class="mode-bar-row">
      <span style="display:flex;align-items:center;gap:6px">${icon(m.icon)}${modeText(m, 'name')}</span>
      <div class="bar"><span style="width:${acc}%;background:linear-gradient(90deg,${m.accent},${m.accent}cc)"></span></div>
      <b>${acc}%</b>
    </div>`;
  }).join('');

  const regionRows = REGIONS.filter((r) => r.id !== 'world').map((r) => {
    const list = COUNTRIES.filter((c) => c.region === r.id);
    const done = list.filter((c) => (store.mastery[c.id] || 0) >= 3).length;
    const ratio = pct(done, list.length);
    return `<div class="region-mastery-row">
      <span>${regionLabel(r)}</span>
      <div class="bar thin"><span style="width:${ratio}%"></span></div>
      <b>${done} / ${list.length}</b>
    </div>`;
  }).join('');

  const achCards = achievements.map((a) => `<div class="achievement ${a.done ? 'unlocked' : ''}">
    <div class="ach-icon">${icon(a.done ? a.icon : 'lock')}</div>
    <div class="grow">
      <b>${achievementText(a, 'title')}</b>
      <p>${achievementText(a, 'desc')}</p>
      <div class="bar ach-bar"><span style="width:${a.done ? 100 : a.pct}%"></span></div>
      <div class="ach-progress">${a.done ? t('已解锁', 'Unlocked') : `${fmtNumber(a.current)} / ${fmtNumber(a.target)}`}</div>
    </div>
  </div>`).join('');

  const content = `${pageHead({
    eyebrow: t('探险家档案', 'EXPLORER PROFILE'),
    title: t('你的环球足迹', 'Your journey so far'),
    subtitle: t('每一次作答都会留下痕迹。看看你已经走了多远，下一步去哪里。', 'Every answer leaves a trace. See how far you have come — and where to go next.'),
  })}
    <section class="profile-hero">
      <div class="profile-avatar">${initial}</div>
      <div class="profile-info">
        <div class="row gap-10 wrap">
          <h1>${escapeHtml(name)}</h1>
          <span class="tag gold">LV.${lv.level}</span>
        </div>
        <div class="profile-lv">
          <span class="pill plain">${icon('flame')}${daily.streak} ${t('天连胜', 'day streak')}</span>
          <span class="pill plain">${icon('coin')}${fmtNumber(store.profile.coins)} ${t('金币', 'coins')}</span>
          <span class="pill plain">${icon('star')}${fmtNumber(store.profile.xp)} XP</span>
        </div>
        <div class="profile-xp">
          <div class="xp-label"><span>${t('升级进度', 'Level progress')}</span><span>${lv.into} / ${lv.need}</span></div>
          <div class="bar gold"><span style="width:${lv.pct}%"></span></div>
        </div>
      </div>
      <div class="profile-side">
        <div class="ps"><b>${fmtNumber(s.correct)}</b><span>${t('累计答对', 'CORRECT')}</span></div>
        <div class="ps"><b>${accuracy}%</b><span>${t('正确率', 'ACCURACY')}</span></div>
        <div class="ps"><b>${mastered}</b><span>${t('已掌握', 'MASTERED')}</span></div>
      </div>
    </section>

    <div class="stat-grid">
      <div class="stat-card">${icon('target')}<b>${fmtNumber(s.answered)}</b><span>${t('累计答题', 'QUESTIONS ANSWERED')}</span></div>
      <div class="stat-card">${icon('flame')}<b>${s.bestStreak}×</b><span>${t('最高连击', 'BEST STREAK')}</span></div>
      <div class="stat-card">${icon('clock')}<b>${fmtDuration(s.timePlayed)}</b><span>${t('游玩时长', 'TIME PLAYED')}</span></div>
      <div class="stat-card">${icon('trophy')}<b>${unlocked} / ${achievements.length}</b><span>${t('成就解锁', 'ACHIEVEMENTS')}</span></div>
    </div>

    <div class="stats-layout">
      <section class="stats-panel panel">
        <h3>${icon('chart')} ${t('各模式正确率', 'Accuracy by mode')}</h3>
        <div class="mode-bars">${modeBars}</div>
      </section>
      <section class="stats-panel panel">
        <h3>${icon('globe')} ${t('大区掌握度', 'Mastery by region')}</h3>
        <div class="region-mastery">${regionRows}</div>
      </section>
    </div>

    <div class="section-head" style="margin-top:30px">
      <div><div class="eyebrow" style="margin-bottom:8px">${t('里程碑', 'MILESTONES')}</div><h2 class="section-title">${t('成就陈列室', 'Achievement hall')}</h2></div>
      <span class="section-sub">${unlocked} / ${achievements.length} ${t('已解锁', 'unlocked')}</span>
    </div>
    <div class="achievement-grid">${achCards}</div>`;

  return { html: shell(content, 'stats') };
}
