/* Small WebAudio synth — no external sound files. */
let ctx = null;
let master = null;
let musicTimer = null;
let musicNodes = [];
let musicOn = false;
let sfxOn = true;

function ensure() {
  if (ctx) {
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.55;
  master.connect(ctx.destination);
  return ctx;
}

export function initAudio() {
  ensure();
}

export function setSfxEnabled(on) { sfxOn = !!on; }

function tone({ freq = 440, dur = 0.2, type = 'sine', vol = 0.05, delay = 0, slide = 0 }) {
  if (!sfxOn) return;
  const c = ensure();
  if (!c) return;
  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t0 + dur);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

export function sfx(name) {
  switch (name) {
    case 'click':
      tone({ freq: 620, dur: 0.05, type: 'triangle', vol: 0.025 });
      break;
    case 'correct':
      tone({ freq: 659.25, dur: 0.16, type: 'sine', vol: 0.055 });
      tone({ freq: 987.77, dur: 0.22, type: 'sine', vol: 0.045, delay: 0.1 });
      tone({ freq: 1318.5, dur: 0.35, type: 'sine', vol: 0.035, delay: 0.2 });
      break;
    case 'wrong':
      tone({ freq: 220, dur: 0.2, type: 'sawtooth', vol: 0.035, slide: -80 });
      tone({ freq: 160, dur: 0.3, type: 'triangle', vol: 0.04, delay: 0.12, slide: -50 });
      break;
    case 'timeout':
      tone({ freq: 330, dur: 0.16, type: 'square', vol: 0.025 });
      tone({ freq: 220, dur: 0.32, type: 'square', vol: 0.025, delay: 0.14 });
      break;
    case 'tick':
      tone({ freq: 880, dur: 0.04, type: 'sine', vol: 0.018 });
      break;
    case 'coin':
      tone({ freq: 988, dur: 0.08, type: 'triangle', vol: 0.03 });
      tone({ freq: 1480, dur: 0.16, type: 'triangle', vol: 0.025, delay: 0.07 });
      break;
    case 'hint':
      tone({ freq: 523, dur: 0.12, type: 'sine', vol: 0.03 });
      tone({ freq: 784, dur: 0.2, type: 'sine', vol: 0.025, delay: 0.08 });
      break;
    case 'star':
      tune([523, 659, 784, 1047], 0.12, 0.045);
      break;
    case 'start':
      tune([392, 523, 659], 0.09, 0.035);
      break;
    case 'win':
      tune([523, 659, 784, 1047, 1319], 0.14, 0.05);
      break;
    case 'levelup':
      tune([659, 880, 1109, 1319], 0.12, 0.045);
      break;
    default:
      break;
  }
}

function tune(freqs, step, vol) {
  freqs.forEach((f, i) => tone({ freq: f, dur: step * 1.8, type: 'sine', vol, delay: i * step }));
}

/* ---------------- ambient music ---------------- */
const CHORDS = [
  [130.81, 196.0, 261.63, 329.63],
  [110.0, 164.81, 220.0, 329.63],
  [87.31, 130.81, 174.61, 261.63],
  [98.0, 146.83, 196.0, 293.66],
];

export function startMusic() {
  if (musicOn) return;
  const c = ensure();
  if (!c) return;
  musicOn = true;
  let step = 0;
  const playChord = () => {
    if (!musicOn) return;
    const chord = CHORDS[step % CHORDS.length];
    step += 1;
    chord.forEach((freq, i) => {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = i === 0 ? 'sine' : 'triangle';
      osc.frequency.value = freq;
      osc.detune.value = (i - 1.5) * 3;
      gain.gain.value = 0.0001;
      const t0 = c.currentTime;
      gain.gain.exponentialRampToValueAtTime(0.013 / (i + 1), t0 + 1.1);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 4.4);
      osc.connect(gain).connect(master);
      osc.start(t0);
      osc.stop(t0 + 4.6);
      musicNodes.push(osc);
    });
    if (musicNodes.length > 24) musicNodes = musicNodes.slice(-12);
  };
  playChord();
  musicTimer = setInterval(playChord, 4200);
}

export function stopMusic() {
  musicOn = false;
  if (musicTimer) clearInterval(musicTimer);
  musicTimer = null;
  musicNodes.forEach((n) => {
    try { n.stop(); } catch { /* already stopped */ }
  });
  musicNodes = [];
}

export function setMusicEnabled(on) {
  if (on) startMusic();
  else stopMusic();
}

export function isMusicOn() { return musicOn; }
