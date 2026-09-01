#!/usr/bin/env node
/**
 * Test de bout en bout de l'import CAMT.053.
 *
 *   node scripts/test-camt053.mjs
 *
 * Crée deux commandes par virement, fabrique un relevé bancaire couvrant les
 * cas réels (paiement exact, montant erroné, libellé sans référence, débit,
 * doublon), puis vérifie que l'import se comporte comme prévu.
 *
 * Écrit aussi un exemple de relevé dans scripts/fixtures/ pour vos propres
 * essais depuis le back-office.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const API = process.env.API_URL ?? 'http://localhost:4000';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@stihl-market.eu';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'ChangeMoi!2026';

const c = { reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m', red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m' };

let token = null;
let failures = 0;

async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(API + path, { ...options, headers });
  const body = await response.json().catch(() => null);
  return { status: response.status, body };
}

function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures++;
  const mark = ok ? `${c.green}✔${c.reset}` : `${c.red}✖${c.reset}`;
  const detail = ok ? `${c.dim}${JSON.stringify(actual)}${c.reset}` : `${c.red}obtenu ${JSON.stringify(actual)}, attendu ${JSON.stringify(expected)}${c.reset}`;
  console.log(`  ${mark} ${label.padEnd(46)} ${detail}`);
}

/** Écriture au format CAMT.053. */
function entry({ amount, date, debtor, iban, remittance, direction = 'CRDT', ref }) {
  return `      <Ntry>
        <NtryRef>${ref}</NtryRef>
        <Amt Ccy="EUR">${amount}</Amt>
        <CdtDbtInd>${direction}</CdtDbtInd>
        <Sts>BOOK</Sts>
        <BookgDt><Dt>${date}</Dt></BookgDt>
        <ValDt><Dt>${date}</Dt></ValDt>
        <AcctSvcrRef>${ref}</AcctSvcrRef>
        <NtryDtls>
          <TxDtls>
            <Refs><EndToEndId>NOTPROVIDED</EndToEndId></Refs>
            <RltdPties>
              <Dbtr><Nm>${debtor}</Nm></Dbtr>
              <DbtrAcct><Id><IBAN>${iban}</IBAN></Id></DbtrAcct>
            </RltdPties>
            <RmtInf><Ustrd>${remittance}</Ustrd></RmtInf>
          </TxDtls>
        </NtryDtls>
      </Ntry>`;
}

function statement(entries) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:camt.053.001.02">
  <BkToCstmrStmt>
    <GrpHdr>
      <MsgId>STIHLMARKET-TEST-001</MsgId>
      <CreDtTm>2026-09-03T06:00:00</CreDtTm>
    </GrpHdr>
    <Stmt>
      <Id>REL-2026-09-02</Id>
      <CreDtTm>2026-09-03T06:00:00</CreDtTm>
      <Acct>
        <Id><IBAN>FR7630001007941234567890185</IBAN></Id>
        <Ccy>EUR</Ccy>
      </Acct>
      <FrToDt>
        <FrDtTm>2026-09-02T00:00:00</FrDtTm>
        <ToDtTm>2026-09-02T23:59:59</ToDtTm>
      </FrToDt>
      <Bal>
        <Tp><CdOrPrtry><Cd>CLBD</Cd></CdOrPrtry></Tp>
        <Amt Ccy="EUR">12450.00</Amt>
        <CdtDbtInd>CRDT</CdtDbtInd>
        <Dt><Dt>2026-09-02</Dt></Dt>
      </Bal>
${entries.join('\n')}
    </Stmt>
  </BkToCstmrStmt>
</Document>
`;
}

async function upload(xml, { dryRun, fileName = 'releve-test.xml' }) {
  const response = await fetch(
    `${API}/api/admin/bank/statements?fileName=${encodeURIComponent(fileName)}&dryRun=${dryRun}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/xml', Authorization: `Bearer ${token}` },
      body: xml,
    },
  );
  const body = await response.json().catch(() => null);
  return { status: response.status, report: body?.report, error: body?.error };
}

