// Canvas-Renderer für das Elfmeterschießen: Stadion, Tor, Torwart, Schütze, Ball.
// Welt-Koordinaten in Metern: x nach rechts, y nach oben, z = Abstand von der Torlinie.

export const GOAL_HW = 3.66; // halbe Torbreite (Innenkante Pfosten)
export const GOAL_H = 2.44;
export const SPOT_Z = 11;
const CAMZ = 19;
const CAMH = 3.2;
const BALL_R = 0.13;
const KEEPER_Z = 0.42;
export const METER_MAX_H = 2.75; // Regler 100 % = 2,75 m Höhe

export const heightFromMeter = (v) => Math.max(0.12, v * METER_MAX_H);
// Reglerbereiche (für das Zeichnen der Zonen)
export const METER_BAR_LO = 2.36 / METER_MAX_H;
export const METER_BAR_HI = 2.52 / METER_MAX_H;

// Wohin geht der Ball? 'in' | 'post' | 'bar' | 'wide' | 'over'
export function classify(tx, ty) {
  const ax = Math.abs(tx);
  if (ty > 2.52) return 'over';
  if (ax > 3.78) return 'wide';
  if (ax >= 3.55) return 'post';
  if (ty >= 2.36) return 'bar';
  return 'in';
}

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

const SKINS = ['#F1C6A0', '#E0AC84', '#C68B62', '#9A6444', '#6E4430'];
const HAIR = ['#1d1612', '#3b2a1e', '#6b4a2b', '#c99a5b', '#111'];

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

