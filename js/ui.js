/* Overlays: toast, modal, confirmation, confetti. */
import { icon } from './icons.js';
import { escapeHtml, prefersReducedMotion } from './utils.js';
import { t } from './i18n.js';

/* ---------------- toast ---------------- */
export function toast(message, type = '', iconName = 'sparkle', ms = 2800) {
  const root = document.getElementById('toast-root');
  if (!root) return;
  const el = document.createElement('div');
  el.className = `toast ${type}`.trim();
  el.innerHTML = `${icon(iconName)}<span>${escapeHtml(message)}</span>`;
  root.appendChild(el);
  setTimeout(() => {
    el.classList.add('out');
    setTimeout(() => el.remove(), 320);
  }, ms);
}

/* ---------------- modal ---------------- */
let active = null;

export function closeModal(silent = false) {
  if (!active) return;
  const { root, previousFocus, keyHandler, onClose } = active;
  document.removeEventListener('keydown', keyHandler);
  root.innerHTML = '';
  document.body.classList.remove('no-scroll');
  active = null;
  if (previousFocus && typeof previousFocus.focus === 'function') {
    try { previousFocus.focus({ preventScroll: true }); } catch { /* noop */ }
  }
  if (!silent && typeof onClose === 'function') onClose();
}

export function openModal({
  title = '', subtitle = '', content = '', wide = false, onMount = null, showClose = true,
  dismissible = true, onClose = null,
} = {}) {
  closeModal(true);
  const root = document.getElementById('modal-root');
  const previousFocus = document.activeElement;
  root.innerHTML = `
    <div class="modal-backdrop" data-modal-backdrop>
      <section class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-label="${escapeHtml(title || 'Dialog')}">
        ${showClose ? `<button class="icon-btn modal-close" data-modal-close aria-label="${t('关闭', 'Close')}">${icon('x')}</button>` : ''}
        ${title ? `<div class="modal-head"><div><h2>${escapeHtml(title)}</h2>${subtitle ? `<p>${subtitle}</p>` : ''}</div></div>` : ''}
        <div data-modal-body>${content}</div>
      </section>
    </div>`;

  const modal = root.querySelector('.modal');
  const backdrop = root.querySelector('[data-modal-backdrop]');
  const close = () => closeModal();

  const onClick = (e) => {
    if (e.target.closest('[data-modal-close]') && dismissible) { close(); return; }
    if (e.target === backdrop && dismissible) close();
  };
  backdrop.addEventListener('click', onClick);

  const keyHandler = (e) => {
    if (e.key === 'Escape' && dismissible) { e.preventDefault(); close(); return; }
    if (e.key !== 'Tab') return;
    const focusables = [...modal.querySelectorAll(
      'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    )].filter((el) => el.offsetParent !== null);
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };
  document.addEventListener('keydown', keyHandler);
  document.body.classList.add('no-scroll');
  active = { root, previousFocus, keyHandler, onClose };

  if (onMount) onMount(modal, close);
  requestAnimationFrame(() => {
    const target = modal.querySelector('[data-autofocus]')
      || modal.querySelector('button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex="0"]');
    if (target) target.focus({ preventScroll: true });
  });

  return { el: modal, close };
}

export function confirmDialog({
  title, message, confirmText = '确认', cancelText = '取消', danger = false, iconName = 'info',
} = {}) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      closeModal();
      resolve(value);
    };
    openModal({
      title,
      content: `
        <div style="display:flex;gap:14px;align-items:flex-start;padding:4px 0 6px">
          <div style="width:42px;height:42px;flex:0 0 auto;border-radius:50%;display:grid;place-items:center;background:rgba(247,184,61,.1);color:var(--gold)">${icon(iconName)}</div>
          <p style="color:var(--text-2);font-size:12.5px;line-height:1.7">${message}</p>
        </div>
        <div class="modal-actions">
          <button class="btn btn-ghost" data-cancel>${escapeHtml(cancelText)}</button>
          <button class="btn ${danger ? 'btn-ghost danger-btn' : 'btn-primary'}" data-confirm data-autofocus>${escapeHtml(confirmText)}</button>
        </div>`,
      onMount(el, close) {
        el.querySelector('[data-cancel]').addEventListener('click', () => finish(false));
        el.querySelector('[data-confirm]').addEventListener('click', () => finish(true));
        const origClose = close;
        void origClose;
      },
    });
    // resolve false when dismissed by backdrop/escape
    const observer = new MutationObserver(() => {
      if (!document.getElementById('modal-root').children.length) {
        observer.disconnect();
        if (!settled) { settled = true; resolve(false); }
      }
    });
    observer.observe(document.getElementById('modal-root'), { childList: true });
  });
}

/* ---------------- confetti ---------------- */
export function confetti({ count = 130, duration = 3200 } = {}) {
  if (prefersReducedMotion() || document.body.classList.contains('reduced-motion')) return;
  const root = document.getElementById('fx-root');
  if (!root) return;
  let canvas = root.querySelector('.confetti-canvas');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.className = 'confetti-canvas';
    root.appendChild(canvas);
  }
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const resize = () => {
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();
  const colors = ['#f7b83d', '#ffdc94', '#3bdcb4', '#5aa9ff', '#ff7e8b', '#a98cff', '#ffffff'];
  const parts = Array.from({ length: count }, () => ({
    x: window.innerWidth * (0.15 + Math.random() * 0.7),
    y: -30 - Math.random() * 200,
    vx: (Math.random() - 0.5) * 2.4,
    vy: 2 + Math.random() * 4.5,
    w: 4 + Math.random() * 7,
    h: 7 + Math.random() * 10,
    rot: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.18,
    color: colors[Math.floor(Math.random() * colors.length)],
    shape: Math.random() < 0.25 ? 'circle' : 'rect',
    life: 1,
  }));
  const start = performance.now();
  let raf = 0;
  const draw = (now) => {
    const elapsed = now - start;
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    for (const p of parts) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.045;
      p.vx *= 0.995;
      p.rot += p.vr;
      p.life = Math.max(0, 1 - elapsed / duration);
      ctx.save();
      ctx.globalAlpha = Math.min(1, p.life * 1.6);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      if (p.shape === 'circle') {
        ctx.beginPath();
        ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      }
      ctx.restore();
      if (p.y > window.innerHeight + 40) p.life = 0;
    }
    if (elapsed < duration) raf = requestAnimationFrame(draw);
    else {
      cancelAnimationFrame(raf);
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      canvas.remove();
    }
  };
  raf = requestAnimationFrame(draw);
  window.addEventListener('resize', resize, { once: true });
}

/* ---------------- focus & scroll helpers ---------------- */
export function focusFirst(container) {
  const el = container.querySelector('[data-autofocus], button, [href], input, select');
  if (el) el.focus({ preventScroll: true });
}
