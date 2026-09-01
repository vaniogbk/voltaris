#!/usr/bin/env node
/**
 * Recalcule les prix du neuf à partir de vos relevés de marché.
 *
 *   node scripts/reprice.mjs --export > prix.csv    # grille actuelle
 *   node scripts/reprice.mjs prix.csv              # simulation
 *   node scripts/reprice.mjs prix.csv --apply      # écriture en base
 *
 * FICHIER ATTENDU
 *
 *   sku,marche,achat
 *   SM-MS462-50,1349,890
 *   SM-FS131R,849,
 *
 *   • marche : le meilleur prix TTC que vous avez constaté chez un concurrent
 *   • achat  : votre prix d'achat HT (facultatif, mais fortement conseillé)
 *
 * La colonne « achat » ne sert qu'à vous protéger : toute ligne dont le prix
 * de vente calculé passe sous le prix d'achat majoré de 5 % est signalée en
 * rouge et refusée, même avec --apply. C'est le seul garde-fou possible —
 * un script ne connaît pas vos remises fournisseur.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const requireFromBackend = createRequire(resolve(ROOT, 'backend/package.json'));
const { PrismaClient } = requireFromBackend('@prisma/client');

const c = {
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', cyan: '\x1b[36m',
};

// ---------------------------------------------------------------- règle

/**
 * Copie volontaire de la règle définie dans
 * backend/prisma/seed-data/products-new.ts : ce script doit rester exécutable
 * sans compiler le backend. Si vous changez la politique de prix, changez-la
 * aux deux endroits.
 */
const FLAT_DISCOUNT_CENTS = 20_000;
const FLAT_DISCOUNT_FLOOR = 50_000;

function sellingPrice(marketCents, discountCents = FLAT_DISCOUNT_CENTS) {
  if (marketCents >= FLAT_DISCOUNT_FLOOR) {
    return roundToPsychological(marketCents - discountCents);
  }
  const rate = marketCents >= 25_000 ? 0.85 : 0.9;
  return roundToPsychological(Math.round(marketCents * rate));
}

function roundToPsychological(cents) {
  const euros = cents / 100;
  if (euros >= 100) return (Math.floor((euros + 1) / 10) * 10 - 1) * 100;
  return Math.max(90, Math.floor(euros) * 100 - 10);
}

// ---------------------------------------------------------------- entrée

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const exportMode = args.includes('--export');
// `indexOf` renvoie -1 quand le drapeau est absent : sans cette garde, le
// premier argument — le chemin du CSV — serait pris pour la valeur de remise.
const discountIndex = args.indexOf('--discount');
const discountArg = discountIndex === -1 ? null : args[discountIndex + 1];
const discountCents =
  discountArg != null ? Math.round(Number(discountArg) * 100) : FLAT_DISCOUNT_CENTS;

// -1 + 1 vaut 0 : sans cette garde, le premier argument serait exclu.
const discountValueIndex = discountIndex === -1 ? -1 : discountIndex + 1;
const csvPath = args.find((a, i) => !a.startsWith('--') && i !== discountValueIndex);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
${c.bold}Recalcul des prix du neuf${c.reset}

  node scripts/reprice.mjs --export > prix.csv
  node scripts/reprice.mjs prix.csv
  node scripts/reprice.mjs prix.csv --apply
  node scripts/reprice.mjs prix.csv --discount 250 --apply

  ${c.bold}--export${c.reset}          Sort la grille actuelle au format CSV
  ${c.bold}--apply${c.reset}           Écrit en base (sans ce drapeau : simulation)
  ${c.bold}--discount <€>${c.reset}    Remise forfaitaire, 200 par défaut

${c.bold}Colonnes du CSV${c.reset}  sku,marche,achat
  achat est facultatif ; s'il est renseigné, toute vente à perte est refusée.
