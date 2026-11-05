// Alle 64 Teilnehmer des DFB-Pokals 2026/27.
// c1 = Hauptfarbe, c2 = Zweitfarbe, p = Muster des Kreis-Logos, r = Spielstärke (50–90).
// Die Farben der Amateurklubs sind an den Vereinsfarben orientiert, bei einigen
// kleineren Vereinen aber angenähert.

const W = '#FFFFFF';
const K = '#111318';

export const TEAMS = [
  // Spitzenteams
  { id: 'bayern', name: 'FC Bayern München', short: 'Bayern', abbr: 'FCB', c1: '#DC052D', c2: W, p: 'ring', r: 88 },
  { id: 'dortmund', name: 'Borussia Dortmund', short: 'Dortmund', abbr: 'BVB', c1: '#FDE100', c2: K, p: 'ring', r: 84 },
  { id: 'leverkusen', name: 'Bayer 04 Leverkusen', short: 'Leverkusen', abbr: 'B04', c1: K, c2: '#E32221', p: 'ring', r: 84 },
  { id: 'leipzig', name: 'RB Leipzig', short: 'Leipzig', abbr: 'RBL', c1: W, c2: '#DD0741', p: 'ring', r: 82 },
  { id: 'stuttgart', name: 'VfB Stuttgart', short: 'Stuttgart', abbr: 'VFB', c1: W, c2: '#E32219', p: 'hband', r: 81 },
  { id: 'frankfurt', name: 'Eintracht Frankfurt', short: 'Frankfurt', abbr: 'SGE', c1: K, c2: '#E1000F', p: 'split', r: 80 },
  { id: 'freiburg', name: 'SC Freiburg', short: 'Freiburg', abbr: 'SCF', c1: '#E2001A', c2: K, p: 'sash', r: 78 },
  { id: 'hoffenheim', name: 'TSG Hoffenheim', short: 'Hoffenheim', abbr: 'TSG', c1: '#1961B5', c2: W, p: 'ring', r: 78 },
  { id: 'mainz', name: '1. FSV Mainz 05', short: 'Mainz 05', abbr: 'M05', c1: '#C3141E', c2: W, p: 'split', r: 76 },
  { id: 'gladbach', name: 'Borussia Mönchengladbach', short: 'Gladbach', abbr: 'BMG', c1: K, c2: '#00A04B', p: 'split', r: 76 },
  { id: 'wolfsburg', name: 'VfL Wolfsburg', short: 'Wolfsburg', abbr: 'WOB', c1: '#65B32E', c2: W, p: 'ring', r: 76 },
  { id: 'werder', name: 'SV Werder Bremen', short: 'Werder', abbr: 'SVW', c1: '#1D9053', c2: W, p: 'diamond', r: 75 },
  { id: 'union', name: '1. FC Union Berlin', short: 'Union', abbr: 'FCU', c1: '#D4011D', c2: W, p: 'ring', r: 75 },
  { id: 'augsburg', name: 'FC Augsburg', short: 'Augsburg', abbr: 'FCA', c1: '#BA3733', c2: '#46714D', p: 'split', r: 74 },
  { id: 'koeln', name: '1. FC Köln', short: 'Köln', abbr: 'KOE', c1: W, c2: '#ED1C24', p: 'ring', r: 74 },
  { id: 'hsv', name: 'Hamburger SV', short: 'HSV', abbr: 'HSV', c1: W, c2: '#00468C', p: 'diamond', r: 74 },
  { id: 'schalke', name: 'FC Schalke 04', short: 'Schalke', abbr: 'S04', c1: '#004D9D', c2: W, p: 'ring', r: 73 },
  { id: 'stpauli', name: 'FC St. Pauli', short: 'St. Pauli', abbr: 'STP', c1: '#5B3A29', c2: W, p: 'ring', r: 72 },
  { id: 'heidenheim', name: '1. FC Heidenheim', short: 'Heidenheim', abbr: 'FCH', c1: '#E30613', c2: '#003B79', p: 'split', r: 72 },
  { id: 'elversberg', name: 'SV 07 Elversberg', short: 'Elversberg', abbr: 'SVE', c1: K, c2: W, p: 'split', r: 71 },
  { id: 'paderborn', name: 'SC Paderborn 07', short: 'Paderborn', abbr: 'SCP', c1: '#005CA9', c2: K, p: 'ring', r: 71 },
  // Weitere Profiklubs
  { id: 'bochum', name: 'VfL Bochum 1848', short: 'Bochum', abbr: 'BOC', c1: '#005BA4', c2: W, p: 'ring', r: 70 },
  { id: 'hertha', name: 'Hertha BSC', short: 'Hertha', abbr: 'BSC', c1: '#005CA9', c2: W, p: 'stripes', r: 70 },
  { id: 'kaiserslautern', name: '1. FC Kaiserslautern', short: 'Lautern', abbr: 'FCK', c1: '#E2001A', c2: W, p: 'sash', r: 70 },
  { id: 'hannover', name: 'Hannover 96', short: 'Hannover', abbr: 'H96', c1: '#00843D', c2: K, p: 'ring', r: 70 },
  { id: 'kiel', name: 'Holstein Kiel', short: 'Kiel', abbr: 'KSV', c1: '#0A4BA0', c2: '#E2001A', p: 'ring', r: 70 },
  { id: 'darmstadt', name: 'SV Darmstadt 98', short: 'Darmstadt', abbr: 'D98', c1: '#004E9E', c2: W, p: 'ring', r: 69 },
  { id: 'nuernberg', name: '1. FC Nürnberg', short: 'Nürnberg', abbr: 'FCN', c1: '#AA1124', c2: K, p: 'ring', r: 69 },
  { id: 'karlsruhe', name: 'Karlsruher SC', short: 'Karlsruhe', abbr: 'KSC', c1: '#0050A0', c2: W, p: 'split', r: 69 },
  { id: 'duesseldorf', name: 'Fortuna Düsseldorf', short: 'Düsseldorf', abbr: 'F95', c1: '#E30613', c2: W, p: 'hband', r: 69 },
  { id: 'magdeburg', name: '1. FC Magdeburg', short: 'Magdeburg', abbr: 'FCM', c1: '#0055A5', c2: W, p: 'sash', r: 68 },
  { id: 'bielefeld', name: 'Arminia Bielefeld', short: 'Bielefeld', abbr: 'DSC', c1: '#004E95', c2: K, p: 'split', r: 68 },
  { id: 'fuerth', name: 'SpVgg Greuther Fürth', short: 'Fürth', abbr: 'SGF', c1: '#00843D', c2: W, p: 'split', r: 67 },
  { id: 'dresden', name: 'Dynamo Dresden', short: 'Dresden', abbr: 'SGD', c1: '#FDD000', c2: K, p: 'split', r: 67 },
  { id: 'braunschweig', name: 'Eintracht Braunschweig', short: 'Braunschweig', abbr: 'EBS', c1: '#FDE100', c2: '#0057A0', p: 'ring', r: 67 },
  { id: 'muenster', name: 'SC Preußen Münster', short: 'Münster', abbr: 'SCP', c1: K, c2: '#00843D', p: 'sash', r: 66 },
  // Drittligisten
  { id: 'osnabrueck', name: 'VfL Osnabrück', short: 'Osnabrück', abbr: 'OSN', c1: '#5B2A86', c2: W, p: 'ring', r: 64 },
  { id: 'rostock', name: 'F.C. Hansa Rostock', short: 'Rostock', abbr: 'FCH', c1: '#0066B3', c2: W, p: 'hband', r: 64 },
  { id: 'cottbus', name: 'FC Energie Cottbus', short: 'Cottbus', abbr: 'FCE', c1: '#E2001A', c2: W, p: 'split', r: 64 },
  { id: 'duisburg', name: 'MSV Duisburg', short: 'Duisburg', abbr: 'MSV', c1: '#005CA9', c2: W, p: 'hstripes', r: 64 },
  { id: 'essen', name: 'Rot-Weiss Essen', short: 'RW Essen', abbr: 'RWE', c1: '#E2001A', c2: W, p: 'sash', r: 64 },
  { id: 'wiesbaden', name: 'SV Wehen Wiesbaden', short: 'Wiesbaden', abbr: 'SVWW', c1: '#E2001A', c2: K, p: 'stripes', r: 63 },
  { id: 'verl', name: 'SC Verl', short: 'Verl', abbr: 'SCV', c1: K, c2: W, p: 'ring', r: 63 },
  { id: 'saarbruecken', name: '1. FC Saarbrücken', short: 'Saarbrücken', abbr: 'FCS', c1: '#003A80', c2: K, p: 'split', r: 63 },
  { id: 'tsv1860', name: 'TSV 1860 München', short: '1860', abbr: '1860', c1: '#6CACE4', c2: W, p: 'ring', r: 63 },
  { id: 'aue', name: 'FC Erzgebirge Aue', short: 'Aue', abbr: 'AUE', c1: '#5B2A86', c2: W, p: 'split', r: 62 },
  { id: 'viktoria', name: 'FC Viktoria Köln', short: 'Viktoria', abbr: 'VIK', c1: '#E2001A', c2: W, p: 'stripes', r: 62 },
  { id: 'mannheim', name: 'SV Waldhof Mannheim', short: 'Waldhof', abbr: 'SVW', c1: '#003A80', c2: K, p: 'stripes', r: 62 },
  { id: 'jena', name: 'FC Carl Zeiss Jena', short: 'Jena', abbr: 'FCC', c1: '#003A80', c2: '#FCD116', p: 'ring', r: 61 },
  { id: 'halle', name: 'Hallescher FC', short: 'Halle', abbr: 'HFC', c1: '#E2001A', c2: W, p: 'ring', r: 60 },
  { id: 'wuerzburg', name: 'Würzburger Kickers', short: 'Würzburg', abbr: 'FWK', c1: '#E2001A', c2: W, p: 'hband', r: 60 },
  // Amateure (Landespokalsieger und Oberliga-Meister)
  { id: 'trier', name: 'SV Eintracht Trier', short: 'Trier', abbr: 'SVE', c1: K, c2: '#0055A5', p: 'split', r: 57 },
  { id: 'altglienicke', name: 'VSG Altglienicke', short: 'Altglienicke', abbr: 'VSG', c1: '#1E4FA0', c2: W, p: 'sash', r: 57 },
  { id: 'luebeck', name: '1. FC Phönix Lübeck', short: 'Phönix Lübeck', abbr: 'PHX', c1: '#E2001A', c2: K, p: 'hband', r: 56 },
  { id: 'grossaspach', name: 'SG Sonnenhof Großaspach', short: 'Großaspach', abbr: 'SGS', c1: K, c2: W, p: 'stripes', r: 56 },
  { id: 'jeddeloh', name: 'SSV Jeddeloh', short: 'Jeddeloh', abbr: 'SSV', c1: '#0B8A3E', c2: W, p: 'sash', r: 55 },
  { id: 'lueneburg', name: 'Lüneburger SK Hansa', short: 'Lüneburg', abbr: 'LSK', c1: '#0057A0', c2: W, p: 'sash', r: 55 },
  { id: 'bahlingen', name: 'Bahlinger SC', short: 'Bahlingen', abbr: 'BSC', c1: K, c2: W, p: 'sash', r: 55 },
  { id: 'schott', name: 'TSV Schott Mainz', short: 'Schott Mainz', abbr: 'TSV', c1: '#003A80', c2: W, p: 'ring', r: 54 },
  { id: 'rhynern', name: 'SV Westfalia Rhynern', short: 'Rhynern', abbr: 'SVW', c1: '#E2001A', c2: K, p: 'split', r: 54 },
  { id: 'hebc', name: 'HEBC Hamburg', short: 'HEBC', abbr: 'HEBC', c1: '#C8102E', c2: W, p: 'hband', r: 52 },
  { id: 'stoenis', name: 'SC St. Tönis', short: 'St. Tönis', abbr: 'SCT', c1: '#0055A5', c2: W, p: 'split', r: 52 },
  { id: 'krieschow', name: 'VfB 1921 Krieschow', short: 'Krieschow', abbr: 'VFB', c1: '#0055A5', c2: W, p: 'hband', r: 50 },
  { id: 'hemelingen', name: 'SV Hemelingen', short: 'Hemelingen', abbr: 'SVH', c1: '#0055A5', c2: W, p: 'ring', r: 50 },
];

