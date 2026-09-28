#!/usr/bin/env node
/**
 * Génère une illustration produit par référence neuve, dans
 * frontend/public/produits/neuf/.
 *
 * Ce sont des DESSINS, pas des photographies. Ils représentent fidèlement le
 * modèle — proportions, couleurs réelles de la machine, organes reconnaissables
 * — sans prétendre montrer un exemplaire précis. Deux conséquences pratiques :
 *
 *   • rien n'est emprunté à personne, donc aucun risque de contrefaçon ;
 *   • Google Merchant Center refuse les visuels non photographiques : les
 *     produits qui n'ont que cette illustration restent exclus du flux
 *     (voir hasRealPhoto() dans frontend/src/app/feed/…/products.xml/route.ts).
 *
 * La géométrie varie selon le modèle : longueur de guide, thermique ou
 * batterie, taille du corps. Neuf tronçonneuses ne donnent pas neuf tuiles
 * identiques.
 *
 * Pour passer aux photos : voir scripts/import-photos.mjs.
 *
 * Usage : node scripts/generate-placeholders.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(ROOT, 'frontend/public/produits/neuf');

const INK = '#0B0B0C';
const RED = '#E1000F';
const GREY = '#74777E';
const FAINT = '#A3A5AB';

/**
 * Dégradés partagés. La lumière vient du haut-gauche dans tout le jeu : c'est
 * ce qui donne aux pièces un volume cohérent d'une tuile à l'autre.
 */
const DEFS = `
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#FFFFFF"/><stop offset="100%" stop-color="#EFEFF2"/>
    </linearGradient>
    <linearGradient id="rule" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${RED}"/><stop offset="100%" stop-color="${RED}" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="org" x1="0.1" y1="0" x2="0.6" y2="1">
      <stop offset="0%" stop-color="#FF9233"/><stop offset="45%" stop-color="#EE7203"/>
      <stop offset="100%" stop-color="#B9550A"/>
    </linearGradient>
    <linearGradient id="orgSoft" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#FFA556"/><stop offset="100%" stop-color="#D96A05"/>
    </linearGradient>
    <linearGradient id="pale" x1="0.1" y1="0" x2="0.5" y2="1">
      <stop offset="0%" stop-color="#FDFDFD"/><stop offset="50%" stop-color="#DFE2E5"/>
      <stop offset="100%" stop-color="#AFB4B9"/>
    </linearGradient>
    <linearGradient id="dark" x1="0.1" y1="0" x2="0.5" y2="1">
      <stop offset="0%" stop-color="#4A4E53"/><stop offset="55%" stop-color="#2E3236"/>
      <stop offset="100%" stop-color="#1A1C1F"/>
    </linearGradient>
    <linearGradient id="steel" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#EDEFF1"/><stop offset="40%" stop-color="#C2C7CC"/>
      <stop offset="100%" stop-color="#8D9399"/>
    </linearGradient>
    <linearGradient id="stone" x1="0" y1="0" x2="0.3" y2="1">
      <stop offset="0%" stop-color="#D8D2C6"/><stop offset="60%" stop-color="#B3AB9C"/>
      <stop offset="100%" stop-color="#8C8576"/>
    </linearGradient>
    <radialGradient id="shade" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0%" stop-color="#0B0B0C" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="#0B0B0C" stop-opacity="0"/>
    </radialGradient>`;

/** Ombre au sol, posée sous chaque machine. */
const shadow = (cx, cy, rx, ry = 22) =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#shade)"/>`;

/** Dents de chaîne le long d'un guide horizontal. */
function chainTeeth(x1, x2, yTop, yBot) {
  const out = [];
  for (let x = x1; x < x2; x += 26) {
    out.push(`<path d="M${x} ${yTop} l9 -9 h7 l-4 9 z" fill="#4E5459"/>`);
    out.push(`<path d="M${x + 13} ${yBot} l9 9 h7 l-4 -9 z" fill="#4E5459"/>`);
  }
  return out.join('');
}

// ---------------------------------------------------------------- machines

