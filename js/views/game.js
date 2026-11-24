import { BY_ID } from '../data.js';
import { MODES, levelConfig, modeText } from '../modes.js';
import { currentQuestion, answerQuestion, finishRun, stageInfo } from '../engine.js';
import { store, spendCoins, achievementText } from '../store.js';
import { icon } from '../icons.js';
import { t, isZh, getLang, altCapital, regionName } from '../i18n.js';
import {
  flagImg, countryName, capitalName, altName, factText, fmtPop, fmtArea, fmtDate,
  escapeHtml, prefersReducedMotion, clamp,
} from '../utils.js';
import { openModal, closeModal, confirmDialog, toast, confetti } from '../ui.js';
import { session } from '../session.js';
import { sfx } from '../audio.js';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function modeTitle(run) {
  if (run.kind === 'daily') return t('每日挑战', 'Daily Challenge');
  if (run.kind === 'tournament') return t('环球锦标赛', 'World Tournament');
  if (run.kind === 'review') return t('错题复习', 'Mistake Review');
  const m = MODES[run.mode];
  return m ? modeText(m, 'name') : '';
}

function mascotSVG() {
  return `<svg viewBox="0 0 120 120" role="img" aria-hidden="true">
    <defs>
      <radialGradient id="mg" cx="34%" cy="28%" r="78%">
        <stop offset="0" stop-color="#38d9b6"/>
        <stop offset="55%" stop-color="#148b8a"/>
        <stop offset="100%" stop-color="#0b3c55"/>
      </radialGradient>
      <linearGradient id="ms" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#ffcf74"/><stop offset="1" stop-color="#e79a1e"/>
      </linearGradient>
    </defs>
    <ellipse cx="60" cy="108" rx="30" ry="5" fill="#000" opacity=".22"/>
    <circle cx="60" cy="58" r="43" fill="url(#mg)" stroke="#8cf3dc" stroke-opacity=".45" stroke-width="1.5"/>
    <path d="M29 45c8-8 18-6 22-13 3-5 9-7 15-4 6 3 7 9 14 12 5 2 10 1 14-1-2 8-9 15-18 17-8 2-13 8-13 15 0 6 4 11 3 17-10 1-20-4-27-12-8-9-12-20-10-31z" fill="#0d5a63" opacity=".62"/>
    <path d="M31 63c9-4 17-2 22 4 4 5 3 11-1 15-8-2-15-8-21-19z" fill="#84f0d4" opacity=".24"/>
    <ellipse cx="49" cy="55" rx="8" ry="9" fill="#f8fbff"/>
    <ellipse cx="72" cy="55" rx="8" ry="9" fill="#f8fbff"/>
    <circle cx="50.5" cy="56.5" r="4" fill="#071521"/>
    <circle cx="73.5" cy="56.5" r="4" fill="#071521"/>
    <circle cx="52" cy="55" r="1.3" fill="#fff"/>
    <circle cx="75" cy="55" r="1.3" fill="#fff"/>
    <path d="M53 70c4 4 10 4 14 0" fill="none" stroke="#06232b" stroke-width="2.6" stroke-linecap="round"/>
    <circle cx="41" cy="65" r="4" fill="#ff8b8b" opacity=".35"/>
    <circle cx="81" cy="65" r="4" fill="#ff8b8b" opacity=".35"/>
    <path d="M18 85c8 2 15 8 20 16" fill="none" stroke="url(#ms)" stroke-width="6" stroke-linecap="round" opacity=".9"/>
    <path d="M102 85c-7 2-13 7-18 14" fill="none" stroke="url(#ms)" stroke-width="6" stroke-linecap="round" opacity=".9"/>
    <path d="M93 18l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#ffdc94" opacity=".9"/>
    <circle cx="26" cy="24" r="2" fill="#8cf3dc" opacity=".8"/>
  </svg>`;
}

function correctMark() { return icon('check'); }
function wrongMark() { return icon('x'); }

function questionKicker(run) {
  if (run.kind === 'daily') {
    return `<span class="dot"></span>${t('每日挑战', 'DAILY')} · ${t('第', 'Q')} ${run.index + 1} / ${run.total}`;
  }
  if (run.kind === 'tournament') {
    const s = stageInfo(run);
    return `<span class="dot"></span>${s[getLang()] || s.en} · ${t('第', 'Q')} ${run.index + 1} / ${run.total}`;
  }
  if (run.kind === 'review') {
    return `<span class="dot"></span>${t('错题复习', 'REVIEW')} · ${t('第', 'Q')} ${run.index + 1} / ${run.total}`;
  }
  return `<span class="dot"></span>LEVEL ${run.level} · ${t('第', 'Q')} ${run.index + 1} / ${run.total}`;
}

