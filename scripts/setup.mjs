#!/usr/bin/env node
/**
 * Installation locale de Stihl Market, de bout en bout.
 *
 *   node scripts/setup.mjs
 *
 * Étapes : contrôle des prérequis, génération des .env avec des secrets
 * aléatoires, installation des dépendances, démarrage de PostgreSQL,
 * migrations, seed et génération des visuels.
 *
 * Le script est idempotent : un .env existant n'est jamais écrasé.
 */
import { execSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BACKEND = resolve(ROOT, 'backend');
const FRONTEND = resolve(ROOT, 'frontend');

const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

let step = 0;
const total = 7;

const title = (msg) => console.log(`\n${c.cyan}${c.bold}[${++step}/${total}] ${msg}${c.reset}`);
const ok = (msg) => console.log(`  ${c.green}✔${c.reset} ${msg}`);
const warn = (msg) => console.log(`  ${c.yellow}!${c.reset} ${msg}`);
const info = (msg) => console.log(`  ${c.dim}${msg}${c.reset}`);
const fail = (msg) => {
  console.error(`\n${c.red}✖ ${msg}${c.reset}\n`);
  process.exit(1);
};

function run(command, cwd = ROOT, allowFailure = false) {
  const result = spawnSync(command, { cwd, shell: true, stdio: 'inherit' });
  if (result.status !== 0 && !allowFailure) {
    fail(`Échec de la commande : ${command}`);
  }
  return result.status === 0;
}

function has(command) {
  try {
    execSync(command, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

const secret = () => randomBytes(48).toString('base64');

/** Copie .env.example vers .env en remplaçant les valeurs indiquées. */
function writeEnv(dir, replacements = {}) {
  const target = resolve(dir, '.env');
  if (existsSync(target)) {
    warn(`.env déjà présent dans ${dir.replace(ROOT, '.')} — laissé intact`);
    return false;
  }

  const example = resolve(dir, '.env.example');
  if (!existsSync(example)) fail(`.env.example introuvable dans ${dir}`);

  let content = readFileSync(example, 'utf8');
  for (const [key, value] of Object.entries(replacements)) {
    // Remplace la ligne KEY=… quelle que soit sa valeur d'exemple.
    content = content.replace(new RegExp(`^${key}=.*$`, 'm'), `${key}="${value}"`);
  }
  writeFileSync(target, content, 'utf8');
  ok(`.env créé dans ${dir.replace(ROOT, '.')}`);
  return true;
}

// ---------------------------------------------------------------- exécution

console.log(`\n${c.bold}Stihl Market — installation locale${c.reset}`);
console.log(`${c.dim}${ROOT}${c.reset}`);

title('Vérification des prérequis');
{
  const nodeMajor = Number(process.versions.node.split('.')[0]);
  if (nodeMajor < 20) fail(`Node.js 20 ou supérieur est requis (détecté : ${process.versions.node}).`);
  ok(`Node.js ${process.versions.node}`);

  if (!has('npm --version')) fail('npm est introuvable dans le PATH.');
  ok('npm disponible');

  if (has('docker --version')) {
    ok('Docker disponible');
  } else {
    warn('Docker introuvable — vous devrez fournir vous-même une base PostgreSQL.');
    warn('Renseignez DATABASE_URL dans backend/.env avant de relancer.');
  }
}

title('Génération des fichiers .env');
{
  // docker-compose publie PostgreSQL sur POSTGRES_PORT (5432 par défaut).
  // Sur une machine où ce port est déjà pris, le .env de la racine le
  // redéfinit : DATABASE_URL doit alors pointer sur le même port.
  const dbPort = readRootPort();
  if (dbPort !== '5432') info(`PostgreSQL sera publié sur le port ${dbPort} (défini à la racine).`);

  writeEnv(BACKEND, {
    JWT_ACCESS_SECRET: secret(),
    JWT_REFRESH_SECRET: secret(),
    DATABASE_URL: `postgresql://stihl:stihl@localhost:${dbPort}/stihl_market?schema=public`,
  });
  writeEnv(FRONTEND);
}

function readRootPort() {
  const rootEnv = resolve(ROOT, '.env');
  if (!existsSync(rootEnv)) return '5432';
  return readFileSync(rootEnv, 'utf8').match(/^POSTGRES_PORT\s*=\s*(\d+)/m)?.[1] ?? '5432';
}

title('Installation des dépendances du backend');
run('npm install', BACKEND);
ok('Dépendances backend installées');

title('Installation des dépendances du frontend');
run('npm install', FRONTEND);
ok('Dépendances frontend installées');

title('Démarrage de PostgreSQL');
{
  if (has('docker --version')) {
    run('docker compose up -d', ROOT);
    info('Attente de la disponibilité de la base…');

    // Le conteneur répond avant que Postgres n'accepte les connexions :
    // on interroge pg_isready plutôt que d'attendre une durée fixe.
    let ready = false;
    for (let attempt = 0; attempt < 30; attempt++) {
      ready = spawnSync(
        'docker compose exec -T postgres pg_isready -U stihl -d stihl_market',
        { cwd: ROOT, shell: true, stdio: 'ignore' },
      ).status === 0;
      if (ready) break;
      execSync(process.platform === 'win32' ? 'timeout /t 1 /nobreak >nul' : 'sleep 1', {
        shell: true,
        stdio: 'ignore',
      });
    }

    if (!ready) fail("PostgreSQL n'a pas démarré dans le délai imparti. Vérifiez `docker compose logs postgres`.");
    ok('PostgreSQL prêt sur le port 5432');
  } else {
    warn('Étape ignorée (Docker absent).');
  }
}

title('Migrations et génération du client Prisma');
run('npx prisma migrate dev --name init', BACKEND);
ok('Schéma appliqué');

title('Chargement des données et génération des visuels');
run('npm run db:seed', BACKEND);
run('node scripts/generate-placeholders.mjs', ROOT);
ok('Catalogue initialisé');

// ---------------------------------------------------------------- résumé

const adminPassword =
  readFileSync(resolve(BACKEND, '.env'), 'utf8').match(/^ADMIN_PASSWORD="?(.+?)"?$/m)?.[1] ??
  'ChangeMoi!2026';
const adminEmail =
  readFileSync(resolve(BACKEND, '.env'), 'utf8').match(/^ADMIN_EMAIL="?(.+?)"?$/m)?.[1] ??
  'admin@stihl-market.eu';

console.log(`
${c.green}${c.bold}Installation terminée.${c.reset}

  ${c.bold}Démarrer :${c.reset}      npm run dev
  ${c.bold}Boutique :${c.reset}      http://localhost:3000/fr
  ${c.bold}Shop (DE) :${c.reset}     http://localhost:3000/de
  ${c.bold}Back-office :${c.reset}   http://localhost:3000/fr/admin
  ${c.bold}API :${c.reset}           http://localhost:4000/health

  ${c.bold}Connexion admin :${c.reset} ${adminEmail} / ${adminPassword}
  ${c.yellow}Changez ce mot de passe avant toute mise en ligne.${c.reset}

  ${c.dim}Paiement carte : renseignez STRIPE_SECRET_KEY dans backend/.env et
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY dans frontend/.env, puis relancez.
  Sans ces clés, seul le virement SEPA est proposé — c'est volontaire.${c.reset}
`);