`);
  process.exit(0);
}

const prisma = new PrismaClient();

const money = (cents) =>
  (cents / 100).toLocaleString('fr-FR', { minimumFractionDigits: cents % 100 ? 2 : 0 }) + ' €';

function parseCsv(path) {
  const rows = [];
  const lines = readFileSync(path, 'utf8').split(/\r?\n/).filter((l) => l.trim());

  for (const [index, line] of lines.entries()) {
    const cells = line.split(/[,;]/).map((v) => v.trim());
    // En-tête toléré, quelle que soit sa casse.
    if (index === 0 && /sku/i.test(cells[0])) continue;

    const [sku, market, cost] = cells;
    if (!sku) continue;

    const marketCents = Math.round(Number(String(market).replace(',', '.')) * 100);
    if (!Number.isFinite(marketCents) || marketCents <= 0) {
      console.error(`${c.red}Ligne ${index + 1} ignorée : prix marché illisible pour ${sku}${c.reset}`);
      continue;
    }

    const costCents = cost ? Math.round(Number(String(cost).replace(',', '.')) * 100) : null;
    rows.push({ sku: sku.toUpperCase(), marketCents, costCents: Number.isFinite(costCents) ? costCents : null });
  }
  return rows;
}

// ---------------------------------------------------------------- exécution

async function main() {
  if (exportMode) {
    const products = await prisma.product.findMany({
      where: { condition: 'NEW' },
      orderBy: { sku: 'asc' },
      select: { sku: true, priceCents: true, compareAtCents: true },
    });
    console.log('sku,marche,achat');
    for (const p of products) {
      console.log(`${p.sku},${((p.compareAtCents ?? p.priceCents) / 100).toFixed(2)},`);
    }
    return;
  }

  if (!csvPath) {
    console.error(`${c.red}Indiquez un fichier CSV. Voir --help.${c.reset}`);
    process.exit(1);
  }

  const rows = parseCsv(csvPath);
  if (rows.length === 0) {
    console.error(`${c.red}Aucune ligne exploitable dans ${csvPath}.${c.reset}`);
    process.exit(1);
  }

  console.log(`\n${c.bold}Recalcul des prix — remise forfaitaire ${money(discountCents)} au-delà de ${money(FLAT_DISCOUNT_FLOOR)}${c.reset}`);
  if (!apply) console.log(`${c.yellow}Simulation — rien n'est écrit. Ajoutez --apply pour valider.${c.reset}`);
  console.log('');
  console.log(
    'SKU'.padEnd(20) + 'MARCHÉ'.padStart(11) + 'ACTUEL'.padStart(11) +
    'NOUVEAU'.padStart(11) + 'MARGE'.padStart(11) + '  ÉTAT',
  );
  console.log('─'.repeat(80));

  const updates = [];
  let losses = 0;
  let missing = 0;

  for (const row of rows) {
    const product = await prisma.product.findUnique({
      where: { sku: row.sku },
      select: { id: true, sku: true, priceCents: true, condition: true },
    });

    if (!product) {
      console.log(`${c.red}${row.sku.padEnd(20)}${'—'.padStart(44)}  SKU inconnu${c.reset}`);
      missing++;
      continue;
    }

    const next = sellingPrice(row.marketCents, discountCents);

    // La marge se calcule sur le prix HT : les prix affichés sont TTC.
    const netCents = Math.round(next / 1.2);
    const marginCents = row.costCents == null ? null : netCents - row.costCents;
    const atLoss = marginCents != null && marginCents < row.costCents * 0.05;

    if (atLoss) losses++;
    else updates.push({ id: product.id, sku: product.sku, next, marketCents: row.marketCents });

    const marginText = marginCents == null ? '—' : money(marginCents);
    const state = atLoss
      ? `${c.red}vente à perte — refusé${c.reset}`
      : next === product.priceCents
        ? `${c.dim}inchangé${c.reset}`
        : `${c.green}mis à jour${c.reset}`;

    console.log(
      row.sku.padEnd(20) +
        money(row.marketCents).padStart(11) +
        money(product.priceCents).padStart(11) +
        money(next).padStart(11) +
        marginText.padStart(11) +
        '  ' + state,
    );
  }

  console.log('─'.repeat(80));
  console.log(
    `${updates.length} à mettre à jour` +
      (losses ? `${c.red}, ${losses} refusé(s) pour vente à perte${c.reset}` : '') +
      (missing ? `${c.yellow}, ${missing} SKU inconnu(s)${c.reset}` : ''),
  );

  if (!apply) {
    console.log(`\n${c.dim}Relancez avec --apply pour écrire ces prix.${c.reset}\n`);
    return;
  }

  for (const u of updates) {
    await prisma.product.update({
      where: { id: u.id },
      // Le prix marché devient le prix barré : la remise reste visible.
      data: { priceCents: u.next, compareAtCents: u.marketCents },
    });
  }

  console.log(`\n${c.green}${c.bold}${updates.length} prix mis à jour.${c.reset}\n`);
}

main()
  .catch((err) => {
    console.error(`\n${c.red}Échec :${c.reset}`, err.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
