import { BY_ID } from '../data.js';
import { MODES, modeText } from '../modes.js';
import { createRun } from '../engine.js';
import { store, levelInfo, dailyState, achievementText } from '../store.js';
import { icon } from '../icons.js';
import { t, isZh } from '../i18n.js';
import {
  countryName, capitalName, fmtPop, fmtDuration, fmtNumber, escapeHtml,
  flagImg, starIcons, timeUntilMidnight,
} from '../utils.js';
import { session } from '../session.js';
import { confetti, toast } from '../ui.js';
import { sfx } from '../audio.js';
import { logoMark } from '../layout.js';

function answerLabel(q, country) {
  if (!q) return '';
  if (q.type === 'capital') return capitalName(country);
  if (q.type === 'population') return `${fmtPop(country.population)} ${t('人', 'people')}`;
  if (q.type === 'independence') return countryName(country);
  return countryName(country);
}

function questionTypeLabel(q) {
  if (!q) return '';
  return {
    flag: t('国旗', 'Flag'), capital: t('首都', 'Capital'), country: t('国家', 'Country'),
    population: t('人口', 'Population'), independence: t('独立日', 'Independence'),
  }[q.type] || '';
}

function scoreRing(accuracy, score) {
  const r = 44;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - accuracy / 100);
  return `<div class="score-ring">
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <defs>
        <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#ffdc94"/><stop offset=".55" stop-color="#f7b83d"/><stop offset="1" stop-color="#3bdcb4"/>
        </linearGradient>
      </defs>
      <circle class="ring-bg" cx="50" cy="50" r="${r}" fill="none" stroke-width="6"/>
      <circle class="ring-fg" cx="50" cy="50" r="${r}" fill="none" stroke-width="6"
        stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${offset.toFixed(1)}"/>
    </svg>
    <div class="ring-copy"><b>${fmtNumber(score)}</b><span>${t('SCORE', 'SCORE')}</span></div>
  </div>`;
}

function reviewPanel(result) {
  const wrong = result.answers.filter((a) => !a.correct);
  if (!wrong.length) {
    return `<div class="result-panel">
      <h3>${icon('check')} ${t('本局回顾', 'Review')}</h3>
      <div class="review-empty">${icon('sparkle')}<p>${t('全部答对，没有错题。太棒了！', 'All correct — no mistakes to review. Amazing!')}</p></div>
    </div>`;
  }
  return `<div class="result-panel">
    <h3>${icon('refresh')} ${t('错题回顾', 'Review mistakes')} <span class="tag rose" style="margin-left:auto">${wrong.length}</span></h3>
    <div class="review-list">
      ${wrong.map((a) => {
        const target = a.target || BY_ID[a.q.targetId];
        const chosen = a.choiceId ? BY_ID[a.choiceId] : null;
        return `<div class="review-item">
          <span class="ri-flag">${flagImg(target)}</span>
          <span class="ri-body">
            <b>${escapeHtml(countryName(target))} <span style="font-weight:500;color:var(--muted)">· ${questionTypeLabel(a.q)}</span></b>
            <span>${t('正确', 'Answer')}：${escapeHtml(answerLabel(a.q, target))}${chosen ? ` · ${t('你选了', 'You picked')} ${escapeHtml9(answerLabel(a.q, chosen))}` : ''}${a.timedOut ? ` · <span class="ri-timeout">${t('超时', 'timeout')}</span>` : ''}${a.skipped ? ` · <span class="ri-timeout">${t('跳过', 'skipped')}</span>` : ''}</span>
          </span>
        </div>`;
      }).join('')}
    </div>
  </div>`;
}
function escapeHtml9(v) { return escapeHtml(v); }

function tournamentPanel(result) {
  const lb = result.leaderboard || [];
  return `<div class="result-panel">
    <h3>${icon('trophy')} ${t('最终排名', 'Final standings')} <span class="tag gold" style="margin-left:auto">#${result.rank} / ${lb.length}</span></h3>
    <div class="leaderboard">
      ${lb.map((row, i) => `<div class="lb-row ${row.me ? 'me' : ''} ${i < 3 ? 'top' : ''}">
        <span class="rank">${i + 1}</span>
        <span class="lb-name"><span class="mini-av">${row.me ? 'YOU' : row.name.slice(0, 2).toUpperCase()}</span>${row.me ? t('你', 'You') : row.name}</span>
        <span class="lb-score">${fmtNumber(row.score)}</span>
        <span class="lb-tag">${i === 0 ? t('冠军', 'CHAMP') : i < 3 ? t('领奖台', 'PODIUM') : ''}</span>
      </div>`).join('')}
    </div>
    ${result.rank === 1
      ? `<p class="tiny" style="color:var(--gold-2);margin-top:10px">${t('冠军！奖杯已经放进你的陈列室。', 'Champion! The trophy is yours.')}</p>`
      : `<p class="tiny muted" style="margin-top:10px">${t('再试一次，冠军只差几道题。', 'Try again — the crown is a few questions away.')}</p>`}
  </div>`;
}

