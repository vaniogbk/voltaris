#!/usr/bin/env node
/**
 * Importe vos photos produit et les rattache aux fiches en base.
 *
 *   node scripts/import-photos.mjs            # importe tout ce qui est prêt
 *   node scripts/import-photos.mjs --dry-run  # montre ce qui serait fait
 *   node scripts/import-photos.mjs --sku SM-MS462-50
 *   node scripts/import-photos.mjs --help
 *
 * PRINCIPE
 * Déposez vos photos dans un dossier portant le SKU du produit :
 *
 *   img-produits/
 *     SM-MS462-50/
 *       01.jpg      ← photo principale (celle du catalogue)
 *       02.jpg
 *       03.jpg
 *     SM-FS131R/
 *       principale.jpg
 *       detail-moteur.jpg
 *
 * Les fichiers sont pris dans l'ordre alphabétique : nommez-les 01, 02, 03…
 * pour maîtriser l'ordre de la galerie. Le premier sert de vignette partout.
 *
 * Le script copie les fichiers vers frontend/public/produits/<slug>/ puis
 * remplace les images de la fiche en base. Il ne touche à aucun produit dont
 * le dossier n'existe pas : vous pouvez donc l'exécuter autant de fois que
 * nécessaire, au fil de vos prises de vue.
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Le client Prisma vit dans backend/node_modules : on le résout depuis là
// pour que ce script reste lançable depuis la racine du dépôt.
const requireFromBackend = createRequire(resolve(ROOT, 'backend/package.json'));
const { PrismaClient } = requireFromBackend('@prisma/client');
const SOURCE = resolve(ROOT, 'img-produits');
const DEST = resolve(ROOT, 'frontend/public/produits');

const ACCEPTED = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif']);

const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
${c.bold}Import des photos produit${c.reset}

  node scripts/import-photos.mjs [options]

  ${c.bold}--dry-run${c.reset}            Affiche le plan d'import sans rien modifier
  ${c.bold}--sku <SKU>${c.reset}          Limite l'import à un produit
  ${c.bold}--from-csv <fichier>${c.reset} Télécharge depuis un flux d'URL au lieu du disque
  ${c.bold}--help${c.reset}               Cette aide

${c.bold}Où déposer les fichiers${c.reset}

  img-produits/<SKU>/01.jpg, 02.jpg, 03.jpg…

  Le premier fichier dans l'ordre alphabétique devient la photo principale.
  Formats acceptés : ${[...ACCEPTED].join(', ')}

${c.bold}Import depuis un flux fournisseur${c.reset}

  node scripts/import-photos.mjs --from-csv photos.csv

  Fichier attendu, une ligne par image, dans l'ordre de la galerie :

    sku,url
    SM-MS462-50,https://media.mon-grossiste.fr/ms462/face.jpg
    SM-MS462-50,https://media.mon-grossiste.fr/ms462/profil.jpg

  ${c.yellow}N'utilisez ce mode qu'avec des URL dont vous détenez le droit d'usage
  commercial : médiathèque revendeur, catalogue de votre grossiste, banque
  d'images sous licence. Reprendre les photos d'un concurrent ou du fabricant
  sans autorisation est une contrefaçon.${c.reset}

${c.bold}Conseils de prise de vue${c.reset}

  • Fond uni et clair, lumière diffuse — les fiches sont sur fond blanc.
  • Cadrez en 4/3 : c'est le format des vignettes du catalogue.
  • 1600 px de côté minimum, sinon le zoom plein écran sera flou.
  • Pour une occasion, photographiez aussi les défauts : c'est ce qui fait
    la crédibilité de l'annonce et évite les litiges au déballage.
`);
  process.exit(0);
}

const dryRun = args.includes('--dry-run');

const skuIndex = args.indexOf('--sku');
const onlySku = skuIndex === -1 ? null : args[skuIndex + 1];
if (skuIndex !== -1 && !onlySku) {
  console.error(`${c.red}--sku attend une valeur.${c.reset}`);
  process.exit(1);
}

const csvIndex = args.indexOf('--from-csv');
const csvPath = csvIndex === -1 ? null : args[csvIndex + 1];
if (csvIndex !== -1 && !csvPath) {
  console.error(`${c.red}--from-csv attend un chemin de fichier.${c.reset}`);
  process.exit(1);
}

const prisma = new PrismaClient();

/** Dossiers de premier niveau qui ressemblent à un SKU (et non à des photos en vrac). */
function findSkuFolders() {
  if (!existsSync(SOURCE)) return [];
  return readdirSync(SOURCE)
    .filter((entry) => statSync(join(SOURCE, entry)).isDirectory())
    .filter((entry) => !onlySku || entry.toUpperCase() === onlySku.toUpperCase());
}

