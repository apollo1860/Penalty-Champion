import { TEAMS, ROUND_NAMES, ROUND_SHORT, team, tierOf, strength01, badgeSVG, potOf, POT_LABEL } from './teams.js';
import { Scene, classify, heightFromMeter } from './scene.js';
import { Sound, buzz } from './audio.js';
import {
  newTournament, myPairing, completeRound, advance, simulateRest, shootoutWinner, load, save, clear,
} from './tournament.js';

const $ = (s) => document.querySelector(s);
const app = $('#app');
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const gauss = () => {
  let u = 0;
  let v = 0;
  while (!u) u = Math.random();
  while (!v) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};

const DIFF = {
  easy: { label: 'Leicht', hint: 'Langsamer Regler, viel Zeit beim Halten.', meter: 0.78, aimErr: 0.07, keepTime: 4, aiKeep: -0.08, aiRead: -0.04, userKeep: 0.1 },
  normal: { label: 'Normal', hint: 'Ausgewogen. Wie ein echtes Pokalspiel.', meter: 1, aimErr: 0.14, keepTime: 3, aiKeep: 0, aiRead: 0.03, userKeep: 0.03 },
  hard: { label: 'Profi', hint: 'Schneller Regler, Torhüter lesen dich öfter.', meter: 1.22, aimErr: 0.2, keepTime: 2.2, aiKeep: 0.06, aiRead: 0.1, userKeep: -0.03 },
};
const NUMBERS = [9, 10, 7, 11, 8, 6, 4, 5, 3, 2, 14];

let tour = load();
let difficulty = (tour && tour.difficulty) || 'normal';
const scene = new Scene($('#pitch'));

// ---------------- Navigation ----------------
function show(id) {
  document.querySelectorAll('.screen').forEach((s) => {
    if (s.id === id) s.setAttribute('data-active', '');
    else s.removeAttribute('data-active');
  });
  if (id === 'screen-match') scene.start();
  else {
    scene.stop();
    Sound.stopCrowd();
  }
  const chip = $('#round-chip');
  if (tour && (id === 'screen-round' || id === 'screen-match')) chip.textContent = ROUND_NAMES[tour.round];
  else chip.textContent = '26/27';
  const scr = document.getElementById(id);
  if (scr) scr.scrollTop = 0;
}

// ---------------- Ton ----------------
function syncSound() {
  app.classList.toggle('muted', !Sound.enabled);
}
$('#btn-sound').addEventListener('click', () => {
  Sound.setEnabled(!Sound.enabled);
  syncSound();
  if (Sound.enabled && $('#screen-match').hasAttribute('data-active')) Sound.startCrowd();
});
syncSound();
document.addEventListener('pointerdown', () => Sound.unlock(), { once: true });

// ---------------- Start ----------------
function renderHome() {
  const cont = $('#btn-continue');
  const resumable = !!tour;
  cont.hidden = !resumable;
  if (resumable) {
    const t = team(tour.teamId);
    const finished = tour.status === 'champion' || tour.status === 'done';
    cont.innerHTML = `${badgeSVG(t, 30)}<span>${finished ? 'Turnierbilanz' : `Weiter · ${ROUND_NAMES[tour.round]}`}</span>`;
  }
  $('#btn-new').className = resumable ? 'btn btn-ghost' : 'btn btn-gold';
  const mq = $('#marquee');
  if (!mq.childElementCount) {
    const html = TEAMS.map((t) => badgeSVG(t, 44)).join('');
    mq.innerHTML = html + html;
  }
  show('screen-home');
}
$('#btn-new').addEventListener('click', () => {
  Sound.click();
  renderTeams();
  show('screen-teams');
});
$('#btn-continue').addEventListener('click', () => {
  Sound.click();
  if (tour.status === 'champion' || tour.status === 'done') renderEnd();
  else renderRound();
});
$('#btn-home').addEventListener('click', () => {
  if (match) abortMatch();
  closeSheet();
  renderHome();
});