function dailyPanel(result) {
  const daily = dailyState();
  return `<div class="result-panel">
    <h3>${icon('calendar')} ${t('每日连胜', 'Daily streak')}</h3>
    <div style="display:flex;align-items:center;gap:16px">
      <div style="width:58px;height:58px;border-radius:50%;display:grid;place-items:center;background:rgba(59,220,180,.1);border:1px solid rgba(59,220,180,.24);color:var(--teal)">${icon('flame')}</div>
      <div><div style="font:800 30px/1 var(--font-display);color:var(--gold-2)">${daily.streak} <small style="font-size:11px;color:var(--muted)">${t('天', 'days')}</small></div>
      <div class="tiny muted" style="margin-top:4px">${t('下一个挑战在', 'Next challenge in')} <b data-daily-countdown style="color:var(--text-2)">--:--:--</b></div></div>
    </div>
    <p class="tiny muted" style="margin-top:14px">${result.dailyUpdated ? t('今天的奖励已到账，明天继续。', 'Today’s rewards are in. Come back tomorrow.') : t('今天已经完成过挑战，本次不计入连胜。', 'You already completed today’s challenge. This run does not extend the streak.')}</p>
  </div>`;
}

function rightPanel(result) {
  if (result.kind === 'tournament') return tournamentPanel(result);
  if (result.kind === 'daily') return dailyPanel(result);
  const unlocked = result.unlocked || [];
  return `<div class="result-panel">
    <h3>${icon('star')} ${t('本局收获', 'Rewards')}</h3>
    <div class="result-achievements">
      ${unlocked.length ? unlocked.map((a) => `<div class="ra-item">${icon(a.icon)}<div><b>${achievementText(a, 'title')}</b><span>${achievementText(a, 'desc')}</span></div></div>`).join('')
        : `<p class="tiny muted" style="padding:6px 0 10px">${t('没有新成就，但每一次练习都在积累。', 'No new achievements this time — every run still counts.')}</p>`}
      <div class="ra-item" style="background:rgba(59,220,180,.05);border-color:rgba(59,220,180,.16)">${icon('sparkle')}<div><b>${t('熟练度', 'Mastery')}</b><span>${t('答对的国家熟练度 +1，集满 3 格即掌握。', 'Each correct answer adds mastery. Three pips = mastered.')}</span></div></div>
    </div>
  </div>`;
}

