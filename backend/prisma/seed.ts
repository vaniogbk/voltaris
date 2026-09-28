/**
 * Seed Voltaris.
 *
 * Idempotent : chaque exécution met à jour les enregistrements existants
 * (clé : sku pour les produits, slug pour les catégories) plutôt que de
 * créer des doublons. On peut donc le relancer après avoir modifié le
 * contenu des fichiers seed-data/.
 *
 * Le stock n'est réinitialisé QUE lors de la création initiale d'un produit :
 * relancer le seed ne doit jamais écraser un inventaire réel géré depuis
 * le back-office.
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { CATEGORIES } from './seed-data/categories.js';
import { USED_PRODUCTS } from './seed-data/products-used.js';
import { NEW_PRODUCTS } from './seed-data/products-new.js';
import type { ProductSeed } from './seed-data/types.js';

const prisma = new PrismaClient();

const DEFAULT_ADMIN_PASSWORD = 'ChangeMoi!2026';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@voltaris.eu';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? DEFAULT_ADMIN_PASSWORD;

async function seedAdmin() {
  // Ce mot de passe par défaut est écrit ici, dans un dépôt public : le
  // connaître ne demande aucun effort. Il dépanne en local, il ouvrirait le
  // backoffice à n'importe qui en ligne. On refuse donc de créer le compte
  // plutôt que d'en créer un dont tout le monde a la clé.
  if (process.env.NODE_ENV === 'production' && ADMIN_PASSWORD === DEFAULT_ADMIN_PASSWORD) {
    throw new Error(
      'ADMIN_PASSWORD est absent ou vaut la valeur par défaut, qui est publique. ' +
        'Définissez ADMIN_PASSWORD dans les variables du service avant de lancer le seed.',
    );
  }

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL.toLowerCase() },
    update: { role: 'ADMIN' },
    create: {
      email: ADMIN_EMAIL.toLowerCase(),
      passwordHash,
      firstName: 'Admin',
      lastName: 'Voltaris',
      role: 'ADMIN',
      locale: 'fr',
      country: 'FR',
      emailVerified: true,
    },
  });
  console.log(`  ✔ Administrateur : ${admin.email}`);
  return admin;
}

async function seedShippingRates() {
  const rates = [
    // ---- France : DPD jusqu'à 30 kg, Schenker au-delà
    { country: 'FR', carrier: 'DPD', name: 'Colis standard', minWeightG: 0, maxWeightG: 2_000, priceCents: 790, freeAboveCents: 15_000, etaMinDays: 2, etaMaxDays: 4 },
    { country: 'FR', carrier: 'DPD', name: 'Colis standard', minWeightG: 2_001, maxWeightG: 10_000, priceCents: 1_290, freeAboveCents: 30_000, etaMinDays: 2, etaMaxDays: 4 },
    { country: 'FR', carrier: 'DPD', name: 'Colis lourd', minWeightG: 10_001, maxWeightG: 30_000, priceCents: 2_490, freeAboveCents: null, etaMinDays: 3, etaMaxDays: 5 },
    { country: 'FR', carrier: 'Schenker', name: 'Messagerie palette', minWeightG: 30_001, maxWeightG: 120_000, priceCents: 8_900, freeAboveCents: null, etaMinDays: 4, etaMaxDays: 8 },

    // ---- Allemagne : DHL jusqu'à 31,5 kg (limite du réseau colis), Schenker au-delà
    { country: 'DE', carrier: 'DHL', name: 'Paket Standard', minWeightG: 0, maxWeightG: 2_000, priceCents: 890, freeAboveCents: 15_000, etaMinDays: 2, etaMaxDays: 4 },
    { country: 'DE', carrier: 'DHL', name: 'Paket Standard', minWeightG: 2_001, maxWeightG: 10_000, priceCents: 1_490, freeAboveCents: 30_000, etaMinDays: 2, etaMaxDays: 4 },
    { country: 'DE', carrier: 'DHL', name: 'Paket Schwergut', minWeightG: 10_001, maxWeightG: 31_500, priceCents: 2_790, freeAboveCents: null, etaMinDays: 3, etaMaxDays: 6 },
    { country: 'DE', carrier: 'Schenker', name: 'Spedition Palette', minWeightG: 31_501, maxWeightG: 120_000, priceCents: 9_900, freeAboveCents: null, etaMinDays: 5, etaMaxDays: 9 },
  ] as const;

  for (const rate of rates) {
    await prisma.shippingRate.upsert({
      where: {
        country_carrier_minWeightG_maxWeightG: {
          country: rate.country,
          carrier: rate.carrier,
          minWeightG: rate.minWeightG,
          maxWeightG: rate.maxWeightG,
        },
      },
      update: {
        priceCents: rate.priceCents,
        freeAboveCents: rate.freeAboveCents,
        etaMinDays: rate.etaMinDays,
        etaMaxDays: rate.etaMaxDays,
        active: true,
      },
      create: { ...rate },
    });
  }
  console.log(`  ✔ ${rates.length} tarifs de livraison (FR + DE)`);
}

async function seedCategories() {
  const ids = new Map<string, string>();

  for (const cat of CATEGORIES) {
    const category = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { position: cat.position, icon: cat.icon },
      create: { slug: cat.slug, position: cat.position, icon: cat.icon },
    });

    for (const locale of ['fr', 'de'] as const) {
      const t = cat[locale];
      await prisma.categoryTranslation.upsert({
        where: { categoryId_locale: { categoryId: category.id, locale } },
        update: { name: t.name, slug: t.slug, description: t.description, metaTitle: t.metaTitle, metaDescription: t.metaDescription },
        create: { categoryId: category.id, locale, name: t.name, slug: t.slug, description: t.description, metaTitle: t.metaTitle, metaDescription: t.metaDescription },
      });
    }

    ids.set(cat.slug, category.id);
  }

  console.log(`  ✔ ${CATEGORIES.length} catégories (fr + de)`);
  return ids;
}

async function seedProduct(seed: ProductSeed, categoryIds: Map<string, string>) {
  const categoryId = categoryIds.get(seed.categorySlug);
  if (!categoryId) throw new Error(`Catégorie inconnue : ${seed.categorySlug}`);

  const existing = await prisma.product.findUnique({ where: { sku: seed.sku } });

  const scalars = {
    slug: seed.slug,
    categoryId,
    brand: seed.brand,
    model: seed.model,
    condition: seed.condition,
    conditionGrade: seed.conditionGrade ?? null,
    priceCents: seed.priceCents,
    compareAtCents: seed.compareAtCents ?? null,
    vatMode: seed.vatMode ?? 'STANDARD',
    vatRateBps: seed.vatRateBps ?? 2000,
    lowStockAlert: seed.lowStockAlert ?? 1,
    weightGrams: seed.weightGrams,
    status: 'PUBLISHED' as const,
    isFeatured: seed.isFeatured ?? false,
    isUnique: seed.isUnique ?? false,
    publishedAt: existing?.publishedAt ?? new Date(),
  };

  const product = existing
    ? await prisma.product.update({ where: { sku: seed.sku }, data: scalars })
    : await prisma.product.create({ data: { sku: seed.sku, stock: seed.stock, ...scalars } });

  // Mouvement de stock initial uniquement à la création : on ne réécrit jamais
  // un inventaire déjà géré depuis le back-office.
  if (!existing && seed.stock > 0) {
    await prisma.stockMovement.create({
      data: {
        productId: product.id,
        delta: seed.stock,
        stockAfter: seed.stock,
        reason: 'INITIAL',
        note: 'Stock initial (seed)',
      },
    });
  }

  for (const locale of ['fr', 'de'] as const) {
    const t = seed[locale];
    const data = {
      name: t.name,
      slug: t.slug,
      shortDescription: t.shortDescription,
      description: t.description,
      conditionNote: t.conditionNote ?? null,
      metaTitle: t.metaTitle,
      metaDescription: t.metaDescription,
    };
    await prisma.productTranslation.upsert({
      where: { productId_locale: { productId: product.id, locale } },
      update: data,
      create: { productId: product.id, locale, ...data },
    });
  }

  // Images et specs sont remplacées en bloc : le fichier seed fait autorité.
  await prisma.productImage.deleteMany({ where: { productId: product.id } });
  await prisma.productImage.createMany({
    data: seed.images.map((img, i) => ({
      productId: product.id,
      url: img.url,
      altFr: img.altFr,
      altDe: img.altDe,
      position: i,
    })),
  });

  await prisma.productSpec.deleteMany({ where: { productId: product.id } });
  await prisma.productSpec.createMany({
    data: (['fr', 'de'] as const).flatMap((locale) =>
      seed.specs[locale].map(([label, value], i) => ({
        productId: product.id,
        locale,
        label,
        value,
        position: i,
      })),
    ),
  });

  return product;
}

async function main() {
  console.log('\nSeed Voltaris\n' + '─'.repeat(40));

  await seedAdmin();
  await seedShippingRates();
  const categoryIds = await seedCategories();

  for (const seed of USED_PRODUCTS) {
    await seedProduct(seed, categoryIds);
  }
  console.log(`  ✔ ${USED_PRODUCTS.length} produits d'occasion (stock réel)`);

  for (const seed of NEW_PRODUCTS) {
    await seedProduct(seed, categoryIds);
  }
  console.log(`  ✔ ${NEW_PRODUCTS.length} produits neufs (catalogue)`);

  console.log('─'.repeat(40));
  console.log(`Connexion admin : ${ADMIN_EMAIL}`);
  if (ADMIN_PASSWORD === DEFAULT_ADMIN_PASSWORD) {
    console.log('⚠️  Mot de passe admin par défaut — changez-le avant la mise en production.');
  }
  console.log('');
}

/**
 * Avec --if-empty, n'amorce que si la base ne contient encore aucune
 * catégorie. C'est le mode utilisé au démarrage du service : un
 * redéploiement ne doit pas rejouer le seed sur une boutique en activité,
 * mais une base fraîchement provisionnée doit se remplir sans intervention.
 *
 * Sans le drapeau, le seed s'exécute toujours : c'est ce qu'on veut quand
 * on le lance à la main avec npm run db:seed.
 */
async function shouldRun(): Promise<boolean> {
  if (!process.argv.includes('--if-empty')) return true;

  // Échappatoire pour pousser une mise à jour du catalogue (nouvelle
  // catégorie, nouvelle référence) sur une base déjà remplie : on pose
  // SEED_FORCE=1 dans les variables du service, on redéploie, on la retire.
  //
  // Le seed procède par upsert, donc rejouer n'efface rien — mais il réécrit
  // prix et stocks avec les valeurs du dépôt. À n'utiliser que tant que les
  // ajustements se font ici et non depuis le back-office.
  if (process.env.SEED_FORCE === '1') {
    console.log('SEED_FORCE=1 : le catalogue du dépôt est réappliqué.');
    return true;
  }

  const categories = await prisma.category.count();
  if (categories > 0) {
    console.log(`Seed ignoré : la base contient déjà ${categories} catégories.`);
    return false;
  }
  console.log('Base vide : amorçage initial.');
  return true;
}

shouldRun()
  .then((run) => (run ? main() : undefined))
  .catch((err) => {
    console.error('\nÉchec du seed :', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
