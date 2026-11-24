/* Question generation + run scoring. Pure-ish: timers live in the view. */
import { COUNTRIES, BY_ID } from './data.js';
import { MODES, LEVELS, levelConfig, DAILY, TOURNAMENT } from './modes.js';
import { mulberry32, shuffle, sampleN, sampleOne, todayKey, hashString, clamp } from './utils.js';
import {
  finishRun as persistFinish, recordAnswer as persistAnswer, dailySeed,
} from './store.js';

const MODE_TO_TYPE = {
  flags: 'flag', capitals: 'capital', countries: 'country',
  population: 'population', independence: 'independence',
};

const INDEPENDENCE_POOL = COUNTRIES.filter((c) => !!c.independence);
const POP_POOL = COUNTRIES.filter((c) => c.population > 0).sort((a, b) => b.population - a.population);

function poolFor(level, region) {
  const cfg = levelConfig(level);
  let pool = COUNTRIES.filter((c) => cfg.tiers.includes(c.tier));
  if (region && region !== 'world') pool = pool.filter((c) => c.region === region);
  if (pool.length < 12) {
    pool = COUNTRIES.filter((c) => (region && region !== 'world' ? c.region === region : true));
  }
  return pool.length ? pool : COUNTRIES;
}

function sameMonthDay(a, b) {
  return a && b && a.slice(5) === b.slice(5);
}

function candidatePool(target, region, level, global = false) {
  const cfg = levelConfig(level);
  let pool = global ? COUNTRIES : COUNTRIES.filter((c) => cfg.tiers.includes(c.tier));
  if (region && region !== 'world') pool = pool.filter((c) => c.region === region);
  if (level >= 4 && !global) {
    const near = pool.filter((c) => c.subregion === target.subregion);
    if (near.length >= 10) pool = near;
  }
  return pool.filter((c) => c.id !== target.id);
}

function pickDistractors(target, count, { region, level, rng, type }) {
  const seen = new Set([target.id]);
  const out = [];
  const pools = [
    candidatePool(target, region, level),
    candidatePool(target, 'world', level),
    COUNTRIES,
  ];
  for (const pool of pools) {
    const candidates = shuffle(pool, rng).filter((c) => {
      if (seen.has(c.id)) return false;
      if (type === 'capital' && c.capital === target.capital) return false;
      if (type === 'independence' && sameMonthDay(c.independence, target.independence)) return false;
      if (type === 'country' && c.nameZh === target.nameZh) return false;
      return true;
    });
    for (const c of candidates) {
      if (out.length >= count) break;
      seen.add(c.id);
      out.push(c);
    }
    if (out.length >= count) break;
  }
  return out;
}

function makeQuestion(type, target, { level, region, rng }) {
  if (type === 'population') {
    // Pick four countries with a difficulty-dependent spread.
    const anchorIndex = Math.floor(rng() * POP_POOL.length);
    let candidates;
    if (level >= 4) {
      const window = level >= 5 ? 40 : 70;
      const start = clamp(anchorIndex - Math.floor(window / 2), 0, Math.max(0, POP_POOL.length - window));
      candidates = POP_POOL.slice(start, start + window);
    } else {
      candidates = POP_POOL;
    }
    const four = sampleN(candidates, 4, rng);
    if (four.length < 4) return null;
    const ask = rng() < 0.5 ? 'max' : 'min';
    const sorted = [...four].sort((a, b) => b.population - a.population);
    const answer = ask === 'max' ? sorted[0] : sorted[sorted.length - 1];
    return {
      type: 'population',
      targetId: answer.id,
      optionIds: four.map((c) => c.id),
      answerId: answer.id,
      ask,
      mode: 'population',
    };
  }

  if (type === 'independence') {
    if (!target.independence) return null;
    const count = 3;
    const distractors = pickDistractors(target, count, { region, level, rng, type: 'independence' });
    if (distractors.length < count) return null;
    const optionIds = shuffle([target, ...distractors], rng).map((c) => c.id);
    return {
      type: 'independence', targetId: target.id, optionIds,
      answerId: target.id, date: target.independence, mode: 'independence',
    };
  }

  const cfg = levelConfig(level);
  const count = (type === 'flag' ? cfg.options : 4) - 1;
  const distractors = pickDistractors(target, count, { region, level, rng, type });
  if (distractors.length < count) return null;
  const optionIds = shuffle([target, ...distractors], rng).map((c) => c.id);
  return {
    type,
    targetId: target.id,
    optionIds,
    answerId: target.id,
    mode: MODE_TO_TYPE_VALUES[type],
  };
}
const MODE_TO_TYPE_VALUES = { flag: 'flags', capital: 'capitals', country: 'countries' };