/**
 * Tronçonneuse. `bar` donne la longueur du guide en pixels, `electric` bascule
 * sur la robe claire des modèles à batterie (pas de silencieux, prise d'accu).
 */
function chainsaw({ bar = 250, electric = false } = {}) {
  const body = electric ? 'url(#pale)' : 'url(#org)';
  const barX = 352;
  const tip = barX + bar;
  return `
    ${shadow(400, 372, 300, 24)}
    <!-- poignée arrière -->
    <path d="M44 150 h96 v34 H86 v74 h54 v34 H44 q-18 0 -18 -18 V168 q0 -18 18 -18 z" fill="url(#dark)"/>
    <!-- corps -->
    <path d="M118 140 h176 q30 0 30 30 v122 q0 26 -26 26 H118 q-26 0 -26 -26 V170 q0 -30 26 -30 z" fill="${body}"/>
    <!-- capot filtre -->
    <path d="M140 112 h132 q22 0 22 22 v18 H118 v-18 q0 -22 22 -22 z" fill="${electric ? 'url(#steel)' : 'url(#orgSoft)'}"/>
    <!-- poignée supérieure -->
    <path d="M128 106 q84 -34 168 -4" fill="none" stroke="url(#dark)" stroke-width="20" stroke-linecap="round"/>
    <!-- grilles d'aération -->
    <path d="M132 196 h58 M132 218 h58 M132 240 h58" stroke="#00000033" stroke-width="7" stroke-linecap="round"/>
    ${electric
      ? '<rect x="206" y="196" width="96" height="70" rx="10" fill="url(#dark)"/><rect x="222" y="212" width="64" height="12" rx="6" fill="#EE7203"/>'
      : '<path d="M236 274 h74 q16 0 16 16 v20 q0 16 -16 16 h-74 z" fill="url(#dark)"/>'}
    <!-- protège-main / frein de chaîne -->
    <path d="M318 126 q46 6 52 58" fill="none" stroke="url(#dark)" stroke-width="18" stroke-linecap="round"/>
    <!-- guide-chaîne -->
    <path d="M${barX} 196 H${tip - 34} q34 0 34 26 t-34 26 H${barX} z" fill="url(#steel)"/>
    <path d="M${barX + 14} 212 H${tip - 40} q16 0 16 10 t-16 10 H${barX + 14} z" fill="#00000018"/>
    <circle cx="${tip - 30}" cy="222" r="13" fill="none" stroke="#7E848A" stroke-width="5"/>
    ${chainTeeth(barX + 10, tip - 20, 196, 248)}
    <!-- carter de pignon -->
    <path d="M300 168 h56 q18 0 18 18 v72 q0 18 -18 18 h-56 z" fill="${electric ? 'url(#steel)' : 'url(#orgSoft)'}"/>
    <circle cx="332" cy="222" r="9" fill="#00000040"/>`;
}

/** Petite scie à batterie tenue d'une main (GTA 26). */
function miniSaw() {
  return `
    ${shadow(400, 344, 210, 20)}
    <path d="M196 158 h150 q28 0 28 28 v92 q0 28 -28 28 H196 q-28 0 -28 -28 v-92 q0 -28 28 -28 z" fill="url(#pale)"/>
    <path d="M214 132 h108 q20 0 20 20 v10 H194 v-10 q0 -20 20 -20 z" fill="url(#steel)"/>
    <rect x="206" y="204" width="76" height="16" rx="8" fill="#EE7203"/>
    <path d="M196 288 h150 v34 q0 20 -20 20 H216 q-20 0 -20 -20 z" fill="url(#dark)"/>
    <path d="M374 200 H520 q26 0 26 22 t-26 22 H374 z" fill="url(#steel)"/>
    ${chainTeeth(386, 508, 200, 240)}
    <circle cx="504" cy="222" r="10" fill="none" stroke="#7E848A" stroke-width="4"/>`;
}