// ---------------- Teamwahl ----------------
let filter = 'all';
function renderTeams() {
  const q = $('#team-search').value.trim().toLowerCase();
  const grid = $('#team-grid');
  const list = TEAMS.filter((t) => (filter === 'all' || tierOf(t.r).key === filter)
    && (!q || t.name.toLowerCase().includes(q) || t.short.toLowerCase().includes(q) || t.abbr.toLowerCase().includes(q)));
  grid.innerHTML = list.length
    ? list.map((t) => `<button type="button" class="team-card" data-id="${t.id}">
        ${badgeSVG(t, 56)}
        <span class="tname">${t.short}</span>
        <span class="bar" title="Stärke ${t.r}"><i style="width:${Math.round(15 + strength01(t.r) * 85)}%"></i></span>
      </button>`).join('')
    : '<p class="empty">Kein Verein gefunden.</p>';
}
$('#team-search').addEventListener('input', renderTeams);
$('#filters').addEventListener('click', (e) => {
  const b = e.target.closest('.fchip');
  if (!b) return;
  filter = b.dataset.f;
  document.querySelectorAll('.fchip').forEach((c) => c.setAttribute('aria-selected', String(c === b)));
  renderTeams();
});
$('#team-grid').addEventListener('click', (e) => {
  const c = e.target.closest('.team-card');
  if (!c) return;
  Sound.click();
  openPick(team(c.dataset.id));
});

function openSheet(html) {
  const sh = $('#sheet');
  sh.innerHTML = `<div class="sheet-grip"></div>${html}`;
  sh.hidden = false;
  $('#sheet-backdrop').hidden = false;
}
function closeSheet() {
  $('#sheet').hidden = true;
  $('#sheet-backdrop').hidden = true;
}
$('#sheet-backdrop').addEventListener('click', closeSheet);

function openPick(t) {
  const p = newTournament(t.id, difficulty).pairings.find((x) => x.home === t.id || x.away === t.id);
  const oppId = p.home === t.id ? p.away : p.home;
  const opp = team(oppId);
  const where = p.home === t.id ? 'Heimspiel gegen' : 'Auswärts bei';
  openSheet(`
    <div class="pick">
      ${badgeSVG(t, 92)}
      <h3 id="sheet-title">${t.name}</h3>
      <div class="meta">${POT_LABEL[potOf(t.id)]} · ${tierOf(t.r).label} · Stärke ${t.r}</div>
      <div class="opponent">
        ${badgeSVG(opp, 44)}
        <div><small>1. Runde · ${where}</small><b>${opp.name}</b></div>
      </div>
      <div class="seg-label">Schwierigkeit</div>
      <div class="seg" id="diff">
        ${Object.entries(DIFF).map(([k, d]) => `<button type="button" data-d="${k}" aria-pressed="${k === difficulty}">${d.label}</button>`).join('')}
      </div>
      <div class="seg-hint" id="diff-hint">${DIFF[difficulty].hint}</div>
      <button type="button" class="btn btn-gold" id="btn-go">Mit ${t.short} starten</button>
    </div>`);
  $('#diff').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    difficulty = b.dataset.d;
    document.querySelectorAll('#diff button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    $('#diff-hint').textContent = DIFF[difficulty].hint;
  });
  $('#btn-go').addEventListener('click', () => {
    Sound.whistle();
    tour = newTournament(t.id, difficulty);
    save(tour);
    closeSheet();
    renderRound();
  });
}

// ---------------- Runde ----------------
function sideHTML(t, cls, extra = '') {
  return `<div class="side ${cls}">${badgeSVG(t, 24)}<span>${t.short}</span>${extra}</div>`;
}