function questionHead(run, q) {
  const target = BY_ID[q.targetId];
  if (q.type === 'flag') {
    return `<div class="q-kicker">${questionKicker(run)}</div>
      <h1 class="q-title">${escapeHtml(countryName(target))}</h1>
      <div class="q-alt">${escapeHtml(altName(target))}</div>
      <p class="q-ask">${t('选出正确的国旗', 'Pick the correct flag')}</p>`;
  }
  if (q.type === 'capital') {
    return `<div class="q-kicker">${questionKicker(run)}</div>
      <h1 class="q-title">${escapeHtml(countryName(target))}</h1>
      <div class="q-alt">${escapeHtml(altName(target))}</div>
      <p class="q-ask">${t('这个国家的首都是？', 'What is the capital?')}</p>`;
  }
  if (q.type === 'country') {
    return `<div class="q-kicker">${questionKicker(run)}</div>
      <h1 class="q-title small-title">${t('这是哪个国家？', 'Which country is this?')}</h1>
      <p class="q-ask">${t('结合国旗与地图位置作答', 'Use the flag and the map location')}</p>`;
  }
  if (q.type === 'population') {
    const more = q.ask === 'max';
    return `<div class="q-kicker">${questionKicker(run)}</div>
      <h1 class="q-title small-title">${more ? t('哪个国家人口更多？', 'Which country has more people?') : t('哪个国家人口更少？', 'Which country has fewer people?')}</h1>
      <div class="q-alt">POPULATION · 2023</div>
      <p class="q-ask">${t('从四个国家中选出答案', 'Choose one of the four countries')}</p>`;
  }
  return `<div class="q-kicker">${questionKicker(run)}</div>
    <h1 class="q-title small-title">${fmtDate(q.date)}</h1>
    <div class="q-alt">INDEPENDENCE DAY</div>
    <p class="q-ask">${t('哪个国家在这一天庆祝独立？', 'Which country celebrates independence on this day?')}</p>`;
}

function mapPin(country) {
  const left = clamp(((country.lng + 180) / 360) * 100, 1.5, 98.5);
  const top = clamp(((90 - country.lat) / 180) * 100, 2, 98);
  return `<span class="map-pin" style="left:${left.toFixed(2)}%;top:${top.toFixed(2)}%"></span>`;
}

function questionVisual(q) {
  if (q.type !== 'country') return '';
  const target = BY_ID[q.targetId];
  return `<div class="country-visual">
    <div class="cv-flag">${flagImg(target)}</div>
    <div class="map-card">
      <img src="/assets/world-map.svg" alt="${t('世界地图', 'World map')}">
      ${mapPin(target)}
      <span class="map-label">LOCATION</span>
    </div>
  </div>`;
}

function flagCard(c, index, removed = false) {
  return `<button class="flag-card ${removed ? 'is-removed' : ''}" data-choice="${c.id}" data-key="${LETTERS[index]}"
    aria-label="${escapeHtml(countryName(c))}" ${removed ? 'disabled' : ''}>
    ${flagImg(c)}
    <span class="answer-mark">${correctMark()}</span>
  </button>`;
}

function answerGrid(q) {
  if (q.type === 'capital') {
    return `<div class="answer-grid">${q.optionIds.map((id, i) => {
      const c = BY_ID[id];
      return `<button class="answer-btn" data-choice="${id}" data-key="${LETTERS[i]}">
        <span class="key">${LETTERS[i]}</span>
        <span class="txt">${escapeHtml(capitalName(c))}<small>${escapeHtml(altCapital(c))}</small></span>
        <span class="mark">${correctMark()}</span>
      </button>`;
    }).join('')}</div>`;
  }
  if (q.type === 'country') {
    return `<div class="answer-grid">${q.optionIds.map((id, i) => {
      const c = BY_ID[id];
      return `<button class="answer-btn" data-choice="${id}" data-key="${LETTERS[i]}">
        <span class="key">${LETTERS[i]}</span>
        <span class="txt">${escapeHtml(countryName(c))}</span>
        <span class="mark">${correctMark()}</span>
      </button>`;
    }).join('')}</div>`;
  }
  if (q.type === 'population') {
    return `<div class="answer-grid pop-grid">${q.optionIds.map((id, i) => {
      const c = BY_ID[id];
      return `<button class="answer-btn" data-choice="${id}" data-key="${LETTERS[i]}">
        <span class="flag-thumb">${flagImg(c)}</span>
        <span>
          <span class="pop-name">${escapeHtml(countryName(c))}</span>
          <span class="pop-value" data-pop="${id}"></span>
        </span>
        <span class="mark">${correctMark()}</span>
      </button>`;
    }).join('')}</div>`;
  }
  return '';
}