/** Débrousailleuse : moteur en haut, arbre en diagonale, tête de coupe en bas. */
function brushcutter({ electric = false } = {}) {
  const body = electric ? 'url(#pale)' : 'url(#org)';
  return `
    ${shadow(470, 384, 250, 22)}
    <path d="M118 96 h124 q26 0 26 26 v76 q0 26 -26 26 H118 q-26 0 -26 -26 v-76 q0 -26 26 -26 z" fill="${body}"/>
    <path d="M138 74 h86 q16 0 16 16 v10 H122 V90 q0 -16 16 -16 z" fill="url(#dark)"/>
    <path d="M250 176 L560 318" stroke="url(#steel)" stroke-width="26" stroke-linecap="round"/>
    <path d="M250 176 L560 318" stroke="#FFFFFF44" stroke-width="8" stroke-linecap="round"/>
    <!-- poignée guidon -->
    <path d="M318 168 q42 -46 92 -12" fill="none" stroke="url(#dark)" stroke-width="16" stroke-linecap="round"/>
    <circle cx="316" cy="166" r="14" fill="url(#dark)"/>
    <!-- carter de protection -->
    <path d="M498 300 q86 -20 118 54 h-92 z" fill="url(#dark)"/>
    <!-- tête de coupe -->
    <circle cx="592" cy="348" r="44" fill="url(#steel)"/>
    <circle cx="592" cy="348" r="18" fill="${electric ? '#EE7203' : 'url(#dark)'}"/>
    <path d="M592 348 l86 26 M592 348 l-30 88" stroke="#9CA0A7" stroke-width="5" stroke-linecap="round"/>`;
}

/** Taille-haie : bloc moteur et longue lame à double denture. */
function hedge() {
  return `
    ${shadow(400, 356, 280, 20)}
    <path d="M78 156 h178 q26 0 26 26 v92 q0 26 -26 26 H78 q-26 0 -26 -26 v-92 q0 -26 26 -26 z" fill="url(#org)"/>
    <path d="M100 130 h128 q18 0 18 18 v10 H82 v-10 q0 -18 18 -18 z" fill="url(#orgSoft)"/>
    <path d="M92 124 q72 -32 144 -4" fill="none" stroke="url(#dark)" stroke-width="18" stroke-linecap="round"/>
    <path d="M110 206 h56 M110 228 h56" stroke="#00000033" stroke-width="7" stroke-linecap="round"/>
    <path d="M282 200 h44 v76 h-44 z" fill="url(#dark)"/>
    <path d="M326 212 H906 v52 H326 z" fill="url(#steel)"/>
    <path d="M338 212 v-22 M378 212 v-22 M418 212 v-22 M458 212 v-22 M498 212 v-22 M538 212 v-22 M578 212 v-22 M618 212 v-22 M658 212 v-22 M698 212 v-22 M738 212 v-22 M778 212 v-22 M818 212 v-22 M858 212 v-22" stroke="#6E747A" stroke-width="10" stroke-linecap="round"/>
    <path d="M358 264 v22 M398 264 v22 M438 264 v22 M478 264 v22 M518 264 v22 M558 264 v22 M598 264 v22 M638 264 v22 M678 264 v22 M718 264 v22 M758 264 v22 M798 264 v22 M838 264 v22 M878 264 v22" stroke="#6E747A" stroke-width="10" stroke-linecap="round"/>`;
}

/** Souffleur : moteur, tube courbe, buse et souffle. */
function blower() {
  return `
    ${shadow(380, 372, 250, 22)}
    <path d="M96 146 h172 q30 0 30 30 v116 q0 26 -26 26 H96 q-26 0 -26 -26 V176 q0 -30 26 -30 z" fill="url(#org)"/>
    <circle cx="182" cy="234" r="58" fill="url(#dark)"/>
    <circle cx="182" cy="234" r="34" fill="#00000055"/>
    <path d="M136 120 q66 -30 132 -2" fill="none" stroke="url(#dark)" stroke-width="18" stroke-linecap="round"/>
    <path d="M298 200 h150 q30 0 30 24 t-30 24 H298 z" fill="url(#steel)"/>
    <path d="M478 204 h150 q22 0 22 20 t-22 20 H478 z" fill="url(#pale)"/>
    <path d="M660 196 q40 28 0 56" fill="none" stroke="#EE7203" stroke-width="9" stroke-linecap="round"/>
    <path d="M700 180 q58 44 0 88" fill="none" stroke="#EE7203" stroke-width="7" stroke-linecap="round" opacity=".55"/>
    <path d="M744 164 q76 60 0 120" fill="none" stroke="#EE7203" stroke-width="6" stroke-linecap="round" opacity=".3"/>`;
}

