/* Persistent player profile, progress, SRS-lite mastery and achievements. */
import { MODES, MODE_ORDER } from './modes.js';
import { getLang } from './i18n.js';
import {
  todayKey, yesterdayKey, hashString, clamp,
} from './utils.js';

const KEY = 'geoquest_v1';

function defaultProgress() {
  const p = {};
  for (const m of MODE_ORDER) {
    p[m] = { maxLevel: 1, stars: {}, best: {}, plays: 0, answered: 0, correct: 0 };
  }
  return p;
}

function defaultState() {
  return {
    version: 1,
    settings: { lang: 'zh', sound: true, music: false, motion: true },
    profile: { name: '探险家', xp: 0, coins: 150, createdAt: Date.now() },
    stats: {
      answered: 0, correct: 0, games: 0, bestStreak: 0, timePlayed: 0,
      fastCorrect: 0, hintsUsed: 0, noHintPerfect: 0, coinsEarned: 0,
      byMode: {}, regionsPlayed: {},
    },
    progress: defaultProgress(),
    mastery: {},
    mistakes: {},
    achievements: {},
    daily: { date: null, score: 0, lastDate: null, streak: 0, history: {} },
    tournament: { bestRank: null, bestScore: 0, wins: 0, plays: 0 },
    lastMode: null,
  };
}

function merge(base, saved) {
  if (!saved || typeof saved !== 'object') return base;
  const out = Array.isArray(base) ? [...base] : { ...base };
  for (const [k, v] of Object.entries(saved)) {
    if (v && typeof v === 'object' && !Array.isArray(v) && base[k] && typeof base[k] === 'object' && !Array.isArray(base[k])) {
      out[k] = merge(base[k], v);
    } else if (v !== undefined) {
      out[k] = v;
    }
  }
  return out;
}

function load() {
  const base = defaultState();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw);
    // guarantee every mode exists after upgrades
    const merged = merge(base, parsed);
    merged.progress = { ...defaultProgress(), ...(merged.progress || {}) };
    for (const m of MODE_ORDER) {
      merged.progress[m] = {
        ...defaultProgress()[m],
        ...(merged.progress[m] || {}),
        stars: { ...((merged.progress[m] || {}).stars || {}) },
        best: { ...((merged.progress[m] || {}).best || {}) },
      };
    }
    return merged;
  } catch {
    return base;
  }
}

export const store = load();

export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    /* storage may be unavailable; game still works for this session */
  }
}

export function resetStore() {
  try { localStorage.removeItem(KEY); } catch { /* noop */ }
  location.hash = '#/home';
  location.reload();
}

export function setSetting(key, value) {
  store.settings[key] = value;
  save();
}

export function setLangSetting(lang) {
  store.settings.lang = lang === 'en' ? 'en' : 'zh';
  save();
}

export function levelInfo(xp = store.profile.xp) {
  let level = 1;
  let need = 120;
  let acc = 0;
  while (xp >= acc + need && level < 99) {
    acc += need;
    level += 1;
    need = Math.round(need * 1.28);
  }
  return { level, into: xp - acc, need, pct: Math.round(((xp - acc) / need) * 100) };
}

export function addRewards(xp = 0, coins = 0) {
  store.profile.xp += xp;
  store.profile.coins += coins;
  if (coins > 0) store.stats.coinsEarned += coins;
}

export function spendCoins(n) {
  if (store.profile.coins < n) return false;
  store.profile.coins -= n;
  save();
  return true;
}

export function masteryOf(id) { return store.mastery[id] || 0; }

export function setMastery(id, value) {
  store.mastery[id] = clamp(value, 0, 3);
  save();
}

export function masteredCount() {
  return Object.values(store.mastery).filter((v) => v >= 3).length;
}

export function mistakeList() {
  return Object.entries(store.mistakes)
    .map(([id, info]) => ({ id, ...info }))
    .sort((a, b) => (b.count - a.count) || (b.last - a.last));
}

export function mistakeCount() {
  return Object.keys(store.mistakes).length;
}

/**
 * Record a single answer. Rewards are supplied by the engine so that the
 * scoring rules live in one place.
 */
