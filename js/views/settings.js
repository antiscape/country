import { store, setSetting, setLangSetting, exportSave, importSave, resetStore } from '../store.js';
import { shell, pageHead } from '../layout.js';
import { icon } from '../icons.js';
import { t, setLang } from '../i18n.js';
import { openModal, confirmDialog, toast } from '../ui.js';
import { sfx, setSfxEnabled, setMusicEnabled } from '../audio.js';

function toggle(key, on, label, desc) {
  return `<div class="setting-row">
    <div><div class="sr-label">${label}</div><div class="sr-desc">${desc}</div></div>
    <button class="switch ${on ? 'on' : ''}" role="switch" aria-checked="${on}" data-toggle="${key}" aria-label="${label}"></button>
  </div>`;
}

export function settingsView() {
  const st = store.settings;
  const content = `${pageHead({
    eyebrow: t('偏好设置', 'PREFERENCES'),
    title: t('把游戏调成你的样子', 'Make it yours'),
    subtitle: t('语言、声音、动效与存档。所有设置只保存在这台设备上。', 'Language, sound, motion and saves — kept on this device only.'),
  })}
    <div class="settings-layout">
      <section class="settings-card panel">
        <h3>${icon('sliders')} ${t('游戏体验', 'Experience')}</h3>
        <p>${t('随时可以更改，立即生效。', 'Change these at any time — they apply instantly.')}</p>
        <div class="setting-row">
          <div><div class="sr-label">${t('界面语言', 'Language')}</div><div class="sr-desc">${t('中文 / English / Español / Français', 'Chinese / English / Spanish / French')}</div></div>
          <div class="segmented" data-lang>
            <button data-l="zh" class="${st.lang === 'zh' ? 'on' : ''}">中文</button>
            <button data-l="en" class="${st.lang === 'en' ? 'on' : ''}">EN</button>
            <button data-l="es" class="${st.lang === 'es' ? 'on' : ''}">ES</button>
            <button data-l="fr" class="${st.lang === 'fr' ? 'on' : ''}">FR</button>
          </div>
        </div>
        ${toggle('sound', st.sound, t('音效', 'Sound effects'), t('答对、答错与按钮反馈音', 'Correct, wrong and UI sounds'))}
        ${toggle('music', st.music, t('环境音乐', 'Ambient music'), t('轻柔的环球背景音（默认关闭）', 'A soft background loop (off by default)'))}
        ${toggle('motion', st.motion, t('动态效果', 'Motion'), t('关闭后减少动画与粒子效果', 'Turn off to reduce animations and particles'))}
      </section>

      <section class="settings-card panel">
        <h3>${icon('keyboard')} ${t('键盘快捷键', 'Keyboard shortcuts')}</h3>
        <p>${t('桌面端可用，移动端直接点击。', 'Available on desktop. Tap on mobile.')}</p>
        <div class="shortcut-list">
          <div><span>${t('选择答案', 'Select answer')}</span><kbd>1–9</kbd></div>
          <div><span>${t('选择答案（字母）', 'Select (letters)')}</span><kbd>A–J</kbd></div>
          <div><span>${t('滚动国旗', 'Scroll flags')}</span><kbd>← →</kbd></div>
          <div><span>${t('继续 / 下一题', 'Continue')}</span><kbd>Space</kbd></div>
          <div><span>${t('提示', 'Hint')}</span><kbd>?</kbd></div>
          <div><span>${t('暂停', 'Pause')}</span><kbd>Esc</kbd></div>
          <div><span>${t('搜索国家', 'Search atlas')}</span><kbd>/</kbd></div>
        </div>
      </section>

      <section class="settings-card panel">
        <h3>${icon('download')} ${t('存档管理', 'Save data')}</h3>
        <p>${t('进度保存在浏览器 localStorage 中。换设备时可以导出再导入。', 'Progress lives in localStorage. Export and import to move devices.')}</p>
        <div class="setting-row">
          <div><div class="sr-label">${t('导出存档', 'Export save')}</div><div class="sr-desc">${t('下载一份 JSON 备份', 'Download a JSON backup')}</div></div>
          <button class="btn btn-ghost btn-sm" data-export>${icon('download')}${t('导出', 'Export')}</button>
        </div>
        <div class="setting-row">
          <div><div class="sr-label">${t('导入存档', 'Import save')}</div><div class="sr-desc">${t('将覆盖当前进度', 'Overwrites current progress')}</div></div>
          <button class="btn btn-ghost btn-sm" data-import>${icon('upload')}${t('导入', 'Import')}</button>
          <input type="file" accept="application/json,.json" data-file hidden>
        </div>
        <div class="setting-row">
          <div><div class="sr-label" style="color:var(--red)">${t('重置进度', 'Reset progress')}</div><div class="sr-desc">${t('清空所有记录，无法恢复', 'Erase everything — irreversible')}</div></div>
          <button class="btn btn-ghost btn-sm danger-btn" data-reset>${icon('trash')}${t('重置', 'Reset')}</button>
        </div>
      </section>

      <section class="settings-card panel">
        <h3>${icon('info')} ${t('关于 GEOQUEST', 'About GEOQUEST')}</h3>
        <p>${t('一个用一面旗认识世界的独立地理游戏。', 'An independent geography game about knowing the world, one flag at a time.')}</p>
        <div class="about-text">
          <p>${t(
            '玩法灵感来自 CrazyGames 上的《Geography Quiz: Flags and Capitals》，在保留五种核心模式的同时，重新设计了关卡、提示、错题复习、图鉴与锦标赛等体验。',
            'Inspired by Geography Quiz: Flags and Capitals on CrazyGames. It keeps the five core modes while redesigning levels, hints, mistake review, the atlas and tournaments.',
          )}</p>
          <p style="margin-top:10px">${t('国旗素材来自', 'Flags from')} <a href="https://flagcdn.com" target="_blank" rel="noopener">flagcdn</a> · ${t('国家数据来自', 'Country data from')} <a href="https://github.com/mledoze/countries" target="_blank" rel="noopener">world-countries</a> · ${t('人口数据来自世界银行 2023 年统计。', 'Population from World Bank 2023.')}</p>
          <p style="margin-top:10px">v1.0 · ${t('纯前端实现，无需联网即可游玩（首次加载后）。', 'Pure front-end. Playable offline after first load.')}</p>
        </div>
        <div class="modal-actions" style="margin-top:18px">
          <a class="btn btn-ghost btn-sm" href="https://www.crazygames.com/game/world-geography-flags-and-capitals" target="_blank" rel="noopener">${icon('arrow-up-right')}${t('查看原版', 'Original game')}</a>
        </div>
      </section>
    </div>`;

  return {
    html: shell(content, 'settings'),
    mount() {
      document.querySelectorAll('[data-toggle]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const key = btn.dataset.toggle;
          const next = !(btn.classList.contains('on'));
          btn.classList.toggle('on', next);
          btn.setAttribute('aria-checked', String(next));
          setSetting(key, next);
          if (key === 'sound') {
            setSfxEnabled(next);
            if (next) sfx('click');
          }
          if (key === 'music') setMusicEnabled(next);
          if (key === 'motion') document.body.classList.toggle('reduced-motion', !next);
          if (next) sfx('click');
        });
      });
      document.querySelectorAll('[data-lang] button').forEach((btn) => {
        btn.addEventListener('click', () => {
          if (btn.classList.contains('on')) return;
          setLangSetting(btn.dataset.l);
          setLang(btn.dataset.l);
          sfx('click');
          const url = new URL(location.href);
          url.searchParams.set('lang', btn.dataset.l);
          location.href = url.toString();
        });
      });
      document.querySelector('[data-export]')?.addEventListener('click', () => {
        const blob = new Blob([exportSave()], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const date = new Date().toISOString().slice(0, 10);
        a.href = url;
        a.download = `geoquest-save-${date}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        toast(t('存档已导出', 'Save exported'), 'good', 'download');
      });
      const fileInput = document.querySelector('[data-file]');
      document.querySelector('[data-import]')?.addEventListener('click', () => fileInput?.click());
      fileInput?.addEventListener('change', async () => {
        const file = fileInput.files?.[0];
        if (!file) return;
        const text = await file.text();
        if (importSave(text)) {
          toast(t('导入成功，正在刷新…', 'Imported. Reloading…'), 'good', 'check');
          setTimeout(() => location.reload(), 700);
        } else {
          toast(t('存档格式无效', 'Invalid save file'), 'bad', 'x');
        }
        fileInput.value = '';
      });
      document.querySelector('[data-reset]')?.addEventListener('click', () => {
        confirmDialog({
          title: t('重置所有进度？', 'Reset all progress?'),
          message: t('等级、金币、掌握度、成就和每日连胜都会被清空。这个操作无法撤销。', 'Level, coins, mastery, achievements and daily streaks will be erased. This cannot be undone.'),
          confirmText: t('确认重置', 'Reset everything'),
          cancelText: t('取消', 'Cancel'),
          danger: true,
          iconName: 'trash',
        }).then((ok) => { if (ok) resetStore(); });
      });
    },
  };
}