/** Élagueuse sur perche : long manche télescopique, tête de coupe en haut. */
function pole() {
  return `
    ${shadow(420, 388, 260, 20)}
    <path d="M86 336 h132 q24 0 24 24 v-0 q0 24 -24 24 H86 q-24 0 -24 -24 t24 -24 z" fill="url(#org)"/>
    <path d="M150 342 L742 112" stroke="url(#steel)" stroke-width="24" stroke-linecap="round"/>
    <path d="M150 342 L742 112" stroke="#FFFFFF40" stroke-width="7" stroke-linecap="round"/>
    <path d="M400 258 l14 34" stroke="#8D9399" stroke-width="10" stroke-linecap="round"/>
    <path d="M742 112 h96 q22 0 22 20 t-22 20 h-96 z" fill="url(#steel)"/>
    ${chainTeeth(754, 838, 112, 148)}
    <path d="M700 96 q40 10 46 44" fill="none" stroke="url(#dark)" stroke-width="14" stroke-linecap="round"/>`;
}

/** Découpeuse à disque. */
function cutoff() {
  return `
    ${shadow(400, 382, 270, 22)}
    <path d="M70 168 h190 q30 0 30 30 v110 q0 26 -26 26 H70 q-26 0 -26 -26 V198 q0 -30 26 -30 z" fill="url(#org)"/>
    <path d="M96 142 h140 q20 0 20 20 v8 H76 v-8 q0 -20 20 -20 z" fill="url(#orgSoft)"/>
    <path d="M86 136 q76 -32 152 -2" fill="none" stroke="url(#dark)" stroke-width="19" stroke-linecap="round"/>
    <path d="M104 218 h64 M104 242 h64 M104 266 h64" stroke="#00000033" stroke-width="7" stroke-linecap="round"/>
    <path d="M290 206 h64 v96 h-64 z" fill="url(#dark)"/>
    <circle cx="560" cy="248" r="146" fill="url(#steel)"/>
    <circle cx="560" cy="248" r="146" fill="none" stroke="#7E848A" stroke-width="6"/>
    <circle cx="560" cy="248" r="30" fill="url(#dark)"/>
    <circle cx="560" cy="248" r="12" fill="#EE7203"/>
    <path d="M414 248 a146 146 0 0 1 292 0 h-40 a106 106 0 0 0 -212 0 z" fill="url(#dark)" opacity=".92"/>
    <path d="M472 150 l24 -20 M560 118 v-26 M648 150 l-24 -20" stroke="#6E747A" stroke-width="7" stroke-linecap="round"/>`;
}

/** Broyeur : trémie, corps, goulotte et roues. */
function shredder({ petrol = false } = {}) {
  return `
    ${shadow(420, 396, 250, 22)}
    <path d="M210 88 h320 l-58 108 H268 z" fill="url(#pale)"/>
    <path d="M210 88 h320 l-14 26 H224 z" fill="url(#steel)"/>
    <path d="M262 196 h216 q26 0 26 26 v112 q0 26 -26 26 H262 q-26 0 -26 -26 V222 q0 -26 26 -26 z" fill="${petrol ? 'url(#org)' : 'url(#dark)'}"/>
    <rect x="286" y="236" width="150" height="16" rx="8" fill="#EE7203"/>
    <path d="M286 280 h92 M286 306 h92" stroke="#FFFFFF33" stroke-width="7" stroke-linecap="round"/>
    ${petrol
      ? '<path d="M504 214 h92 q22 0 22 22 v54 q0 22 -22 22 h-92 z" fill="url(#dark)"/><circle cx="596" cy="262" r="16" fill="#00000055"/>'
      : '<path d="M504 246 h74 q18 0 18 18 t-18 18 h-74 z" fill="url(#steel)"/>'}
    <path d="M236 330 l-62 62 h84 z" fill="url(#steel)"/>
    <circle cx="288" cy="384" r="34" fill="url(#dark)"/><circle cx="288" cy="384" r="13" fill="#7E848A"/>
    <circle cx="456" cy="384" r="34" fill="url(#dark)"/><circle cx="456" cy="384" r="13" fill="#7E848A"/>`;
}

