import { fr, type Dictionary } from './fr';
import { de } from './de';
import type { Locale } from '@/lib/routes';

const DICTIONARIES: Record<Locale, Dictionary> = { fr, de };

export function getDictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale] ?? fr;
}

/** Interpolation simple : t('Plus que {n} en stock', { n: 2 }) */
export function interpolate(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) =>
    key in values ? String(values[key]) : match,
  );
}

export type { Dictionary };