function flagAnswers(q, removedIds) {
  if (q.type === 'independence') {
    return `<div class="flag-grid">${q.optionIds.map((id, i) => flagCard(BY_ID[id], i, removedIds.has(id))).join('')}</div>`;
  }
  const many = q.optionIds.length > 6;
  const manyClass = many ? (q.optionIds.length >= 10 ? 'many many-10' : 'many many-8') : '';
  return `<div class="flag-strip-wrap">
    ${many ? '' : `<button class="strip-arrow prev" data-scroll="-1" aria-label="${t('向左', 'Scroll left')}">${icon('chevron-left')}</button>`}
    <div class="flag-strip ${manyClass}" data-strip>${q.optionIds.map((id, i) => flagCard(BY_ID[id], i, removedIds.has(id))).join('')}</div>
    ${many ? '' : `<button class="strip-arrow next" data-scroll="1" aria-label="${t('向右', 'Scroll right')}">${icon('chevron-right')}</button>`}
  </div>`;
}

function renderAnswers(q, removedIds) {
  if (q.type === 'flag' || q.type === 'independence') return flagAnswers(q, removedIds);
  return answerGrid(q);
}

function feedbackMeta(target, q) {
  const items = [
    `${icon('landmark')}${escapeHtml(capitalName(target))}`,
    `${icon('users')}${fmtPop(target.population)}`,
    `${icon('map')}${fmtArea(target)}`,
    `${icon('map-pin')}${escapeHtml(regionName(target))}`,
  ];
  if (q.type === 'independence' && target.independence) {
    items.push(`${icon('calendar')}${fmtDate(target.independence)}`);
  }
  return items.map((x) => `<span>${x}</span>`).join('');
}