export function recordAnswer({
  mode, countryId, correct, timedOut = false, coins = 0, xp = 0, fast = false, hinted = false,
}) {
  const s = store.stats;
  s.answered += 1;
  if (correct) s.correct += 1;
  if (fast && correct) s.fastCorrect += 1;
  if (hinted) s.hintsUsed += 1;

  if (!s.byMode[mode]) s.byMode[mode] = { answered: 0, correct: 0 };
  s.byMode[mode].answered += 1;
  if (correct) s.byMode[mode].correct += 1;

  if (countryId) {
    if (correct) {
      store.mastery[countryId] = Math.min(3, (store.mastery[countryId] || 0) + 1);
    } else {
      store.mastery[countryId] = Math.max(0, (store.mastery[countryId] || 0) - 1);
    }
    if (correct) {
      const m = store.mistakes[countryId];
      if (m) {
        m.count -= 1;
        if (m.count <= 0) delete store.mistakes[countryId];
      }
    } else if (timedOut || !correct) {
      const m = store.mistakes[countryId] || { count: 0, last: 0 };
      m.count += 1;
      m.last = Date.now();
      store.mistakes[countryId] = m;
    }
  }

  addRewards(xp, coins);
  save();
  return { unlocked: evaluateAchievements() };
}

export function startRunMeta({ mode, region, kind }) {
  store.lastMode = MODES[mode] ? mode : store.lastMode;
  if (region) store.stats.regionsPlayed[region] = true;
  save();
  void kind;
}

