import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { ApiError } from '../lib/errors.js';

/**
 * Formulaire de contact → Telegram.
 *
 * Les messages arrivent dans une conversation Telegram plutôt que par e-mail :
 * la notification est immédiate sur le téléphone, et il n'y a aucun serveur
 * SMTP à maintenir.
 *
 * Le jeton du bot ne quitte jamais le serveur. Le navigateur ne connaît que
 * l'existence, ou non, du formulaire.
 */

export interface ContactMessage {
  name: string;
  email: string;
  orderNumber?: string;
  subject: string;
  message: string;
  locale: 'fr' | 'de';
}

/**
 * Échappe les caractères réservés du mode HTML de Telegram.
 * Sans cela, un message contenant « <b> » casserait le rendu, et un visiteur
 * malveillant pourrait injecter du balisage dans votre conversation.
 */
function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Telegram refuse les messages de plus de 4096 caractères. */
const MAX_TELEGRAM_LENGTH = 3800;

function formatMessage(input: ContactMessage): string {
  const flag = input.locale === 'de' ? '🇩🇪' : '🇫🇷';

  const lines = [
    `<b>🔔 Nouveau message — Voltaris</b> ${flag}`,
    '',
    `<b>De :</b> ${escapeHtml(input.name)}`,
    `<b>E-mail :</b> ${escapeHtml(input.email)}`,
  ];

  if (input.orderNumber) {
    lines.push(`<b>Commande :</b> <code>${escapeHtml(input.orderNumber)}</code>`);
  }

  lines.push(`<b>Sujet :</b> ${escapeHtml(input.subject)}`, '', escapeHtml(input.message));

  const text = lines.join('\n');
  return text.length > MAX_TELEGRAM_LENGTH
    ? `${text.slice(0, MAX_TELEGRAM_LENGTH)}\n\n[…message tronqué]`
    : text;
}

export async function sendContactMessage(input: ContactMessage): Promise<void> {
  if (!env.telegramEnabled) {
    throw new ApiError(
      503,
      'CONTACT_NOT_CONFIGURED',
      "Le formulaire n'est pas disponible pour le moment. Écrivez-nous par e-mail.",
    );
  }

  const url = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: env.TELEGRAM_CHAT_ID,
        text: formatMessage(input),
        parse_mode: 'HTML',
        // Les aperçus de liens transformeraient chaque URL citée par un
        // visiteur en vignette dans votre conversation.
        disable_web_page_preview: true,
      }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch (err) {
    logger.error({ err }, 'Telegram injoignable');
    throw new ApiError(
      502,
      'CONTACT_DELIVERY_FAILED',
      "Votre message n'a pas pu être transmis. Réessayez, ou écrivez-nous par e-mail.",
    );
  }

  if (!response.ok) {
    // La réponse d'erreur de Telegram contient le motif exact (jeton invalide,
    // conversation inconnue…) : elle est journalisée, jamais renvoyée au client.
    const detail = await response.text().catch(() => '');
    logger.error({ status: response.status, detail }, 'Telegram a refusé le message');
    throw new ApiError(
      502,
      'CONTACT_DELIVERY_FAILED',
      "Votre message n'a pas pu être transmis. Réessayez, ou écrivez-nous par e-mail.",
    );
  }

  logger.info({ from: input.email }, 'Message de contact transmis');
}