/** Affûteuse à eau Tormek : bac, meule et cuir. */
function grinder() {
  return `
    ${shadow(400, 396, 250, 22)}
    <path d="M150 214 h500 q30 0 30 30 v104 q0 30 -30 30 H150 q-30 0 -30 -30 V244 q0 -30 30 -30 z" fill="url(#dark)"/>
    <path d="M150 214 h500 v26 H150 z" fill="#FFFFFF1A"/>
    <circle cx="322" cy="216" r="148" fill="url(#stone)"/>
    <circle cx="322" cy="216" r="148" fill="none" stroke="#7E7768" stroke-width="5"/>
    <circle cx="322" cy="216" r="34" fill="url(#steel)"/>
    <circle cx="322" cy="216" r="13" fill="#4A4E53"/>
    <ellipse cx="560" cy="234" rx="92" ry="92" fill="#B98A5E"/>
    <ellipse cx="560" cy="234" rx="92" ry="92" fill="none" stroke="#8E6741" stroke-width="5"/>
    <circle cx="560" cy="234" r="22" fill="url(#steel)"/>
    <path d="M410 150 h180 q18 0 18 18 t-18 18 H410 z" fill="url(#steel)"/>
    <path d="M182 266 h120" stroke="#EE7203" stroke-width="12" stroke-linecap="round"/>`;
}

/** Lime d'affûtage 2-en-1 dans son guide. */
function file() {
  return `
    ${shadow(400, 348, 230, 18)}
    <path d="M150 268 L612 152" stroke="url(#steel)" stroke-width="30" stroke-linecap="round"/>
    <path d="M150 268 L612 152" stroke="#FFFFFF55" stroke-width="9" stroke-linecap="round"/>
    <path d="M612 152 l112 -28 q20 -5 25 15 t-15 25 l-112 28 z" fill="url(#dark)"/>
    <path d="M206 286 l10 26 M266 271 l10 26 M326 256 l10 26 M386 241 l10 26 M446 226 l10 26 M506 211 l10 26" stroke="#EE7203" stroke-width="7" stroke-linecap="round"/>
    <path d="M186 214 h300 q16 0 16 16 t-16 16 H186 z" fill="url(#org)" opacity=".9"/>`;
}

/** Guide-chaîne seul. */
function bar() {
  return `
    ${shadow(400, 326, 300, 18)}
    <path d="M110 200 H760 q54 0 54 46 t-54 46 H110 q-32 0 -32 -46 t32 -46 z" fill="url(#steel)"/>
    <path d="M142 226 H744 q26 0 26 20 t-26 20 H142 z" fill="#00000018"/>
    <circle cx="742" cy="246" r="22" fill="none" stroke="#7E848A" stroke-width="7"/>
    <circle cx="148" cy="246" r="13" fill="#4E5459"/>
    <rect x="190" y="236" width="70" height="20" rx="10" fill="#4E5459"/>
    ${chainTeeth(130, 730, 200, 292)}`;
}

/** Chaîne de rechange, en boucle. */
function chain() {
  return `
    ${shadow(400, 356, 250, 20)}
    <ellipse cx="440" cy="240" rx="250" ry="112" fill="none" stroke="url(#dark)" stroke-width="36"/>
    <ellipse cx="440" cy="240" rx="250" ry="112" fill="none" stroke="#9CA0A7" stroke-width="12" stroke-dasharray="22 18"/>
    <path d="M250 152 l-16 -28 22 -6 z M360 130 l-14 -30 22 -4 z M520 130 l14 -30 -22 -4 z M630 152 l16 -28 -22 -6 z" fill="#EE7203"/>`;
}

