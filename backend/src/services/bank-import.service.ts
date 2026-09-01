import crypto from 'node:crypto';
import { XMLParser } from 'fast-xml-parser';
import type { BankEntryStatus, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';
import { ApiError } from '../lib/errors.js';
import * as orderService from './order.service.js';

/**
 * Import de relevés bancaires au format CAMT.053 (ISO 20022).
 *
 * Toutes les banques européennes exportent ce format. Le fichier est déposé
 * depuis le back-office : les écritures au crédit sont extraites, la référence
 * de commande est retrouvée dans le libellé, et les commandes dont le montant
 * concorde exactement passent en « payée ».
 *
 * Ce qui reste volontairement manuel : un montant qui ne correspond pas, ou un
 * libellé sans référence exploitable. Encaisser automatiquement un virement
 * incomplet reviendrait à expédier une machine à moitié payée.
 */

// ------------------------------------------------------------------ parsing

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@',
  // Les banques préfixent les balises différemment (ns2:Ntry, Doc:Ntry…).
  removeNSPrefix: true,
  parseTagValue: false, // on garde les montants en texte pour éviter les arrondis
  trimValues: true,
});

export interface ParsedEntry {
  bankReference: string | null;
  amountCents: number;
  currency: string;
  bookedAt: Date;
  valueDate: Date | null;
  debtorName: string | null;
  debtorIban: string | null;
  remittance: string | null;
}

export interface ParsedStatement {
  externalId: string | null;
  accountIban: string | null;
  fromDate: Date | null;
  toDate: Date | null;
  credits: ParsedEntry[];
  /** Écritures au débit rencontrées : comptées pour le rapport, non stockées. */
  debitCount: number;
}

/** Ramène une valeur XML éventuellement absente ou répétée à un tableau. */
function toArray<T>(value: T | T[] | undefined | null): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

/** Extrait le texte d'un nœud, qu'il soit une chaîne ou un objet à attributs. */
function text(node: unknown): string | null {
  if (node == null) return null;
  if (typeof node === 'string') return node.trim() || null;
  if (typeof node === 'number') return String(node);
  if (typeof node === 'object' && '#text' in (node as Record<string, unknown>)) {
    const value = (node as Record<string, unknown>)['#text'];
    return value == null ? null : String(value).trim() || null;
  }
  return null;
}

