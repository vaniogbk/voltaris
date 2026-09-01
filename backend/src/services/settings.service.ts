import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';
import { ApiError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import { isValidIban, normalizeIban } from './sepa-qr.service.js';

/**
 * Réglages modifiables depuis le back-office, stockés en base.
 *
 * Les coordonnées bancaires vivaient uniquement dans les variables
 * d'environnement : en changer imposait un redéploiement. Elles sont désormais
 * éditables depuis un formulaire, et prennent effet immédiatement — le
 * `.env` ne sert plus que de valeur de départ.
 */

const BANK_ACCOUNT_KEY = 'bank_account';

export interface BankAccount {
  holder: string;
  iban: string;
  bic: string;
  bankName: string;
  /** Délai laissé au client pour régler, en jours */
  dueDays: number;
}

export interface StoredBankAccount extends BankAccount {
  /** D'où vient la valeur servie : le formulaire, ou le `.env` de départ. */
  source: 'database' | 'env';
  updatedAt: Date | null;
}

function fromEnv(): BankAccount {
  return {
    holder: env.BANK_ACCOUNT_HOLDER,
    iban: env.BANK_IBAN,
    bic: env.BANK_BIC,
    bankName: env.BANK_NAME,
    dueDays: env.BANK_TRANSFER_DUE_DAYS,
  };
}

/**
 * Compte destinataire actuellement en vigueur.
 * Appelé à chaque génération d'instructions de virement, donc un changement
 * s'applique sans redémarrage.
 */
export async function getBankAccount(): Promise<StoredBankAccount> {
  const setting = await prisma.setting.findUnique({ where: { key: BANK_ACCOUNT_KEY } });

  if (!setting) return { ...fromEnv(), source: 'env', updatedAt: null };

  const stored = setting.value as unknown as Partial<BankAccount>;
  const fallback = fromEnv();

  return {
    // Un champ vidé en base retombe sur la valeur d'environnement plutôt que
    // de produire un IBAN vide sur la page de confirmation.
    holder: stored.holder?.trim() || fallback.holder,
    iban: stored.iban?.trim() || fallback.iban,
    bic: stored.bic?.trim() || fallback.bic,
    bankName: stored.bankName?.trim() || fallback.bankName,
    dueDays: stored.dueDays ?? fallback.dueDays,
    source: 'database',
    updatedAt: setting.updatedAt,
  };
}

export async function setBankAccount(input: BankAccount, userId: string): Promise<StoredBankAccount> {
  const iban = normalizeIban(input.iban);

  // Un IBAN erroné enverrait l'argent des clients ailleurs, sans message
  // d'erreur pour eux : la clé de contrôle est vérifiée avant enregistrement.
  if (!isValidIban(iban)) {
    throw ApiError.badRequest(
      "Cet IBAN est invalide : sa clé de contrôle ne correspond pas. Vérifiez la saisie.",
      'INVALID_IBAN',
    );
  }

  const value = {
    holder: input.holder.trim(),
    iban,
    bic: input.bic.trim().toUpperCase(),
    bankName: input.bankName.trim(),
    dueDays: input.dueDays,
  };

  const setting = await prisma.setting.upsert({
    where: { key: BANK_ACCOUNT_KEY },
    update: { value },
    create: { key: BANK_ACCOUNT_KEY, value },
  });

  // Trace explicite : un changement de compte destinataire est l'opération la
  // plus sensible du back-office.
  logger.warn(
    { userId, iban: `${iban.slice(0, 8)}…${iban.slice(-4)}`, holder: value.holder },
    'Compte bancaire destinataire modifié',
  );

  return { ...value, source: 'database', updatedAt: setting.updatedAt };
}

/** Repasse sur les valeurs du `.env`, en supprimant la surcharge en base. */
export async function resetBankAccount(userId: string): Promise<StoredBankAccount> {
  await prisma.setting.deleteMany({ where: { key: BANK_ACCOUNT_KEY } });
  logger.warn({ userId }, 'Compte bancaire réinitialisé sur les variables d’environnement');
  return { ...fromEnv(), source: 'env', updatedAt: null };
}
