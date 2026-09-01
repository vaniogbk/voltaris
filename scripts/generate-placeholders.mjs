#!/usr/bin/env node
/**
 * Génère un visuel SVG par produit neuf, dans frontend/public/produits/neuf/.
 *
 * ⚠️ Ce sont des visuels de mise en page, PAS des photos produit. Ils existent
 * pour que le catalogue reste lisible et cohérent en attendant vos clichés.
 * Chaque tuile porte la silhouette de la famille d'outil, le modèle et sa
 * caractéristique déterminante, afin que deux tronçonneuses ne se ressemblent
 * pas sur une page de catalogue.
 *
 * Pour passer aux vraies photos : voir scripts/import-photos.mjs.
 *
 * Usage : node scripts/generate-placeholders.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(ROOT, 'frontend/public/produits/neuf');

// Palette claire, alignée sur le thème du site.
const INK = '#0B0B0C';
const RED = '#E1000F';
const FOG = '#3B3D42';
const MIST = '#9CA0A7';
const GREY = '#74777E';
const FAINT = '#A3A5AB';

/** Silhouettes stylisées, tracées dans une boîte de 320 × 160. */
const GLYPHS = {
  chainsaw: `
    <rect x="18" y="58" width="126" height="52" rx="12" fill="${FOG}"/>
    <rect x="30" y="44" width="72" height="20" rx="10" fill="none" stroke="${MIST}" stroke-width="5"/>
    <path d="M144 72 h150 l14 12 -14 12 H144 z" fill="${MIST}"/>
    <path d="M150 66 h146 M150 102 h146" stroke="${RED}" stroke-width="5" stroke-linecap="round" stroke-dasharray="3 9"/>
    <circle cx="60" cy="84" r="9" fill="${RED}"/>`,
  brushcutter: `
    <path d="M40 32 L232 118" stroke="${FOG}" stroke-width="16" stroke-linecap="round"/>
    <path d="M96 57 h56" stroke="${MIST}" stroke-width="9" stroke-linecap="round"/>
    <circle cx="248" cy="126" r="30" fill="none" stroke="${MIST}" stroke-width="8"/>
    <circle cx="248" cy="126" r="9" fill="${RED}"/>
    <rect x="24" y="20" width="34" height="26" rx="9" fill="${FOG}"/>`,
  hedge: `
    <rect x="24" y="66" width="92" height="38" rx="11" fill="${FOG}"/>
    <path d="M116 74 h176 v22 H116 z" fill="${MIST}"/>
    <path d="M124 74 v-11 M144 74 v-11 M164 74 v-11 M184 74 v-11 M204 74 v-11 M224 74 v-11 M244 74 v-11 M264 74 v-11 M284 74 v-11" stroke="${RED}" stroke-width="5" stroke-linecap="round"/>
    <circle cx="60" cy="85" r="8" fill="${RED}"/>`,
  blower: `
    <path d="M34 60 h74 l18 18 -18 18 H34 z" fill="${FOG}"/>
    <rect x="126" y="70" width="150" height="16" rx="8" fill="${MIST}"/>
    <path d="M282 62 q26 16 0 32" fill="none" stroke="${RED}" stroke-width="6" stroke-linecap="round"/>
    <path d="M290 50 q38 28 0 56" fill="none" stroke="${RED}" stroke-width="5" stroke-linecap="round" opacity=".5"/>
    <circle cx="62" cy="78" r="9" fill="${RED}"/>`,
  pole: `
    <path d="M26 128 L250 34" stroke="${FOG}" stroke-width="14" stroke-linecap="round"/>
    <path d="M250 34 l42 -14 8 20 -40 16 z" fill="${MIST}"/>
    <path d="M256 26 l40 -13" stroke="${RED}" stroke-width="4" stroke-dasharray="3 6"/>
    <rect x="18" y="112" width="36" height="26" rx="9" fill="${FOG}"/>`,
  cutoff: `
    <rect x="20" y="62" width="112" height="46" rx="12" fill="${FOG}"/>
    <circle cx="232" cy="84" r="56" fill="none" stroke="${MIST}" stroke-width="10"/>
    <circle cx="232" cy="84" r="12" fill="${RED}"/>
    <path d="M132 74 h48 M132 96 h48" stroke="${MIST}" stroke-width="8" stroke-linecap="round"/>`,
  grinder: `
    <rect x="88" y="52" width="144" height="70" rx="12" fill="${FOG}"/>
    <ellipse cx="88" cy="87" rx="26" ry="52" fill="${MIST}"/>
    <ellipse cx="232" cy="87" rx="20" ry="42" fill="${MIST}" opacity=".7"/>
    <path d="M120 40 h96" stroke="${MIST}" stroke-width="7" stroke-linecap="round"/>
    <rect x="128" y="76" width="64" height="22" rx="5" fill="${RED}"/>`,
  file: `
    <path d="M40 116 L232 40" stroke="${MIST}" stroke-width="13" stroke-linecap="round"/>
    <path d="M232 40 l48 -18" stroke="${FOG}" stroke-width="19" stroke-linecap="round"/>
    <path d="M62 108 l6 14 M86 99 l6 14 M110 90 l6 14 M134 81 l6 14 M158 72 l6 14" stroke="${RED}" stroke-width="4" stroke-linecap="round"/>`,
  bar: `
    <path d="M28 70 h214 q34 0 34 14 t-34 14 H28 q-12 0 -12 -14 t12 -14 z" fill="${MIST}"/>
    <circle cx="248" cy="84" r="11" fill="none" stroke="${INK}" stroke-width="5"/>
    <circle cx="52" cy="84" r="7" fill="${INK}"/>
    <path d="M30 62 h222 M30 106 h222" stroke="${RED}" stroke-width="5" stroke-linecap="round" stroke-dasharray="4 10"/>`,
  chain: `
    <path d="M36 84 h248" stroke="${FOG}" stroke-width="22" stroke-linecap="round"/>
    <path d="M52 84 h216" stroke="${MIST}" stroke-width="8" stroke-dasharray="14 12" stroke-linecap="round"/>
    <path d="M60 66 l12 -14 8 14 z M116 66 l12 -14 8 14 z M172 66 l12 -14 8 14 z M228 66 l12 -14 8 14 z" fill="${RED}"/>`,
  canister: `
    <path d="M96 44 h128 q14 0 14 14 v66 q0 14 -14 14 H96 q-14 0 -14 -14 V58 q0 -14 14 -14 z" fill="${FOG}"/>
    <rect x="122" y="26" width="46" height="20" rx="7" fill="${MIST}"/>
    <rect x="196" y="26" width="30" height="18" rx="7" fill="${RED}"/>
    <rect x="104" y="70" width="66" height="34" rx="5" fill="${MIST}" opacity=".55"/>`,
  bottle: `
    <path d="M128 46 h64 v14 l18 22 v46 q0 14 -14 14 h-72 q-14 0 -14 -14V82 l18 -22 z" fill="${FOG}"/>
    <rect x="142" y="24" width="36" height="24" rx="6" fill="${RED}"/>
    <rect x="118" y="88" width="84" height="30" rx="5" fill="${MIST}" opacity=".5"/>`,
  helmet: `
    <path d="M62 100 q0 -66 98 -66 t98 66 z" fill="${FOG}"/>
    <rect x="52" y="98" width="216" height="16" rx="8" fill="${MIST}"/>
    <path d="M76 114 q84 34 168 0" fill="none" stroke="${RED}" stroke-width="7" stroke-linecap="round"/>
    <circle cx="70" cy="76" r="14" fill="${MIST}"/><circle cx="250" cy="76" r="14" fill="${MIST}"/>`,
  trousers: `
    <path d="M110 26 h100 l10 108 h-38 l-22 -66 -22 66 h-38 z" fill="${FOG}"/>
    <path d="M118 56 h84" stroke="${RED}" stroke-width="7" stroke-linecap="round"/>
    <path d="M126 82 h28 M166 82 h28" stroke="${MIST}" stroke-width="5" stroke-linecap="round"/>`,
  gloves: `
    <path d="M104 128 V64 q0 -14 13 -14 t13 14 v-14 q0 -14 13 -14 t13 14 v14 q0 -14 13 -14 t13 14 v14 q0 -12 12 -12 t12 12 v42 q0 22 -24 22 z" fill="${FOG}"/>
    <path d="M112 108 h84" stroke="${RED}" stroke-width="7" stroke-linecap="round"/>`,
  battery: `
    <rect x="82" y="46" width="156" height="76" rx="12" fill="${FOG}"/>
    <rect x="128" y="30" width="64" height="18" rx="6" fill="${MIST}"/>
    <rect x="100" y="86" width="24" height="16" rx="3" fill="${RED}"/>
    <rect x="132" y="86" width="24" height="16" rx="3" fill="${RED}"/>
    <rect x="164" y="86" width="24" height="16" rx="3" fill="${MIST}" opacity=".45"/>
    <rect x="196" y="86" width="24" height="16" rx="3" fill="${MIST}" opacity=".45"/>`,
  charger: `
    <rect x="70" y="58" width="180" height="62" rx="12" fill="${FOG}"/>
    <rect x="118" y="40" width="84" height="20" rx="6" fill="${MIST}"/>
    <path d="M156 70 l-14 24 h18 l-8 20 22 -28 h-18 z" fill="${RED}"/>
    <path d="M250 92 q30 8 34 34" fill="none" stroke="${MIST}" stroke-width="6" stroke-linecap="round"/>`,
};

