// Turnierlogik: Auslosung, Simulation der anderen Partien, Spielstand speichern.
import { TEAMS, ROUND1, team } from './teams.js';

const KEY = 'pc-pokal-2627-v1';

function shuffle(a) {
  const arr = a.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Entscheidung im Elfmeterschießen nach den echten Regeln (5 Schützen, dann Sudden Death)
export function shootoutWinner(a, b) {
  const nA = a.length;
  const nB = b.length;
  const gA = a.filter(Boolean).length;
  const gB = b.filter(Boolean).length;
  if (nA <= 5 && nB <= 5) {
    if (gA + (5 - nA) < gB) return 'B';
    if (gB + (5 - nB) < gA) return 'A';
    if (nA === 5 && nB === 5 && gA !== gB) return gA > gB ? 'A' : 'B';
    return null;
  }
  if (nA === nB && gA !== gB) return gA > gB ? 'A' : 'B';
  return null;
}

function goalProb(shooter, keeper) {
  return Math.max(0.55, Math.min(0.9, 0.75 + (shooter.r - keeper.r) * 0.004));
}

export function simulateShootout(homeId, awayId) {
  const h = team(homeId);
  const w = team(awayId);
  const firstHome = Math.random() < 0.5;
  const A = firstHome ? h : w;
  const B = firstHome ? w : h;
  const sa = [];
  const sb = [];
  let win = null;
  while (!win) {
    if (sa.length === sb.length) sa.push(Math.random() < goalProb(A, B));
    else sb.push(Math.random() < goalProb(B, A));
    win = shootoutWinner(sa, sb);
  }
  const gA = sa.filter(Boolean).length;
  const gB = sb.filter(Boolean).length;
  const winnerId = (win === 'A' ? A : B).id;
  return {
    home: homeId,
    away: awayId,
    hg: firstHome ? gA : gB,
    ag: firstHome ? gB : gA,
    winner: winnerId,
  };
}

export function newTournament(teamId, difficulty) {
  return {
    v: 1,
    teamId,
    difficulty,
    round: 0,
    pairings: ROUND1.map(([h, a]) => ({ home: h, away: a })),
    results: null, // Ergebnisse der aktuellen Runde (nach dem eigenen Spiel)
    path: [], // eigene Spiele
    status: 'playing', // 'playing' | 'out' | 'champion' | 'done'
    champion: null,
    stats: { shots: 0, goals: 0, faced: 0, saves: 0 },
    created: Date.now(),
  };
}

export function myPairing(t) {
  return t.pairings.find((p) => p.home === t.teamId || p.away === t.teamId) || null;
}

// Nach dem eigenen Spiel: alle anderen Partien der Runde simulieren
export function completeRound(t, myResult) {
  t.results = t.pairings.map((p) => {
    if (p.home === myResult.home && p.away === myResult.away) return myResult;
    return simulateShootout(p.home, p.away);
  });
  t.path.push({ round: t.round, ...myResult });
  const iWon = myResult.winner === t.teamId;
  if (!iWon) t.status = 'out';
  if (iWon && t.round === 5) {
    t.status = 'champion';
    t.champion = t.teamId;
  }
  save(t);
}

// Auslosung der nächsten Runde aus den Siegern
export function advance(t) {
  const winners = t.results.map((r) => r.winner);
  t.round += 1;
  const drawn = shuffle(winners);
  t.pairings = [];
  for (let i = 0; i < drawn.length; i += 2) t.pairings.push({ home: drawn[i], away: drawn[i + 1] });
  t.results = null;
  save(t);
}

// Nach dem Ausscheiden: Rest des Turniers simulieren
export function simulateRest(t) {
  const log = [];
  while (t.results && t.results.length > 1) {
    advance(t);
    t.results = t.pairings.map((p) => simulateShootout(p.home, p.away));
    log.push({ round: t.round, results: t.results });
  }
  t.champion = t.results[0].winner;
  t.status = t.status === 'champion' ? 'champion' : 'done';
  save(t);
  return log;
}

export function save(t) {
  try { localStorage.setItem(KEY, JSON.stringify(t)); } catch (e) { /* ignore */ }
}
export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const t = JSON.parse(raw);
    if (!t || t.v !== 1 || !team(t.teamId)) return null;
    return t;
  } catch (e) {
    return null;
  }
}
export function clear() {
  try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
}

export const ALL_TEAMS = TEAMS;