// Die 32 ausgelosten Partien der 1. Hauptrunde (Heim – Gast).
export const ROUND1 = [
  ['osnabrueck', 'bayern'],
  ['hebc', 'dortmund'],
  ['trier', 'leipzig'],
  ['rostock', 'stuttgart'],
  ['aue', 'hoffenheim'],
  ['wiesbaden', 'leverkusen'],
  ['duesseldorf', 'freiburg'],
  ['stoenis', 'frankfurt'],
  ['krieschow', 'mainz'],
  ['braunschweig', 'union'],
  ['schott', 'gladbach'],
  ['verl', 'hsv'],
  ['wuerzburg', 'koeln'],
  ['lueneburg', 'werder'],
  ['halle', 'schalke'],
  ['duisburg', 'elversberg'],
  ['luebeck', 'paderborn'],
  ['altglienicke', 'wolfsburg'],
  ['cottbus', 'augsburg'],
  ['essen', 'stpauli'],
  ['grossaspach', 'bielefeld'],
  ['jeddeloh', 'heidenheim'],
  ['fuerth', 'bochum'],
  ['hemelingen', 'hannover'],
  ['muenster', 'karlsruhe'],
  ['saarbruecken', 'hertha'],
  ['viktoria', 'nuernberg'],
  ['jena', 'darmstadt'],
  ['bahlingen', 'magdeburg'],
  ['tsv1860', 'kiel'],
  ['mannheim', 'kaiserslautern'],
  ['rhynern', 'dresden'],
];

