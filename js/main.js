import { store, save } from './store.js';
import { setLang, normalizeLang, getLang } from './i18n.js';
import { setSfxEnabled, setMusicEnabled, initAudio } from './audio.js';
import { closeModal } from './ui.js';
import { session } from './session.js';
import { homeView } from './views/home.js';
import { playView } from './views/play.js';
import { gameView } from './views/game.js';
import { resultView } from './views/result.js';
import { atlasView } from './views/atlas.js';
import { statsView } from './views/stats.js';
import { settingsView } from './views/settings.js';
import { learnView } from './views/learn.js';
import { dailyView, tournamentView } from './views/events.js';

const app = document.getElementById('app');
let currentView = null;

function parseHash() {
  const raw = location.hash.replace(/^#\/?/, '') || 'home';
  const [path, qs] = raw.split('?');
  const parts = path.split('/').filter(Boolean);
  const query = Object.fromEntries(new URLSearchParams(qs || ''));
  return { name: parts[0] || 'home', sub: parts[1] || null, query };
}

function titleFor(name, sub) {
  const titles = {
    zh: {
      home: '环球地理 · 国旗、首都与人口挑战',
      atlas: '国家图鉴', stats: '成就与档案', settings: '设置', play: '选择关卡',
      game: '探险中', result: '本局结果', learn: '闪卡学习', daily: '每日挑战', tournament: '环球锦标赛',
    },
    en: {
      home: 'World Geography · Flags, Capitals & More',
      atlas: 'World Atlas', stats: 'Profile & Achievements', settings: 'Settings', play: 'Choose a level',
      game: 'Playing', result: 'Results', learn: 'Flashcards', daily: 'Daily Challenge', tournament: 'World Tournament',
    },
    es: {
      home: 'Geografía mundial · Banderas y capitales',
      atlas: 'Atlas mundial', stats: 'Perfil y logros', settings: 'Ajustes', play: 'Elegir nivel',
      game: 'Jugando', result: 'Resultados', learn: 'Tarjetas', daily: 'Reto diario', tournament: 'Torneo mundial',
    },
    fr: {
      home: 'Géographie mondiale · Drapeaux et capitales',
      atlas: 'Atlas mondial', stats: 'Profil et succès', settings: 'Réglages', play: 'Choisir un niveau',
      game: 'En partie', result: 'Résultats', learn: 'Cartes', daily: 'Défi du jour', tournament: 'Tournoi mondial',
    },
  };
  void sub;
  return `GEOQUEST · ${(titles[getLang()] || titles.en)[name] || titles.en.home}`;
}

function render() {
  if (currentView?.cleanup) {
    try { currentView.cleanup(); } catch { /* keep navigating */ }
  }
  closeModal(true);
  document.querySelectorAll('.confetti-canvas').forEach((el) => el.remove());
  const { name, sub, query } = parseHash();
  let view = null;

  switch (name) {
    case 'home': view = homeView(); break;
    case 'play': view = playView({ mode: sub }); break;
    case 'game': view = gameView(); break;
    case 'result': view = resultView(); break;
    case 'atlas': view = atlasView(); break;
    case 'stats': view = statsView(); break;
    case 'settings': view = settingsView(); break;
    case 'learn': view = learnView({ query }); break;
    case 'daily': view = dailyView(); break;
    case 'tournament': view = tournamentView(); break;
    default: view = homeView();
  }
  if (!view) {
    location.hash = '#/home';
    return;
  }

  app.innerHTML = view.html;
  currentView = view;
  if (typeof view.mount === 'function') view.mount(app);
  document.title = titleFor(name, sub);
  window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
}

function boot() {
  const bootParams = new URLSearchParams(location.search);
  let hasSave = false;
  let siteLang = '';
  try {
    hasSave = !!localStorage.getItem('geoquest_v1');
    siteLang = localStorage.getItem('geoquest_lang') || '';
  } catch { /* noop */ }

  if (bootParams.get('lang')) {
    store.settings.lang = normalizeLang(bootParams.get('lang'));
    save();
  } else if (!hasSave) {
    // Prefer the language chosen on the SEO site; otherwise use the browser.
    const candidates = siteLang
      ? [siteLang, ...(navigator.languages?.length ? navigator.languages : [navigator.language])]
      : (navigator.languages?.length ? navigator.languages : [navigator.language]);
    store.settings.lang = normalizeLang(candidates.find((l) => ['zh', 'en', 'es', 'fr'].includes(String(l).toLowerCase().slice(0, 2))) || 'en');
    save();
  }
  setLang(store.settings.lang);
  try { localStorage.setItem('geoquest_lang', store.settings.lang); } catch { /* noop */ }
  document.body.classList.toggle('reduced-motion', !store.settings.motion);
  setSfxEnabled(store.settings.sound);
  if (!store.settings.music) setMusicEnabled(false);

  const hadHash = !!location.hash;
  if (!hadHash) {
    history.replaceState(null, '', '#/home');
  }
  window.addEventListener('hashchange', render);
  render();
  const bootMode = bootParams.get('mode');
  const validModes = ['flags', 'capitals', 'countries', 'population', 'independence', 'review'];
  if (bootMode && validModes.includes(bootMode) && (!hadHash || location.hash === '#/home')) {
    location.hash = `#/play/${bootMode}`;
  }

  const unlockAudio = () => {
    initAudio();
    if (store.settings.music) setMusicEnabled(true);
    window.removeEventListener('pointerdown', unlockAudio);
    window.removeEventListener('keydown', unlockAudio);
  };
  window.addEventListener('pointerdown', unlockAudio, { once: true });
  window.addEventListener('keydown', unlockAudio, { once: true });

  // Global navigation click sound (lightweight; answer-specific sounds handle themselves)
  document.addEventListener('click', (e) => {
    const target = e.target.closest('a[href]');
    if (!target) return;
    import('./audio.js').then(({ sfx }) => sfx('click')).catch(() => {});
  });

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {});
    });
  }

  // Expose a tiny debug surface for local testing.
  window.GEOQUEST = { store, session, render };
}

boot();