/** Bidon de carburant / d'huile. */
function canister() {
  return `
    ${shadow(400, 400, 190, 20)}
    <path d="M272 142 h256 q34 0 34 34 v190 q0 34 -34 34 H272 q-34 0 -34 -34 V176 q0 -34 34 -34 z" fill="url(#org)"/>
    <path d="M272 142 h256 q34 0 34 34 v22 H238 v-22 q0 -34 34 -34 z" fill="url(#orgSoft)"/>
    <rect x="300" y="104" width="94" height="44" rx="14" fill="url(#dark)"/>
    <rect x="442" y="108" width="72" height="40" rx="12" fill="url(#steel)"/>
    <rect x="286" y="236" width="150" height="96" rx="10" fill="#FFFFFF66"/>
    <path d="M306 268 h110 M306 296 h84" stroke="#B9550A" stroke-width="9" stroke-linecap="round"/>`;
}

/** Flacon d'huile moteur. */
function bottle() {
  return `
    ${shadow(400, 400, 150, 18)}
    <path d="M316 150 h168 v34 l38 52 v164 q0 30 -30 30 H308 q-30 0 -30 -30 V236 l38 -52 z" fill="url(#dark)"/>
    <rect x="336" y="98" width="128" height="56" rx="14" fill="url(#org)"/>
    <rect x="300" y="250" width="200" height="104" rx="10" fill="#EE7203"/>
    <path d="M324 288 h150 M324 320 h110" stroke="#FFFFFFAA" stroke-width="10" stroke-linecap="round"/>`;
}

/** Casque forestier avec visière et coquilles. */
function helmet() {
  return `
    ${shadow(400, 386, 220, 20)}
    <path d="M196 262 q0 -170 208 -170 t208 170 z" fill="url(#org)"/>
    <path d="M232 262 q0 -134 172 -134 t172 134 z" fill="#FFFFFF22"/>
    <rect x="176" y="256" width="456" height="34" rx="17" fill="url(#dark)"/>
    <path d="M214 294 q190 78 380 0 v26 q-190 74 -380 0 z" fill="url(#steel)" opacity=".75"/>
    <ellipse cx="192" cy="226" rx="44" ry="56" fill="url(#dark)"/>
    <ellipse cx="616" cy="226" rx="44" ry="56" fill="url(#dark)"/>
    <path d="M176 200 q-34 -40 -8 -84" fill="none" stroke="url(#dark)" stroke-width="16" stroke-linecap="round"/>`;
}

/** Pantalon anti-coupures. */
function trousers() {
  return `
    ${shadow(400, 410, 180, 18)}
    <path d="M288 96 h224 l26 300 h-92 l-46 -166 -46 166 h-92 z" fill="url(#dark)"/>
    <path d="M288 96 h224 l6 64 H282 z" fill="url(#steel)"/>
    <rect x="300" y="182" width="200" height="18" rx="9" fill="#EE7203"/>
    <path d="M318 246 h56 M430 246 h56" stroke="#FFFFFF33" stroke-width="10" stroke-linecap="round"/>
    <path d="M318 320 h50 M436 320 h50" stroke="#FFFFFF22" stroke-width="10" stroke-linecap="round"/>`;
}

/** Paire de gants de travail. */
function gloves() {
  return `
    ${shadow(400, 388, 190, 18)}
    <path d="M286 366 V182 q0 -30 28 -30 t28 30 v-40 q0 -30 28 -30 t28 30 v40 q0 -30 28 -30 t28 30 v34 q0 -26 26 -26 t26 26 v122 q0 46 -52 46 z" fill="url(#dark)"/>
    <path d="M300 300 h178" stroke="#EE7203" stroke-width="16" stroke-linecap="round"/>
    <path d="M300 334 h178" stroke="#FFFFFF22" stroke-width="10" stroke-linecap="round"/>
    <path d="M330 206 v66 M386 196 v76 M442 206 v66" stroke="#FFFFFF1A" stroke-width="8" stroke-linecap="round"/>`;
}

