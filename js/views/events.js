import { store, dailyState } from '../store.js';
import { createRun } from '../engine.js';
import { shell } from '../layout.js';
import { icon } from '../icons.js';
import { t, isZh } from '../i18n.js';
import { fmtNumber, timeUntilMidnight, todayKey } from '../utils.js';
import { session } from '../session.js';
import { startRunMeta } from '../store.js';
import { sfx } from '../audio.js';

function countdownText() {
  const ms = timeUntilMidnight();
  const h = String(Math.floor(ms / 3600000)).padStart(2, '0');
  const m = String(Math.floor((ms % 3600000) / 60000)).padStart(2, '0');
  const s = String(Math.floor((ms % 60000) / 1000)).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function startDaily(practice = false) {
  const run = createRun({ mode: 'daily' });
  if (!run.questions.length) return false;
  startRunMeta({ mode: 'flags', region: 'world', kind: 'daily' });
  session.run = run;
  session.result = null;
  if (practice) session.practice = true;
  sfx('start');
  location.hash = '#/game';
  return true;
}

function startTournament() {
  const run = createRun({ mode: 'tournament' });
  if (!run.questions.length) return false;
  startRunMeta({ mode: 'flags', region: 'world', kind: 'tournament' });
  session.run = run;
  session.result = null;
  sfx('start');
  location.hash = '#/game';
  return true;
}

export function dailyView() {
  const daily = dailyState();
  const history = store.daily.history || {};
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = todayKey(d);
    days.push({ key, done: !!history[key] || (i === 0 && daily.done), today: i === 0 });
  }

  const content = `<a class="back-link" href="#/home">${icon('arrow-left')}${t('返回首页', 'Back home')}</a>
    <section class="event-hero teal">
      <div>
        <div class="eyebrow">${t('每日挑战', 'DAILY CHALLENGE')}</div>
        <h1>${t('今天的环球小测', 'Today’s world quiz')}</h1>
        <p>${t('12 道混合题，从国旗到独立日。每天一次，保持连胜；完成后可以无限练习，但只有第一次计入奖励。', '12 mixed questions, from flags to independence days. One scored attempt per day — practice as much as you like afterwards.')}</p>
        <div class="event-meta">
          <span class="pill">${icon('target')}${t('12 题', '12 questions')}</span>
          <span class="pill">${icon('heart')}${t('3 颗心', '3 lives')}</span>
          <span class="pill">${icon('clock')}${t('14 秒 / 题', '14s / question')}</span>
          <span class="pill ${daily.streak ? 'gold' : ''}">${icon('flame')}${daily.streak} ${t('天连胜', 'day streak')}</span>
        </div>
        <div class="event-actions">
          ${daily.done
            ? `<button class="btn btn-ghost btn-lg" data-practice>${icon('refresh')}${t('再练一次', 'Practice again')}</button>
               <span class="pill teal">${icon('check')}${t('今日已完成', 'Completed today')} · ${daily.score} ${t('分', 'pts')}</span>`
            : `<button class="btn btn-primary btn-lg" data-start>${icon('play')}${t('开始今日挑战', 'Start today’s challenge')}</button>`}
        </div>
      </div>
      <div class="event-emblem">${icon('calendar')}</div>
    </section>

    <div class="event-rules" style="margin-top:16px">
      <div class="event-rule">${icon('target')}<b>${t('五模式混合', 'All five modes')}</b><p>${t('国旗、首都、国家、人口与独立日各有权重。', 'Flags, capitals, countries, population and independence all appear.')}</p></div>
      <div class="event-rule">${icon('flame')}<b>${t('保持连胜', 'Keep the streak')}</b><p>${t('连续完成每日挑战，最多累计 7 天成就。', 'Complete it on consecutive days to unlock the 7-day achievement.')}</p></div>
      <div class="event-rule">${icon('clock')}<b>${t('次日重置', 'Resets daily')}</b><p>${t('下一个挑战在 ', 'Next challenge in ')}<b data-countdown style="color:var(--teal)">${countdownText()}</b></p></div>
    </div>

    <section class="panel" style="padding:22px;margin-top:16px">
      <div class="row between" style="margin-bottom:16px">
        <h3 style="font:750 15px/1.2 var(--font-display);display:flex;align-items:center;gap:8px">${icon('calendar')}${t('最近 7 天', 'Last 7 days')}</h3>
        <span class="pill plain">${icon('trophy')}${t('历史最高', 'Best')} ${fmtNumber(Object.values(history).length ? Math.max(...Object.values(history)) : 0)} ${t('分', 'pts')}</span>
      </div>
      <div class="daily-history">
        ${days.map((d) => `<div class="dh-day ${d.done ? 'done' : ''} ${d.today ? 'today' : ''}">
          <span class="dh-dot">${d.done ? icon('check') : ''}</span>
          <span>${d.key.slice(5).replace('-', '/')}</span>
        </div>`).join('')}
      </div>
    </section>`;

  return {
    html: shell(content, 'home'),
    mount() {
      document.querySelector('[data-start]')?.addEventListener('click', () => startDaily(false));
      document.querySelector('[data-practice]')?.addEventListener('click', () => startDaily(true));
      let timer = null;
      const el = document.querySelector('[data-countdown]');
      if (el) timer = setInterval(() => { el.textContent = countdownText(); }, 1000);
      this.cleanup = () => clearInterval(timer);
    },
  };
}