export class Scene {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.running = false;
    this.time = 0;
    this.last = 0;
    this.crowd = [];
    this.timers = [];
    this.reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.reset();
    this._loop = this._loop.bind(this);
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(canvas);
  }

  reset() {
    this.keeper = { x: 0, hipY: 0.95, rot: 0, arm: 0, crouch: 0, dive: null, settle: null, skin: SKINS[1], hair: HAIR[0] };
    this.shooter = { x: -1.05, z: 12.75, phase: 'stand', t0: 0, run: 0, kick: 0, skin: SKINS[2], hair: HAIR[1] };
    this.ball = { x: 0, y: BALL_R, z: SPOT_Z, vx: 0, vy: 0, vz: 0, mode: 'rest', spin: 0, alpha: 1 };
    this.net = { amp: 0, x: 0, y: 1, t0: 0 };
    this.aim = { visible: false, x: 0, y: 1.2, locked: false };
    this.meter = { visible: false, v: 0, stopped: false };
    this.cheer = null;
    this.timers.forEach(clearTimeout);
    this.timers = [];
  }

  setup({ shooterTeam, keeperTeam, crowdTeams, number }) {
    this.reset();
    this.shooterTeam = shooterTeam;
    this.keeperTeam = keeperTeam;
    this.number = number;
    this.shooter.skin = SKINS[(number * 7) % SKINS.length];
    this.shooter.hair = HAIR[(number * 3) % HAIR.length];
    this.keeper.skin = SKINS[(keeperTeam.abbr.charCodeAt(0) + 2) % SKINS.length];
    this.keeper.hair = HAIR[keeperTeam.abbr.charCodeAt(1) % HAIR.length];
    if (crowdTeams && crowdTeams !== this.crowdTeams) {
      this.crowdTeams = crowdTeams;
      this._buildCrowd();
    }
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    this.resize();
    requestAnimationFrame(this._loop);
  }

  stop() {
    this.running = false;
  }

  resize() {
    const c = this.canvas;
    const W = c.clientWidth;
    const H = c.clientHeight;
    if (!W || !H) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    c.width = Math.round(W * dpr);
    c.height = Math.round(H * dpr);
    this.dpr = dpr;
    this.W = W;
    this.H = H;
    const f = Math.min(1.84 * W, 1.71 * H);
    this.f = f;
    // Schütze steht unten im Bild, Tor möglichst groß, Rest gehört der Tribüne
    this.hz = Math.min(0.96 * H - 0.508 * f, 0.4 * H - 0.04 * f);
    this.cx = W / 2;
    this._buildCrowd();
  }

  proj(x, y, z) {
    const D = Math.max(0.3, CAMZ - z);
    const s = this.f / D;
    return { x: this.cx + x * s, y: this.hz + (CAMH - y) * s, s };
  }

  // Bildschirmposition (CSS-Pixel relativ zum Canvas) -> Welt-x/y auf der Torebene
  screenToGoal(px, py) {
    const D = CAMZ;
    return { x: ((px - this.cx) * D) / this.f, y: CAMH - ((py - this.hz) * D) / this.f };
  }

  _buildCrowd() {
    if (!this.W || !this.crowdTeams) return;
    const top = 0;
    const bottom = this.proj(0, 0.9, -5.5).y;
    const pal = [];
    this.crowdTeams.forEach((t, i) => {
      pal.push({ c: t.c1, team: i }, { c: t.c1, team: i }, { c: t.c2, team: i });
    });
    const neutral = ['#5b6684', '#8a93ab', '#3b445e'];
    const dots = [];
    let row = 0;
    const gap = 9;
    for (let y = top + 14; y < bottom - 6; y += gap, row++) {
      const depth = (y - top) / Math.max(1, bottom - top);
      const step = 9 + depth * 3;
      for (let x = (row % 2) * (step / 2) + 4; x < this.W; x += step) {
        if (Math.random() < 0.12) continue;
        // linke Kurve eher Heim-, rechte eher Gastfans
        const side = x / this.W;
        let pick;
        const roll = Math.random();
        if (roll < 0.18) pick = { c: neutral[(Math.random() * 3) | 0], team: -1 };
        else {
          const team = Math.random() < 1 - side * 0.8 - 0.1 ? 0 : 1;
          const opts = pal.filter((p) => p.team === team);
          pick = opts[(Math.random() * opts.length) | 0];
        }
        dots.push({ x: x + (Math.random() - 0.5) * 3, y, r: 1.5 + depth * 1.4, c: pick.c, team: pick.team, ph: Math.random() * 6.28 });
      }
    }
    this.crowd = dots;
  }

  celebrate(teamIndex) {
    this.cheer = { team: teamIndex, t0: this.time };
  }

  later(ms, fn) {
    const id = setTimeout(fn, ms);
    this.timers.push(id);
  }

  // ---------- Schuss-Ablauf ----------
  /**
   * shot = { tx, ty, power(0..1), result: 'goal'|'save'|'post'|'bar'|'wide'|'over',
   *          keeperDir: -1|0|1, onKick, onImpact, onDone }
   */
  playShot(shot) {
    const sh = this.shooter;
    sh.phase = 'run';
    sh.t0 = this.time;
    const runDur = 0.62;
    this.aim.visible = false;
    this.meter.visible = false;
    this.later(runDur * 1000, () => {
      sh.phase = 'kick';
      sh.t0 = this.time;
      shot.onKick && shot.onKick();
      this._launch(shot);
    });
  }

  _launch(shot) {
    const b = this.ball;
    const T = lerp(0.7, 0.42, clamp(shot.power, 0, 1));
    const zEnd = shot.result === 'save' ? KEEPER_Z + 0.05 : 0;
    const Tf = T * (1 - zEnd / SPOT_Z);
    b.mode = 'flight';
    b.f = {
      t0: this.time, T: Tf,
      x0: 0, y0: BALL_R, z0: SPOT_Z,
      x1: shot.tx, y1: shot.ty, z1: zEnd,
      arc: shot.ty > 1.2 ? 0.35 : 0.1,
    };
    b.spin = 0;
    // Torwart reagiert
    this._dive(shot, Tf);
    this.later(Tf * 1000, () => this._impact(shot));
  }

  _dive(shot, Tf) {
    const k = this.keeper;
    const dir = shot.keeperDir;
    const saved = shot.result === 'save';
    let to;
    if (dir === 0) {
      const hx = saved ? clamp(shot.tx, -1.2, 1.2) : clamp(shot.tx * 0.2, -0.3, 0.3);
      const hy = saved ? shot.ty : 1.9;
      const hipY = clamp(hy - 1.0, 0.75, 1.5);
      to = { x: clamp(hx * 0.6, -0.6, 0.6), hipY, rot: saved ? clamp(hx * 0.35, -0.5, 0.5) : 0, arm: 1 };
    } else {
      let hx;
      let hy;
      if (saved) {
        hx = shot.tx;
        hy = shot.ty;
      } else if (Math.sign(shot.tx) === dir && Math.abs(shot.tx) > 1.1) {
        // richtige Ecke geahnt, aber nicht rangekommen
        hx = dir * clamp(Math.abs(shot.tx) - 0.75, 1.7, 2.9);
        hy = shot.ty > 1.3 ? clamp(shot.ty - 0.8, 0.5, 1.5) : clamp(shot.ty + 0.7, 0.9, 1.8);
      } else {
        hx = dir * (2.3 + Math.random() * 0.6);
        hy = 0.5 + Math.random() * 1.2;
      }
      const th = lerp(1.42, 0.6, clamp(hy / 2.3, 0, 1));
      const reach = 1.17;
      let hipX = hx - dir * Math.sin(th) * reach;
      let hipY = hy - Math.cos(th) * reach;
      hipX = clamp(hipX, -2.5, 2.5);
      hipY = clamp(hipY, 0.28, 1.6);
      to = { x: hipX, hipY, rot: dir * th, arm: 1 };
    }
    const react = 0.04;
    const dur = Math.max(0.24, Tf * 0.92 - react);
    k.dive = { t0: this.time + react, dur, from: { x: k.x, hipY: k.hipY, rot: k.rot, arm: k.arm }, to, dir };
    k.settle = null;
  }

  _impact(shot) {
    const b = this.ball;
    const f = b.f;
    const vx = (f.x1 - f.x0) / f.T;
    const vy = (f.y1 - f.y0) / f.T;
    const vz = (f.z1 - f.z0) / f.T;
    b.x = f.x1; b.y = f.y1; b.z = f.z1;
    b.mode = 'free';
    const r = shot.result;
    if (r === 'goal') {
      b.vx = vx * 0.5; b.vy = vy * 0.3; b.vz = vz * 0.55;
      b.net = true;
    } else if (r === 'save') {
      const catchIt = shot.keeperDir === 0 || (shot.power < 0.4 && Math.abs(shot.ty) < 1.2);
      if (catchIt) {
        b.mode = 'held';
      } else {
        const side = Math.sign(shot.tx || shot.keeperDir || 1);
        b.vx = side * (2.5 + Math.random() * 2);
        b.vy = 2 + Math.random() * 2.5;
        b.vz = 4 + Math.random() * 3;
      }
    } else if (r === 'post') {
      b.vx = -Math.sign(shot.tx) * (1.5 + Math.random() * 2);
      b.vy = 0.6;
      b.vz = 4 + Math.random() * 2;
    } else if (r === 'bar') {
      b.vx = vx * 0.2;
      b.vy = shot.ty > GOAL_H ? 3.5 : -2.5;
      b.vz = shot.ty > GOAL_H ? -2 : 4.5;
    } else {
      b.vx = vx; b.vy = vy * 0.6 + 0.5; b.vz = vz;
      b.away = true;
    }
    shot.onImpact && shot.onImpact();
    this.later(1500, () => shot.onDone && shot.onDone());
  }

  // ---------- Update ----------
  _loop(now) {
    if (!this.running) return;
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.time += dt;
    this._update(dt);
    this._draw();
    requestAnimationFrame(this._loop);
  }

  _update(dt) {
    const t = this.time;
    const k = this.keeper;
    // Torwart
    if (k.dive) {
      const d = k.dive;
      const p = clamp((t - d.t0) / d.dur, 0, 1);
      if (t >= d.t0) {
        const e = easeOut(p);
        k.x = lerp(d.from.x, d.to.x, e);
        k.hipY = lerp(d.from.hipY, d.to.hipY, e) + (d.dir !== 0 ? Math.sin(p * Math.PI) * 0.12 : 0);
        k.rot = lerp(d.from.rot, d.to.rot, e);
        k.arm = lerp(d.from.arm, d.to.arm, Math.min(1, p * 1.6));
      }
      if (p >= 1 && t > d.t0 + d.dur + 0.18) {
        k.settle = { t0: t, from: { hipY: k.hipY, rot: k.rot, x: k.x }, dir: d.dir };
        k.dive = null;
      }
    } else if (k.settle) {
      const s = k.settle;
      const p = clamp((t - s.t0) / 0.35, 0, 1);
      const e = easeInOut(p);
      if (s.dir !== 0) {
        k.hipY = lerp(s.from.hipY, 0.26, e);
        k.rot = lerp(s.from.rot, s.dir * 1.5, e);
      } else {
        k.hipY = lerp(s.from.hipY, 0.95, e);
        k.rot = lerp(s.from.rot, 0, e);
        k.arm = lerp(1, 0.45, e);
      }
    } else {
      // leichtes Hin- und Herwippen auf der Linie
      k.x = Math.sin(t * 1.9) * 0.18;
      k.hipY = 0.9 + Math.abs(Math.sin(t * 3.8)) * 0.04;
      k.rot = Math.sin(t * 1.9) * 0.04;
      k.arm = 0.15 + Math.sin(t * 3.8) * 0.05;
    }

    // Schütze
    const sh = this.shooter;
    if (sh.phase === 'run') {
      const p = clamp((t - sh.t0) / 0.62, 0, 1);
      const e = easeInOut(p);
      sh.x = lerp(-1.05, -0.42, e);
      sh.z = lerp(12.75, SPOT_Z + 0.42, e);
      sh.run = p;
    } else if (sh.phase === 'kick') {
      sh.kick = clamp((t - sh.t0) / 0.3, 0, 1);
    } else {
      sh.x = -1.05;
      sh.z = 12.75;
    }

    // Ball
    const b = this.ball;
    if (b.mode === 'flight') {
      const f = b.f;
      const p = clamp((t - f.t0) / f.T, 0, 1);
      b.x = lerp(f.x0, f.x1, p);
      b.z = lerp(f.z0, f.z1, p);
      b.y = lerp(f.y0, f.y1, p) + Math.sin(p * Math.PI) * f.arc;
      b.spin += dt * 22;
    } else if (b.mode === 'free') {
      b.vy -= 9.81 * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.z += b.vz * dt;
      b.spin += dt * (Math.abs(b.vx) + Math.abs(b.vz)) * 2;
      if (b.net) {
        if (b.z < -1.35) {
          if (!b.netHit) {
            b.netHit = true;
            this.net = { amp: 0.75, x: b.x, y: Math.max(0.3, b.y), t0: t };
          }
          b.z = -1.35;
          b.vz = 0.4;
          b.vx *= 0.2;
        }
        b.x = clamp(b.x, -GOAL_HW + 0.15, GOAL_HW - 0.15);
        b.y = Math.min(b.y, 2.3);
        if (b.z > -0.2) b.z = -0.2;
      }
      if (b.y < BALL_R) {
        b.y = BALL_R;
        b.vy = Math.abs(b.vy) * 0.45;
        b.vx *= 0.75;
        b.vz *= 0.75;
        if (b.vy < 0.4) b.vy = 0;
      }
      if (b.away && b.z < -9) b.mode = 'hidden';
    } else if (b.mode === 'held') {
      const h = this._handPos();
      b.x = h.x;
      b.y = h.y;
      b.z = KEEPER_Z + 0.08;
    }

    if (this.net.amp > 0.001) {
      this.net.amp *= Math.exp(-dt * 1.6);
    }
  }

  _handPos() {
    const k = this.keeper;
    const reach = 1.12;
    return { x: k.x + Math.sin(k.rot) * reach, y: k.hipY + Math.cos(k.rot) * reach };
  }

  // ---------- Zeichnen ----------
  _draw() {
    const ctx = this.ctx;
    const { W, H } = this;
    if (!W) return;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    this._drawStands();
    this._drawPitch();
    this._drawNet();
    const b = this.ball;
    const ballVisible = b.mode !== 'hidden';
    if (ballVisible && b.z < -0.05) this._drawBall();
    this._drawGoalFrame();
    if (ballVisible && b.z >= -0.05 && b.z < KEEPER_Z) this._drawBall();
    this._drawKeeper();
    if (ballVisible && b.z >= KEEPER_Z) this._drawBall();
    this._drawShooter();
    this._drawAim();
    this._drawMeter();
    // Vignette
    const g = ctx.createRadialGradient(W / 2, H * 0.55, H * 0.3, W / 2, H * 0.55, H * 0.95);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(4,8,20,0.45)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  _drawStands() {
    const ctx = this.ctx;
    const { W } = this;
    const boardTop = this.proj(0, 0.9, -5.5).y;
    const g = ctx.createLinearGradient(0, 0, 0, boardTop);
    g.addColorStop(0, '#070b18');
    g.addColorStop(1, '#141c33');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, boardTop + 1);
    // Tribünenstufen
    ctx.strokeStyle = 'rgba(255,255,255,0.025)';
    ctx.lineWidth = 1;
    for (let y = 18; y < boardTop; y += 9) {
      ctx.beginPath();
      ctx.moveTo(0, y + 4);
      ctx.lineTo(W, y + 4);
      ctx.stroke();
    }
    // Fans
    const t = this.time;
    const ch = this.cheer;
    const chAge = ch ? t - ch.t0 : 99;
    for (const d of this.crowd) {
      let dy = Math.sin(t * 1.3 + d.ph) * 0.4;
      if (ch && chAge < 3.2 && d.team === ch.team) {
        const decay = 1 - chAge / 3.2;
        dy -= Math.abs(Math.sin(chAge * 11 + d.ph)) * 4 * decay;
      }
      ctx.fillStyle = d.c;
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.arc(d.x, d.y + dy, d.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // Flutlicht-Schein
    for (const x of [0, W]) {
      const lg = ctx.createRadialGradient(x, 0, 0, x, 0, W * 0.5);
      lg.addColorStop(0, 'rgba(255,248,220,0.16)');
      lg.addColorStop(1, 'rgba(255,248,220,0)');
      ctx.fillStyle = lg;
      ctx.fillRect(0, 0, W, boardTop);
    }
    // Werbebanden (LED)
    const a = this.proj(-40, 0.9, -5.5);
    const bb = this.proj(40, 0, -5.5);
    const bh = bb.y - a.y;
    ctx.fillStyle = '#0c1226';
    ctx.fillRect(0, a.y, W, bh);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, a.y, W, bh);
    ctx.clip();
    const fs = Math.max(8, bh * 0.52);
    ctx.font = `800 ${fs}px "Big Shoulders Display", "Barlow Condensed", Impact, sans-serif`;
    ctx.textBaseline = 'middle';
    const words = ['PENALTY CHAMPION', 'POKAL 26/27', 'DER WEG NACH BERLIN', 'ELFMETER-STADION'];
    let x = -((t * 18) % 260);
    let i = 0;
    while (x < W) {
      const w = words[i % words.length];
      ctx.fillStyle = i % 2 ? '#E8B931' : '#dfe6f5';
      ctx.fillText(w, x, a.y + bh / 2 + 1);
      x += ctx.measureText(w).width + fs * 1.6;
      i++;
    }
    ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(0, a.y, W, 1);
  }

  _drawPitch() {
    const ctx = this.ctx;
    const { W, H } = this;
    const top = this.proj(0, 0, -5.5).y;
    ctx.fillStyle = '#3d8a46';
    ctx.fillRect(0, top, W, H - top);
    // Mähstreifen
    const step = 2.2;
    let i = 0;
    for (let z = -5.5; z < CAMZ - 0.5; z += step, i++) {
      const y0 = this.proj(0, 0, z).y;
      const y1 = Math.min(H, this.proj(0, 0, Math.min(z + step, CAMZ - 0.4)).y);
      ctx.fillStyle = i % 2 ? '#428f4a' : '#3a8243';
      ctx.fillRect(0, y0, W, y1 - y0 + 0.5);
      if (y1 >= H) break;
    }
    // Linien
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineCap = 'round';
    const line = (pts) => {
      ctx.beginPath();
      pts.forEach(([x, z], j) => {
        const p = this.proj(x, 0, z);
        if (j === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();
    };
    ctx.lineWidth = Math.max(1.2, (0.12 * this.f) / CAMZ);
    line([[-40, 0], [40, 0]]);
    ctx.lineWidth = Math.max(1.4, (0.12 * this.f) / (CAMZ - 5.5));
    line([[-9.16, 0], [-9.16, 5.5], [9.16, 5.5], [9.16, 0]]);
    ctx.lineWidth = Math.max(1.6, (0.12 * this.f) / 4);
    line([[-20.16, 0], [-20.16, CAMZ - 1]]);
    line([[20.16, 0], [20.16, CAMZ - 1]]);
    // Elfmeterpunkt
    const sp = this.proj(0, 0, SPOT_Z);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    ctx.ellipse(sp.x, sp.y, 0.13 * sp.s, 0.05 * sp.s, 0, 0, Math.PI * 2);
    ctx.fill();
    // Torraum-Schatten
    const gl = this.proj(-GOAL_HW, 0, 0);
    const gr = this.proj(GOAL_HW, 0, 0);
    const sg = ctx.createLinearGradient(0, gl.y - 4, 0, gl.y + 10);
    sg.addColorStop(0, 'rgba(0,0,0,0.18)');
    sg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sg;
    ctx.fillRect(gl.x - 10, gl.y - 2, gr.x - gl.x + 20, 12);
  }

  _netZ(x, y) {
    const n = this.net;
    if (n.amp < 0.002) return 0;
    const d2 = (x - n.x) ** 2 + (y - n.y) ** 2;
    const age = this.time - n.t0;
    return n.amp * Math.exp(-d2 / 0.9) * (0.75 + 0.25 * Math.cos(age * 14));
  }

  _drawNet() {
    const ctx = this.ctx;
    const BACK = -2.0;
    const ROOF_Z = -1.2;
    const ROOF_Y = 2.3;
    // Profil vom Boden hinten bis zur Latte
    const prof = (u) => {
      // u: 0 = Boden hinten, 0.6 = Dachkante, 1 = Latte
      if (u <= 0.6) {
        const k = u / 0.6;
        return { y: k * ROOF_Y, z: lerp(BACK, ROOF_Z, k) };
      }
      const k = (u - 0.6) / 0.4;
      return { y: lerp(ROOF_Y, GOAL_H, k), z: lerp(ROOF_Z, 0, k) };
    };
    const pt = (x, u) => {
      const p = prof(u);
      const bz = u < 0.85 ? this._netZ(x, p.y) : 0;
      return this.proj(x, p.y, p.z - bz);
    };
    // Rückwand dunkel hinterlegen
    ctx.fillStyle = 'rgba(10,30,18,0.35)';
    ctx.beginPath();
    let p = pt(-GOAL_HW, 0);
    ctx.moveTo(p.x, p.y);
    p = pt(GOAL_HW, 0);
    ctx.lineTo(p.x, p.y);
    p = pt(GOAL_HW, 0.6);
    ctx.lineTo(p.x, p.y);
    p = pt(-GOAL_HW, 0.6);
    ctx.lineTo(p.x, p.y);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = 'rgba(255,255,255,0.33)';
    ctx.lineWidth = 0.8;
    // Längsfäden
    const cols = 30;
    for (let i = 0; i <= cols; i++) {
      const x = -GOAL_HW + (i / cols) * GOAL_HW * 2;
      ctx.beginPath();
      for (let j = 0; j <= 20; j++) {
        const q = pt(x, j / 20);
        if (j === 0) ctx.moveTo(q.x, q.y);
        else ctx.lineTo(q.x, q.y);
      }
      ctx.stroke();
    }
    // Querfäden
    const rows = 16;
    for (let j = 0; j <= rows; j++) {
      const u = j / rows;
      ctx.beginPath();
      for (let i = 0; i <= cols; i++) {
        const x = -GOAL_HW + (i / cols) * GOAL_HW * 2;
        const q = pt(x, u);
        if (i === 0) ctx.moveTo(q.x, q.y);
        else ctx.lineTo(q.x, q.y);
      }
      ctx.stroke();
    }
    // Seitennetze
    for (const sx of [-GOAL_HW, GOAL_HW]) {
      for (let j = 0; j <= 8; j++) {
        const y = (j / 8) * GOAL_H;
        const a = this.proj(sx, y, 0);
        const u = clamp(y / ROOF_Y, 0, 1) * 0.6;
        const b = pt(sx, Math.min(u, 0.6));
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }
  }

  _drawGoalFrame() {
    const ctx = this.ctx;
    const t = 0.12;
    const L = this.proj(-GOAL_HW - t, GOAL_H + t, 0);
    const R = this.proj(GOAL_HW + t, 0, 0);
    const iL = this.proj(-GOAL_HW, GOAL_H, 0);
    const iR = this.proj(GOAL_HW, GOAL_H, 0);
    const pw = iL.x - L.x;
    // Schatten der Pfosten
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(L.x, R.y - 1, R.x - L.x, 3);
    const grad = (x0, x1) => {
      const g = ctx.createLinearGradient(x0, 0, x1, 0);
      g.addColorStop(0, '#d9dee8');
      g.addColorStop(0.45, '#ffffff');
      g.addColorStop(1, '#bfc6d4');
      return g;
    };
    ctx.fillStyle = grad(L.x, iL.x);
    ctx.fillRect(L.x, L.y, pw, R.y - L.y);
    ctx.fillStyle = grad(iR.x, R.x);
    ctx.fillRect(iR.x, L.y, pw, R.y - L.y);
    const bg = ctx.createLinearGradient(0, L.y, 0, iL.y);
    bg.addColorStop(0, '#ffffff');
    bg.addColorStop(1, '#c9cfdb');
    ctx.fillStyle = bg;
    ctx.fillRect(L.x, L.y, R.x - L.x, iL.y - L.y);
  }

  _drawBall() {
    const ctx = this.ctx;
    const b = this.ball;
    const p = this.proj(b.x, b.y, b.z);
    const sh = this.proj(b.x, 0, b.z);
    const r = Math.max(2.2, BALL_R * p.s);
    // Schatten
    if (b.z > -1.9) {
      const lift = clamp(1 - (b.y - BALL_R) / 2.5, 0.25, 1);
      ctx.fillStyle = `rgba(0,0,0,${0.32 * lift})`;
      ctx.beginPath();
      ctx.ellipse(sh.x, sh.y, r * 1.05, r * 0.38, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.save();
    ctx.translate(p.x, p.y);
    const g = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.7, '#eef1f6');
    g.addColorStop(1, '#a9b2c3');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    if (r > 3.5) {
      ctx.save();
      ctx.clip();
      ctx.rotate(b.spin);
      ctx.fillStyle = '#1b2233';
      const pent = (cx, cy, rr) => {
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
          ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
        }
        ctx.closePath();
        ctx.fill();
      };
      pent(0, 0, r * 0.32);
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5 + Math.PI / 5;
        pent(Math.cos(a) * r * 0.95, Math.sin(a) * r * 0.95, r * 0.3);
      }
      ctx.restore();
    }
    ctx.restore();
  }

  _drawKeeper() {
    const ctx = this.ctx;
    const k = this.keeper;
    const team = this.keeperTeam;
    if (!team) return;
    const p = this.proj(k.x, k.hipY, KEEPER_Z);
    const fp = this.proj(k.x + Math.sin(k.rot) * 0.2, 0, KEEPER_Z);
    // Schatten
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    const spread = 0.35 + Math.abs(Math.sin(k.rot)) * 0.8;
    ctx.ellipse(fp.x, fp.y, spread * fp.s, 0.1 * fp.s, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.scale(p.s, p.s);
    ctx.rotate(k.rot);
    const jersey = team.c1;
    const shorts = team.c2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    // Beine
    const legA = 0.12 + Math.abs(k.rot) * 0.15;
    ctx.lineWidth = 0.15;
    for (const s of [-1, 1]) {
      const fx = s * 0.1 + s * Math.sin(legA) * 0.88;
      const fy = Math.cos(legA) * 0.88;
      ctx.strokeStyle = jersey;
      ctx.beginPath();
      ctx.moveTo(s * 0.11, 0.1);
      ctx.lineTo(fx, fy);
      ctx.stroke();
      ctx.strokeStyle = '#141824';
      ctx.lineWidth = 0.16;
      ctx.beginPath();
      ctx.moveTo(fx, fy - 0.06);
      ctx.lineTo(fx + s * 0.03, fy + 0.04);
      ctx.stroke();
      ctx.lineWidth = 0.15;
    }
    // Hose
    ctx.fillStyle = shorts;
    roundRect(ctx, -0.24, -0.03, 0.48, 0.3, 0.07);
    ctx.fill();
    // Arme (hinter dem Torso, wenn unten)
    const aIdle = 0.55;
    const aUp = Math.PI - 0.22;
    const a = lerp(aIdle, aUp, k.arm);
    const arms = () => {
      for (const s of [-1, 1]) {
        const sx = s * 0.22;
        const sy = -0.52;
        const ex = sx + s * Math.sin(a) * 0.62;
        const ey = sy + Math.cos(a) * 0.62;
        ctx.strokeStyle = jersey;
        ctx.lineWidth = 0.14;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(ex, ey);
        ctx.stroke();
        ctx.fillStyle = '#f4f6fb';
        ctx.beginPath();
        ctx.arc(ex, ey, 0.105, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = shorts === '#FFFFFF' ? '#1b2030' : shorts;
        ctx.lineWidth = 0.035;
        ctx.stroke();
      }
    };
    // Torso
    ctx.fillStyle = jersey;
    roundRect(ctx, -0.26, -0.64, 0.52, 0.68, 0.13);
    ctx.fill();
    const tg = ctx.createLinearGradient(-0.26, 0, 0.26, 0);
    tg.addColorStop(0, 'rgba(255,255,255,0.18)');
    tg.addColorStop(0.5, 'rgba(255,255,255,0)');
    tg.addColorStop(1, 'rgba(0,0,0,0.22)');
    ctx.fillStyle = tg;
    roundRect(ctx, -0.26, -0.64, 0.52, 0.68, 0.13);
    ctx.fill();
    // Brustband in Zweitfarbe
    ctx.fillStyle = hexA(shorts, 0.9);
    ctx.fillRect(-0.26, -0.42, 0.52, 0.07);
    arms();
    // Kopf
    ctx.fillStyle = k.skin;
    ctx.beginPath();
    ctx.arc(0, -0.79, 0.135, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = k.hair;
    ctx.beginPath();
    ctx.arc(0, -0.81, 0.138, Math.PI * 1.05, Math.PI * 1.95);
    ctx.fill();
    ctx.restore();
  }

  _drawShooter() {
    const ctx = this.ctx;
    const sh = this.shooter;
    const team = this.shooterTeam;
    if (!team) return;
    const hip = this.proj(sh.x, 0.95, sh.z);
    const foot = this.proj(sh.x, 0, sh.z);
    const s = hip.s;
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath();
    ctx.ellipse(foot.x, foot.y, 0.42 * s, 0.13 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(hip.x, hip.y);
    ctx.scale(s, s);
    // Laufbewegung
    let lean = 0;
    let lLift = 0;
    let rLift = 0;
    let armSwing = 0;
    let rOut = 0;
    if (sh.phase === 'run') {
      const cyc = Math.sin(sh.run * Math.PI * 4);
      lLift = Math.max(0, cyc) * 0.22;
      rLift = Math.max(0, -cyc) * 0.22;
      armSwing = cyc * 0.35;
      lean = 0.08;
    } else if (sh.phase === 'kick') {
      const kk = easeOut(sh.kick);
      rLift = 0.15 + kk * 0.45;
      rOut = kk * 0.12;
      armSwing = -0.5 * kk;
      lean = 0.1 - kk * 0.18;
    } else {
      const br = Math.sin(this.time * 2.4) * 0.01;
      lean = br;
    }
    ctx.rotate(lean);
    const jersey = team.c1;
    const shorts = team.c2;
    ctx.lineCap = 'round';
    // Beine (von hinten)
    const leg = (x, lift, out) => {
      const fx = x + out;
      const fy = 0.92 - lift;
      ctx.strokeStyle = this.shooter.skin;
      ctx.lineWidth = 0.15;
      ctx.beginPath();
      ctx.moveTo(x, 0.12);
      ctx.lineTo(fx, fy - 0.35);
      ctx.stroke();
      ctx.strokeStyle = jersey;
      ctx.lineWidth = 0.16;
      ctx.beginPath();
      ctx.moveTo(fx, fy - 0.36);
      ctx.lineTo(fx, fy - 0.06);
      ctx.stroke();
      ctx.strokeStyle = '#151a26';
      ctx.lineWidth = 0.17;
      ctx.beginPath();
      ctx.moveTo(fx, fy - 0.05);
      ctx.lineTo(fx, fy + 0.03);
      ctx.stroke();
    };
    leg(-0.12, lLift, 0);
    leg(0.12, rLift, rOut);
    // Hose
    ctx.fillStyle = shorts;
    roundRect(ctx, -0.25, -0.04, 0.5, 0.32, 0.07);
    ctx.fill();
    // Arme
    for (const sd of [-1, 1]) {
      const sw = armSwing * sd;
      ctx.strokeStyle = jersey;
      ctx.lineWidth = 0.13;
      const ex = sd * 0.36 + sw * 0.15;
      const ey = -0.05 - sw * 0.12;
      ctx.beginPath();
      ctx.moveTo(sd * 0.23, -0.52);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      ctx.fillStyle = this.shooter.skin;
      ctx.beginPath();
      ctx.arc(ex, ey + 0.04, 0.055, 0, Math.PI * 2);
      ctx.fill();
    }
    // Trikot
    ctx.fillStyle = jersey;
    roundRect(ctx, -0.27, -0.64, 0.54, 0.68, 0.13);
    ctx.fill();
    const tg = ctx.createLinearGradient(-0.27, 0, 0.27, 0);
    tg.addColorStop(0, 'rgba(0,0,0,0.2)');
    tg.addColorStop(0.5, 'rgba(255,255,255,0.06)');
    tg.addColorStop(1, 'rgba(0,0,0,0.25)');
    ctx.fillStyle = tg;
    roundRect(ctx, -0.27, -0.64, 0.54, 0.68, 0.13);
    ctx.fill();
    // Rückennummer
    ctx.fillStyle = shorts === jersey ? '#111' : shorts;
    ctx.font = '900 0.34px "Big Shoulders Display", "Barlow Condensed", Impact, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(this.number || 9), 0, -0.3);
    // Kopf von hinten
    ctx.fillStyle = this.shooter.skin;
    ctx.beginPath();
    ctx.arc(0, -0.79, 0.135, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = this.shooter.hair;
    ctx.beginPath();
    ctx.arc(0, -0.8, 0.137, Math.PI * 0.92, Math.PI * 2.08);
    ctx.fill();
    ctx.restore();
  }

  _drawAim() {
    if (!this.aim.visible) return;
    const ctx = this.ctx;
    const a = this.aim;
    const ty = this.meter.visible ? heightFromMeter(this.meter.v) : a.y;
    const base = this.proj(a.x, 0, 0);
    const topP = this.proj(a.x, METER_MAX_H, 0);
    // Führungslinie
    ctx.save();
    ctx.setLineDash([3, 4]);
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(base.x, base.y);
    ctx.lineTo(topP.x, topP.y);
    ctx.stroke();
    ctx.restore();
    const p = this.proj(a.x, ty, 0);
    const cls = classify(a.x, ty);
    const col = cls === 'in' ? '#E8B931' : cls === 'post' || cls === 'bar' ? '#FF9F43' : '#FF5A5F';
    const r = 11 + (a.locked ? 0 : Math.sin(this.time * 6) * 1.5);
    ctx.strokeStyle = col;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(p.x - r - 5, p.y);
    ctx.lineTo(p.x - r + 4, p.y);
    ctx.moveTo(p.x + r - 4, p.y);
    ctx.lineTo(p.x + r + 5, p.y);
    ctx.moveTo(p.x, p.y - r - 5);
    ctx.lineTo(p.x, p.y - r + 4);
    ctx.moveTo(p.x, p.y + r - 4);
    ctx.lineTo(p.x, p.y + r + 5);
    ctx.stroke();
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  _drawMeter() {
    const m = this.meter;
    if (!m.visible) return;
    const ctx = this.ctx;
    const { W, H } = this;
    const w = 16;
    const x = W - w - 14;
    const top = H * 0.12;
    const bottom = H * 0.66;
    const h = bottom - top;
    const vy = (v) => bottom - v * h;
    // Rahmen
    ctx.fillStyle = 'rgba(7,11,24,0.78)';
    roundRect(ctx, x - 5, top - 5, w + 10, h + 10, 10);
    ctx.fill();
    // Zonen
    const g = ctx.createLinearGradient(0, bottom, 0, vy(METER_BAR_LO));
    g.addColorStop(0, '#1f7a4a');
    g.addColorStop(0.6, '#3DDC84');
    g.addColorStop(1, '#C8F27A');
    ctx.fillStyle = g;
    ctx.fillRect(x, vy(METER_BAR_LO), w, bottom - vy(METER_BAR_LO));
    ctx.fillStyle = '#FF9F43';
    ctx.fillRect(x, vy(METER_BAR_HI), w, vy(METER_BAR_LO) - vy(METER_BAR_HI));
    ctx.fillStyle = '#FF5A5F';
    ctx.fillRect(x, top, w, vy(METER_BAR_HI) - top);
    // Nadel
    const ny = vy(m.v);
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 6;
    roundRect(ctx, x - 6, ny - 2.5, w + 12, 5, 2.5);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + w + 6, ny);
    ctx.lineTo(x + w + 13, ny - 6);
    ctx.lineTo(x + w + 13, ny + 6);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}
