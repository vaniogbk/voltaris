import { prisma } from '../lib/prisma.js';
import { ApiError } from '../lib/errors.js';

export const SHIPPING_COUNTRIES = ['FR', 'DE'] as const;
export type ShippingCountry = (typeof SHIPPING_COUNTRIES)[number];

export function assertShippable(country: string): asserts country is ShippingCountry {
  if (!SHIPPING_COUNTRIES.includes(country.toUpperCase() as ShippingCountry)) {
    throw ApiError.badRequest(
      "Nous livrons uniquement en France métropolitaine et en Allemagne.",
      'COUNTRY_NOT_SERVED',
    );
  }
}

export interface ShippingQuote {
  carrier: string;
  name: string;
  priceCents: number;
  etaMinDays: number;
  etaMaxDays: number;
  free: boolean;
}

/**
 * Tarif de livraison pour un pays, un poids total et un panier donné.
 * La boutique est en livraison seule : il n'existe aucune option de retrait.
 */
export async function quote(
  country: string,
  totalWeightGrams: number,
  subtotalCents: number,
): Promise<ShippingQuote> {
  assertShippable(country);
  const iso = country.toUpperCase();

  const rate = await prisma.shippingRate.findFirst({
    where: {
      country: iso,
      active: true,
      minWeightG: { lte: totalWeightGrams },
      maxWeightG: { gte: totalWeightGrams },
    },
    orderBy: { priceCents: 'asc' },
  });

  if (!rate) {
    // Au-delà de la grille (colis hors gabarit) : devis manuel.
    throw ApiError.unprocessable(
      "Le poids de ce panier dépasse notre grille de livraison standard. Contactez-nous pour un devis transport.",
      'SHIPPING_OUT_OF_RANGE',
      { totalWeightGrams, country: iso },
    );
  }

  const free = rate.freeAboveCents != null && subtotalCents >= rate.freeAboveCents;

  return {
    carrier: rate.carrier,
    name: rate.name,
    priceCents: free ? 0 : rate.priceCents,
    etaMinDays: rate.etaMinDays,
    etaMaxDays: rate.etaMaxDays,
    free,
  };
}

export async function listRates(country?: string) {
  return prisma.shippingRate.findMany({
    where: country ? { country: country.toUpperCase() } : undefined,
    orderBy: [{ country: 'asc' }, { minWeightG: 'asc' }],
  });
}

const TRACKING_URLS: Record<string, string> = {
  DPD: 'https://www.dpd.fr/trace/{n}',
  DHL: 'https://www.dhl.de/de/privatkunden/dhl-sendungsverfolgung.html?piececode={n}',
  Chronopost: 'https://www.chronopost.fr/tracking-no-cms/suivi-page?listeNumerosLT={n}',
  GLS: 'https://gls-group.com/FR/fr/suivi-colis?match={n}',
  Schenker: 'https://www.dbschenker.com/app/tracking-public/?refNumber={n}',
};

export function buildTrackingUrl(carrier: string, trackingNumber: string): string | null {
  const template = TRACKING_URLS[carrier];
  return template ? template.replace('{n}', encodeURIComponent(trackingNumber)) : null;
}
