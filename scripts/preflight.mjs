#!/usr/bin/env node
/**
 * Contrôle avant mise en production.
 *
 *   node scripts/preflight.mjs
 *
 * Vérifie ce qui casse réellement une boutique le jour de l'ouverture :
 * secrets par défaut laissés en place, coordonnées bancaires de démonstration,
 * mentions légales non renseignées, build cassé.
 *
 * Sortie 0 si tout est prêt, 1 s'il reste des points bloquants.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
};

const blockers = [];
const warnings = [];

const block = (msg, fix) => blockers.push({ msg, fix });
const warn = (msg, fix) => warnings.push({ msg, fix });

/**
 * Clé de contrôle IBAN (ISO 13616, modulo 97).
 * Dupliqué depuis backend/src/services/sepa-qr.service.ts : ce script doit
 * pouvoir tourner sans que le backend soit compilé ni ses dépendances installées.
 */
function isValidIban(input) {
  const value = String(input).replace(/[\s-]/g, '').toUpperCase();
  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]{10,30}$/.test(value)) return false;

  const rearranged = value.slice(4) + value.slice(0, 4);
  const numeric = rearranged.replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));

  let remainder = 0;
  for (const digit of numeric) remainder = (remainder * 10 + Number(digit)) % 97;
  return remainder === 1;
}