/** Batterie du système AP. */
function battery() {
  return `
    ${shadow(400, 382, 200, 20)}
    <path d="M232 152 h336 q30 0 30 30 v160 q0 30 -30 30 H232 q-30 0 -30 -30 V182 q0 -30 30 -30 z" fill="url(#pale)"/>
    <path d="M232 152 h336 q30 0 30 30 v26 H202 v-26 q0 -30 30 -30 z" fill="url(#steel)"/>
    <rect x="300" y="110" width="200" height="46" rx="12" fill="url(#dark)"/>
    <rect x="242" y="250" width="44" height="30" rx="6" fill="#EE7203"/>
    <rect x="300" y="250" width="44" height="30" rx="6" fill="#EE7203"/>
    <rect x="358" y="250" width="44" height="30" rx="6" fill="#EE7203"/>
    <rect x="416" y="250" width="44" height="30" rx="6" fill="#C9CDD1"/>
    <rect x="242" y="304" width="220" height="14" rx="7" fill="#00000018"/>`;
}

/** Chargeur rapide. */
function charger() {
  return `
    ${shadow(400, 372, 210, 20)}
    <path d="M216 176 h368 q30 0 30 30 v122 q0 30 -30 30 H216 q-30 0 -30 -30 V206 q0 -30 30 -30 z" fill="url(#pale)"/>
    <path d="M216 176 h368 q30 0 30 30 v24 H186 v-24 q0 -30 30 -30 z" fill="url(#steel)"/>
    <rect x="288" y="136" width="224" height="44" rx="12" fill="url(#dark)"/>
    <path d="M398 244 l-30 54 h38 l-18 44 50 -64 h-38 z" fill="#EE7203"/>
    <circle cx="256" cy="312" r="13" fill="#EE7203"/>
    <path d="M614 300 q60 14 68 70" fill="none" stroke="url(#dark)" stroke-width="14" stroke-linecap="round"/>`;
}

const ART = {
  chainsaw, miniSaw, brushcutter, hedge, blower, pole, cutoff,
  shredder, grinder, file, bar, chain, canister, bottle,
  helmet, trousers, gloves, battery, charger,
};

/**
 * [fichier, modèle, marque, dessin, caractéristique, options]
 * Les options font varier la géométrie : longueur de guide, motorisation.
 */