export const ROUND_NAMES = ['1. Runde', '2. Runde', 'Achtelfinale', 'Viertelfinale', 'Halbfinale', 'Finale'];
export const ROUND_SHORT = ['1R', '2R', 'AF', 'VF', 'HF', 'F'];

const byId = new Map(TEAMS.map((t) => [t.id, t]));
export const team = (id) => byId.get(id);

// Lostöpfe: Im Amateurtopf stehen die Amateure, die Drittligisten und die Teams
// ab Platz 15 der letzten Zweitliga-Saison. In der 1. Runde ist das immer die Heimmannschaft.
const AMATEUR_POT = new Set(ROUND1.map(([home]) => home));
export const potOf = (id) => (AMATEUR_POT.has(id) ? 'amateur' : 'pro');
export const POT_LABEL = { amateur: 'Amateurtopf', pro: 'Profitopf' };

export function tierOf(r) {
  if (r >= 78) return { key: 'top', label: 'Topteam' };
  if (r >= 66) return { key: 'pro', label: 'Profi' };
  if (r >= 60) return { key: 'liga3', label: 'Ambitioniert' };
  return { key: 'amateur', label: 'Underdog' };
}

// 0..1 Stärke für Balken und KI
export const strength01 = (r) => Math.max(0, Math.min(1, (r - 50) / 38));