function renderRound() {
  if (!tour) return renderHome();
  if (tour.status === 'champion' || tour.status === 'done') return renderEnd();
  const r = tour.round;
  const played = !!tour.results;
  const lastMine = played ? tour.path[tour.path.length - 1] : null;
  const iWon = lastMine && lastMine.winner === tour.teamId;
  // Stepper
  $('#stepper').innerHTML = ROUND_SHORT.map((s, i) => {
    let c = '';
    if (i < r || (i === r && played && iWon)) c = 'done';
    else if (i === r && played && !iWon) c = 'lost';
    else if (i === r) c = 'now';
    return `<li class="${c}">${s}</li>`;
  }).join('');
  // Eigene Partie
  const p = myPairing(tour);
  const h = team(p.home);
  const a = team(p.away);
  const tag = (t) => (t.id === tour.teamId ? '<span class="fx-tag">DU</span>' : `<span class="fx-tag ghost">${POT_LABEL[potOf(t.id)]}</span>`);
  const mid = played
    ? `<div class="fx-vs">${lastMine.hg}:${lastMine.ag}<small>i. E.</small></div>`
    : `<div class="fx-vs">VS<small>${r === 5 ? 'Berlin' : (p.home === tour.teamId ? 'Heimspiel' : 'Auswärts')}</small></div>`;
  $('#fixture').innerHTML = `
    <div class="fx-top"><span>${ROUND_NAMES[r]}</span><span>${played ? (iWon ? 'Weiter!' : 'Ausgeschieden') : 'Dein Spiel'}</span></div>
    <div class="fx-teams">
      <div class="fx-team">${badgeSVG(h, 76)}<div class="fx-name">${h.short}</div>${tag(h)}</div>
      ${mid}
      <div class="fx-team">${badgeSVG(a, 76)}<div class="fx-name">${a.short}</div>${tag(a)}</div>
    </div>`;
  // Aktionen
  const cta = $('#round-cta');
  if (!played) {
    cta.innerHTML = '<button type="button" class="btn btn-gold" id="btn-kickoff">Zum Elfmeterschießen</button>';
    $('#btn-kickoff').addEventListener('click', startMatch);
  } else if (iWon) {
    cta.innerHTML = `<button type="button" class="btn btn-gold" id="btn-next">Auslosung ${ROUND_NAMES[r + 1]}</button>`;
    $('#btn-next').addEventListener('click', () => {
      Sound.click();
      advance(tour);
      renderRound();
    });
  } else {
    cta.innerHTML = `<button type="button" class="btn btn-gold" id="btn-sim">Pokalsieger ermitteln</button>
      <button type="button" class="btn btn-ghost" id="btn-restart">Neues Turnier</button>`;
    $('#btn-sim').addEventListener('click', () => {
      simulateRest(tour);
      renderEnd();
    });
    $('#btn-restart').addEventListener('click', () => {
      renderTeams();
      show('screen-teams');
    });
  }
  // Alle Partien
  $('#list-title').textContent = `${ROUND_NAMES[r]} · ${tour.pairings.length} ${tour.pairings.length === 1 ? 'Partie' : 'Partien'}`;
  const rows = (tour.results || tour.pairings).map((res) => {
    const H = team(res.home);
    const A = team(res.away);
    const mine = res.home === tour.teamId || res.away === tour.teamId;
    if (res.winner) {
      const hw = res.winner === res.home;
      return `<li class="res${mine ? ' mine' : ''}">${sideHTML(H, hw ? 'win' : 'lose')}<div class="score">${res.hg}:${res.ag}<small>i. E.</small></div>${sideHTML(A, hw ? 'lose away' : 'win away')}</li>`;
    }
    return `<li class="res${mine ? ' mine' : ''}">${sideHTML(H, '')}<div class="score pending">– : –</div>${sideHTML(A, 'away')}</li>`;
  });
  // eigene Partie nach oben
  const mineIdx = (tour.results || tour.pairings).findIndex((x) => x.home === tour.teamId || x.away === tour.teamId);
  if (mineIdx > 0) rows.unshift(rows.splice(mineIdx, 1)[0]);
  $('#results').innerHTML = rows.join('');
  show('screen-round');
}

// ---------------- Spiel ----------------
let match = null;
let phase = 'idle';
let meterRaf = 0;
let keepTimer = 0;

function abortMatch() {
  scene.reset();
  cancelAnimationFrame(meterRaf);
  clearInterval(keepTimer);
  match = null;
  phase = 'idle';
  const fin = $('.final');
  if (fin) fin.remove();
}

function startMatch() {
  Sound.click();
  const p = myPairing(tour);
  const home = team(p.home);
  const away = team(p.away);
  const firstHome = Math.random() < 0.5;
  match = {
    home, away,
    first: firstHome ? 'home' : 'away',
    second: firstHome ? 'away' : 'home',
    shots: { home: [], away: [] },
    kick: 0,
    mySide: home.id === tour.teamId ? 'home' : 'away',
  };
  $('#banner').hidden = true;
  show('screen-match');
  Sound.startCrowd();
  const firstTeam = match[match.first];
  scene.setup({ shooterTeam: firstTeam, keeperTeam: match[match.second], crowdTeams: [home, away], number: 9 });
  renderScoreboard();
  renderControls('<div class="ctrl-hint">Münzwurf …</div>');
  callout(`Münzwurf: ${firstTeam.short} beginnt`);
  Sound.whistle();
  setTimeout(() => { if (match) nextKick(); }, 1500);
}

function sideOfKick(i) {
  return i % 2 === 0 ? match.first : match.second;
}