function targetsFor(pool, count, rng, used = new Set()) {
  const fresh = pool.filter((c) => !used.has(c.id));
  const picked = sampleN(fresh.length >= count ? fresh : pool, count, rng);
  picked.forEach((c) => used.add(c.id));
  return picked;
}

function buildStandard(mode, level, region, count, rng) {
  const cfg = levelConfig(level);
  const type = MODE_TO_TYPE[mode];
  let pool = poolFor(level, region);
  if (mode === 'independence') pool = pool.filter((c) => c.independence);
  if (pool.length < count) pool = COUNTRIES.filter((c) => (mode === 'independence' ? c.independence : true));
  const targets = targetsFor(pool, count, rng);
  const questions = [];
  for (const target of targets) {
    const q = makeQuestion(type, target, { level, region, rng });
    if (q) questions.push(q);
  }
  return questions;
}

function buildMixed({ level, region, count, rng, types, pool = null }) {
  const basePool = pool || poolFor(level, region);
  const targets = targetsFor(basePool, count * 2, rng);
  const questions = [];
  let ti = 0;
  for (let i = 0; i < count; i++) {
    const type = types[i % types.length];
    let target = targets[ti++ % targets.length];
    if (type === 'independence' && !target.independence) {
      const alt = INDEPENDENCE_POOL.filter((c) => !questions.some((q) => q.targetId === c.id));
      target = sampleOne(alt.length ? alt : INDEPENDENCE_POOL, rng);
    }
    let q = makeQuestion(type, target, { level, region, rng });
    if (!q) {
      // graceful fallback to a flag question
      q = makeQuestion('flag', target, { level, region, rng });
    }
    if (q) questions.push(q);
  }
  return questions;
}