function readEnv(path) {
  if (!existsSync(path)) return null;
  const env = {};
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (match) env[match[1]] = match[2].trim().replace(/^["']|["']$/g, '');
  }
  return env;
}

// ------------------------------------------------------------------ backend

const backendEnv = readEnv(resolve(ROOT, 'backend/.env'));

if (!backendEnv) {
  block('backend/.env est absent.', 'Lancez `npm run setup`, ou copiez backend/.env.example.');
} else {
  if (backendEnv.NODE_ENV !== 'production') {
    warn(
      `backend NODE_ENV = "${backendEnv.NODE_ENV ?? 'non défini'}".`,
      'Sur Railway, définissez NODE_ENV=production dans les variables du service.',
    );
  }

  for (const key of ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET']) {
    const value = backendEnv[key] ?? '';
    if (!value || value.includes('remplacez-moi') || value.length < 32) {
      block(
        `${key} n'est pas un secret valide.`,
        'Générez-le avec : openssl rand -base64 48',
      );
    }
  }

  if (backendEnv.JWT_ACCESS_SECRET && backendEnv.JWT_ACCESS_SECRET === backendEnv.JWT_REFRESH_SECRET) {
    block(
      'JWT_ACCESS_SECRET et JWT_REFRESH_SECRET sont identiques.',
      'Un jeton de rafraîchissement pourrait alors servir de jeton d\'accès. Utilisez deux valeurs distinctes.',
    );
  }

  if (backendEnv.ADMIN_PASSWORD === 'ChangeMoi!2026' || !backendEnv.ADMIN_PASSWORD) {
    block(
      'Le mot de passe administrateur est celui par défaut.',
      'Changez ADMIN_PASSWORD puis relancez le seed, ou modifiez le mot de passe depuis le compte.',
    );
  }

  if (backendEnv.BANK_IBAN?.startsWith('FR7630001007941234567890185')) {
    block(
      "L'IBAN est celui de démonstration.",
      'Renseignez BANK_IBAN, BANK_BIC, BANK_NAME et BANK_ACCOUNT_HOLDER : ces coordonnées sont affichées aux clients.',
    );
  } else if (backendEnv.BANK_IBAN && !isValidIban(backendEnv.BANK_IBAN)) {
    block(
      `BANK_IBAN a une clé de contrôle invalide : ${backendEnv.BANK_IBAN}`,
      "Vérifiez la saisie. Un IBAN erroné produit un code QR qui envoie l'argent ailleurs, sans message d'erreur pour le client.",
    );
  }

  if (!backendEnv.STRIPE_SECRET_KEY) {
    warn(
      'STRIPE_SECRET_KEY est vide : le paiement par carte sera masqué.',
      'Volontaire si vous ne vendez qu\'en virement. Sinon, ajoutez la clé sk_live_… et le webhook.',
    );
  } else {
    if (backendEnv.STRIPE_SECRET_KEY.startsWith('sk_test_')) {
      warn('Stripe est en mode test (sk_test_…).', 'Passez en clé live avant l\'ouverture.');
    }
    if (!backendEnv.STRIPE_WEBHOOK_SECRET) {
      block(
        'STRIPE_WEBHOOK_SECRET est absent alors que Stripe est actif.',
        'Sans webhook, aucune commande carte ne passera au statut payé. Créez le endpoint sur /api/webhooks/stripe.',
      );
    }
  }

  if (backendEnv.CORS_ORIGINS?.includes('localhost')) {
    warn(
      'CORS_ORIGINS contient encore localhost.',
      'En production, listez uniquement votre domaine Vercel et votre domaine final.',
    );
  }
}

// ----------------------------------------------------------------- frontend

const frontendEnv = readEnv(resolve(ROOT, 'frontend/.env'));

if (!frontendEnv) {
  warn(
    'frontend/.env est absent.',
    'Normal si les variables sont définies directement dans Vercel.',
  );
} else {
  if (frontendEnv.NEXT_PUBLIC_ENV !== 'production') {
    warn(
      `NEXT_PUBLIC_ENV = "${frontendEnv.NEXT_PUBLIC_ENV ?? 'non défini'}" : robots.txt bloque toute indexation.`,
      'Mettez NEXT_PUBLIC_ENV=production sur l\'environnement de production Vercel — et laissez-le tel quel en préproduction.',
    );
  }

  if (!frontendEnv.NEXT_PUBLIC_SITE_URL || frontendEnv.NEXT_PUBLIC_SITE_URL.includes('localhost')) {
    block(
      'NEXT_PUBLIC_SITE_URL pointe encore sur localhost.',
      'Cette valeur alimente les balises canonical, hreflang et le sitemap : elle doit être votre domaine public.',
    );
  }

  if (frontendEnv.NEXT_PUBLIC_API_URL?.includes('localhost')) {
    block(
      'NEXT_PUBLIC_API_URL pointe sur localhost.',
      'Renseignez l\'URL publique de votre service Railway.',
    );
  }

  const stripePk = frontendEnv.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  const stripeSk = backendEnv?.STRIPE_SECRET_KEY;
  if (Boolean(stripePk) !== Boolean(stripeSk)) {
    block(
      'Les clés Stripe ne sont configurées que d\'un seul côté.',
      'Renseignez la clé publique côté frontend ET la clé secrète côté backend, ou aucune des deux.',
    );
  }
  if (stripePk && stripeSk) {
    const pkLive = stripePk.startsWith('pk_live_');
    const skLive = stripeSk.startsWith('sk_live_');
    if (pkLive !== skLive) {
      block(
        'Les clés Stripe mélangent les modes test et live.',
        'Les deux clés doivent appartenir au même mode, sinon le paiement échoue systématiquement.',
      );
    }
  }
}

// -------------------------------------------------- contenu légal à compléter

const companyFile = resolve(ROOT, 'frontend/src/config/company.ts');
if (existsSync(companyFile)) {
  const source = readFileSync(companyFile, 'utf8');

  // Les champs obligatoires sont ceux du tableau REQUIRED ; ils sont réputés
  // non renseignés tant qu'ils valent la chaîne vide dans l'objet COMPANY.
  const required = [
    'legalName', 'legalForm', 'line1', 'postalCode', 'city',
    'registrationNumber', 'registry', 'vatNumber',
    'publicationDirector', 'email', 'phone', 'jurisdiction',
  ];

  const empty = required.filter((field) =>
    new RegExp(`^\\s*${field}:\\s*''\\s*,`, 'm').test(source),
  );

  if (empty.length) {
    block(
      `${empty.length} donnée(s) de société non renseignée(s) : ${empty.slice(0, 6).join(', ')}${empty.length > 6 ? '…' : ''}`,
      "Complétez frontend/src/config/company.ts. Les mentions légales sont obligatoires en France (art. 6 III LCEN) et en Allemagne (§ 5 DDG), et Google Merchant Center les exige pour valider la boutique.",
    );
  }
}

// ------------------------------------------- référencement et Merchant Center

{
  // Google Merchant Center refuse le SVG et interdit les visuels de
  // remplacement : un produit sans photographie ne peut pas être diffusé.
  const seedFile = resolve(ROOT, 'backend/prisma/seed-data/products-new.ts');
  if (existsSync(seedFile)) {
    // On ne compte que les valeurs assignées, pas la déclaration du type.
    const placeholders = (readFileSync(seedFile, 'utf8').match(/placeholder: '/g) ?? []).length;
    if (placeholders > 0) {
      warn(
        `${placeholders} produit(s) neufs utilisent encore un visuel provisoire.`,
        'Ils restent visibles sur la boutique mais sont exclus du flux Google Merchant Center — Google rejette le SVG et les images de remplacement. Importez vos photos : npm run photos',
      );
    }
  }

  if (frontendEnv?.NEXT_PUBLIC_SITE_URL && !frontendEnv.NEXT_PUBLIC_SITE_URL.startsWith('https://')) {
    block(
      'NEXT_PUBLIC_SITE_URL n\'est pas en HTTPS.',
      'Google Merchant Center et les balises canonical exigent une origine HTTPS.',
    );
  }
}

// ------------------------------------------------------------------- rapport

console.log(`\n${c.bold}Contrôle avant mise en production${c.reset}\n`);

if (!blockers.length && !warnings.length) {
  console.log(`${c.green}Aucun point bloquant détecté.${c.reset}\n`);
  process.exit(0);
}

if (blockers.length) {
  console.log(`${c.red}${c.bold}Bloquant (${blockers.length})${c.reset}`);
  for (const { msg, fix } of blockers) {
    console.log(`  ${c.red}✖${c.reset} ${msg}`);
    console.log(`    ${c.dim}→ ${fix}${c.reset}`);
  }
  console.log('');
}

if (warnings.length) {
  console.log(`${c.yellow}${c.bold}À vérifier (${warnings.length})${c.reset}`);
  for (const { msg, fix } of warnings) {
    console.log(`  ${c.yellow}!${c.reset} ${msg}`);
    console.log(`    ${c.dim}→ ${fix}${c.reset}`);
  }
  console.log('');
}

process.exit(blockers.length ? 1 : 0);