function renderScoreboard(timerText) {
  const m = match;
  const n = Math.floor(m.kick / 2) + 1;
  const sudden = n > 5;
  $('#sb-label').textContent = sudden ? `Sudden Death · Runde ${n}` : `Elfmeterschießen · Runde ${n}/5`;
  const nextSide = phase === 'over' ? null : sideOfKick(m.kick);
  ['home', 'away'].forEach((side, i) => {
    const t = m[side];
    const shots = m.shots[side];
    const isNext = side === nextSide;
    const total = Math.max(5, shots.length + (isNext ? 1 : 0));
    let items = [];
    for (let k = 0; k < total; k++) {
      if (k < shots.length) items.push(shots[k] ? 'g' : 'm');
      else if (k === shots.length && isNext) items.push('next');
      else items.push('');
    }
    if (items.length > 6) items = items.slice(items.length - 6);
    const dots = items.map((c) => {
      if (c === 'g') return '<span class="dot g"><svg viewBox="0 0 10 10"><path d="M2 5.2 4.2 7.4 8.2 2.8" stroke="#08311b" stroke-width="1.8" fill="none" stroke-linecap="round"/></svg></span>';
      if (c === 'm') return '<span class="dot m"><svg viewBox="0 0 10 10"><path d="M2.6 2.6l4.8 4.8M7.4 2.6 2.6 7.4" stroke="#3a0b0d" stroke-width="1.8" stroke-linecap="round"/></svg></span>';
      return `<span class="dot ${c}"></span>`;
    }).join('');
    const row = $(`#sb-row-${i}`);
    row.style.setProperty('--team', t.c1 === '#FFFFFF' ? t.c2 : t.c1);
    row.classList.toggle('shooting', isNext);
    row.innerHTML = `${badgeSVG(t, 28)}
      <div class="sb-name"><span>${t.short}</span>${side === m.mySide ? '<em class="you">DU</em>' : ''}</div>
      <div class="dots">${dots}</div>
      <div class="sb-score">${shots.filter(Boolean).length}</div>`;
  });
  const timer = $('#sb-timer');
  if (timerText) {
    timer.className = 'sb-timer';
    timer.textContent = timerText;
  } else if (phase === 'aim' || phase === 'power') {
    timer.className = 'sb-timer calm';
    timer.textContent = 'Du schießt';
  } else if (phase === 'keep' || phase === 'keep-locked') {
    timer.className = 'sb-timer calm';
    timer.textContent = 'Du hältst';
  } else {
    timer.textContent = '';
  }
}

function renderControls(html) {
  $('#controls').innerHTML = html;
}
let calloutT = 0;
function callout(text, ms = 1600) {
  const c = $('#callout');
  c.textContent = text;
  c.hidden = false;
  clearTimeout(calloutT);
  if (ms) calloutT = setTimeout(() => { c.hidden = true; }, ms);
}
function hideCallout() {
  $('#callout').hidden = true;
}
function banner(text, cls, small = '') {
  const b = $('#banner');
  b.className = `banner ${cls || ''}`;
  b.innerHTML = `${text}${small ? `<small>${small}</small>` : ''}`;
  b.hidden = false;
  // Animation neu starten
  b.style.animation = 'none';
  void b.offsetWidth;
  b.style.animation = '';
}

function nextKick() {
  if (!match) return;
  $('#banner').hidden = true;
  const m = match;
  const w = shootoutWinner(m.shots[m.first], m.shots[m.second]);
  if (w) return endMatch(w === 'A' ? m.first : m.second);
  const side = sideOfKick(m.kick);
  const other = side === 'home' ? 'away' : 'home';
  const shooter = m[side];
  const keeper = m[other];
  const num = NUMBERS[m.shots[side].length % NUMBERS.length];
  scene.setup({ shooterTeam: shooter, keeperTeam: keeper, crowdTeams: [m.home, m.away], number: num });
  if (side === m.mySide) beginAim();
  else beginKeep();
}

// ----- Schießen -----
function meterSpeed() {
  const d = DIFF[tour.difficulty || 'normal'];
  const sudden = match.kick >= 10;
  const mine = team(tour.teamId);
  return 1.3 * d.meter * (1 + tour.round * 0.06) * (sudden ? 1.08 : 1) * (1 + (0.5 - strength01(mine.r)) * 0.12);
}

function beginAim() {
  phase = 'aim';
  Sound.tension(true);
  scene.aim.visible = true;
  scene.aim.locked = false;
  scene.aim.x = 0;
  scene.aim.y = 1.2;
  renderScoreboard();
  const desk = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  renderControls(desk
    ? '<div class="ctrl-hint"><b>Klicke ins Tor</b>, um zu zielen.<br>Oder: Pfeiltasten und Leertaste.</div>'
    : '<div class="ctrl-hint"><b>Tippe ins Tor</b> und zieh, um die Richtung zu wählen.<br>Loslassen bestätigt.</div>');
  callout('Ziel wählen', 1800);
}