export function createRun(config = {}) {
  const {
    mode = 'flags', level = 1, region = 'world', kind = mode,
    count = null, seed = null, types = null, reviewIds = null,
  } = config;
  const seedValue = seed ?? (mode === 'daily' ? dailySeed(todayKey()) : ((Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0));
  const rng = mulberry32(seedValue);
  let questions = [];
  let runKind = kind;
  let runMode = mode;
  let hearts = 3;
  let seconds = levelConfig(level).secs;
  let runLevel = level;

  if (mode === 'daily') {
    runKind = 'daily';
    runMode = 'daily';
    runLevel = 3;
    hearts = DAILY.hearts;
    seconds = DAILY.secs;
    const dailyTypes = [
      'flag', 'flag', 'flag', 'capital', 'capital', 'capital',
      'country', 'country', 'population', 'population', 'independence', 'independence',
    ];
    questions = buildMixed({
      level: 3, region: 'world', count: DAILY.count,
      rng, types: shuffle(dailyTypes, rng),
    });
  } else if (mode === 'tournament') {
    runKind = 'tournament';
    runMode = 'tournament';
    runLevel = 4;
    hearts = TOURNAMENT.hearts;
    seconds = TOURNAMENT.secs;
    const tTypes = [
      'flag', 'flag', 'flag', 'flag', 'capital', 'capital', 'capital',
      'country', 'country', 'country', 'population', 'population',
      'independence', 'independence', 'independence',
    ];
    questions = buildMixed({
      level: 4, region: 'world', count: TOURNAMENT.count,
      rng, types: shuffle(tTypes, rng),
    });
  } else if (mode === 'review') {
    runKind = 'review';
    runMode = 'review';
    runLevel = 2;
    hearts = 5;
    seconds = 18;
    const ids = reviewIds || [];
    const reviewPool = ids.map((id) => BY_ID[id]).filter(Boolean);
    const targets = reviewPool.slice(0, 10);
    const typeCycle = ['flag', 'capital', 'country'];
    questions = targets.map((target, i) => {
      const preferred = typeCycle[i % typeCycle.length];
      return makeQuestion(preferred, target, { level: 2, region: 'world', rng })
        || makeQuestion('flag', target, { level: 2, region: 'world', rng });
    }).filter(Boolean);
  } else {
    questions = buildStandard(mode, level, region, count || levelConfig(level).q, rng);
    // top up if the pool was unusually small
    let guard = 0;
    while (questions.length < (count || levelConfig(level).q) && guard < 12) {
      guard += 1;
      const more = buildStandard(mode, level, 'world', 10, rng);
      for (const q of more) {
        if (questions.length >= (count || levelConfig(level).q)) break;
        if (!questions.some((x) => x.targetId === q.targetId)) questions.push(q);
      }
    }
  }

  const total = questions.length;
  return {
    id: `run_${Date.now()}`,
    mode: runMode,
    kind: runKind,
    level: runLevel,
    region,
    questions,
    index: 0,
    total,
    score: 0,
    coins: 0,
    xp: 0,
    hearts,
    maxHearts: hearts,
    combo: 0,
    bestCombo: 0,
    correct: 0,
    answers: [],
    startedAt: Date.now(),
    seconds,
    hintUsed: false,
    hintsUsedCount: 0,
    seed: seedValue,
    finished: false,
    rank: null,
    leaderboard: null,
  };
}

export function currentQuestion(run) {
  return run.questions[run.index] || null;
}

export function questionMode(q) {
  return q?.mode || 'flags';
}

export function answerQuestion(run, choiceId, { timeLeft = 0, timedOut = false, hinted = false, skip = false } = {}) {
  const q = currentQuestion(run);
  if (!q) return null;
  const correct = !skip && !timedOut && choiceId === q.answerId;
  const oldCombo = run.combo;
  if (correct) {
    run.combo += 1;
    run.bestCombo = Math.max(run.bestCombo, run.combo);
    run.correct += 1;
  } else {
    run.combo = 0;
    if (!skip) run.hearts = Math.max(0, run.hearts - 1);
  }

  let points = 0;
  let coins = 0;
  let xp = 0;
  if (correct) {
    const cfg = levelConfig(run.level);
    const comboMult = 1 + Math.min(run.combo, 10) * 0.08;
    const base = 100 + Math.round(Math.max(0, timeLeft) * 4);
    points = Math.round(base * cfg.mult * comboMult * (hinted ? 0.8 : 1));
    coins = 4 + Math.min(5, run.combo);
    xp = 8 + Math.min(6, run.combo);
  } else {
    xp = skip ? 0 : 1;
  }
  run.score += points;
  run.coins += coins;
  run.xp += xp;

  const answer = {
    q, choiceId, correct, timedOut, skipped: skip, timeLeft,
    points, coins, xp, hinted,
    target: BY_ID[q.targetId],
    mode: q.mode,
    combo: oldCombo,
  };
  run.answers.push(answer);

  const recorded = persistAnswer({
    mode: q.mode,
    countryId: q.targetId,
    correct,
    timedOut,
    coins,
    xp,
    fast: correct && (run.seconds - timeLeft) <= 5,
    hinted,
  });

  return { ...answer, unlocked: recorded.unlocked };
}

export function makeLeaderboard(run) {
  const rng = mulberry32((run.seed || Date.now()) ^ 0x9e3779b9);
  const names = ['Aiko', 'Mateo', 'Lena', 'Kwame', 'Priya', 'Noah', 'Sofia'];
  const bots = names.map((name, i) => {
    const base = run.score * (0.42 + rng() * 0.5) + rng() * 170 - (i === 0 ? 20 : 0);
    return { name, score: Math.max(100, Math.round(base)), bot: true };
  });
  const player = { name: 'YOU', score: run.score, bot: false, me: true };
  const all = [...bots, player].sort((a, b) => b.score - a.score);
  const rank = all.findIndex((x) => x.me) + 1;
  return { all, rank };
}

export function finishRun(run) {
  if (run.finished) return run.result;
  run.finished = true;
  const total = run.total || 1;
  const ratio = run.correct / total;
  const stars = run.hearts > 0
    ? (ratio >= 0.9 ? 3 : ratio >= 0.7 ? 2 : ratio >= 0.4 ? 1 : 0)
    : 0;
  let leaderboard = null;
  let rank = null;
  if (run.kind === 'tournament') {
    const lb = makeLeaderboard(run);
    leaderboard = lb.all;
    rank = lb.rank;
  }
  const duration = Math.round((Date.now() - run.startedAt) / 1000);
  const persisted = persistFinish({
    mode: run.mode,
    level: run.level,
    region: run.region,
    score: run.score,
    correct: run.correct,
    total,
    stars,
    duration,
    bestStreak: run.bestCombo,
    hintUsed: run.hintUsed,
    cleared: run.hearts > 0,
    kind: run.kind,
    rank,
    seed: run.seed,
  });

  const result = {
    ...run,
    stars,
    accuracy: Math.round(ratio * 100),
    duration,
    rank,
    leaderboard,
    ...persisted,
  };
  run.result = result;
  return result;
}

export function stageInfo(run) {
  if (run.kind !== 'tournament') return null;
  const idx = run.index + 1;
  if (idx <= TOURNAMENT.stages[0]) return { zh: '小组赛', en: 'Group Stage', es: 'Fase de grupos', fr: 'Phase de groupes', n: 1 };
  if (idx <= TOURNAMENT.stages[0] + TOURNAMENT.stages[1]) return { zh: '半决赛', en: 'Semi-final', es: 'Semifinal', fr: 'Demi-finale', n: 2 };
  return { zh: '决赛', en: 'Final', es: 'Final', fr: 'Finale', n: 3 };
}

export function dailyConfig() {
  const date = todayKey();
  return {
    mode: 'daily',
    kind: 'daily',
    seed: dailySeed(date),
    date,
  };
}

export { INDEPENDENCE_POOL, POP_POOL, LEVELS };
