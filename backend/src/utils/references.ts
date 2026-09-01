import { customAlphabet } from 'nanoid';
import { prisma } from '../lib/prisma.js';

/** Alphabet sans caractères ambigus (0/O, 1/I/L) pour une saisie manuelle fiable. */
const nanoRef = customAlphabet('ABCDEFGHJKMNPQRSTUVWXYZ23456789', 6);

/**
 * Numéro de commande séquentiel par année : SM-2026-00001.
 * Le comptage se fait dans la transaction appelante pour limiter les collisions
 * sous concurrence ; la contrainte d'unicité en base reste le garde-fou final.
 */
export async function nextOrderNumber(tx: Pick<typeof prisma, 'order'> = prisma): Promise<string> {
  const year = new Date().getFullYear();
  const startOfYear = new Date(Date.UTC(year, 0, 1));
  const count = await tx.order.count({ where: { createdAt: { gte: startOfYear } } });
  return `SM-${year}-${String(count + 1).padStart(5, '0')}`;
}

/**
 * Numéro de facture séquentiel par année : FA-2026-00001.
 *
 * Attribué au moment de l'encaissement, jamais à la commande : une
 * numérotation de facture doit être continue et sans trou, or une commande
 * peut être abandonnée ou annulée avant paiement.
 */
export async function nextInvoiceNumber(tx: Pick<typeof prisma, 'order'> = prisma): Promise<string> {
  const year = new Date().getFullYear();
  const startOfYear = new Date(Date.UTC(year, 0, 1));

  const count = await tx.order.count({
    where: { invoiceNumber: { not: null }, paidAt: { gte: startOfYear } },
  });

  return `FA-${year}-${String(count + 1).padStart(5, '0')}`;
}

/**
 * Référence à rappeler dans le libellé du virement SEPA.
 * Format court et lisible au téléphone : SM-K7M2QX
 */
export function bankTransferReference(): string {
  return `SM-${nanoRef()}`;
}

const COMBINING_MARKS = /[̀-ͯ]/g;
const SHARP_S = /[ßẞ]/g;

export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
    .replace(SHARP_S, 'ss')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}