function setAimFromEvent(e) {
  const rect = $('#pitch').getBoundingClientRect();
  const g = scene.screenToGoal(e.clientX - rect.left, e.clientY - rect.top);
  scene.aim.x = clamp(g.x, -4.6, 4.6);
  scene.aim.y = clamp(g.y, 0.2, 2.3);
}

let aiming = false;
let powerStartedAt = 0;
const pitch = $('#pitch');
pitch.addEventListener('pointerdown', (e) => {
  if (!match) return;
  if (phase === 'aim') {
    aiming = true;
    try { pitch.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    setAimFromEvent(e);
  } else if (phase === 'power') {
    if (performance.now() - powerStartedAt > 180) stopMeter();
  } else if (phase === 'keep') {
    const rect = pitch.getBoundingClientRect();
    const g = scene.screenToGoal(e.clientX - rect.left, e.clientY - rect.top);
    pickKeep(g.x < -1.2 ? -1 : g.x > 1.2 ? 1 : 0);
  }
});
pitch.addEventListener('pointermove', (e) => {
  if (phase !== 'aim') return;
  if (aiming || e.pointerType === 'mouse') setAimFromEvent(e);
});
pitch.addEventListener('pointerup', (e) => {
  if (phase === 'aim' && aiming) {
    aiming = false;
    setAimFromEvent(e);
    lockAim();
  }
});
pitch.addEventListener('pointercancel', () => { aiming = false; });

function lockAim() {
  phase = 'power';
  Sound.tick();
  scene.aim.locked = true;
  scene.meter.visible = true;
  scene.meter.v = 0;
  powerStartedAt = performance.now();
  hideCallout();
  renderScoreboard();
  renderControls(`
    <button type="button" class="btn btn-gold shoot-btn" id="btn-shoot">Schuss!</button>
    <div class="legend"><span><i style="background:var(--good)"></i>Im Tor</span><span><i style="background:var(--warn)"></i>Latte</span><span><i style="background:var(--bad)"></i>Drüber</span></div>`);
  $('#btn-shoot').addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (performance.now() - powerStartedAt > 120) stopMeter();
  });
  const speed = meterSpeed();
  let ph = 0;
  let last = performance.now();
  const step = (now) => {
    if (phase !== 'power') return;
    ph += ((now - last) / 1000) * speed;
    last = now;
    const k = ph % 2;
    scene.meter.v = k < 1 ? k : 2 - k;
    meterRaf = requestAnimationFrame(step);
  };
  meterRaf = requestAnimationFrame(step);
}

function aiKeeperDir(tx, keeperTeam) {
  const d = DIFF[tour.difficulty];
  const zone = Math.abs(tx) < 1.1 ? 0 : Math.sign(tx);
  const read = Math.max(0, 0.04 + strength01(keeperTeam.r) * 0.12 + d.aiRead);
  if (Math.random() < read) return zone;
  const r = Math.random();
  return r < 0.4 ? -1 : r < 0.8 ? 1 : 0;
}

function saveChance(tx, ty, power, dir) {
  const ax = Math.abs(tx);
  const zone = ax < 1.1 ? 0 : Math.sign(tx);
  if (dir === 0) {
    if (zone === 0) return ty < 1.9 ? 0.9 : 0.55;
    if (ax < 1.8 && ty < 1.9) return 0.3;
    return 0;
  }
  if (zone !== dir) return 0;
  const d = Math.hypot(ax - 2.2, ty - 0.9);
  return 0.93 - 0.36 * d - 0.28 * power;
}

function stopMeter() {
  if (phase !== 'power') return;
  phase = 'kicking';
  cancelAnimationFrame(meterRaf);
  const v = scene.meter.v;
  const d = DIFF[tour.difficulty];
  const tx = scene.aim.x + gauss() * d.aimErr;
  const ty = Math.max(0.12, heightFromMeter(v) + gauss() * 0.05);
  const keeperTeam = match[match.mySide === 'home' ? 'away' : 'home'];
  const cls = classify(tx, ty);
  const dir = aiKeeperDir(tx, keeperTeam);
  let result = cls;
  if (cls === 'in') {
    const bonus = (strength01(keeperTeam.r) - 0.5) * 0.1 + d.aiKeep;
    const p = clamp(saveChance(tx, ty, v, dir) + (saveChance(tx, ty, v, dir) > 0 ? bonus : 0), 0, 0.95);
    result = Math.random() < p ? 'save' : 'goal';
  }
  renderControls('<div class="ctrl-hint">Anlauf …</div>');
  Sound.tension(false);
  runShot({ tx, ty, power: v, result, keeperDir: dir }, true);
}

