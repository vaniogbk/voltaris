import type { VatMode } from '@prisma/client';

/** Taux de TVA standard par pays de livraison, en points de base. */
export const VAT_RATES_BPS: Record<string, number> = {
  FR: 2000, // 20 %
  DE: 1900, // 19 %
};

export function vatRateForCountry(country: string): number {
  return VAT_RATES_BPS[country.toUpperCase()] ?? 2000;
}

/**
 * Part de TVA contenue dans un montant TTC.
 * Renvoie 0 pour les biens vendus sous le régime de la marge : la TVA sur marge
 * n'est pas ventilée sur la facture et n'est pas déductible par l'acheteur.
 */
export function vatFromGross(grossCents: number, vatRateBps: number, vatMode: VatMode): number {
  if (vatMode === 'MARGIN') return 0;
  return Math.round((grossCents * vatRateBps) / (10_000 + vatRateBps));
}

export function formatCents(cents: number, locale: 'fr' | 'de' = 'fr', currency = 'EUR'): string {
  const tag = locale === 'de' ? 'de-DE' : 'fr-FR';
  return new Intl.NumberFormat(tag, { style: 'currency', currency }).format(cents / 100);
}

/** Pourcentage de remise entier, arrondi vers le bas (ex. 1649 → 849 donne 48). */
export function discountPercent(priceCents: number, compareAtCents?: number | null): number | null {
  if (!compareAtCents || compareAtCents <= priceCents) return null;
  return Math.floor(((compareAtCents - priceCents) / compareAtCents) * 100);
}
