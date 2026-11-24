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

  /* ---------------- AdSense + consent ---------------- */
  const slots = [...document.querySelectorAll('.adsbygoogle')];
  const adBoxes = [...document.querySelectorAll('.ad-slot')];
  if (!ads.enabled || !ads.client || (!slots.length && !ads.autoAds)) {
    adBoxes.forEach((el) => el.classList.add('ad-slot--empty'));
    return;
  }

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

  const loadAds = () => {
    if (window.__adsenseLoaded) return;
    window.__adsenseLoaded = true;
    // Prefer the exact AdSense snippet embedded as an inert <template> in the
    // page head. It is only cloned into the live DOM after consent.
    const template = document.querySelector('template[data-adsense-auto]');
    let s;
    if (template?.content?.firstElementChild) {
      s = template.content.firstElementChild.cloneNode(true);
    } else {
      s = document.createElement('script');
      s.async = true;
      s.crossOrigin = 'anonymous';
      s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(ads.client)}`;
    }
    s.onerror = () => adBoxes.forEach((el) => el.classList.add('ad-slot--empty'));
    s.onload = () => {
      for (const slot of slots) {
        try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch { /* noop */ }
      }
    };
    document.head.appendChild(s);
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
      if (value === 'granted') loadAds();
      else adBoxes.forEach((box) => box.classList.add('ad-slot--empty'));
    });
  };

  document.querySelectorAll('[data-consent-open]').forEach((btn) => {
    btn.addEventListener('click', () => {
      try { localStorage.removeItem(CONSENT_KEY); } catch { /* noop */ }
      location.reload();
    });
  });

  if (consent === 'granted') loadAds();
  else if (consent !== 'denied') showBanner();
  else adBoxes.forEach((el) => el.classList.add('ad-slot--empty'));
})();
