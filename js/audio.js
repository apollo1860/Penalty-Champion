// Kleine synthetische Soundkulisse über die Web Audio API (keine Dateien nötig).

let ctx = null;
let master = null;
let crowdGain = null;
let enabled = true;

try {
  enabled = localStorage.getItem('pc-sound') !== 'off';
} catch (e) { /* ignore */ }

function ensure() {
  if (!enabled) return null;
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.7;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function noiseBuffer(seconds = 2, brown = false) {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1;
    if (brown) {
      last = (last + 0.02 * w) / 1.02;
      d[i] = last * 3.5;
    } else d[i] = w;
  }
  return buf;
}

let bufWhite = null;
let bufBrown = null;
function buffers() {
  if (!bufWhite) bufWhite = noiseBuffer(2, false);
  if (!bufBrown) bufBrown = noiseBuffer(4, true);
}

export const Sound = {
  get enabled() { return enabled; },
  setEnabled(v) {
    enabled = v;
    try { localStorage.setItem('pc-sound', v ? 'on' : 'off'); } catch (e) { /* ignore */ }
    if (!v && ctx) {
      this.stopCrowd();
      ctx.suspend();
    } else if (v) {
      ensure();
    }
  },
  unlock() { ensure(); },

  startCrowd() {
    if (!ensure() || crowdGain) return;
    buffers();
    const src = ctx.createBufferSource();
    src.buffer = bufBrown;
    src.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 520;
    bp.Q.value = 0.6;
    crowdGain = ctx.createGain();
    crowdGain.gain.value = 0;
    crowdGain.gain.linearRampToValueAtTime(0.16, ctx.currentTime + 1.2);
    src.connect(bp).connect(crowdGain).connect(master);
    src.start();
    crowdGain._src = src;
  },
  stopCrowd() {
    if (!crowdGain || !ctx) return;
    const g = crowdGain;
    crowdGain = null;
    g.gain.cancelScheduledValues(ctx.currentTime);
    g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
    setTimeout(() => { try { g._src.stop(); } catch (e) { /* ignore */ } }, 700);
  },
  tension(on) {
    if (!crowdGain || !ctx) return;
    crowdGain.gain.linearRampToValueAtTime(on ? 0.07 : 0.16, ctx.currentTime + 0.4);
  },

  kick(power = 0.5) {
    if (!ensure()) return;
    buffers();
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(150 + power * 60, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.14);
    g.gain.setValueAtTime(0.9, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + 0.22);
    const n = ctx.createBufferSource();
    n.buffer = bufWhite;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 1800;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.35, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    n.connect(hp).connect(ng).connect(master);
    n.start(t);
    n.stop(t + 0.06);
  },

  whistle(long = false) {
    if (!ensure()) return;
    const t = ctx.currentTime;
    const dur = long ? 0.9 : 0.35;
    const o = ctx.createOscillator();
    const lfo = ctx.createOscillator();
    const lg = ctx.createGain();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.value = 2650;
    lfo.frequency.value = 38;
    lg.gain.value = 120;
    lfo.connect(lg).connect(o.frequency);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.18, t + 0.02);
    g.gain.setValueAtTime(0.18, t + dur - 0.05);
    g.gain.linearRampToValueAtTime(0, t + dur);
    o.connect(g).connect(master);
    o.start(t); lfo.start(t);
    o.stop(t + dur); lfo.stop(t + dur);
  },

  cheer(intensity = 1) {
    if (!ensure()) return;
    buffers();
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = bufWhite;
    src.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(700, t);
    bp.frequency.linearRampToValueAtTime(1200, t + 0.5);
    bp.Q.value = 0.8;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.32 * intensity, t + 0.25);
    g.gain.linearRampToValueAtTime(0.2 * intensity, t + 1.2);
    g.gain.linearRampToValueAtTime(0, t + 2.6);
    src.connect(bp).connect(g).connect(master);
    src.start(t);
    src.stop(t + 2.7);
  },

  groan() {
    if (!ensure()) return;
    buffers();
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = bufBrown;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(900, t);
    lp.frequency.linearRampToValueAtTime(300, t + 1.2);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.5, t + 0.15);
    g.gain.linearRampToValueAtTime(0, t + 1.4);
    src.connect(lp).connect(g).connect(master);
    src.start(t);
    src.stop(t + 1.5);
  },

  ping() {
    if (!ensure()) return;
    const t = ctx.currentTime;
    [880, 1320, 2110].forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'triangle';
      o.frequency.value = f;
      g.gain.setValueAtTime(0.22 / (i + 1), t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
      o.connect(g).connect(master);
      o.start(t);
      o.stop(t + 0.75);
    });
  },

  tick() {
    if (!ensure()) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'square';
    o.frequency.value = 1100;
    g.gain.setValueAtTime(0.05, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + 0.06);
  },

  click() {
    if (!ensure()) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(620, t);
    o.frequency.exponentialRampToValueAtTime(380, t + 0.06);
    g.gain.setValueAtTime(0.12, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + 0.09);
  },
};

export function buzz(pattern) {
  try { if (navigator.vibrate) navigator.vibrate(pattern); } catch (e) { /* ignore */ }
}
