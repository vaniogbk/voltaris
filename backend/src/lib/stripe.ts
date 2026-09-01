import Stripe from 'stripe';
import { env } from '../config/env.js';
import { ApiError } from './errors.js';

let client: Stripe | null = null;

if (env.STRIPE_SECRET_KEY) {
  client = new Stripe(env.STRIPE_SECRET_KEY, {
    // Version d'API épinglée par le SDK installé : la laisser implicite évite
    // une désynchronisation entre les types et la version réellement appelée.
    appInfo: { name: 'Stihl Market', version: '1.0.0' },
  });
}

/**
 * Renvoie le client Stripe, ou lève une erreur exploitable côté API si la clé
 * n'est pas configurée. Le virement SEPA reste disponible dans ce cas.
 */
export function getStripe(): Stripe {
  if (!client) {
    throw new ApiError(
      503,
      'STRIPE_NOT_CONFIGURED',
      "Le paiement par carte n'est pas disponible. Choisissez le virement bancaire.",
    );
  }
  return client;
}

export const stripeEnabled = () => client !== null;
