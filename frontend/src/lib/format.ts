import type { Locale } from './routes';

const LOCALE_TAG: Record<Locale, string> = { fr: 'fr-FR', de: 'de-DE' };

export function formatPrice(cents: number, locale: Locale, currency = 'EUR'): string {
  return new Intl.NumberFormat(LOCALE_TAG[locale], {
    style: 'currency',
    currency,
    // Les prix du catalogue sont ronds : on masque « ,00 » sans perdre les
    // centimes quand ils existent (frais de port, remises).
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

export function formatDate(value: string | Date, locale: Locale): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat(LOCALE_TAG[locale], {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export function formatDateTime(value: string | Date, locale: Locale): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat(LOCALE_TAG[locale], {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatWeight(grams: number, locale: Locale): string {
  const kg = grams / 1000;
  return `${new Intl.NumberFormat(LOCALE_TAG[locale], { maximumFractionDigits: 1 }).format(kg)} kg`;
}

/** Découpe un IBAN en groupes de 4 pour la lecture et la recopie. */
export function formatIban(iban: string): string {
  return iban.replace(/\s/g, '').replace(/(.{4})/g, '$1 ').trim();
}