export const ACHIEVEMENTS = [
  {
    id: 'first_run', icon: 'compass', titleZh: '初次启程', titleEn: 'First Steps',
    descZh: '完成第一局探险', descEn: 'Finish your first run',
    titleEs: 'Primeros pasos', titleFr: 'Premiers pas', descEs: 'Completa tu primera partida', descFr: 'Terminez votre première partie',
    target: 1, value: (s) => s.stats.games,
  },
  {
    id: 'streak10', icon: 'flame', titleZh: '十连击', titleEn: 'On Fire',
    descZh: '单局连续答对 10 题', descEn: 'Get 10 correct answers in a row',
    titleEs: 'En racha', titleFr: 'En feu', descEs: 'Acierta 10 preguntas seguidas', descFr: '10 bonnes réponses d’affilée',
    target: 10, value: (s) => s.stats.bestStreak,
  },
  {
    id: 'correct100', icon: 'target', titleZh: '百题斩', titleEn: 'Century',
    descZh: '累计答对 100 题', descEn: 'Answer 100 questions correctly',
    titleEs: 'Centenario', titleFr: 'Centurion', descEs: 'Acierta 100 preguntas', descFr: '100 bonnes réponses',
    target: 100, value: (s) => s.stats.correct,
  },
  {
    id: 'correct500', icon: 'brain', titleZh: '地理大脑', titleEn: 'Geo Brain',
    descZh: '累计答对 500 题', descEn: 'Answer 500 questions correctly',
    titleEs: 'Cerebro geográfico', titleFr: 'Cerveau géo', descEs: 'Acierta 500 preguntas', descFr: '500 bonnes réponses',
    target: 500, value: (s) => s.stats.correct,
  },
  {
    id: 'perfect', icon: 'sparkle', titleZh: '完美通关', titleEn: 'Flawless',
    descZh: '不使用提示，三星完成一个关卡', descEn: 'Earn 3 stars without using hints',
    titleEs: 'Sin fallos', titleFr: 'Sans faute', descEs: 'Consigue 3 estrellas sin pistas', descFr: 'Obtenez 3 étoiles sans indice',
    target: 1, value: (s) => s.stats.noHintPerfect,
  },
  {
    id: 'all_modes', icon: 'layers', titleZh: '全能探险家', titleEn: 'All-Rounder',
    descZh: '体验全部 5 种挑战模式', descEn: 'Play all 5 challenge modes',
    titleEs: 'Todoterreno', titleFr: 'Touche-à-tout', descEs: 'Juega los 5 modos', descFr: 'Jouez aux 5 modes',
    target: 5, value: (s) => Object.keys(MODES).filter((m) => (s.stats.byMode[m]?.answered || 0) > 0).length,
  },
  {
    id: 'master50', icon: 'graduation', titleZh: '半百之国', titleEn: 'Fifty Flags',
    descZh: '掌握 50 个国家（熟练度满格）', descEn: 'Master 50 countries',
    titleEs: 'Cincuenta países', titleFr: 'Cinquante pays', descEs: 'Domina 50 países', descFr: 'Maîtrisez 50 pays',
    target: 50, value: () => masteredCount(),
  },
  {
    id: 'daily7', icon: 'calendar', titleZh: '七日环球', titleEn: 'Seven Suns',
    descZh: '连续 7 天完成每日挑战', descEn: 'Complete the daily challenge 7 days in a row',
    titleEs: 'Siete días', titleFr: 'Sept jours', descEs: 'Completa el reto diario 7 días seguidos', descFr: '7 jours de défi quotidien d’affilée',
    target: 7, value: (s) => s.daily.streak,
  },
  {
    id: 'champion', icon: 'crown', titleZh: '环球冠军', titleEn: 'World Champion',
    descZh: '赢得一场锦标赛', descEn: 'Win a tournament',
    titleEs: 'Campeón mundial', titleFr: 'Champion du monde', descEs: 'Gana un torneo', descFr: 'Remportez un tournoi',
    target: 1, value: (s) => s.tournament.wins,
  },
  {
    id: 'fast20', icon: 'bolt', titleZh: '闪电作答', titleEn: 'Quick Draw',
    descZh: '在 5 秒内答对 20 题', descEn: 'Answer 20 questions correctly in under 5 seconds',
    titleEs: 'Rayo', titleFr: 'Éclair', descEs: 'Acierta 20 preguntas en menos de 5 s', descFr: '20 bonnes réponses en moins de 5 s',
    target: 20, value: (s) => s.stats.fastCorrect,
  },
  {
    id: 'explorer', icon: 'map', titleZh: '六大洲', titleEn: 'Six Continents',
    descZh: '在全部 6 个大区游玩', descEn: 'Play in all 6 regions',
    titleEs: 'Seis continentes', titleFr: 'Six continents', descEs: 'Juega en las 6 regiones', descFr: 'Jouez dans les 6 régions',
    target: 6, value: (s) => Object.keys(s.stats.regionsPlayed || {}).filter((r) => r !== 'world').length,
  },
  {
    id: 'level10', icon: 'medal', titleZh: '十级学者', titleEn: 'Level Ten',
    descZh: '达到玩家等级 10', descEn: 'Reach player level 10',
    titleEs: 'Nivel diez', titleFr: 'Niveau dix', descEs: 'Alcanza el nivel 10', descFr: 'Atteignez le niveau 10',
    target: 10, value: () => levelInfo().level,
  },
  {
    id: 'collector', icon: 'coin', titleZh: '金币收藏家', titleEn: 'Coin Collector',
    descZh: '累计获得 1000 金币', descEn: 'Earn 1,000 coins',
    titleEs: 'Coleccionista', titleFr: 'Collectionneur', descEs: 'Gana 1000 monedas', descFr: 'Gagnez 1000 pièces',
    target: 1000, value: (s) => s.stats.coinsEarned,
  },
];

export function achievementText(a, field) {
  const suffix = { zh: 'Zh', en: 'En', es: 'Es', fr: 'Fr' }[getLang()] || 'En';
  return a[`${field}${suffix}`] || a[`${field}En`] || '';
}

export function evaluateAchievements() {
  const unlocked = [];
  for (const a of ACHIEVEMENTS) {
    if (store.achievements[a.id]) continue;
    if (a.value(store) >= a.target) {
      store.achievements[a.id] = Date.now();
      unlocked.push(a);
    }
  }
  if (unlocked.length) save();
  return unlocked;
}

export function achievementList() {
  return ACHIEVEMENTS.map((a) => {
    const current = a.value(store);
    return {
      ...a,
      current,
      done: !!store.achievements[a.id],
      pct: Math.min(100, Math.round((current / a.target) * 100)),
    };
  });
}

export function dailyState() {
  const today = todayKey();
  return {
    today,
    done: store.daily.date === today,
    score: store.daily.date === today ? store.daily.score : 0,
    streak: store.daily.streak,
    lastDate: store.daily.lastDate,
  };
}

/**
 * Complete a run: stars, unlocks, daily streak, tournament rank and bonuses.
 */