/**
 * [fichier, modèle, marque, silhouette, caractéristique déterminante]
 * La caractéristique différencie visuellement des modèles qui partagent la
 * même silhouette : neuf tronçonneuses ne doivent pas donner neuf tuiles
 * identiques dans une grille de catalogue.
 */
const PRODUCTS = [
  ['ms-500i', 'MS 500i', 'STIHL', 'chainsaw', '79,2 cm³ · 6,8 ch · guide 63 cm'],
  ['ms-462', 'MS 462 C-M', 'STIHL', 'chainsaw', '72,2 cm³ · 6,0 ch · guide 50 cm'],
  ['ms-400', 'MS 400 C-M', 'STIHL', 'chainsaw', '66,8 cm³ · 4,8 ch · guide 45 cm'],
  ['ms-261', 'MS 261 C-M', 'STIHL', 'chainsaw', '50,2 cm³ · 3,9 ch · guide 40 cm'],
  ['ms-251', 'MS 251 C-BE', 'STIHL', 'chainsaw', '45,6 cm³ · 3,0 ch · guide 40 cm'],
  ['ms-194t', 'MS 194 T', 'STIHL', 'chainsaw', '31,8 cm³ · poignée haute · 3,3 kg'],
  ['ms-180', 'MS 180 C-BE', 'STIHL', 'chainsaw', '31,8 cm³ · 2,0 ch · guide 35 cm'],
  ['msa-300', 'MSA 300 C-O', 'STIHL', 'chainsaw', 'Batterie AP · chaîne 24 m/s'],
  ['msa-220', 'MSA 220 C-B', 'STIHL', 'chainsaw', 'Batterie AP · 3,0 kg · guide 35 cm'],
  ['fs-131', 'FS 131 R', 'STIHL', 'brushcutter', '36,3 cm³ · 4-MIX · poignée circulaire'],
  ['fs-111', 'FS 111 R', 'STIHL', 'brushcutter', '31,4 cm³ · 4-MIX · 5,7 kg'],
  ['fs-91', 'FS 91 R', 'STIHL', 'brushcutter', '28,4 cm³ · 4-MIX · 5,3 kg'],
  ['fs-55', 'FS 55 R', 'STIHL', 'brushcutter', '27,2 cm³ · 2-temps · 5,0 kg'],
  ['fsa-60', 'FSA 60 R', 'STIHL', 'brushcutter', 'Batterie AK · coupe 28 cm · 2,8 kg'],
  ['hs-82r', 'HS 82 R', 'STIHL', 'hedge', '22,7 cm³ · lame 75 cm · dents 33 mm'],
  ['bg-86', 'BG 86', 'STIHL', 'blower', '27,2 cm³ · 810 m³/h · 80 m/s'],
  ['ht-105', 'HT 105', 'STIHL', 'pole', '31,4 cm³ · télescopique 2,70–3,90 m'],
  ['ts-420', 'TS 420', 'STIHL', 'cutoff', '66,7 cm³ · disque 350 mm · coupe 125 mm'],
  ['tormek-t8', 'T-8', 'TORMEK', 'grinder', 'Meule 250 mm · 90 tr/min · 230 V'],
  ['affuteur-2en1', '2-en-1 · 5,2 mm', 'STIHL', 'file', 'Chaînes 3/8" · dent et limiteur'],
  ['guide-63', 'Rollomatic ES Light 63', 'STIHL', 'bar', '63 cm · 3/8" · 1,6 mm · 84 maillons'],
  ['chaine-rs', 'Rapid Super 84E', 'STIHL', 'chain', '3/8" · 1,6 mm · gouge carrée'],
  ['huile-chaine', 'SynthPlus 5 L', 'STIHL', 'canister', 'Adhérence renforcée · bio > 60 %'],
  ['huile-2t', 'HP Ultra 1 L', 'STIHL', 'bottle', 'Synthétique · 1:50 · 50 L de mélange'],
  ['casque', 'ADVANCE X-Vent', 'STIHL', 'helmet', 'EN 397 · visière · SNR 25 dB'],
  ['pantalon', 'FUNCTION Ergo', 'STIHL', 'trousers', 'EN 381-5 classe 1 · 20 m/s'],
  ['gants', 'DYNAMIC Duro', 'STIHL', 'gloves', 'Paume Kevlar · tailles S à XXL'],
  ['bidon', 'Bidon combiné 5/3 L', 'STIHL', 'canister', '5 L carburant + 3 L huile · UN'],
  ['batterie-ap300', 'AP 300 S', 'STIHL', 'battery', '281 Wh · système AP · 1,7 kg'],
  ['chargeur-al500', 'AL 500', 'STIHL', 'charger', '80 % en 25 min · ventilation active'],
];

