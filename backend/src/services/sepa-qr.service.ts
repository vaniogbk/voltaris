import QRCode from 'qrcode';
import { logger } from '../lib/logger.js';

/**
 * Code QR de virement SEPA, au format EPC069-12 (« Girocode »).
 *
 * Le client scanne le code depuis son application bancaire : bénéficiaire,
 * IBAN, montant ET référence sont pré-remplis. C'est le seul moyen fiable
 * d'obtenir la référence exacte dans le libellé du virement — une référence
 * saisie à la main est mal recopiée dans une part non négligeable des cas,
 * et un virement sans référence exploitable doit être rapproché manuellement.
 *
 * Support : universel en Allemagne et en Autriche, très répandu en France
 * (les principales applications bancaires le lisent). Les coordonnées restent
 * affichées en clair juste à côté pour les banques qui ne le gèrent pas.
 */

export interface EpcInput {
  /** Nom du bénéficiaire, 70 caractères maximum */
  name: string;
  iban: string;
  bic?: string;
  amountCents: number;
  currency?: string;
  /** Libellé du virement — c'est lui qui porte la référence de commande */
  remittance: string;
}

/** Normalise un IBAN : majuscules, sans espace ni séparateur. */
export function normalizeIban(iban: string): string {
  return iban.replace(/[\s-]/g, '').toUpperCase();
}

/**
 * Validation IBAN par la clé de contrôle modulo 97 (norme ISO 13616).
 * Un IBAN mal saisi dans la configuration produirait un code QR qui envoie
 * l'argent nulle part : il vaut mieux le détecter au démarrage.
 */
export function isValidIban(iban: string): boolean {
  const value = normalizeIban(iban);
  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]{10,30}$/.test(value)) return false;

  // Les 4 premiers caractères passent à la fin, les lettres deviennent des
  // nombres (A=10 … Z=35), puis le reste de la division par 97 doit valoir 1.
  const rearranged = value.slice(4) + value.slice(0, 4);
  const numeric = rearranged.replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));

  let remainder = 0;
  for (const digit of numeric) {
    remainder = (remainder * 10 + Number(digit)) % 97;
  }
  return remainder === 1;
}

/** Construit la charge utile EPC069-12. */
export function buildEpcPayload(input: EpcInput): string {
  const iban = normalizeIban(input.iban);
  const currency = (input.currency ?? 'EUR').toUpperCase();

  if (!isValidIban(iban)) {
    throw new Error(`IBAN invalide : ${input.iban}`);
  }
  if (input.amountCents < 1 || input.amountCents > 99_999_999_999) {
    throw new Error(`Montant hors des bornes EPC : ${input.amountCents}`);
  }

  const lines = [
    'BCD', // service tag
    '002', // version — autorise un BIC vide dans la zone SEPA
    '1', // jeu de caractères : UTF-8
    'SCT', // SEPA Credit Transfer
    (input.bic ?? '').trim().toUpperCase(),
    input.name.trim().slice(0, 70),
    iban,
    `${currency}${(input.amountCents / 100).toFixed(2)}`,
    '', // code de purpose : non utilisé
    '', // référence structurée ISO 11649 : on utilise le libellé libre
    input.remittance.trim().slice(0, 140),
  ];

  const payload = lines.join('\n');

  // La spécification impose 331 octets au maximum.
  const size = Buffer.byteLength(payload, 'utf8');
  if (size > 331) throw new Error(`Charge utile EPC trop longue : ${size} octets`);

  return payload;
}

/**
 * Renvoie le code QR en SVG, ou null si les coordonnées bancaires ne
 * permettent pas d'en produire un. La page de confirmation reste utilisable
 * sans QR : l'IBAN y figure toujours en clair.
 */
export async function buildTransferQrSvg(input: EpcInput): Promise<string | null> {
  try {
    const payload = buildEpcPayload(input);
    return await QRCode.toString(payload, {
      type: 'svg',
      errorCorrectionLevel: 'M',
      margin: 0,
      width: 240,
      color: { dark: '#0B0B0C', light: '#FFFFFF' },
    });
  } catch (err) {
    logger.warn({ err }, 'Code QR de virement non généré');
    return null;
  }
}
