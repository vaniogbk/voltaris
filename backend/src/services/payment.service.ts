import type Stripe from 'stripe';
import type { Order } from '@prisma/client';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import { getStripe, stripeEnabled } from '../lib/stripe.js';
import { ApiError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import { buildTransferQrSvg } from './sepa-qr.service.js';
import { getBankAccount } from './settings.service.js';
import * as orders from './order.service.js';

/** Instructions de virement SEPA renvoyées au client après commande. */
export interface BankTransferInstructions {
  holder: string;
  iban: string;
  bic: string;
  bankName: string;
  amountCents: number;
  currency: string;
  reference: string;
  dueAt: Date | null;
  /** Code QR EPC069-12 en SVG, ou null si l'IBAN configuré est invalide. */
  qrCodeSvg: string | null;
}

export async function bankTransferInstructions(order: Order): Promise<BankTransferInstructions> {
  if (!order.bankTransferRef) {
    throw ApiError.badRequest("Cette commande n'est pas réglée par virement.", 'NOT_A_TRANSFER');
  }

  // Les coordonnées sont relues à chaque affichage : un changement de compte
  // depuis le back-office s'applique aussitôt, y compris aux commandes déjà
  // passées qui n'ont pas encore été réglées.
  const account = await getBankAccount();

  // Le libellé se limite à la référence : c'est la seule donnée sur laquelle
  // repose le rapprochement, et les libellés courts survivent mieux aux
  // troncatures imposées par certaines banques.
  const qrCodeSvg = await buildTransferQrSvg({
    name: account.holder,
    iban: account.iban,
    bic: account.bic,
    amountCents: order.totalCents,
    currency: order.currency,
    remittance: order.bankTransferRef,
  });

  return {
    holder: account.holder,
    iban: account.iban,
    bic: account.bic,
    bankName: account.bankName,
    amountCents: order.totalCents,
    currency: order.currency,
    reference: order.bankTransferRef,
    dueAt: order.bankTransferDueAt,
    qrCodeSvg,
  };
}

/**
 * Crée (ou réutilise) le PaymentIntent Stripe d'une commande.
 * Le montant provient exclusivement de la commande en base.
 */
export async function createOrRetrievePaymentIntent(orderId: string) {
  const stripe = getStripe();

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw ApiError.notFound('Commande introuvable');
  if (order.paymentMethod !== 'CARD') {
    throw ApiError.badRequest("Cette commande n'est pas réglée par carte.", 'NOT_A_CARD_ORDER');
  }
  if (order.paymentStatus === 'SUCCEEDED') {
    throw ApiError.conflict('Cette commande est déjà payée.', 'ALREADY_PAID');
  }

  if (order.stripePaymentIntentId) {
    const existing = await stripe.paymentIntents.retrieve(order.stripePaymentIntentId);
    if (existing.status !== 'canceled') {
      return { clientSecret: existing.client_secret, paymentIntentId: existing.id };
    }
  }

  const intent = await stripe.paymentIntents.create(
    {
      amount: order.totalCents,
      currency: order.currency.toLowerCase(),
      automatic_payment_methods: { enabled: true },
      metadata: { orderId: order.id, orderNumber: order.orderNumber },
      description: `Voltaris — commande ${order.orderNumber}`,
      receipt_email: order.email,
      shipping: buildStripeShipping(order),
    },
    // Clé d'idempotence : un double clic ne crée pas deux intents.
    { idempotencyKey: `pi_${order.id}` },
  );

  await prisma.order.update({
    where: { id: order.id },
    data: { stripePaymentIntentId: intent.id, paymentStatus: 'PROCESSING' },
  });

  return { clientSecret: intent.client_secret, paymentIntentId: intent.id };
}

function buildStripeShipping(order: Order) {
  const a = order.shippingAddress as unknown as {
    firstName: string;
    lastName: string;
    line1: string;
    line2?: string;
    postalCode: string;
    city: string;
    country: string;
    phone?: string;
  };
  return {
    name: `${a.firstName} ${a.lastName}`,
    phone: a.phone,
    address: {
      line1: a.line1,
      line2: a.line2,
      postal_code: a.postalCode,
      city: a.city,
      country: a.country,
    },
  };
}

/**
 * Traite un événement Stripe déjà vérifié.
 * Le webhook est la seule source de vérité pour marquer une commande payée :
 * le retour navigateur peut être perdu ou falsifié.
 */
export async function handleStripeEvent(event: Stripe.Event) {
  const object = event.data.object as {
    id?: string;
    metadata?: Record<string, string>;
    latest_charge?: string | Stripe.Charge | null;
  };
  const orderId = object.metadata?.orderId;

  switch (event.type) {
    case 'payment_intent.succeeded': {
      if (!orderId) break;
      await orders.markPaid(orderId, {
        chargeId: typeof object.latest_charge === 'string' ? object.latest_charge : undefined,
      });
      logger.info({ orderId, intentId: object.id }, 'Paiement carte confirmé');
      break;
    }

    case 'payment_intent.payment_failed': {
      if (!orderId) break;
      await prisma.order.update({ where: { id: orderId }, data: { paymentStatus: 'FAILED' } });
      logger.warn({ orderId }, 'Paiement carte échoué');
      break;
    }

    case 'payment_intent.canceled': {
      if (!orderId) break;
      await orders.cancelOrder(orderId, 'PaymentIntent annulé côté Stripe');
      break;
    }

    case 'charge.refunded': {
      const intentId = (object as { payment_intent?: string }).payment_intent;
      if (!intentId) break;
      const order = await prisma.order.findUnique({ where: { stripePaymentIntentId: intentId } });
      if (order) {
        await prisma.order.update({
          where: { id: order.id },
          data: { status: 'REFUNDED', paymentStatus: 'REFUNDED' },
        });
      }
      break;
    }

    default:
      logger.debug({ type: event.type }, 'Événement Stripe ignoré');
  }
}

export async function refundOrder(orderId: string, amountCents?: number) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw ApiError.notFound('Commande introuvable');

  if (order.paymentMethod === 'BANK_TRANSFER') {
    // Le remboursement d'un virement se fait manuellement depuis la banque.
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'REFUNDED',
        paymentStatus: 'REFUNDED',
        internalNote: [order.internalNote, 'Remboursement par virement à exécuter manuellement.']
          .filter(Boolean)
          .join('\n'),
      },
    });
    return { manual: true as const };
  }

  if (!order.stripePaymentIntentId) throw ApiError.badRequest('Aucun paiement Stripe à rembourser.');

  const stripe = getStripe();
  const refund = await stripe.refunds.create({
    payment_intent: order.stripePaymentIntentId,
    ...(amountCents ? { amount: amountCents } : {}),
  });

  return { manual: false as const, refundId: refund.id };
}

export function availablePaymentMethods() {
  return [
    {
      id: 'BANK_TRANSFER' as const,
      enabled: true,
      feeCents: 0,
    },
    {
      id: 'CARD' as const,
      enabled: stripeEnabled(),
      feeCents: 0,
    },
  ];
}