async function main() {
  console.log(`\n${c.bold}Import CAMT.053 — test de bout en bout${c.reset}\n`);

  // ---- connexion administrateur
  const login = await api('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  if (login.status !== 200) {
    console.error(`${c.red}Connexion admin impossible (${login.status}).${c.reset}`);
    process.exit(1);
  }
  token = login.body.accessToken;

  // ---- deux commandes par virement
  const catalogue = await api('/api/catalog/products?locale=fr&perPage=48');
  const inStock = catalogue.body.items.filter((p) => p.inStock);
  const [a, b] = [inStock.find((p) => p.condition !== 'NEW'), inStock.find((p) => p.condition === 'NEW')];

  const address = {
    firstName: 'Marie', lastName: 'Leroy', line1: '8 chemin du Moulin',
    postalCode: '67000', city: 'Strasbourg', country: 'FR',
  };
  const makeOrder = async (product, email) =>
    (await api('/api/checkout/orders', {
      method: 'POST',
      body: JSON.stringify({
        items: [{ productId: product.id, quantity: 1 }],
        email, locale: 'fr', shippingAddress: address,
        paymentMethod: 'BANK_TRANSFER', acceptTerms: true,
      }),
    })).body;

  const exact = await makeOrder(a, 'marie.leroy@example.com');
  const short = await makeOrder(b, 'paul.martin@example.com');

  console.log(`${c.bold}Commandes de test${c.reset}`);
  console.log(`  ${exact.order.orderNumber} — ${exact.order.totalCents / 100} € — réf ${exact.payment.instructions.reference}`);
  console.log(`  ${short.order.orderNumber} — ${short.order.totalCents / 100} € — réf ${short.payment.instructions.reference}\n`);

  // ---- relevé couvrant les cas réels
  const entries = [
    // 1. paiement exact, référence propre
    entry({ amount: (exact.order.totalCents / 100).toFixed(2), date: '2026-09-02',
      debtor: 'MARIE LEROY', iban: 'FR7630006000011234567890189',
      remittance: `VIREMENT ${exact.payment.instructions.reference}`, ref: 'BQ-0001' }),
    // 2. bonne référence, tirets supprimés par la banque, montant insuffisant
    entry({ amount: ((short.order.totalCents - 5000) / 100).toFixed(2), date: '2026-09-02',
      debtor: 'PAUL MARTIN', iban: 'FR7630004000031234567890147',
      remittance: `ACOMPTE ${short.payment.instructions.reference.replace('-', '')}`, ref: 'BQ-0002' }),
    // 3. aucune référence exploitable
    entry({ amount: '250.00', date: '2026-09-02', debtor: 'ENTREPRISE DUBOIS',
      iban: 'FR7630002000051234567890112', remittance: 'REGLEMENT FACTURE', ref: 'BQ-0003' }),
    // 4. débit : doit être ignoré
    entry({ amount: '89.00', date: '2026-09-02', debtor: 'DPD FRANCE',
      iban: 'FR7630003000041234567890175', remittance: 'FRAIS TRANSPORT',
      direction: 'DBIT', ref: 'BQ-0004' }),
  ];
  const xml = statement(entries);

  mkdirSync(resolve(ROOT, 'scripts/fixtures'), { recursive: true });
  writeFileSync(resolve(ROOT, 'scripts/fixtures/exemple-camt053.xml'), xml, 'utf8');

  // ---- simulation
  console.log(`${c.bold}Simulation${c.reset}`);
  const preview = await upload(xml, { dryRun: true });
  check('statut HTTP', preview.status, 200);
  check('rien écrit (dryRun)', preview.report.dryRun, true);
  check('crédits lus', preview.report.totals.credits, 3);
  check('débits ignorés', preview.report.totals.debitsIgnored, 1);
  check('rapprochées', preview.report.totals.matched, 1);
  check('montant différent', preview.report.totals.amountMismatch, 1);
  check('non rapprochées', preview.report.totals.unmatched, 1);

  const beforeStatus = (await api(`/api/admin/orders/${exact.order.orderNumber}`)).body.order.paymentStatus;
  check('commande encore impayée après simulation', beforeStatus, 'AWAITING_TRANSFER');

  // ---- import réel
  console.log(`\n${c.bold}Import${c.reset}`);
  const real = await upload(xml, { dryRun: false });
  check('statut HTTP', real.status, 201);
  check('rapprochées', real.report.totals.matched, 1);
  check('montant encaissé', real.report.totals.collectedCents, exact.order.totalCents);

  const paid = (await api(`/api/admin/orders/${exact.order.orderNumber}`)).body.order;
  check('commande payée', [paid.status, paid.paymentStatus], ['PAID', 'SUCCEEDED']);

  const unpaid = (await api(`/api/admin/orders/${short.order.orderNumber}`)).body.order;
  check('commande sous-payée non encaissée', unpaid.paymentStatus, 'AWAITING_TRANSFER');

  // ---- rejeu du même fichier
  console.log(`\n${c.bold}Rejeu du même relevé${c.reset}`);
  const replay = await upload(xml, { dryRun: true });
  check('écritures vues comme doublons', replay.report.totals.duplicates, 3);
  check('aucun nouvel encaissement', replay.report.totals.matched, 0);

  // ---- reprise manuelle
  console.log(`\n${c.bold}Rattachement manuel${c.reset}`);
  const pending = (await api('/api/admin/bank/entries/pending')).body.entries;
  check('écritures en attente', pending.length, 2);

  const orphan = pending.find((e) => e.status === 'UNMATCHED');
  const matched = await api(`/api/admin/bank/entries/${orphan.id}/match`, {
    method: 'POST',
    body: JSON.stringify({ orderNumber: short.order.orderNumber }),
  });
  check('rattachement accepté', matched.status, 200);

  const rescued = (await api(`/api/admin/orders/${short.order.orderNumber}`)).body.order;
  check('commande encaissée à la main', rescued.paymentStatus, 'SUCCEEDED');

  // ---- fichier invalide
  console.log(`\n${c.bold}Robustesse${c.reset}`);
  const notXml = await upload('ceci n est pas du xml', { dryRun: true });
  check('fichier non XML refusé', notXml.error?.code, 'NOT_CAMT053');

  const wrongSchema = await upload('<?xml version="1.0"?><Autre><Chose/></Autre>', { dryRun: true });
  check('XML hors CAMT.053 refusé', wrongSchema.error?.code, 'NOT_CAMT053');

  // ---- verdict
  console.log('');
  if (failures === 0) {
    console.log(`${c.green}${c.bold}Tous les contrôles passent.${c.reset}`);
    console.log(`${c.dim}Relevé d'exemple écrit dans scripts/fixtures/exemple-camt053.xml${c.reset}\n`);
  } else {
    console.log(`${c.red}${c.bold}${failures} contrôle(s) en échec.${c.reset}\n`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(`\n${c.red}Échec du test :${c.reset}`, err);
  process.exit(1);
});