export function gameView() {
  const run = session.run;
  if (!run) {
    return {
      html: '',
      mount() { location.hash = '#/home'; },
    };
  }

  const mode = MODES[run.mode];
  const title = modeTitle(run);
  const accent = mode?.accent || (run.kind === 'daily' ? '#3bdcb4' : '#f7b83d');
  const hearts = Array.from({ length: run.maxHearts }, () => `<span>${icon('heart')}</span>`).join('');

  const html = `<div class="game" style="--accent:${accent}">
    <header class="game-bar">
      <div class="game-bar-left">
        <button class="icon-btn" data-back aria-label="${t('暂停并返回', 'Pause and go back')}">${icon('arrow-left')}</button>
        <div class="game-title"><b>${escapeHtml(title)}</b><span>${run.kind === 'tournament' ? t('15 题 · 4 颗心', '15 Qs · 4 lives') : `${run.total} ${t('道题', 'questions')}`}</span></div>
      </div>
      <div class="game-bar-center">
        <div class="q-progress"><span data-progress></span></div>
        <div class="q-counter" data-counter></div>
        <span class="mobile-time" data-time-mobile>${run.seconds}s</span>
      </div>
      <div class="game-bar-right">
        <div class="hearts" data-hearts aria-label="${t('生命值', 'Lives')}">${hearts}</div>
        <span class="pill gold" data-coins>${icon('coin')}<span>${store.profile.coins}</span></span>
        <span class="pill score-mobile" data-score-mobile>${icon('star')}<span>0</span></span>
        <button class="icon-btn" data-hints aria-label="${t('提示', 'Hints')}">${icon('lightbulb')}</button>
        <button class="icon-btn" data-pause aria-label="${t('暂停', 'Pause')}">${icon('pause')}</button>
      </div>
    </header>
    <div class="timer-bar" data-timerbar><span></span></div>
    <main class="game-stage">
      <aside class="stage-left">
        <div class="mascot">
          <div class="mascot-orb" data-mascot>${mascotSVG()}</div>
          <div class="mascot-bubble" data-bubble>${t('准备好了吗？', 'Ready when you are.')}</div>
        </div>
      </aside>
      <section class="stage-center">
        <div class="q-head q-anim" data-qhead></div>
        <div data-qvisual></div>
        <div class="answers" data-answers></div>
        <div class="mobile-stats">
          <div><span>SCORE</span><b data-mscore>0</b></div>
          <div><span>COMBO</span><b data-mcombo>×1</b></div>
          <div><span>COINS</span><b data-mcoins>${store.profile.coins}</b></div>
        </div>
      </section>
      <aside class="stage-right">
        <div class="side-card"><div class="sc-label">${icon('star')}SCORE</div><div class="sc-big" data-score-side>0</div></div>
        <div class="side-card combo-card" data-combo>
          <span class="flame">${icon('flame')}</span>
          <div><b data-combo-num>×1</b><span>${t('连击加成', 'COMBO')}</span></div>
        </div>
        <div class="timer-dial" data-dial>
          <div class="timer-dial-inner" style="--p:100">
            <div style="text-align:center"><span data-time>${run.seconds}</span><small>SEC</small></div>
          </div>
        </div>
        <div class="hint-side">
          <button class="hint-mini" data-hint="fifty">${icon('target')}<span><b>50 / 50</b><span>${t('排除一半错误', 'Remove half')}</span></span><span class="cost">30</span></button>
          <button class="hint-mini" data-hint="freeze">${icon('timer')}<span><b>${t('时间冻结', 'Freeze')}</b><span>+8 ${t('秒', 'sec')}</span></span><span class="cost">20</span></button>
          <button class="hint-mini" data-hint="skip">${icon('skip-forward')}<span><b>${t('跳过', 'Skip')}</b><span>${t('不扣生命', 'No life lost')}</span></span><span class="cost">50</span></button>
        </div>
      </aside>
    </main>
    <div class="feedback-host" data-feedback></div>
  </div>`;

  return {
    html,
    mount() {
      let alive = true;
      let answered = false;
      let feedbackOpen = false;
      let paused = false;
      let timeLeft = run.seconds;
      let deadline = 0;
      let timerId = null;
      let hintUsedThisQ = false;
      let lastHearts = run.hearts;
      let lastTick = null;
      let began = false;
      const removedIds = new Set();
      let gameEl = null;

      const qs = (sel) => gameEl.querySelector(sel);
      const qsa = (sel) => [...gameEl.querySelectorAll(sel)];

      function updateTimerUI() {
        const ratio = clamp(timeLeft / run.seconds, 0, 1);
        const bar = qs('[data-timerbar]');
        bar.querySelector('span').style.width = `${ratio * 100}%`;
        bar.classList.toggle('warn', ratio <= 0.45 && ratio > 0.24);
        bar.classList.toggle('danger', ratio <= 0.24);
        const dial = qs('[data-dial]');
        dial.querySelector('.timer-dial-inner').style.setProperty('--p', Math.max(0, ratio * 100).toFixed(1));
        dial.classList.toggle('warn', ratio <= 0.45 && ratio > 0.24);
        dial.classList.toggle('danger', ratio <= 0.24);
        qs('[data-time]').textContent = Math.max(0, Math.ceil(timeLeft));
        const mobileTime = qs('[data-time-mobile]');
        if (mobileTime) mobileTime.textContent = `${Math.max(0, Math.ceil(timeLeft))}s`;
      }

      function updateHeader() {
        qs('[data-progress]').style.width = `${((run.index + (answered ? 1 : 0)) / run.total) * 100}%`;
        qs('[data-counter]').innerHTML = `<b>${run.index + 1}</b> / ${run.total}`;
        const heartsEl = qs('[data-hearts]');
        const justLost = run.hearts < lastHearts;
        heartsEl.innerHTML = Array.from({ length: run.maxHearts }, (_, i) => {
          const off = i >= run.hearts;
          const hit = off && justLost && i === run.hearts ? ' hit' : '';
          return `<span>${icon('heart', `ic ${off ? 'off' : ''}${hit}`)}</span>`;
        }).join('');
        lastHearts = run.hearts;
        const coins = qs('[data-coins] span');
        if (coins) coins.textContent = store.profile.coins;
        const score = qs('[data-score]');
        const scoreSide = qs('[data-score-side]');
        const scoreMobile = qs('[data-score-mobile] span');
        if (score) score.textContent = run.score;
        if (scoreSide) scoreSide.textContent = run.score;
        if (scoreMobile) scoreMobile.textContent = run.score;
        const combo = qs('[data-combo]');
        const comboNum = qs('[data-combo-num]');
        if (combo) combo.classList.toggle('on', run.combo >= 2);
        if (comboNum) comboNum.textContent = `×${Math.max(1, run.combo)}`;
        const ms = qs('[data-mscore]');
        const mc = qs('[data-mcombo]');
        const mcoin = qs('[data-mcoins]');
        if (ms) ms.textContent = run.score;
        if (mc) mc.textContent = `×${Math.max(1, run.combo)}`;
        if (mcoin) mcoin.textContent = store.profile.coins;
        updateTimerUI();
      }

      function setBubble(text) {
        const bubble = qs('[data-bubble]');
        if (bubble) bubble.textContent = text;
      }

      function renderQuestion() {
        answered = false;
        feedbackOpen = false;
        hintUsedThisQ = false;
        timeLeft = run.seconds;
        lastTick = null;
        removedIds.clear();
        const q = currentQuestion(run);
        if (!q) { endRun(); return; }
        qs('[data-qhead]').innerHTML = questionHead(run, q);
        qs('[data-qvisual]').innerHTML = questionVisual(q);
        qs('[data-answers]').innerHTML = renderAnswers(q, removedIds);
        const head = qs('[data-qhead]');
        head.classList.remove('q-anim');
        void head.offsetWidth;
        head.classList.add('q-anim');
        setBubble(q.type === 'flag'
          ? t('看准颜色和图案。', 'Watch the colours and shapes.')
          : q.type === 'capital'
            ? t('回忆一下它的位置。', 'Picture the country on the map.')
            : q.type === 'independence'
              ? t('日期里藏着历史线索。', 'The date holds a historical clue.')
              : t('相信你的第一直觉。', 'Trust your first instinct.'));
        updateHeader();
        bindStrip();
        startTimer();
      }

      function bindStrip() {
        const strip = qs('[data-strip]');
        if (!strip) return;
        const prev = qs('[data-scroll="-1"]');
        const next = qs('[data-scroll="1"]');
        const refresh = () => {
          if (!prev || !next) return;
          prev.disabled = strip.scrollLeft <= 4;
          next.disabled = strip.scrollLeft + strip.clientWidth >= strip.scrollWidth - 4;
        };
        strip.addEventListener('scroll', refresh, { passive: true });
        refresh();
      }

      function startTimer() {
        if (!alive || answered || feedbackOpen || !began) return;
        paused = false;
        deadline = performance.now() + timeLeft * 1000;
        clearInterval(timerId);
        timerId = setInterval(tick, 100);
        updateTimerUI();
      }

      function stopTimer() {
        if (timerId) clearInterval(timerId);
        timerId = null;
        if (deadline) {
          timeLeft = Math.max(0, (deadline - performance.now()) / 1000);
          deadline = 0;
        }
      }

      function tick() {
        if (!alive || answered) return;
        timeLeft = Math.max(0, (deadline - performance.now()) / 1000);
        const sec = Math.ceil(timeLeft);
        if (timeLeft <= 3.15 && timeLeft > 0 && sec !== lastTick) {
          lastTick = sec;
          sfx('tick');
        }
        updateTimerUI();
        if (timeLeft <= 0) {
          stopTimer();
          handleAnswer(null, { timedOut: true });
        }
      }

      function pauseTimer() {
        if (paused) return;
        stopTimer();
        paused = true;
      }

      function resumeTimer() {
        if (!alive || answered || feedbackOpen || timerId) return;
        if (!began) { paused = false; return; }
        paused = false;
        deadline = performance.now() + timeLeft * 1000;
        timerId = setInterval(tick, 100);
        updateTimerUI();
      }

      function markAnswer(choiceId, timedOut) {
        const q = currentQuestion(run);
        const correctId = q.answerId;
        for (const btn of qsa('[data-choice]')) {
          const id = btn.dataset.choice;
          btn.disabled = true;
          if (id === correctId) {
            btn.classList.add('is-correct');
            const mark = btn.querySelector('.answer-mark, .mark');
            if (mark) mark.innerHTML = correctMark();
          } else if (id === choiceId && !timedOut) {
            btn.classList.add('is-wrong');
            const mark = btn.querySelector('.answer-mark, .mark');
            if (mark) mark.innerHTML = wrongMark();
          } else {
            btn.classList.add('is-dim');
          }
        }
        if (q.type === 'population') {
          for (const el of qsa('[data-pop]')) {
            const c = BY_ID[el.dataset.pop];
            if (c) el.innerHTML = `<b>${fmtPop(c.population, true)}</b> ${t('人', 'people')}`;
          }
        }
        if (q.type === 'country') {
          const label = qs('.map-label');
          const target = BY_ID[q.targetId];
          if (label) label.textContent = countryName(target);
        }
      }

      function feedbackFact(q, target) {
        if (q.type === 'population') {
          const more = q.ask === 'max';
          return t(
            `${countryName(target)}人口约 ${fmtPop(target.population)}，是四个选项中人口${more ? '最多' : '最少'}的国家。`,
            `${countryName(target)} has about ${fmtPop(target.population)} people — the ${more ? 'largest' : 'smallest'} of the four.`,
          );
        }
        if (q.type === 'independence') {
          return t(
            `${countryName(target)}于 ${fmtDate(target.independence)} 独立。${factText(target)}`,
            `${countryName(target)} became independent on ${fmtDate(target.independence)}. ${factText(target)}`,
          );
        }
        return factText(target);
      }

      function showFeedback(res) {
        const q = currentQuestion(run);
        const target = BY_ID[q.targetId];
        const isLast = run.hearts <= 0 || run.index >= run.total - 1;
        const correct = res.correct;
        const skipped = res.skipped;
        const title = correct
          ? `${t('答对了！', 'Correct!')} ${res.points ? `<span class="pts">+${res.points}</span>` : ''}`
          : skipped
            ? t('已跳过', 'Skipped')
            : res.timedOut
              ? t('时间到', 'Time’s up')
              : t('差一点', 'Not quite');
        const cap = capitalName(target);
        const sub = correct
          ? (cap === countryName(target)
            ? escapeHtml(countryName(target))
            : `${escapeHtml(countryName(target))} · ${escapeHtml(cap)}`)
          : `${t('正确答案是', 'The answer is')} <b>${escapeHtml(countryName(target))}</b>`;
        const cls = correct ? 'correct' : res.timedOut ? 'warn' : 'bad';
        const iconName = correct ? 'check' : res.timedOut ? 'clock' : 'x';
        const button = isLast ? t('查看结果', 'See results') : t('继续', 'Continue');
        qs('[data-feedback]').innerHTML = `
          <div class="feedback-panel ${cls}" role="status" aria-live="polite">
            <div class="fb-icon">${icon(iconName)}</div>
            <div class="fb-body">
              <div class="fb-title">${title}</div>
              <div class="fb-fact">${sub} · ${escapeHtml(feedbackFact(q, target))}</div>
              <div class="fb-meta">${feedbackMeta(target, q)}</div>
            </div>
            <div class="fb-actions">
              <button class="btn btn-primary" data-next>${button} <kbd>Space</kbd></button>
              <div class="fb-tip">${t('按空格继续', 'Press space to continue')}</div>
            </div>
          </div>`;
        qs('.feedback-panel')?.classList.add('show');
        if (correct) {
          sfx('correct');
          animateMascot('happy');
          setBubble(run.combo >= 5 ? t('势不可挡！', 'Unstoppable!') : t('干得漂亮！', 'Nice work!'));
        } else if (skipped) {
          sfx('click');
          setBubble(t('跳过也没关系。', 'A skip is okay.'));
        } else {
          sfx(res.timedOut ? 'timeout' : 'wrong');
          animateMascot('sad');
          setBubble(t('记住它，下次一定行。', 'Remember it for next time.'));
        }
        for (const a of res.unlocked || []) {
          toast(`${t('成就解锁', 'Achievement')} · ${achievementText(a, 'title')}`, 'good', 'trophy', 3600);
        }
      }

      function animateMascot(kind) {
        const m = qs('[data-mascot]');
        if (!m) return;
        m.classList.remove('happy', 'sad');
        void m.offsetWidth;
        m.classList.add(kind);
        setTimeout(() => m?.classList.remove('happy', 'sad'), 800);
      }

      function handleAnswer(choiceId, { timedOut = false, skip = false } = {}) {
        if (!alive || answered) return;
        answered = true;
        feedbackOpen = true;
        stopTimer();
        const res = answerQuestion(run, choiceId, {
          timeLeft, timedOut, skip, hinted: hintUsedThisQ,
        });
        if (!res) return;
        markAnswer(choiceId, timedOut);
        updateHeader();
        showFeedback(res);
        if (correctFlash(res)) {
          // tiny celebratory pulse on the score
          qs('[data-score-side]')?.animate(
            [{ transform: 'scale(1)' }, { transform: 'scale(1.16)' }, { transform: 'scale(1)' }],
            { duration: 420, easing: 'ease-out' },
          );
        }
      }

      function correctFlash(res) { return res.correct; }

      function nextQuestion() {
        if (!answered) return;
        qs('[data-feedback]').innerHTML = '';
        if (run.hearts <= 0 || run.index >= run.total - 1) {
          endRun();
          return;
        }
        run.index += 1;
        feedbackOpen = false;
        renderQuestion();
      }

      function endRun() {
        if (!alive) return;
        stopTimer();
        const result = finishRun(run);
        session.result = result;
        session.run = null;
        closeModal(true);
        sfx(result.stars === 3 ? 'win' : 'star');
        location.hash = '#/result';
      }

      function openPause(auto = false) {
        if (!alive) return;
        if (!answered && !feedbackOpen) pauseTimer();
        openModal({
          title: '',
          dismissible: false,
          showClose: false,
          content: `<div class="pause-panel">
            <div class="pause-icon">${icon('pause')}</div>
            <h2>${auto ? t('已自动暂停', 'Paused automatically') : t('休息一下', 'Take a break')}</h2>
            <p>${t('计时已经暂停，准备好再继续。', 'The timer is paused. Continue when you are ready.')}</p>
            <div class="pause-stats">
              <div><b>${run.score}</b><span>${t('得分', 'SCORE')}</span></div>
              <div><b>${run.index + 1}/${run.total}</b><span>${t('进度', 'PROGRESS')}</span></div>
              <div><b>${run.combo}×</b><span>${t('连击', 'COMBO')}</span></div>
            </div>
            <div class="pause-actions">
              <button class="btn btn-primary" data-resume>${icon('play')}${t('继续游戏', 'Resume')}</button>
              <button class="btn btn-ghost" data-quit>${icon('log-out')}${t('退出本局', 'Quit run')}</button>
            </div>
          </div>`,
          onMount(el, close) {
            el.querySelector('[data-resume]').addEventListener('click', () => {
              closeModal(true);
              resumeTimer();
            });
            el.querySelector('[data-quit]').addEventListener('click', () => {
              closeModal(true);
              confirmDialog({
                title: t('退出本局？', 'Quit this run?'),
                message: t('本局不会计入关卡成绩，但已获得的经验与金币会保留。', 'This run will not count toward level records, but earned XP and coins are kept.'),
                confirmText: t('退出', 'Quit'),
                cancelText: t('继续游戏', 'Keep playing'),
                danger: true,
                iconName: 'log-out',
              }).then((ok) => {
                if (!alive) return;
                if (ok) {
                  alive = false;
                  closeModal(true);
                  location.hash = '#/home';
                } else {
                  resumeTimer();
                }
              });
            });
          },
        });
      }

      function openHints() {
        if (answered || feedbackOpen || !alive) return;
        pauseTimer();
        const coins = store.profile.coins;
        const cost = { fifty: 30, freeze: 20, skip: 50 };
        const can = (k) => coins >= cost[k] && !hintUsedThisQ;
        openModal({
          title: t('使用提示', 'Use a hint'),
          subtitle: t('每道题只能使用一次提示，消耗金币。', 'One hint per question. Hints cost coins.'),
          dismissible: true,
          onClose: () => { if (alive && !answered) resumeTimer(); },
          content: `<button class="hint-option" data-use="fifty" ${can('fifty') ? '' : 'disabled'}>
            <span class="hint-ic">${icon('target')}</span>
            <span><b>50 / 50</b><p>${t('排除一半的错误选项', 'Remove half of the wrong options')}</p></span>
            <span class="cost">${icon('coin')}30</span>
          </button>
          <button class="hint-option" data-use="freeze" ${can('freeze') ? '' : 'disabled'}>
            <span class="hint-ic">${icon('timer')}</span>
            <span><b>${t('时间冻结', 'Freeze time')}</b><p>${t('本题剩余时间增加 8 秒', 'Add 8 seconds to this question')}</p></span>
            <span class="cost">${icon('coin')}20</span>
          </button>
          <button class="hint-option" data-use="skip" ${can('skip') ? '' : 'disabled'}>
            <span class="hint-ic">${icon('skip-forward')}</span>
            <span><b>${t('跳过本题', 'Skip question')}</b><p>${t('不扣生命，但不得分', 'No life lost, no points')}</p></span>
            <span class="cost">${icon('coin')}50</span>
          </button>
          <p class="tiny muted" style="margin-top:10px">${t('当前金币', 'Coins')}：${coins}</p>`,
          onMount(el, close) {
            el.querySelectorAll('[data-use]').forEach((btn) => {
              btn.addEventListener('click', () => {
                const kind = btn.dataset.use;
                if (!can(kind)) return;
                if (!spendCoins(cost[kind])) { toast(t('金币不够', 'Not enough coins'), 'bad', 'coin'); return; }
                hintUsedThisQ = true;
                run.hintUsed = true;
                run.hintsUsedCount += 1;
                sfx('hint');
                if (kind === 'fifty') {
                  const q = currentQuestion(run);
                  const wrongs = q.optionIds.filter((id) => id !== q.answerId);
                  const removeCount = Math.ceil(wrongs.length / 2);
                  wrongs.slice(0, removeCount).forEach((id) => removedIds.add(id));
                  closeModal(true);
                  qs('[data-answers]').innerHTML = renderAnswers(q, removedIds);
                  bindStrip();
                  updateHeader();
                  resumeTimer();
                  toast(t('已排除一半错误选项', 'Half of the wrong options removed'), 'good', 'target');
                } else if (kind === 'freeze') {
                  timeLeft += 8;
                  closeModal(true);
                  if (timerId) {
                    clearInterval(timerId);
                    deadline = performance.now() + timeLeft * 1000;
                    timerId = setInterval(tick, 100);
                  } else {
                    resumeTimer();
                  }
                  updateHeader();
                  toast(t('时间 +8 秒', '+8 seconds'), 'good', 'timer');
                } else {
                  closeModal(true);
                  handleAnswer(null, { skip: true });
                }
              });
            });
          },
        });
      }

      function scrollStrip(dir) {
        const strip = qs('[data-strip]');
        if (!strip) return;
        strip.scrollBy({ left: dir * Math.max(160, strip.clientWidth * 0.55), behavior: 'smooth' });
      }

      function onGameClick(e) {
        const choice = e.target.closest('[data-choice]');
        if (choice) {
          if (choice.disabled || answered || paused) return;
          handleAnswer(choice.dataset.choice);
          return;
        }
        if (e.target.closest('[data-next]')) { nextQuestion(); return; }
        if (e.target.closest('[data-pause]') || e.target.closest('[data-back]')) { openPause(); return; }
        if (e.target.closest('[data-hints]') || e.target.closest('[data-hint]')) {
          const hint = e.target.closest('[data-hint]');
          openHints(hint ? hint.dataset.hint : null);
          return;
        }
        const scroll = e.target.closest('[data-scroll]');
        if (scroll) { scrollStrip(Number(scroll.dataset.scroll)); return; }
      }

      function onKey(e) {
        if (!alive) return;
        if (document.getElementById('modal-root')?.children.length) return;
        if (e.target.closest('input, textarea, select')) return;
        if (feedbackOpen) {
          if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); nextQuestion(); }
          return;
        }
        if (answered) return;
        if (e.key === 'Escape') { e.preventDefault(); openPause(); return; }
        if (e.key === '?') { e.preventDefault(); openHints(); return; }
        if (e.key === 'ArrowLeft') { e.preventDefault(); scrollStrip(-1); return; }
        if (e.key === 'ArrowRight') { e.preventDefault(); scrollStrip(1); return; }
        const key = e.key.toUpperCase();
        let idx = -1;
        if (/^[1-9]$/.test(key)) idx = Number(key) - 1;
        else if (key === '0') idx = 9;
        else if (LETTERS.includes(key)) idx = LETTERS.indexOf(key);
        if (idx >= 0) {
          const buttons = qsa('[data-choice]');
          if (buttons[idx] && !buttons[idx].disabled) {
            e.preventDefault();
            handleAnswer(buttons[idx].dataset.choice);
          }
        }
      }

      function onVisibility() {
        if (!document.hidden || answered || feedbackOpen || !alive || paused) return;
        if (document.getElementById('modal-root')?.children.length) return;
        openPause(true);
      }

      function begin() {
        if (!alive || began) return;
        began = true;
        run.startedAt = Date.now();
        if (!paused) startTimer();
      }

      function countdown() {
        if (prefersReducedMotion() || document.body.classList.contains('reduced-motion')) { begin(); return; }
        const overlay = document.createElement('div');
        overlay.className = 'countdown';
        overlay.innerHTML = `<div class="countdown-inner"><div class="countdown-num">3</div><p>${t('准备出发', 'GET READY')}</p><div style="margin-top:14px;font-size:10px;color:var(--muted);letter-spacing:.16em">${t('点击任意处跳过', 'CLICK ANYWHERE TO SKIP')}</div></div>`;
        gameEl.appendChild(overlay);
        let n = 3;
        let skipped = false;
        const numEl = () => overlay.querySelector('.countdown-num');
        const advance = () => {
          if (!alive || skipped) return;
          n -= 1;
          if (n <= 0) {
            skipped = true;
            overlay.classList.add('done');
            setTimeout(() => { overlay.remove(); begin(); }, 260);
            return;
          }
          numEl().textContent = String(n);
          numEl().style.animation = 'none';
          void numEl().offsetWidth;
          numEl().style.animation = 'count-pop .5s var(--ease-out)';
          sfx('click');
          setTimeout(advance, 520);
        };
        overlay.addEventListener('click', () => {
          if (skipped) return;
          skipped = true;
          sfx('start');
          overlay.remove();
          begin();
        });
        setTimeout(advance, 620);
      }

      // ----- mount -----
      gameEl = document.querySelector('.game');
      if (!gameEl) return;
      gameEl.addEventListener('click', onGameClick);
      document.addEventListener('keydown', onKey);
      document.addEventListener('visibilitychange', onVisibility);
      renderQuestion();
      countdown();

      this.cleanup = () => {
        alive = false;
        stopTimer();
        gameEl?.removeEventListener('click', onGameClick);
        document.removeEventListener('keydown', onKey);
        document.removeEventListener('visibilitychange', onVisibility);
        closeModal(true);
      };
    },
  };
}
