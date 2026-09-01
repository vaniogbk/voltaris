import { Router, raw } from 'express';
import { env } from '../config/env.js';
import { getStripe } from '../lib/stripe.js';
import { logger } from '../lib/logger.js';
import * as payments from '../services/payment.service.js';

export const webhookRouter = Router();

/**
 * Webhook Stripe.
 * Le corps doit rester brut : la signature est calculée sur les octets exacts,
 * d'où le `raw` local plutôt que le parser JSON global de l'application.
 */
webhookRouter.post('/stripe', raw({ type: 'application/json' }), async (req, res) => {
  const signature = req.headers['stripe-signature'];

  if (!env.STRIPE_WEBHOOK_SECRET || typeof signature !== 'string') {
    logger.warn('Webhook Stripe reçu sans secret configuré ou sans signature');
    return res.status(400).json({ error: { code: 'WEBHOOK_NOT_CONFIGURED' } });
  }

  let event;
  try {
    event = getStripe().webhooks.constructEvent(
      req.body as Buffer,
      signature,
      env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    logger.warn({ err }, 'Signature de webhook Stripe invalide');
    return res.status(400).json({ error: { code: 'INVALID_SIGNATURE' } });
  }

  try {
    await payments.handleStripeEvent(event);
  } catch (err) {
    // On répond 500 pour que Stripe rejoue l'événement plus tard.
    logger.error({ err, type: event.type }, 'Échec du traitement du webhook Stripe');
    return res.status(500).json({ error: { code: 'WEBHOOK_HANDLER_FAILED' } });
  }

  res.json({ received: true });
});
