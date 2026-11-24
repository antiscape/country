/* Static content site: atlas filtering, consent and AdSense display slots. */
(() => {
  const cfg = window.__SITE_CONFIG__ || {};
  const ads = cfg.adsense || {};
  const CONSENT_KEY = 'geoquest_consent_v1';
  const LANG_KEY = 'geoquest_lang';
  const LANGS = ['zh', 'en', 'es', 'fr'];

  // Remember the language the visitor is actually reading.
  const pathLang = location.pathname.split('/')[1];
  if (LANGS.includes(pathLang)) {
    try { localStorage.setItem(LANG_KEY, pathLang); } catch { /* noop */ }
  }
  document.querySelectorAll('[data-set-lang]').forEach((link) => {
    link.addEventListener('click', () => {
      try { localStorage.setItem(LANG_KEY, link.dataset.setLang); } catch { /* noop */ }
    });
  });

  /* ---------------- atlas filter ---------------- */
  const search = document.querySelector('[data-atlas-search]');
  if (search) {
    const norm = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const cards = [...document.querySelectorAll('[data-country-card]')];
    const regions = [...document.querySelectorAll('[data-region-filter]')];
    const count = document.querySelector('[data-atlas-count]');
    const empty = document.querySelector('[data-atlas-empty]');
    const blocks = [...document.querySelectorAll('[data-region-block]')];
    let region = 'world';

    const apply = () => {
      const q = norm(search.value.trim());
      let shown = 0;
      for (const card of cards) {
        const hay = norm(card.dataset.search);
        const okRegion = region === 'world' || card.dataset.region === region;
        const okQuery = !q || hay.includes(q);
        const show = okRegion && okQuery;
        card.hidden = !show;
        if (show) shown += 1;
      }
      for (const block of blocks) {
        const visible = [...block.querySelectorAll('[data-country-card]')].some((c) => !c.hidden);
        block.hidden = !visible;
      }
      if (count) count.textContent = String(shown);
      if (empty) empty.hidden = shown !== 0;
    };

    search.addEventListener('input', apply);
    regions.forEach((btn) => btn.addEventListener('click', () => {
      region = btn.dataset.regionFilter;
      regions.forEach((b) => b.classList.toggle('on', b === btn));
      apply();
    }));
    apply();
  }

  /* ---------------- pronunciation ---------------- */
  const speakButtons = [...document.querySelectorAll('[data-speak]')];
  if (speakButtons.length) {
    const synth = window.speechSynthesis;
    const canSpeak = Boolean(synth) && typeof window.SpeechSynthesisUtterance === 'function';
    // Recorded clips work without any speech support; only hide the buttons
    // when there is neither audio nor synthesis.
    const hasAudio = speakButtons.some((btn) => btn.dataset.audio);
    if (!canSpeak && !hasAudio) {
      document.documentElement.classList.add('no-tts');
    } else {
      const pageLang = document.documentElement.lang || 'en';
      let voice = null;
      const pickVoice = () => {
        if (!canSpeak) return;
        const voices = synth.getVoices() || [];
        voice = voices.find((v) => String(v.lang || '').toLowerCase().replace('_', '-').startsWith(pageLang.slice(0, 2).toLowerCase())) || null;
      };
      pickVoice();
      if (canSpeak && typeof synth.addEventListener === 'function') synth.addEventListener('voiceschanged', pickVoice);

      const fallbackSpeak = (text, btn) => {
        if (!canSpeak) return;
        synth.cancel();
        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = pageLang;
        if (voice) utter.voice = voice;
        utter.rate = 0.9;
        const done = () => btn.classList.remove('is-speaking');
        utter.onend = done;
        utter.onerror = done;
        btn.classList.add('is-speaking');
        synth.speak(utter);
      };

      let current = null;
      const playClip = (btn) => {
        const src = btn.dataset.audio;
        const text = btn.dataset.speak || '';
        if (current) {
          current.pause();
          document.querySelectorAll('.speak.is-speaking').forEach((el) => el.classList.remove('is-speaking'));
          current = null;
        }
        if (!src) { fallbackSpeak(text, btn); return; }
        const audio = new Audio(src);
        audio.preload = 'auto';
        current = audio;
        const done = () => {
          btn.classList.remove('is-speaking');
          if (current === audio) current = null;
        };
        audio.addEventListener('ended', done);
        audio.addEventListener('pause', done);
        btn.classList.add('is-speaking');
        const played = audio.play();
        if (played && typeof played.catch === 'function') {
          played.catch(() => { done(); fallbackSpeak(text, btn); });
        }
      };

      for (const btn of speakButtons) {
        btn.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();
          playClip(btn);
        });
      }
    }
  }

  /* ---------------- AdSense + consent ---------------- */
  const slots = [...document.querySelectorAll('.adsbygoogle')];
  const adBoxes = [...document.querySelectorAll('.ad-slot')];
  if (!ads.enabled || !ads.client || (!slots.length && !ads.autoAds)) {
    adBoxes.forEach((el) => el.classList.add('ad-slot--empty'));
    return;
  }

  // When a Google-certified CMP (Funding Choices) is configured in AdSense it
  // owns the consent UI and Consent Mode, so the built-in banner stays off.
  const cmp = String(ads.cmp || 'custom');
  const hasConsentUi = () => Boolean(
    window.googlefc
    || document.querySelector('.fc-consent-root')
    || document.querySelector('.fc-dialog-overlay'),
  );

  const lang = (document.documentElement.lang || 'en').slice(0, 2);
  const copy = {
    zh: { text: '我们使用 Cookie 展示广告并衡量效果。你可以接受或拒绝；拒绝后仍可继续玩。', accept: '接受', deny: '仅必要', privacy: '隐私政策' },
    en: { text: 'We use cookies to serve and measure ads. You can accept or decline; the game still works either way.', accept: 'Accept', deny: 'Essential only', privacy: 'Privacy policy' },
    es: { text: 'Usamos cookies para mostrar y medir anuncios. Puedes aceptar o rechazar; el juego funciona igual.', accept: 'Aceptar', deny: 'Solo esenciales', privacy: 'Privacidad' },
    fr: { text: 'Nous utilisons des cookies pour diffuser et mesurer des annonces. Vous pouvez accepter ou refuser ; le jeu reste utilisable.', accept: 'Accepter', deny: 'Essentiels', privacy: 'Confidentialité' },
  }[lang] || null;
  const c = copy || { text: 'We use cookies to serve and measure ads.', accept: 'Accept', deny: 'Essential only', privacy: 'Privacy policy' };
  const privacyHref = `/${lang === 'zh' ? 'zh' : lang}/privacy/`;

  let consent = null;
  try { consent = localStorage.getItem(CONSENT_KEY); } catch { /* noop */ }

  // The AdSense tag is already in <head>; Consent Mode decides whether it may
  // use cookies and personalise ads. Defaults are "denied" in the page head.
  const grantConsent = () => {
    if (typeof window.gtag === 'function') {
      window.gtag('consent', 'update', {
        ad_storage: 'granted',
        ad_user_data: 'granted',
        ad_personalization: 'granted',
      });
    }
    if (window.__adsenseReady) return;
    window.__adsenseReady = true;
    for (const slot of slots) {
      try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch { /* noop */ }
    }
  };

  const denyConsent = () => {
    // Consent Mode defaults already deny storage; just make sure no empty
    // placeholder boxes stay visible.
    adBoxes.forEach((el) => el.classList.add('ad-slot--empty'));
  };

  const showBanner = () => {
    if (document.querySelector('.consent-banner')) return;
    const el = document.createElement('div');
    el.className = 'consent-banner';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', c.text);
    el.innerHTML = `<p>${c.text} <a href="${privacyHref}" style="color:var(--teal)">${c.privacy}</a></p>
      <div class="actions">
        <button class="btn btn-ghost" data-consent="denied">${c.deny}</button>
        <button class="btn btn-primary" data-consent="granted">${c.accept}</button>
      </div>`;
    document.body.appendChild(el);
    el.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-consent]');
      if (!btn) return;
      const value = btn.dataset.consent;
      try { localStorage.setItem(CONSENT_KEY, value); } catch { /* noop */ }
      el.remove();
      if (value === 'granted') grantConsent();
      else denyConsent();
    });
  };

  document.querySelectorAll('[data-consent-open]').forEach((btn) => {
    btn.addEventListener('click', () => {
      try { localStorage.removeItem(CONSENT_KEY); } catch { /* noop */ }
      location.reload();
    });
  });

  const applyStoredChoice = () => {
    if (consent === 'granted') grantConsent();
    else if (consent !== 'denied') showBanner();
    else adBoxes.forEach((el) => el.classList.add('ad-slot--empty'));
  };

  if (cmp === 'google') {
    // Funding Choices should paint its own message. If it is not published, is
    // blocked, or targets a different site, fall back to the built-in banner so
    // the page is never left with no consent notice at all.
    if (hasConsentUi()) return;
    let waited = 0;
    const timer = setInterval(() => {
      if (hasConsentUi()) { clearInterval(timer); return; }
      waited += 300;
      if (waited < 3000) return;
      clearInterval(timer);
      applyStoredChoice();
      // If the CMP shows up late, drop our banner so nobody sees two dialogs.
      const watch = setInterval(() => {
        if (!hasConsentUi()) return;
        clearInterval(watch);
        const el = document.querySelector('.consent-banner');
        if (el) el.remove();
      }, 500);
      setTimeout(() => clearInterval(watch), 20000);
    }, 300);
    return;
  }

  applyStoredChoice();
})();