const escape = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function svg(name, brand, glyphKey, spec) {
  const glyph = GLYPHS[glyphKey] ?? GLYPHS.chainsaw;
  // Le corps du texte est réduit pour les noms longs, qui ne doivent jamais
  // déborder de la zone utile de 840 px.
  const fontSize = name.length > 18 ? 38 : name.length > 13 ? 46 : 56;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 750" width="1000" height="750" role="img" aria-label="${escape(brand)} ${escape(name)} — ${escape(spec)}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="100%" stop-color="#F1F1F3"/>
    </linearGradient>
    <linearGradient id="rule" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${RED}"/>
      <stop offset="100%" stop-color="${RED}" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <rect width="1000" height="750" fill="url(#bg)"/>
  <rect x="0" y="0" width="1000" height="6" fill="${RED}"/>

  <g transform="translate(340 240) scale(1.28)">${glyph}
  </g>

  <rect x="80" y="452" width="420" height="3" fill="url(#rule)"/>

  <text x="80" y="424" font-family="Inter, Roboto, Helvetica, Arial, sans-serif" font-size="22" font-weight="700" letter-spacing="4.5" fill="${RED}">${escape(brand)}</text>
  <text x="80" y="518" font-family="Inter, Roboto, Helvetica, Arial, sans-serif" font-size="${fontSize}" font-weight="800" letter-spacing="-1" fill="${INK}">${escape(name)}</text>
  <text x="80" y="566" font-family="Inter, Roboto, Helvetica, Arial, sans-serif" font-size="24" font-weight="600" fill="${GREY}">${escape(spec)}</text>
  <text x="80" y="612" font-family="Inter, Roboto, Helvetica, Arial, sans-serif" font-size="19" font-weight="500" fill="${FAINT}">Visuel provisoire — photo produit à venir</text>

  <text x="80" y="690" font-family="Inter, Roboto, Helvetica, Arial, sans-serif" font-size="17" font-weight="700" letter-spacing="3" fill="${FAINT}">STIHL MARKET</text>
</svg>
`;
}

mkdirSync(OUT, { recursive: true });

for (const [slug, name, brand, glyph, spec] of PRODUCTS) {
  writeFileSync(resolve(OUT, `${slug}.svg`), svg(name, brand, glyph, spec), 'utf8');
}

console.log(`${PRODUCTS.length} visuels générés dans frontend/public/produits/neuf/`);
console.log('Ce sont des placeholders. Pour vos vraies photos : node scripts/import-photos.mjs --help');