export function finishRun(result) {
  const {
    mode, level = 1, region = 'world', score = 0, correct = 0, total = 10,
    stars = 0, duration = 0, bestStreak = 0, hintUsed = false, kind = 'mode',
    rank = null, seed = null, cleared = true,
  } = result;

  const s = store.stats;
  s.games += 1;
  s.timePlayed += Math.max(0, duration);
  s.bestStreak = Math.max(s.bestStreak, bestStreak);
  store.stats.regionsPlayed[region] = true;

  let newBest = false;
  let oldBest = 0;
  let levelBefore = levelInfo().level;
  let bonusXp = 0;
  let bonusCoins = 0;
  let dailyUpdated = false;

  if (MODES[mode]) {
    const p = store.progress[mode];
    p.plays += 1;
    p.answered += total;
    p.correct += correct;
    oldBest = p.best[level] || 0;
    newBest = score > oldBest;
    if (newBest) p.best[level] = score;
    p.stars[level] = Math.max(p.stars[level] || 0, stars);
    if (cleared && stars >= 1 && level >= p.maxLevel && level < 6) p.maxLevel = level + 1;
    if (stars === 3 && !hintUsed && cleared) s.noHintPerfect += 1;
    if (stars === 3) { bonusXp = 80; bonusCoins = 40; }
    else if (stars === 2) { bonusXp = 50; bonusCoins = 20; }
    else if (stars === 1) { bonusXp = 25; bonusCoins = 10; }
    else { bonusXp = 5; bonusCoins = 0; }
  } else if (kind === 'daily') {
    const today = todayKey();
    if (store.daily.date !== today) {
      const prev = store.daily.lastDate;
      store.daily.streak = prev === yesterdayKey() ? store.daily.streak + 1 : 1;
      store.daily.date = today;
      store.daily.lastDate = today;
      store.daily.score = score;
      store.daily.history[today] = score;
      dailyUpdated = true;
      bonusXp = 60;
      bonusCoins = 50;
    }
  } else if (kind === 'review') {
    bonusXp = 30;
    bonusCoins = 15;
  } else if (kind === 'tournament') {
    store.tournament.plays += 1;
    if (rank) {
      store.tournament.bestRank = store.tournament.bestRank == null
        ? rank : Math.min(store.tournament.bestRank, rank);
    }
    store.tournament.bestScore = Math.max(store.tournament.bestScore, score);
    if (rank === 1) store.tournament.wins += 1;
    bonusXp = rank === 1 ? 150 : rank <= 3 ? 90 : 40;
    bonusCoins = rank === 1 ? 150 : rank <= 3 ? 80 : 30;
  }

  addRewards(bonusXp, bonusCoins);
  const unlocked = evaluateAchievements();
  const levelAfter = levelInfo().level;
  save();
  return {
    newBest, oldBest, bonusXp, bonusCoins, unlocked, dailyUpdated,
    levelBefore, levelAfter, leveledUp: levelAfter > levelBefore, seed,
  };
}

export function exportSave() {
  return JSON.stringify(store, null, 2);
}

export function importSave(text) {
  try {
    const data = JSON.parse(text);
    if (!data || typeof data !== 'object' || !data.profile || !data.stats) return false;
    const merged = merge(defaultState(), data);
    merged.progress = { ...defaultProgress(), ...(merged.progress || {}) };
    for (const m of MODE_ORDER) {
      merged.progress[m] = { ...defaultProgress()[m], ...(merged.progress[m] || {}) };
    }
    Object.keys(store).forEach((k) => delete store[k]);
    Object.assign(store, merged);
    save();
    return true;
  } catch {
    return false;
  }
}

export function modeStats(mode) {
  return store.progress[mode] || defaultProgress()[mode];
}

export function modeStarsTotal(mode) {
  const p = store.progress[mode];
  if (!p) return 0;
  return Object.values(p.stars).reduce((a, b) => a + b, 0);
}

export function overallAccuracy() {
  return store.stats.answered ? Math.round((store.stats.correct / store.stats.answered) * 100) : 0;
}

export function regionBest(mode, region) {
  void region;
  return store.progress[mode]?.best || {};
}

export function dailySeed(date = todayKey()) {
  return hashString(`geoquest-daily-${date}`);
}