export function tournamentView() {
  const best = store.tournament;
  const content = `<a class="back-link" href="#/home">${icon('arrow-left')}${t('返回首页', 'Back home')}</a>
    <section class="event-hero">
      <div>
        <div class="eyebrow">${t('环球锦标赛', 'WORLD TOURNAMENT')}</div>
        <h1>${t('七位对手，一座奖杯', 'Seven rivals. One trophy.')}</h1>
        <p>${t('15 道混合题，分小组赛、半决赛、决赛三个阶段。4 颗心，10 秒作答——答得越快，分数越高。最终与七位 AI 探险家同场排名。', '15 mixed questions across group stage, semi-final and final. Four lives, ten seconds — the faster you answer, the higher you score. Finish against seven AI explorers.')}</p>
        <div class="event-meta">
          <span class="pill">${icon('trophy')}${t('15 题', '15 questions')}</span>
          <span class="pill">${icon('heart')}${t('4 颗心', '4 lives')}</span>
          <span class="pill">${icon('bolt')}${t('10 秒 / 题', '10s / question')}</span>
          <span class="pill">${icon('users')}${t('8 人排名', '8-player ranking')}</span>
        </div>
        <div class="event-actions">
          <button class="btn btn-primary btn-lg" data-start-tournament>${icon('trophy')}${t('进入赛场', 'Enter the arena')}</button>
          ${best.bestRank ? `<span class="pill gold">${icon('medal')}${t('历史最佳', 'Best')} #${best.bestRank}</span>` : ''}
        </div>
      </div>
      <div class="event-emblem">${icon('trophy')}</div>
    </section>

    <div class="event-rules">
      <div class="event-rule">${icon('users')}<b>${t('小组赛 · 第 1–5 题', 'Group stage · Q1–5')}</b><p>${t('热身题，以国旗和国家为主。', 'A warm-up focused on flags and countries.')}</p></div>
      <div class="event-rule">${icon('bolt')}<b>${t('半决赛 · 第 6–10 题', 'Semi-final · Q6–10')}</b><p>${t('首都、人口与更接近的选项。', 'Capitals, population and closer options.')}</p></div>
      <div class="event-rule">${icon('crown')}<b>${t('决赛 · 第 11–15 题', 'Final · Q11–15')}</b><p>${t('独立日与混合题型，冠军在最后一题决出。', 'Independence days and mixed rounds. The crown is decided at the end.')}</p></div>
    </div>

    <div class="stats-layout" style="margin-top:16px">
      <section class="stats-panel panel">
        <h3>${icon('medal')} ${t('你的锦标赛战绩', 'Your tournament record')}</h3>
        <div class="stat-grid" style="grid-template-columns:repeat(3,1fr);margin:0">
          <div class="stat-card">${icon('trophy')}<b>${best.bestRank ? `#${best.bestRank}` : '—'}</b><span>${t('最佳名次', 'BEST RANK')}</span></div>
          <div class="stat-card">${icon('crown')}<b>${best.wins}</b><span>${t('冠军次数', 'WINS')}</span></div>
          <div class="stat-card">${icon('star')}<b>${fmtNumber(best.bestScore)}</b><span>${t('最高得分', 'BEST SCORE')}</span></div>
        </div>
      </section>
      <section class="stats-panel panel">
        <h3>${icon('info')} ${t('规则', 'Rules')}</h3>
        <p class="small muted" style="line-height:1.8">${t(
          '答对得分，剩余时间越多分越高；连续答对会叠加连击倍率。答错或超时扣一颗心。生命耗尽则比赛结束。最终分数与 7 位 AI 选手一起排名。',
          'Correct answers score, faster answers score more, and streaks add a combo multiplier. Wrong answers or timeouts cost a life. The run ends at zero lives. Your score is ranked against seven AI explorers.',
        )}</p>
      </section>
    </div>`;

  return {
    html: shell(content, 'home'),
    mount() {
      document.querySelector('[data-start-tournament]')?.addEventListener('click', startTournament);
    },
  };
}