// ----- Halten -----
function aiShot(t) {
  const s = strength01(t.r);
  const pressure = match.kick >= 8 ? 1 : 0;
  const miss = 0.15 - s * 0.09 + pressure * 0.03;
  const side = Math.random() < 0.5 ? -1 : 1;
  if (Math.random() < miss) {
    const k = Math.random();
    let tx;
    let ty;
    if (k < 0.45) { tx = rand(-2.8, 2.8); ty = rand(2.6, 3.1); }
    else if (k < 0.8) { tx = side * rand(3.85, 4.5); ty = rand(0.2, 1.8); }
    else if (k < 0.9) { tx = side * rand(3.58, 3.75); ty = rand(0.3, 2.2); }
    else { tx = rand(-2.5, 2.5); ty = rand(2.38, 2.5); }
    return { tx, ty, power: clamp(ty / 2.75, 0.2, 1) };
  }
  const r = Math.random();
  let tx;
  let ty;
  if (r < 0.18) {
    tx = rand(-0.9, 0.9);
    ty = rand(0.2, 1.9);
  } else {
    tx = side * (1.5 + Math.sqrt(Math.random()) * 1.95);
    ty = Math.random() < 0.55 ? rand(0.15, 0.9) : rand(0.9, 2.3);
  }
  return { tx, ty, power: clamp(ty / 2.75 + rand(-0.1, 0.12), 0.15, 1) };
}

function beginKeep() {
  phase = 'keep';
  Sound.tension(true);
  const shooter = match[sideOfKick(match.kick)];
  match.pendingShot = aiShot(shooter);
  match.keepDeadline = performance.now() + DIFF[tour.difficulty].keepTime * 1000;
  const arrow = (d) => (d === -1
    ? '<svg viewBox="0 0 24 24"><path d="M18 18 6 6M6 6v9M6 6h9" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round"/></svg>'
    : d === 1
      ? '<svg viewBox="0 0 24 24"><path d="M6 18 18 6M18 6v9M18 6H9" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round"/></svg>'
      : '<svg viewBox="0 0 24 24"><path d="M12 20V5M12 5l-6 6M12 5l6 6" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round"/></svg>');
  renderControls(`<div class="keep-row" id="keep-row">
      <button type="button" class="keep-btn" data-k="-1">${arrow(-1)}Links</button>
      <button type="button" class="keep-btn" data-k="0">${arrow(0)}Mitte</button>
      <button type="button" class="keep-btn" data-k="1">${arrow(1)}Rechts</button>
    </div>`);
  $('#keep-row').addEventListener('pointerdown', (e) => {
    const b = e.target.closest('.keep-btn');
    if (!b) return;
    e.preventDefault();
    pickKeep(Number(b.dataset.k));
  });
  callout(`${shooter.short} legt sich den Ball hin`, 1600);
  const tick = () => {
    const left = Math.max(0, match.keepDeadline - performance.now());
    const secs = Math.ceil(left / 1000);
    if (secs !== match.lastSec) {
      match.lastSec = secs;
      if (secs > 0) Sound.tick();
      renderScoreboard(`0:${String(secs).padStart(2, '0')}`);
    }
    if (left <= 0) {
      clearInterval(keepTimer);
      callout('Zu spät! Du bleibst stehen', 1400);
      pickKeep(0, true);
    }
  };
  match.lastSec = null;
  tick();
  clearInterval(keepTimer);
  keepTimer = setInterval(tick, 100);
}

function pickKeep(dir) {
  if (phase !== 'keep' || !match) return;
  phase = 'keep-locked';
  clearInterval(keepTimer);
  Sound.click();
  buzz(15);
  const row = $('#keep-row');
  if (row) {
    row.classList.add('locked');
    const b = row.querySelector(`[data-k="${dir}"]`);
    if (b) b.classList.add('picked');
  }
  renderScoreboard();
  const s = match.pendingShot;
  const cls = classify(s.tx, s.ty);
  let result = cls;
  if (cls === 'in') {
    const base = saveChance(s.tx, s.ty, s.power, dir);
    const p = clamp(base + (base > 0 ? DIFF[tour.difficulty].userKeep : 0), 0, 0.95);
    result = Math.random() < p ? 'save' : 'goal';
  }
  Sound.tension(false);
  setTimeout(() => runShot({ tx: s.tx, ty: s.ty, power: s.power, result, keeperDir: dir }, false), 250);
}