function photosIn(folder) {
  return readdirSync(folder)
    .filter((f) => ACCEPTED.has(extname(f).toLowerCase()))
    .sort((a, b) => a.localeCompare(b, 'fr', { numeric: true }));
}

/** Types MIME acceptés pour un téléchargement, et extension associée. */
const MIME_EXT = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/avif': '.avif',
};
const MAX_BYTES = 15 * 1024 * 1024;

/**
 * Import depuis un flux fournisseur : un CSV `sku,url` par image.
 *
 * ⚠️ N'utilisez ce mode qu'avec des URL dont vous détenez le droit d'usage
 * commercial — médiathèque revendeur, catalogue de votre grossiste, banque
 * d'images sous licence. Reprendre les photos d'un site concurrent ou du
 * fabricant sans autorisation est une contrefaçon.
 */
async function importFromCsv(path) {
  const lines = readFileSync(path, 'utf8').split(/\r?\n/).filter((l) => l.trim());

  const bySku = new Map();
  for (const [index, line] of lines.entries()) {
    const [sku, url] = line.split(/[,;]/).map((v) => v.trim());
    if (index === 0 && /sku/i.test(sku)) continue;
    if (!sku || !url) continue;

    if (!/^https?:\/\//i.test(url)) {
      console.log(`  ${c.yellow}!${c.reset} ${sku} — URL ignorée (protocole non http) : ${url}`);
      continue;
    }
    if (!bySku.has(sku.toUpperCase())) bySku.set(sku.toUpperCase(), []);
    bySku.get(sku.toUpperCase()).push(url);
  }

  if (bySku.size === 0) {
    console.log(`${c.yellow}Aucune ligne exploitable dans ${path}.${c.reset}`);
    console.log(`${c.dim}Format attendu, une ligne par image :  sku,url${c.reset}\n`);
    return;
  }

  let imported = 0;
  let skipped = 0;

  for (const [sku, urls] of bySku) {
    const product = await prisma.product.findUnique({
      where: { sku },
      select: { id: true, slug: true, translations: { select: { locale: true, name: true } } },
    });

    if (!product) {
      console.log(`  ${c.red}✖${c.reset} ${sku} — aucun produit avec ce SKU`);
      skipped++;
      continue;
    }

    const targetDir = join(DEST, product.slug);
    const nameFr = product.translations.find((t) => t.locale === 'fr')?.name ?? sku;
    const nameDe = product.translations.find((t) => t.locale === 'de')?.name ?? nameFr;
    const images = [];

    for (const [index, url] of urls.entries()) {
      try {
        // Beaucoup de CDN (Wikimedia, médiathèques fournisseurs) rejettent
        // les requêtes sans agent identifiable.
        const response = await fetch(url, {
          redirect: 'follow',
          headers: { 'User-Agent': 'StihlMarket-PhotoImport/1.0 (+catalogue produit)' },
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const mime = (response.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
        const ext = MIME_EXT[mime];
        if (!ext) throw new Error(`type non image (${mime || 'inconnu'})`);

        const buffer = Buffer.from(await response.arrayBuffer());
        if (buffer.byteLength > MAX_BYTES) throw new Error(`fichier trop lourd (${Math.round(buffer.byteLength / 1e6)} Mo)`);
        if (buffer.byteLength < 1024) throw new Error('fichier vide ou tronqué');

        const target = `${String(index + 1).padStart(2, '0')}${ext}`;
        if (!dryRun) {
          mkdirSync(targetDir, { recursive: true });
          writeFileSync(join(targetDir, target), buffer);
        }

        images.push({
          url: `/produits/${product.slug}/${target}`,
          altFr: index === 0 ? nameFr : `${nameFr} — vue ${index + 1}`,
          altDe: index === 0 ? nameDe : `${nameDe} — Ansicht ${index + 1}`,
          position: index,
        });
      } catch (err) {
        console.log(`  ${c.yellow}!${c.reset} ${sku} — ${url.slice(0, 60)} : ${err.message}`);
      }
    }

    if (images.length === 0) {
      skipped++;
      continue;
    }

    console.log(`  ${c.green}✔${c.reset} ${sku} — ${images.length} photo(s) téléchargée(s)`);

    if (!dryRun) {
      await prisma.$transaction([
        prisma.productImage.deleteMany({ where: { productId: product.id } }),
        prisma.productImage.createMany({
          data: images.map((img) => ({ productId: product.id, ...img })),
        }),
      ]);
    }
    imported++;
  }

  console.log(
    `\n${c.bold}${imported} produit(s) mis à jour${skipped ? `, ${skipped} ignoré(s)` : ''}.${c.reset}\n`,
  );
}

async function main() {
  console.log(`\n${c.bold}Import des photos produit${c.reset}`);
  if (dryRun) console.log(`${c.yellow}Mode simulation — aucune modification.${c.reset}`);

  if (csvPath) {
    console.log(`${c.dim}flux : ${csvPath}${c.reset}\n`);
    return importFromCsv(csvPath);
  }

  console.log(`${c.dim}source : ${SOURCE}${c.reset}`);
  const folders = findSkuFolders();

  if (folders.length === 0) {
    console.log(`
${c.yellow}Aucun dossier de SKU trouvé.${c.reset}

Créez un dossier par produit, nommé avec son SKU, et déposez-y vos photos :

  ${c.cyan}img-produits/SM-MS462-50/01.jpg${c.reset}

Les SKU disponibles sont listés ci-dessous.
`);
    await listSkus();
    return;
  }

  let imported = 0;
  let skipped = 0;

  for (const folder of folders) {
    const sku = folder;
    const product = await prisma.product.findUnique({
      where: { sku },
      select: { id: true, sku: true, slug: true, translations: { select: { locale: true, name: true } } },
    });

    if (!product) {
      console.log(`  ${c.red}✖${c.reset} ${sku} — aucun produit avec ce SKU`);
      skipped++;
      continue;
    }

    const sourceDir = join(SOURCE, folder);
    const files = photosIn(sourceDir);

    if (files.length === 0) {
      console.log(`  ${c.yellow}!${c.reset} ${sku} — dossier vide`);
      skipped++;
      continue;
    }

    const targetDir = join(DEST, product.slug);
    const nameFr = product.translations.find((t) => t.locale === 'fr')?.name ?? sku;
    const nameDe = product.translations.find((t) => t.locale === 'de')?.name ?? nameFr;

    const images = files.map((file, index) => {
      const ext = extname(file).toLowerCase();
      const target = `${String(index + 1).padStart(2, '0')}${ext}`;
      return {
        source: join(sourceDir, file),
        target: join(targetDir, target),
        url: `/produits/${product.slug}/${target}`,
        altFr: index === 0 ? nameFr : `${nameFr} — vue ${index + 1}`,
        altDe: index === 0 ? nameDe : `${nameDe} — Ansicht ${index + 1}`,
        position: index,
      };
    });

    console.log(
      `  ${c.green}✔${c.reset} ${sku} — ${images.length} photo(s) → ${c.dim}public/produits/${product.slug}/${c.reset}`,
    );

    if (!dryRun) {
      mkdirSync(targetDir, { recursive: true });
      for (const img of images) copyFileSync(img.source, img.target);

      // Les photos réelles remplacent le visuel provisoire en un seul geste.
      await prisma.$transaction([
        prisma.productImage.deleteMany({ where: { productId: product.id } }),
        prisma.productImage.createMany({
          data: images.map((img) => ({
            productId: product.id,
            url: img.url,
            altFr: img.altFr,
            altDe: img.altDe,
            position: img.position,
          })),
        }),
      ]);
    }

    imported++;
  }

  console.log(
    `\n${c.bold}${imported} produit(s) mis à jour${skipped ? `, ${skipped} ignoré(s)` : ''}.${c.reset}`,
  );
  if (!dryRun && imported > 0) {
    console.log(`${c.dim}Rechargez la boutique : les nouvelles photos sont en ligne.${c.reset}\n`);
  }
}

async function listSkus() {
  const products = await prisma.product.findMany({
    orderBy: [{ condition: 'asc' }, { sku: 'asc' }],
    select: {
      id: true,
      sku: true,
      condition: true,
      translations: { where: { locale: 'fr' }, select: { name: true } },
      _count: { select: { images: true } },
    },
  });

  // Un produit dont l'unique image vient de /produits/neuf/ tourne encore
  // sur un visuel provisoire : c'est celui-là qu'il faut photographier.
  const placeholders = await prisma.productImage.findMany({
    where: { url: { startsWith: '/produits/neuf/' } },
    select: { productId: true },
  });
  const withPlaceholder = new Set(placeholders.map((p) => p.productId));

  console.log(`${c.bold}SKU disponibles${c.reset}\n`);
  for (const p of products) {
    const name = p.translations[0]?.name ?? '';
    const pending = withPlaceholder.has(p.id) ? `  ${c.yellow}visuel provisoire${c.reset}` : '';
    console.log(
      `  ${c.cyan}${p.sku.padEnd(22)}${c.reset} ${c.dim}${String(p._count.images).padStart(2)} img${c.reset}  ${name.slice(0, 46).padEnd(46)}${pending}`,
    );
  }

  const remaining = products.filter((p) => withPlaceholder.has(p.id)).length;
  console.log(
    `\n  ${c.bold}${remaining}${c.reset} produit(s) attendent encore de vraies photos.\n`,
  );
}

main()
  .catch((err) => {
    console.error(`\n${c.red}Échec de l'import :${c.reset}`, err.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