export function resultView() {
  const result = session.result;
  if (!result) {
    return { html: '', mount() { location.hash = '#/home'; } };
  }
  const mode = MODES[result.mode];
  const modeName = result.kind === 'daily' ? t('每日挑战', 'Daily Challenge')
    : result.kind === 'tournament' ? t('环球锦标赛', 'World Tournament')
      : result.kind === 'review' ? t('错题复习', 'Mistake Review')
        : mode ? modeText(mode, 'name') : '';
  const perfect = result.stars === 3;
  const zero = result.correct === 0;
  let title = t('关卡完成', 'Level complete');
  let sub = t('正确 {correct} / {total} 题 · 用时 {duration}', '{correct} / {total} correct · {duration}', { correct: result.correct, total: result.total, duration: fmtDuration(result.duration) });
  if (result.kind === 'tournament') {
    title = result.rank === 1 ? t('冠军！', 'Champion!') : result.rank <= 3 ? t('登上领奖台', 'On the podium') : t('第 {rank} 名', 'Rank #{rank}', { rank: result.rank });
    sub = t('在 8 位探险家中排名第 {rank}，得分 {score}。', 'You placed #{rank} of 8 explorers with {score} points.', { rank: result.rank, score: fmtNumber(result.score) });
  } else if (result.kind === 'daily') {
    title = t('今日挑战完成', "Today's challenge complete");
    sub = t('连续第 {n} 天完成挑战，明天再来。', 'Day {n} of your streak. Come back tomorrow.', { n: dailyState().streak });
  } else if (result.kind === 'review') {
    title = perfect ? t('全部记起来了！', 'All remembered!') : t('复习完成', 'Review complete');
    sub = t('从错题本中复习了 {n} 个国家。', 'Reviewed {n} countries from your mistake list.', { n: result.total });
  } else if (result.hearts <= 0) {
    title = t('探险结束', 'Run over');
    sub = t('生命值用完了，复习一下错题再出发。', 'You ran out of lives. Review your mistakes and try again.');
  } else if (perfect) {
    title = t('完美通关！', 'Flawless!');
    sub = t('全部答对，这就是世界公民的实力。', 'Every answer correct. That is world-class.');
  } else if (result.stars >= 1) {
    title = t('关卡完成', 'Level complete');
  }
  const nextLevel = mode && result.level < 6 && store.progress[result.mode]?.maxLevel >= result.level + 1;
  const totalCoins = (result.coins || 0) + (result.bonusCoins || 0);
  const totalXp = (result.xp || 0) + (result.bonusXp || 0);
  const lv = levelInfo();

  const html = `<div class="result-page">
    <div class="result-shell">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
        <a class="brand" href="#/home">${logoMark()}<span class="brand-text"><span class="brand-en">GEOQUEST</span><span class="brand-zh">${t('环球地理', 'WORLD GEO')}</span></span></a>
        <a class="back-link" href="#/home" style="margin:0">${icon('home')}${t('返回首页', 'Home')}</a>
      </div>
      <section class="result-hero ${perfect ? 'perfect' : zero ? 'zero' : ''}">
        <div class="result-score">${scoreRing(result.accuracy, result.score)}</div>
        <div class="result-copy">
          <div class="eyebrow">${escapeHtml(modeName)} ${result.kind === 'mode' ? `· LEVEL ${result.level}` : ''}</div>
          <h1>${title}</h1>
          <p>${sub}</p>
          ${result.kind === 'tournament' ? '' : `<div class="result-stars">${starIcons(result.stars, 3)}</div>`}
          ${result.newBest ? `<span class="tag gold" style="margin-top:12px">${icon('sparkle')} ${t('新纪录', 'NEW BEST')}</span>` : ''}
          ${result.leveledUp ? `<span class="tag teal" style="margin-top:12px">${icon('bolt')} ${t('等级提升', 'LEVEL UP')} · Lv.${result.levelAfter}</span>` : ''}
        </div>
        <div class="result-rewards">
          <div class="reward">${icon('coin')}${t('金币', 'Coins')}<b>+${totalCoins}</b></div>
          <div class="reward">${icon('sparkle')}${t('经验', 'XP')}<b>+${totalXp}</b></div>
          <div class="reward">${icon('star')}${t('准确率', 'Accuracy')}<b>${result.accuracy}%</b></div>
          ${result.kind === 'daily' ? `<div class="reward">${icon('flame')}${t('连胜', 'Streak')}<b>${dailyState().streak}</b></div>` : ''}
          ${result.kind === 'tournament' ? `<div class="reward">${icon('trophy')}${t('排名', 'Rank')}<b>#${result.rank}</b></div>` : ''}
        </div>
      </section>

      <div class="result-stats">
        <div class="rs-card">${icon('check')}<div><b>${result.correct} / ${result.total}</b><span>${t('答对题数', 'CORRECT')}</span></div></div>
        <div class="rs-card">${icon('flame')}<div><b>${result.bestCombo}×</b><span>${t('最佳连击', 'BEST COMBO')}</span></div></div>
        <div class="rs-card">${icon('clock')}<div><b>${fmtDuration(result.duration)}</b><span>${t('本局用时', 'DURATION')}</span></div></div>
        <div class="rs-card">${icon('medal')}<div><b>Lv.${lv.level}</b><span>${t('当前等级', 'PLAYER LEVEL')}</span></div></div>
      </div>

      <div class="result-main">
        ${reviewPanel(result)}
        ${rightPanel(result)}
      </div>

      <div class="result-actions">
        <button class="btn btn-primary btn-lg" data-retry>${icon('refresh')}${result.kind === 'daily' ? t('再练一次', 'Practice again') : t('再来一次', 'Play again')}</button>
        ${nextLevel ? `<button class="btn btn-ghost btn-lg" data-next-level>${icon('arrow-right')}${t('挑战第 {n} 关', 'Level {n}', { n: result.level + 1 })}</button>` : ''}
        ${result.answers.some((a) => !a.correct) ? `<a class="btn btn-ghost" href="#/play/review">${icon('refresh')}${t('复习错题', 'Review mistakes')}</a>` : ''}
        <button class="btn btn-ghost" data-share>${icon('share')}${t('分享战绩', 'Share')}</button>
        <span class="spacer"></span>
        <a class="btn btn-dark" href="#/home">${t('返回地图', 'Back to map')}</a>
      </div>
    </div>
  </div>`;

  return {
    html,
    mount() {
      const countdownEl = document.querySelector('[data-daily-countdown]');
      let timer = null;
      if (countdownEl) {
        const update = () => {
          const ms = timeUntilMidnight();
          const h = String(Math.floor(ms / 3600000)).padStart(2, '0');
          const m = String(Math.floor((ms % 3600000) / 60000)).padStart(2, '0');
          const s = String(Math.floor((ms % 60000) / 1000)).padStart(2, '0');
          countdownEl.textContent = `${h}:${m}:${s}`;
        };
        update();
        timer = setInterval(update, 1000);
      }
      let confettiTimer = null;
      const achievementTimers = [];
      if (perfect || (result.kind === 'tournament' && result.rank === 1)) {
        confettiTimer = setTimeout(() => confetti({ count: 100 }), 1100);
      }
      if ((result.kind === 'daily' || result.kind === 'tournament') && result.unlocked?.length) {
        result.unlocked.forEach((a, i) => {
          achievementTimers.push(setTimeout(() => {
            toast(`${t('成就解锁', 'Achievement')} · ${achievementText(a, 'title')}`, 'good', 'trophy', 3600);
          }, 900 + i * 1100));
        });
      }
      if (result.stars === 3) sfx('win'); else sfx('star');

      const retry = () => {
        session.result = null;
        let run;
        if (result.kind === 'daily') run = createRun({ mode: 'daily' });
        else if (result.kind === 'tournament') run = createRun({ mode: 'tournament' });
        else if (result.kind === 'review') {
          const ids = Object.keys(store.mistakes).slice(0, 10);
          run = createRun({ mode: 'review', level: 2, reviewIds: ids });
        } else {
          session.lastPlay = { mode: result.mode, level: result.level, region: result.region };
          run = createRun({ mode: result.mode, level: result.level, region: result.region });
        }
        if (!run || !run.questions.length) { toast(t('暂时无法开始新一局。', 'Could not start a new run.'), 'bad'); return; }
        session.run = run;
        location.hash = '#/game';
      };
      document.querySelector('[data-retry]')?.addEventListener('click', retry);
      document.querySelector('[data-next-level]')?.addEventListener('click', () => {
        session.result = null;
        session.lastPlay = { mode: result.mode, level: result.level + 1, region: result.region };
        const run = createRun({ mode: result.mode, level: result.level + 1, region: result.region });
        if (!run.questions.length) { toast(t('题目生成失败。', 'Could not build the next level.'), 'bad'); return; }
        session.run = run;
        location.hash = '#/game';
      });
      document.querySelector('[data-share]')?.addEventListener('click', async () => {
        const blocks = result.answers.map((a) => a.correct ? '🟩' : '🟥').join('');
        const text = `GEOQUEST ${modeName}${result.kind === 'mode' ? ` Lv.${result.level}` : ''}\n${'⭐'.repeat(result.stars)}${result.kind === 'tournament' ? ` #${result.rank}` : ''} ${result.score} ${t('分', 'pts')} · ${result.correct}/${result.total}\n${blocks}`;
        try {
          await navigator.clipboard.writeText(text);
          toast(t('战绩已复制到剪贴板', 'Result copied to clipboard'), 'good', 'share');
        } catch {
          toast(t('复制失败，请手动截图。', 'Copy failed — take a screenshot instead.'), 'bad', 'x');
        }
      });
      this.cleanup = () => {
        clearInterval(timer);
        if (confettiTimer) clearTimeout(confettiTimer);
        achievementTimers.forEach(clearTimeout);
        document.querySelectorAll('.confetti-canvas').forEach((el) => el.remove());
      };
    },
  };
}