// ----- Schuss ausführen -----
const WORDS = {
  goal: 'Tor!', save: 'Gehalten!', post: 'Pfosten!', bar: 'Latte!', wide: 'Vorbei!', over: 'Drüber!',
};

function runShot(shot, mine) {
  const m = match;
  const side = sideOfKick(m.kick);
  const other = side === 'home' ? 'away' : 'home';
  scene.playShot({
    ...shot,
    onKick: () => {
      Sound.kick(shot.power);
      buzz(20);
    },
    onImpact: () => {
      if (!match) return;
      const scored = shot.result === 'goal';
      m.shots[side].push(scored);
      if (mine) {
        tour.stats.shots += 1;
        if (scored) tour.stats.goals += 1;
      } else {
        tour.stats.faced += 1;
        if (!scored) tour.stats.saves += 1;
      }
      const crowdIdx = (scored ? side : other) === 'home' ? 0 : 1;
      scene.celebrate(crowdIdx);
      let cls;
      let word = WORDS[shot.result];
      if (mine) cls = scored ? 'gold' : 'bad';
      else {
        cls = scored ? '' : 'good';
        if (shot.result === 'save') word = 'Parade!';
      }
      banner(word, cls);
      if (scored) {
        Sound.cheer(mine ? 1 : 0.7);
        if (mine) buzz([30, 40, 30]);
      } else if (shot.result === 'save') {
        Sound.cheer(mine ? 0.5 : 1);
        if (!mine) buzz([30, 40, 30]);
      } else {
        if (shot.result === 'post' || shot.result === 'bar') Sound.ping();
        Sound.groan();
      }
      renderScoreboard();
    },
    onDone: () => {
      if (!match) return;
      m.kick += 1;
      nextKick();
    },
  });
}

function endMatch(winnerSide) {
  const m = match;
  phase = 'over';
  renderScoreboard();
  const hg = m.shots.home.filter(Boolean).length;
  const ag = m.shots.away.filter(Boolean).length;
  const result = { home: m.home.id, away: m.away.id, hg, ag, winner: m[winnerSide].id };
  const iWon = winnerSide === m.mySide;
  renderControls('');
  completeRound(tour, result);
  Sound.whistle(true);
  setTimeout(() => (iWon ? Sound.cheer(1.2) : Sound.groan()), 300);
  const champion = tour.status === 'champion';
  const word = champion ? 'Pokalsieger!' : iWon ? (tour.round === 4 ? 'Berlin!' : 'Weiter!') : 'Aus!';
  const sub = champion
    ? 'Der Pokal geht an dich'
    : iWon
      ? (tour.round === 4 ? 'Du stehst im Finale' : `Auf zur Auslosung: ${ROUND_NAMES[tour.round + 1]}`)
      : `Endstation ${ROUND_NAMES[tour.round]}`;
  const el = document.createElement('div');
  el.className = 'final';
  el.innerHTML = `<div class="final-card">
      <div class="final-word ${iWon ? 'good' : 'bad'}">${word}</div>
      <div class="final-score">${badgeSVG(m.home, 48)}<span>${hg}:${ag}</span>${badgeSVG(m.away, 48)}</div>
      <div class="final-sub">${sub}</div>
      <button type="button" class="btn ${iWon ? 'btn-gold' : 'btn-ghost'}" id="btn-after">Weiter</button>
    </div>`;
  setTimeout(() => {
    if (match !== m) return;
    $('#stage').appendChild(el);
    if (iWon) confetti([m[m.mySide].c1, m[m.mySide].c2, '#E8B931']);
    $('#btn-after').addEventListener('click', () => {
      Sound.click();
      el.remove();
      match = null;
      phase = 'idle';
      if (champion) renderEnd();
      else renderRound();
    });
  }, 1300);
}

// Tastatur
document.addEventListener('keydown', (e) => {
  if (!match) return;
  const k = e.key;
  if (phase === 'aim') {
    if (k === 'ArrowLeft') { scene.aim.x = clamp(scene.aim.x - 0.3, -4.6, 4.6); e.preventDefault(); }
    if (k === 'ArrowRight') { scene.aim.x = clamp(scene.aim.x + 0.3, -4.6, 4.6); e.preventDefault(); }
    if (k === ' ' || k === 'Enter') { e.preventDefault(); lockAim(); }
  } else if (phase === 'power') {
    if (k === ' ' || k === 'Enter') { e.preventDefault(); if (performance.now() - powerStartedAt > 120) stopMeter(); }
  } else if (phase === 'keep') {
    if (k === 'ArrowLeft' || k === 'a' || k === '1') pickKeep(-1);
    if (k === 'ArrowUp' || k === 'ArrowDown' || k === 's' || k === '2') pickKeep(0);
    if (k === 'ArrowRight' || k === 'd' || k === '3') pickKeep(1);
  }
});