// ---- Kreis-Logo als SVG ----
function luminance(hex) {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}
export const isLight = (hex) => luminance(hex) > 0.45;

let uid = 0;
export function badgeSVG(t, size = 48) {
  const id = `b${uid++}`;
  const { c1, c2, p } = t;
  const R = 50;
  let inner = '';
  // Hintergrundmuster innerhalb des Kreises
  switch (p) {
    case 'split':
      inner = `<rect x="0" y="0" width="50" height="100" fill="${c1}"/><rect x="50" y="0" width="50" height="100" fill="${c2}"/>`;
      break;
    case 'sash':
      inner = `<rect width="100" height="100" fill="${c1}"/><polygon points="20,0 48,0 80,100 52,100" fill="${c2}" transform="rotate(-28 50 50)"/>`;
      break;
    case 'hband':
      inner = `<rect width="100" height="100" fill="${c1}"/><rect x="0" y="40" width="100" height="22" fill="${c2}"/>`;
      break;
    case 'stripes':
      inner = `<rect width="100" height="100" fill="${c1}"/>${[16, 44, 72].map((x) => `<rect x="${x}" y="0" width="14" height="100" fill="${c2}"/>`).join('')}`;
      break;
    case 'hstripes':
      inner = `<rect width="100" height="100" fill="${c1}"/>${[14, 40, 66].map((y) => `<rect x="0" y="${y}" width="100" height="13" fill="${c2}"/>`).join('')}`;
      break;
    case 'diamond':
      inner = `<rect width="100" height="100" fill="${c1}"/><polygon points="50,14 82,50 50,86 18,50" fill="${c2}"/>`;
      break;
    default:
      inner = `<rect width="100" height="100" fill="${c1}"/>`;
  }
  const ring = p === 'ring' ? c2 : (isLight(c1) && isLight(c2) ? '#1b2030' : '#ffffff');
  const ringW = p === 'ring' ? 9 : 4;
  let txt;
  if (p === 'ring') {
    txt = `fill="${c2}"`;
  } else {
    txt = `fill="#fff" stroke="rgba(8,10,18,.75)" stroke-width="4" paint-order="stroke"`;
  }
  const fs = t.abbr.length > 3 ? 21 : 27;
  return `<svg class="badge" viewBox="0 0 100 100" width="${size}" height="${size}" aria-hidden="true">
<defs><clipPath id="${id}"><circle cx="50" cy="50" r="${R - 1}"/></clipPath>
<radialGradient id="${id}g" cx="35%" cy="28%" r="80%"><stop offset="0" stop-color="#fff" stop-opacity=".28"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".22"/></radialGradient></defs>
<g clip-path="url(#${id})">${inner}<rect width="100" height="100" fill="url(#${id}g)"/></g>
<circle cx="50" cy="50" r="${R - ringW / 2 - 0.5}" fill="none" stroke="${ring}" stroke-width="${ringW}"/>
<text x="50" y="51" text-anchor="middle" dominant-baseline="central" font-family="'Big Shoulders Display','Barlow Condensed',Impact,sans-serif" font-weight="900" font-size="${fs}" letter-spacing="0.5" ${txt}>${t.abbr}</text>
</svg>`;
}