function parseDate(node: unknown): Date | null {
  // <BookgDt> contient soit <Dt> (date seule) soit <DtTm> (horodatage).
  const raw =
    text((node as Record<string, unknown>)?.Dt) ??
    text((node as Record<string, unknown>)?.DtTm) ??
    text(node);
  if (!raw) return null;
  const date = new Date(raw.length === 10 ? `${raw}T00:00:00Z` : raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Convertit un montant décimal ISO 20022 ("423.90") en centimes. */
function toCents(raw: string | null): number | null {
  if (!raw) return null;
  const normalized = raw.replace(',', '.').trim();
  if (!/^-?\d+(\.\d{1,4})?$/.test(normalized)) return null;
  return Math.round(Number(normalized) * 100);
}

/** Rassemble tous les libellés d'une écriture : structurés, libres et complément. */
function collectRemittance(entry: Record<string, any>, txDetails: Record<string, any>[]): string | null {
  const parts: string[] = [];

  for (const tx of txDetails) {
    const info = tx?.RmtInf;
    if (!info) continue;

    for (const unstructured of toArray(info.Ustrd)) {
      const value = text(unstructured);
      if (value) parts.push(value);
    }

    for (const structured of toArray(info.Strd)) {
      const ref = text(structured?.CdtrRefInf?.Ref);
      if (ref) parts.push(ref);
      for (const additional of toArray(structured?.AddtlRmtInf)) {
        const value = text(additional);
        if (value) parts.push(value);
      }
    }

    const endToEnd = text(tx?.Refs?.EndToEndId);
    // « NOTPROVIDED » est la valeur de remplissage normalisée : sans intérêt.
    if (endToEnd && endToEnd.toUpperCase() !== 'NOTPROVIDED') parts.push(endToEnd);
  }

  // Certaines banques ne remplissent que ce champ de complément.
  const additional = text(entry?.AddtlNtryInf);
  if (additional) parts.push(additional);

  const joined = [...new Set(parts)].join(' ').trim();
  return joined || null;
}

export function parseCamt053(xml: string): ParsedStatement[] {
  let document: Record<string, any>;
  try {
    document = parser.parse(xml);
  } catch (err) {
    throw ApiError.badRequest(
      "Le fichier n'est pas un XML valide.",
      'INVALID_XML',
      { detail: (err as Error).message },
    );
  }

  const root = document?.Document?.BkToCstmrStmt;
  if (!root) {
    throw ApiError.badRequest(
      "Ce fichier n'est pas un relevé CAMT.053. Attendu : Document/BkToCstmrStmt.",
      'NOT_CAMT053',
    );
  }

  const statements: ParsedStatement[] = [];

  for (const stmt of toArray<Record<string, any>>(root.Stmt)) {
    const credits: ParsedEntry[] = [];
    let debitCount = 0;

    for (const entry of toArray<Record<string, any>>(stmt.Ntry)) {
      const direction = text(entry.CdtDbtInd);
      if (direction !== 'CRDT') {
        debitCount++;
        continue;
      }

      // Une écriture non comptabilisée peut encore être annulée : on l'ignore.
      const status = text(entry.Sts) ?? text(entry.Sts?.Cd);
      if (status && status !== 'BOOK') continue;

      const amountNode = entry.Amt;
      const amountCents = toCents(text(amountNode));
      if (amountCents == null || amountCents <= 0) continue;

      const bookedAt =
        parseDate(entry.BookgDt) ?? parseDate(entry.ValDt) ?? new Date();

      const txDetails = toArray<Record<string, any>>(entry.NtryDtls).flatMap((d) =>
        toArray<Record<string, any>>(d?.TxDtls),
      );

      const debtor = txDetails.map((tx) => tx?.RltdPties?.Dbtr).find(Boolean);
      const debtorAccount = txDetails.map((tx) => tx?.RltdPties?.DbtrAcct).find(Boolean);

      credits.push({
        bankReference:
          text(entry.AcctSvcrRef) ??
          text(entry.NtryRef) ??
          txDetails.map((tx) => text(tx?.Refs?.AcctSvcrRef)).find(Boolean) ??
          null,
        amountCents,
        currency: (amountNode?.['@Ccy'] as string | undefined)?.toUpperCase() ?? 'EUR',
        bookedAt,
        valueDate: parseDate(entry.ValDt),
        debtorName: text(debtor?.Nm) ?? text(debtor?.Pty?.Nm),
        debtorIban: text(debtorAccount?.Id?.IBAN),
        remittance: collectRemittance(entry, txDetails),
      });
    }

    statements.push({
      externalId: text(stmt.Id),
      accountIban: text(stmt.Acct?.Id?.IBAN),
      fromDate: parseDate(stmt.FrToDt?.FrDtTm) ?? parseDate(stmt.FrToDt?.FrDt),
      toDate: parseDate(stmt.FrToDt?.ToDtTm) ?? parseDate(stmt.FrToDt?.ToDt),
      credits,
      debitCount,
    });
  }

  if (statements.length === 0) {
    throw ApiError.badRequest('Le relevé ne contient aucun compte.', 'EMPTY_STATEMENT');
  }

  return statements;
}

// ---------------------------------------------------- extraction des références

/**
 * Références de commande candidates trouvées dans un libellé.
 *
 * Deux formats coexistent : la référence de virement `SM-K7M2QX` (alphabet sans
 * caractères ambigus) et le numéro de commande `SM-2026-00001`. Les banques
 * suppriment fréquemment les tirets et forcent la casse : on normalise avant
 * de chercher.
 */
export function extractReferences(remittance: string | null): {
  transferRefs: string[];
  orderNumbers: string[];
} {
  if (!remittance) return { transferRefs: [], orderNumbers: [] };

  const normalized = remittance.toUpperCase().replace(/[\s.]/g, '');

  const orderNumbers = [...normalized.matchAll(/SM-?(\d{4})-?(\d{5})/g)].map(
    (m) => `SM-${m[1]}-${m[2]}`,
  );

  // L'alphabet exclut 0, O, 1, I et L : la casse ne peut pas produire de faux
  // positif sur un mot courant de six lettres.
  const transferRefs = [...normalized.matchAll(/SM-?([ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6})(?![0-9])/g)]
    .map((m) => `SM-${m[1]}`)
    // Un numéro de commande commence par quatre chiffres : il ne doit pas être
    // pris pour une référence de virement.
    .filter((ref) => !/^SM-\d{4}$/.test(ref.slice(0, 7)));

  return {
    transferRefs: [...new Set(transferRefs)],
    orderNumbers: [...new Set(orderNumbers)],
  };
}

/**
 * Empreinte stable d'une écriture.
 * Deux relevés qui se chevauchent, ou un même fichier redéposé, ne doivent pas
 * produire de doublon. `occurrence` distingue deux virements par ailleurs
 * rigoureusement identiques le même jour.
 */
function fingerprint(accountIban: string | null, entry: ParsedEntry, occurrence: number): string {
  const material = [
    accountIban ?? '',
    entry.bankReference ?? '',
    entry.bookedAt.toISOString().slice(0, 10),
    String(entry.amountCents),
    entry.currency,
    entry.debtorName ?? '',
    entry.debtorIban ?? '',
    entry.remittance ?? '',
    String(occurrence),
  ].join('|');

  return crypto.createHash('sha256').update(material).digest('hex');
}

// ------------------------------------------------------------------ import

export interface ImportOptions {
  fileName: string;
  userId: string;
  /** Analyse le fichier et renvoie le rapport sans rien écrire. */
  dryRun?: boolean;
}

export interface ImportedEntry {
  fingerprint: string;
  amountCents: number;
  currency: string;
  bookedAt: Date;
  debtorName: string | null;
  remittance: string | null;
  status: BankEntryStatus;
  orderNumber: string | null;
  note: string | null;
  /** Vrai si l'écriture avait déjà été traitée lors d'un import précédent. */
  duplicate: boolean;
}

export interface ImportReport {
  statementId: string | null;
  fileName: string;
  accountIban: string | null;
  fromDate: Date | null;
  toDate: Date | null;
  dryRun: boolean;
  totals: {
    credits: number;
    debitsIgnored: number;
    duplicates: number;
    matched: number;
    amountMismatch: number;
    alreadyPaid: number;
    unmatched: number;
    /** Montant total effectivement encaissé par cet import, en centimes */
    collectedCents: number;
  };
  entries: ImportedEntry[];
}

export async function importCamt053(xml: string, options: ImportOptions): Promise<ImportReport> {
  const statements = parseCamt053(xml);

  // Un fichier peut couvrir plusieurs comptes : on les traite comme un seul
  // lot, le rapport reste lisible et l'IBAN du premier relevé sert d'étiquette.
  const credits = statements.flatMap((s) =>
    s.credits.map((entry) => ({ entry, accountIban: s.accountIban })),
  );
  const debitsIgnored = statements.reduce((sum, s) => sum + s.debitCount, 0);

  // Compteur par empreinte partielle, pour distinguer deux virements identiques.
  const seen = new Map<string, number>();
  const prepared = credits.map(({ entry, accountIban }) => {
    const base = `${accountIban}|${entry.bookedAt.toISOString().slice(0, 10)}|${entry.amountCents}|${entry.remittance}`;
    const occurrence = seen.get(base) ?? 0;
    seen.set(base, occurrence + 1);
    return { entry, accountIban, fingerprint: fingerprint(accountIban, entry, occurrence) };
  });

  const existing = await prisma.bankStatementEntry.findMany({
    where: { fingerprint: { in: prepared.map((p) => p.fingerprint) } },
    select: { fingerprint: true },
  });
  const alreadyImported = new Set(existing.map((e) => e.fingerprint));

  const report: ImportReport = {
    statementId: null,
    fileName: options.fileName,
    accountIban: statements[0]?.accountIban ?? null,
    fromDate: statements[0]?.fromDate ?? null,
    toDate: statements[0]?.toDate ?? null,
    dryRun: Boolean(options.dryRun),
    totals: {
      credits: credits.length,
      debitsIgnored,
      duplicates: 0,
      matched: 0,
      amountMismatch: 0,
      alreadyPaid: 0,
      unmatched: 0,
      collectedCents: 0,
    },
    entries: [],
  };

  const toPersist: Array<{
    fingerprint: string;
    entry: ParsedEntry;
    status: BankEntryStatus;
    orderId: string | null;
    note: string | null;
  }> = [];

  for (const { entry, fingerprint: fp } of prepared) {
    if (alreadyImported.has(fp)) {
      report.totals.duplicates++;
      report.entries.push({
        fingerprint: fp,
        amountCents: entry.amountCents,
        currency: entry.currency,
        bookedAt: entry.bookedAt,
        debtorName: entry.debtorName,
        remittance: entry.remittance,
        status: 'IGNORED',
        orderNumber: null,
        note: 'Écriture déjà importée précédemment',
        duplicate: true,
      });
      continue;
    }

    const resolved = await resolveEntry(entry);
    toPersist.push({ fingerprint: fp, entry, ...resolved });

    report.entries.push({
      fingerprint: fp,
      amountCents: entry.amountCents,
      currency: entry.currency,
      bookedAt: entry.bookedAt,
      debtorName: entry.debtorName,
      remittance: entry.remittance,
      status: resolved.status,
      orderNumber: resolved.orderNumber,
      note: resolved.note,
      duplicate: false,
    });

    switch (resolved.status) {
      case 'MATCHED':
        report.totals.matched++;
        report.totals.collectedCents += entry.amountCents;
        break;
      case 'AMOUNT_MISMATCH':
        report.totals.amountMismatch++;
        break;
      case 'ALREADY_PAID':
        report.totals.alreadyPaid++;
        break;
      default:
        report.totals.unmatched++;
    }
  }

  if (options.dryRun) return report;

  // ---- écriture

  const statement = await prisma.bankStatement.create({
    data: {
      fileName: options.fileName,
      accountIban: report.accountIban,
      externalId: statements[0]?.externalId ?? null,
      fromDate: report.fromDate,
      toDate: report.toDate,
      creditCount: credits.length,
      importedCount: toPersist.length,
      matchedCount: report.totals.matched,
      importedById: options.userId,
      entries: {
        create: toPersist.map(({ fingerprint: fp, entry, status, orderId, note }) => ({
          fingerprint: fp,
          bankReference: entry.bankReference,
          amountCents: entry.amountCents,
          currency: entry.currency,
          bookedAt: entry.bookedAt,
          valueDate: entry.valueDate,
          debtorName: entry.debtorName,
          debtorIban: entry.debtorIban,
          remittance: entry.remittance,
          status,
          orderId,
          note,
        })),
      },
    },
  });

  // L'encaissement n'a lieu qu'après enregistrement du relevé : si la
  // transaction échoue, aucune commande n'est passée en payée sans trace.
  for (const item of toPersist) {
    if (item.status !== 'MATCHED' || !item.orderId) continue;
    try {
      await orderService.markPaid(item.orderId, { userId: options.userId });
    } catch (err) {
      logger.error({ err, orderId: item.orderId }, "Échec de l'encaissement automatique");
      await prisma.bankStatementEntry.updateMany({
        where: { fingerprint: item.fingerprint },
        data: {
          status: 'AMOUNT_MISMATCH',
          note: "Encaissement automatique refusé — à traiter à la main",
        },
      });
    }
  }

  report.statementId = statement.id;
  logger.info(
    { statementId: statement.id, ...report.totals },
    'Relevé CAMT.053 importé',
  );

  return report;
}

/** Détermine à quelle commande se rattache une écriture, et si elle l'encaisse. */
async function resolveEntry(entry: ParsedEntry): Promise<{
  status: BankEntryStatus;
  orderId: string | null;
  orderNumber: string | null;
  note: string | null;
}> {
  const { transferRefs, orderNumbers } = extractReferences(entry.remittance);

  if (transferRefs.length === 0 && orderNumbers.length === 0) {
    return {
      status: 'UNMATCHED',
      orderId: null,
      orderNumber: null,
      note: 'Aucune référence de commande dans le libellé',
    };
  }

  const order = await prisma.order.findFirst({
    where: {
      OR: [
        { bankTransferRef: { in: transferRefs } },
        { orderNumber: { in: orderNumbers } },
      ],
    },
    select: {
      id: true,
      orderNumber: true,
      totalCents: true,
      currency: true,
      paymentMethod: true,
      paymentStatus: true,
      status: true,
    },
  });

  if (!order) {
    return {
      status: 'UNMATCHED',
      orderId: null,
      orderNumber: null,
      note: `Référence lue (${[...transferRefs, ...orderNumbers].join(', ')}) mais aucune commande correspondante`,
    };
  }

  if (order.paymentStatus === 'SUCCEEDED') {
    return {
      status: 'ALREADY_PAID',
      orderId: order.id,
      orderNumber: order.orderNumber,
      note: 'Commande déjà réglée',
    };
  }

  if (order.status === 'CANCELLED') {
    return {
      status: 'AMOUNT_MISMATCH',
      orderId: order.id,
      orderNumber: order.orderNumber,
      note: 'Commande annulée — remboursement probablement dû',
    };
  }

  if (order.paymentMethod !== 'BANK_TRANSFER') {
    return {
      status: 'AMOUNT_MISMATCH',
      orderId: order.id,
      orderNumber: order.orderNumber,
      note: 'Commande réglée par carte — virement inattendu',
    };
  }

  if (entry.currency.toUpperCase() !== order.currency.toUpperCase()) {
    return {
      status: 'AMOUNT_MISMATCH',
      orderId: order.id,
      orderNumber: order.orderNumber,
      note: `Devise reçue ${entry.currency}, attendue ${order.currency}`,
    };
  }

  if (entry.amountCents !== order.totalCents) {
    const delta = entry.amountCents - order.totalCents;
    return {
      status: 'AMOUNT_MISMATCH',
      orderId: order.id,
      orderNumber: order.orderNumber,
      note:
        delta > 0
          ? `Trop-perçu de ${(delta / 100).toFixed(2)} ${order.currency}`
          : `Manque ${(-delta / 100).toFixed(2)} ${order.currency}`,
    };
  }

  return { status: 'MATCHED', orderId: order.id, orderNumber: order.orderNumber, note: null };
}

// ---------------------------------------------------- consultation et reprise

export async function listStatements(page = 1, perPage = 20) {
  const [total, items] = await Promise.all([
    prisma.bankStatement.count(),
    prisma.bankStatement.findMany({
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
      include: {
        importedBy: { select: { firstName: true, lastName: true } },
        _count: { select: { entries: true } },
      },
    }),
  ]);

  return {
    items,
    pagination: { page, perPage, total, totalPages: Math.max(1, Math.ceil(total / perPage)) },
  };
}

export async function getStatement(id: string) {
  const statement = await prisma.bankStatement.findUnique({
    where: { id },
    include: {
      importedBy: { select: { firstName: true, lastName: true } },
      entries: {
        orderBy: { bookedAt: 'desc' },
        include: {
          order: { select: { orderNumber: true, totalCents: true, status: true, email: true } },
        },
      },
    },
  });
  if (!statement) throw ApiError.notFound('Relevé introuvable');
  return statement;
}

/** Écritures restées sans rapprochement, tous relevés confondus. */
export async function listPendingEntries() {
  return prisma.bankStatementEntry.findMany({
    where: { status: { in: ['UNMATCHED', 'AMOUNT_MISMATCH'] } },
    orderBy: { bookedAt: 'desc' },
    take: 100,
    include: {
      statement: { select: { fileName: true, createdAt: true } },
      order: { select: { orderNumber: true, totalCents: true, email: true } },
    },
  });
}

/**
 * Rattachement manuel d'une écriture à une commande, puis encaissement.
 * C'est la porte de sortie quand le client a oublié la référence.
 */
export async function matchEntryToOrder(entryId: string, orderNumber: string, userId: string) {
  const entry = await prisma.bankStatementEntry.findUnique({ where: { id: entryId } });
  if (!entry) throw ApiError.notFound('Écriture introuvable');
  if (entry.status === 'MATCHED') {
    throw ApiError.conflict('Cette écriture est déjà rapprochée.', 'ALREADY_MATCHED');
  }

  const order = await prisma.order.findUnique({ where: { orderNumber } });
  if (!order) throw ApiError.notFound(`Commande ${orderNumber} introuvable`);
  if (order.paymentStatus === 'SUCCEEDED') {
    throw ApiError.conflict('Cette commande est déjà réglée.', 'ALREADY_PAID');
  }

  const note =
    entry.amountCents === order.totalCents
      ? 'Rapprochement manuel'
      : `Rapprochement manuel — écart de ${((entry.amountCents - order.totalCents) / 100).toFixed(2)} ${order.currency}`;

  await orderService.markPaid(order.id, { userId });

  return prisma.bankStatementEntry.update({
    where: { id: entryId },
    data: { status: 'MATCHED', orderId: order.id, note },
    include: { order: { select: { orderNumber: true, totalCents: true } } },
  });
}

/** Écarte une écriture qui ne concerne pas la boutique (remboursement, apport…). */
export async function ignoreEntry(entryId: string, reason: string) {
  return prisma.bankStatementEntry.update({
    where: { id: entryId },
    data: { status: 'IGNORED', note: reason },
  });
}

export type BankEntryWhere = Prisma.BankStatementEntryWhereInput;
