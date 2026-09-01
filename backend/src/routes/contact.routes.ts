import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { asyncHandler, validate } from '../middleware/validate.js';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';
import * as contact from '../services/contact.service.js';

export const contactRouter = Router();

/**
 * Un formulaire qui alimente une conversation Telegram est une cible de choix
 * pour les robots : sans limite, la boîte du commerçant devient inutilisable.
 * Trois messages par quart d'heure et par adresse IP suffisent largement à un
 * usage légitime.
 */
const contactLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 3,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  // Seuls les envois aboutis comptent : une adresse e-mail mal saisie ne doit
  // pas bloquer un client honnête pendant un quart d'heure. Les requêtes
  // invalides restent couvertes par la limite globale de l'application.
  skipFailedRequests: true,
  message: {
    error: {
      code: 'RATE_LIMITED',
      message: 'Vous avez déjà envoyé plusieurs messages. Réessayez dans un quart d’heure.',
    },
  },
});

const contactSchema = z.object({
  name: z.string().min(2, 'Indiquez votre nom').max(80),
  email: z.string().email('Adresse e-mail invalide'),
  orderNumber: z.string().max(40).optional(),
  subject: z.string().min(2).max(120),
  message: z.string().min(10, 'Détaillez un peu votre demande').max(3000),
  locale: z.enum(['fr', 'de']).default('fr'),
  /**
   * Piège à robots : ce champ est masqué en CSS et n'est jamais rempli par un
   * humain. Les robots remplissent tout ce qu'ils trouvent.
   */
  website: z.string().max(200).optional(),
});

/** Indique au frontend s'il doit afficher le formulaire ou l'adresse e-mail. */
contactRouter.get('/', (_req, res) => {
  res.json({ formEnabled: env.telegramEnabled });
});

contactRouter.post(
  '/',
  contactLimiter,
  validate(contactSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof contactSchema>;

    if (body.website) {
      // On répond comme si tout s'était bien passé : un robot qui reçoit une
      // erreur adapte sa charge, un robot qui reçoit un succès s'en va.
      logger.debug({ ip: req.ip }, 'Message de contact rejeté par le piège à robots');
      res.status(202).json({ sent: true });
      return;
    }

    await contact.sendContactMessage({
      name: body.name.trim(),
      email: body.email.trim(),
      orderNumber: body.orderNumber?.trim() || undefined,
      subject: body.subject.trim(),
      message: body.message.trim(),
      locale: body.locale,
    });

    res.status(202).json({ sent: true });
  }),
);