const PRODUCTS = [
  ['ms-500i', 'MS 500i', 'STIHL', 'chainsaw', '79,2 cm³ · 6,8 ch · guide 63 cm', { bar: 400 }],
  ['ms-462', 'MS 462 C-M', 'STIHL', 'chainsaw', '72,2 cm³ · 6,0 ch · guide 50 cm', { bar: 330 }],
  ['ms-400', 'MS 400 C-M', 'STIHL', 'chainsaw', '66,8 cm³ · 4,8 ch · guide 45 cm', { bar: 300 }],
  ['ms-261', 'MS 261 C-M', 'STIHL', 'chainsaw', '50,2 cm³ · 3,9 ch · guide 40 cm', { bar: 270 }],
  ['ms-251', 'MS 251 C-BE', 'STIHL', 'chainsaw', '45,6 cm³ · 3,0 ch · guide 40 cm', { bar: 270 }],
  ['ms-194t', 'MS 194 T', 'STIHL', 'chainsaw', '31,8 cm³ · poignée haute · 3,3 kg', { bar: 225 }],
  ['ms-180', 'MS 180 C-BE', 'STIHL', 'chainsaw', '31,8 cm³ · 2,0 ch · guide 35 cm', { bar: 240 }],
  ['msa-300', 'MSA 300 C-O', 'STIHL', 'chainsaw', 'Batterie AP · chaîne 24 m/s', { bar: 300, electric: true }],
  ['msa-220', 'MSA 220 C-B', 'STIHL', 'chainsaw', 'Batterie AP · 3,0 kg · guide 35 cm', { bar: 240, electric: true }],
  ['fs-131', 'FS 131 R', 'STIHL', 'brushcutter', '36,3 cm³ · 4-MIX · poignée circulaire'],
  ['fs-111', 'FS 111 R', 'STIHL', 'brushcutter', '31,4 cm³ · 4-MIX · 5,7 kg'],
  ['fs-91', 'FS 91 R', 'STIHL', 'brushcutter', '28,4 cm³ · 4-MIX · 5,3 kg'],
  ['fs-55', 'FS 55 R', 'STIHL', 'brushcutter', '27,2 cm³ · 2-temps · 5,0 kg'],
  ['fsa-60', 'FSA 60 R', 'STIHL', 'brushcutter', 'Batterie AK · coupe 28 cm · 2,8 kg', { electric: true }],
  ['hs-82r', 'HS 82 R', 'STIHL', 'hedge', '22,7 cm³ · lame 75 cm · dents 33 mm'],
  ['bg-86', 'BG 86', 'STIHL', 'blower', '27,2 cm³ · 810 m³/h · 80 m/s'],
  ['ht-105', 'HT 105', 'STIHL', 'pole', '31,4 cm³ · télescopique 2,70–3,90 m'],
  ['ts-420', 'TS 420', 'STIHL', 'cutoff', '66,7 cm³ · disque 350 mm · coupe 125 mm'],
  ['ts-500i', 'TS 500i', 'STIHL', 'cutoff', '5,0 kW · disque 350 mm · coupe 125 mm'],
  ['gta-26', 'GTA 26', 'STIHL', 'miniSaw', 'batterie 10,8 V · coupe 8 cm · 1,2 kg'],
  ['ghe-135l', 'GHE 135 L', 'STIHL', 'shredder', 'électrique 230 V · rouleau · branches 35 mm'],
  ['ghe-250s', 'GHE 250 S', 'STIHL', 'shredder', 'électrique · multi-couteaux · branches 35 mm'],
  ['gh-370s', 'GH 370 S', 'STIHL', 'shredder', 'thermique · autonome · branches 45 mm', { petrol: true }],
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

function svg(name, brand, artKey, spec, opts) {
  const draw = ART[artKey] ?? ART.chainsaw;
  const art = draw(opts ?? {});
  // Les noms longs passent en corps réduit : rien ne doit déborder de la
  // colonne utile de 840 px.
  const fontSize = name.length > 18 ? 36 : name.length > 13 ? 44 : 54;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 750" width="1000" height="750" role="img" aria-label="${escape(brand)} ${escape(name)} — ${escape(spec)}">
  <defs>${DEFS}
  </defs>

  <rect width="1000" height="750" fill="url(#bg)"/>
  <rect x="0" y="0" width="1000" height="6" fill="${RED}"/>

  <!-- Cadrage : le taille-haie est le dessin le plus large (906 px), c'est lui
       qui fixe l'échelle maximale sans déborder de la tuile. -->
  <g transform="translate(35 52) scale(1.06)">${art}
  </g>

  <rect x="80" y="576" width="420" height="3" fill="url(#rule)"/>

  <text x="80" y="552" font-family="Inter, Roboto, Helvetica, Arial, sans-serif" font-size="21" font-weight="700" letter-spacing="4.5" fill="${RED}">${escape(brand)}</text>
  <text x="80" y="636" font-family="Inter, Roboto, Helvetica, Arial, sans-serif" font-size="${fontSize}" font-weight="800" letter-spacing="-1" fill="${INK}">${escape(name)}</text>
  <text x="80" y="682" font-family="Inter, Roboto, Helvetica, Arial, sans-serif" font-size="23" font-weight="600" fill="${GREY}">${escape(spec)}</text>

  <text x="820" y="682" text-anchor="end" font-family="Inter, Roboto, Helvetica, Arial, sans-serif" font-size="17" font-weight="700" letter-spacing="3" fill="${FAINT}">VOLTARIS</text>
</svg>
`;
}

mkdirSync(OUT, { recursive: true });

for (const [slug, name, brand, art, spec, opts] of PRODUCTS) {
  writeFileSync(resolve(OUT, `${slug}.svg`), svg(name, brand, art, spec, opts), 'utf8');
}

console.log(`${PRODUCTS.length} illustrations générées dans frontend/public/produits/neuf/`);
console.log('Ce sont des dessins, pas des photos : les produits concernés restent hors du flux Merchant Center.');