// ---------------- Ende ----------------
function renderEnd() {
  const me = team(tour.teamId);
  const champ = team(tour.champion);
  const won = tour.status === 'champion';
  const lastRound = tour.path.length ? tour.path[tour.path.length - 1].round : 0;
  const st = tour.stats;
  const path = tour.path.map((g) => {
    const oppId = g.home === tour.teamId ? g.away : g.home;
    const opp = team(oppId);
    const w = g.winner === tour.teamId;
    const mine = g.home === tour.teamId ? g.hg : g.ag;
    const theirs = g.home === tour.teamId ? g.ag : g.hg;
    return `<li><span class="rn">${ROUND_SHORT[g.round]}</span><span class="vs">${badgeSVG(opp, 24)}<span>${opp.short}</span></span><span class="sc ${w ? 'w' : 'l'}">${mine}:${theirs}</span></li>`;
  }).join('');
  $('#end').innerHTML = `
    <p class="eyebrow">${won ? 'Finale · Berlin' : `Ausgeschieden · ${ROUND_NAMES[lastRound]}`}</p>
    <div class="badge-xl">${badgeSVG(won ? me : champ, 120)}</div>
    <h2 class="${won ? 'gold' : ''}">${won ? 'Pokalsieger 2027' : `${champ.short} holt den Pokal`}</h2>
    <p>${won
      ? `${me.name} gewinnt den Pokal. Sechs Elfmeterschießen, sechs Siege.`
      : `Für ${me.short} war in der ${ROUND_NAMES[lastRound]} Schluss. Den Pokal stemmt ${champ.name}.`}</p>
    <div class="stats">
      <div class="stat"><b>${st.goals}/${st.shots}</b><span>Treffer</span></div>
      <div class="stat"><b>${st.saves}</b><span>Paraden</span></div>
      <div class="stat"><b>${tour.path.filter((g) => g.winner === tour.teamId).length}</b><span>Siege</span></div>
    </div>
    <ul class="path">${path}</ul>
    <div class="end-actions">
      <button type="button" class="btn btn-gold" id="btn-again">Neues Turnier</button>
      <button type="button" class="btn btn-ghost" id="btn-same">Nochmal mit ${me.short}</button>
    </div>`;
  $('#btn-again').addEventListener('click', () => {
    clear();
    tour = null;
    renderTeams();
    show('screen-teams');
  });
  $('#btn-same').addEventListener('click', () => {
    tour = newTournament(me.id, tour.difficulty);
    save(tour);
    renderRound();
  });
  show('screen-end');
  if (won) setTimeout(() => confetti([me.c1, me.c2, '#E8B931', '#ffffff']), 200);
}

// ---------------- Konfetti ----------------
function confetti(colors) {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const c = $('#confetti');
  const ctx = c.getContext('2d');
  const W = (c.width = app.clientWidth);
  const H = (c.height = app.clientHeight);
  const parts = Array.from({ length: 140 }, () => ({
    x: W / 2 + rand(-40, 40), y: H * 0.35,
    vx: rand(-260, 260), vy: rand(-560, -180),
    r: rand(4, 8), a: rand(0, 6.28), va: rand(-8, 8),
    c: colors[(Math.random() * colors.length) | 0],
  }));
  let last = performance.now();
  const t0 = last;
  const step = (now) => {
    const dt = Math.min(0.04, (now - last) / 1000);
    last = now;
    ctx.clearRect(0, 0, W, H);
    for (const p of parts) {
      p.vy += 700 * dt;
      p.vx *= 0.99;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.a += p.va * dt;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.a);
      ctx.fillStyle = p.c;
      ctx.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2);
      ctx.restore();
    }
    if (now - t0 < 3500) requestAnimationFrame(step);
    else ctx.clearRect(0, 0, W, H);
  };
  requestAnimationFrame(step);
}

// ---------------- Start ----------------
renderTeams();
if (tour && tour.status === 'playing' && location.hash === '#runde') renderRound();
else renderHome();

if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
  try {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  } catch (e) { /* ignore */ }
}
