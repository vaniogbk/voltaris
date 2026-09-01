import type { Locale, PaymentMethod, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { ApiError } from '../lib/errors.js';
import { env } from '../config/env.js';
import { vatFromGross } from '../utils/money.js';
import { bankTransferReference, nextInvoiceNumber, nextOrderNumber } from '../utils/references.js';
import * as stock from './stock.service.js';
import * as shipping from './shipping.service.js';
import { getBankAccount } from './settings.service.js';

export interface CartLine {
  productId: string;
  quantity: number;
}

export interface AddressInput {
  firstName: string;
  lastName: string;
  company?: string;
  line1: string;
  line2?: string;
  postalCode: string;
  city: string;
  country: string;
  phone?: string;
}

export interface CreateOrderInput {
  items: CartLine[];
  email: string;
  phone?: string;
  locale: Locale;
  shippingAddress: AddressInput;
  billingAddress?: AddressInput;
  paymentMethod: PaymentMethod;
  customerNote?: string;
  userId?: string;
}

/**
 * Recalcule intégralement le panier à partir de la base.
 * Les prix envoyés par le client ne sont jamais utilisés : seule la base fait foi.
 */
export async function priceCart(items: CartLine[], country: string) {
  if (!items.length) throw ApiError.badRequest('Le panier est vide.', 'EMPTY_CART');

  const products = await prisma.product.findMany({
    where: { id: { in: items.map((i) => i.productId) }, status: 'PUBLISHED' },
    include: { images: { orderBy: { position: 'asc' }, take: 1 }, translations: true },
  });

  const byId = new Map(products.map((p) => [p.id, p]));
  const lines = [];
  let subtotalCents = 0;
  let vatCents = 0;
  let totalWeightGrams = 0;

  for (const item of items) {
    const product = byId.get(item.productId);
    if (!product) {
      throw ApiError.unprocessable(
        "Un article de votre panier n'est plus disponible à la vente.",
        'PRODUCT_UNAVAILABLE',
        { productId: item.productId },
      );
    }

    const available = product.stock - product.reservedStock;
    if (available < item.quantity) {
      // Trois cas distincts : plus rien en stock, pièce unique demandée en
      // plusieurs exemplaires, ou stock simplement insuffisant.
      const reason = product.isUnique
        ? available === 0
          ? `${product.sku} est une pièce unique, déjà réservée par un autre client.`
          : `${product.sku} est une pièce unique : un seul exemplaire est disponible.`
        : available === 0
          ? `${product.sku} n'est plus en stock.`
          : `Stock insuffisant pour ${product.sku} : ${available} disponible(s) sur ${item.quantity} demandé(s).`;

      throw ApiError.conflict(reason, 'INSUFFICIENT_STOCK', {
        productId: product.id,
        sku: product.sku,
        available,
        requested: item.quantity,
      });
    }

    const lineTotal = product.priceCents * item.quantity;
    subtotalCents += lineTotal;
    vatCents += vatFromGross(lineTotal, product.vatRateBps, product.vatMode);
    totalWeightGrams += product.weightGrams * item.quantity;

    lines.push({
      productId: product.id,
      sku: product.sku,
      name: product.translations.find((t) => t.locale === 'fr')?.name ?? product.sku,
      condition: product.condition,
      vatMode: product.vatMode,
      vatRateBps: product.vatRateBps,
      unitPriceCents: product.priceCents,
      quantity: item.quantity,
      totalCents: lineTotal,
      imageUrl: product.images[0]?.url ?? null,
    });
  }

  const shippingQuote = await shipping.quote(country, totalWeightGrams, subtotalCents);
  const totalCents = subtotalCents + shippingQuote.priceCents;

  // La TVA sur le port suit le taux standard du pays de livraison.
  const shippingVatRate = country.toUpperCase() === 'DE' ? 1900 : 2000;
  vatCents += vatFromGross(shippingQuote.priceCents, shippingVatRate, 'STANDARD');

  return { lines, subtotalCents, shipping: shippingQuote, vatCents, totalCents, totalWeightGrams };
}

export async function createOrder(input: CreateOrderInput) {
  const country = input.shippingAddress.country.toUpperCase();
  shipping.assertShippable(country);

  if (input.paymentMethod === 'CARD' && !env.stripeEnabled) {
    throw new ApiError(
      503,
      'STRIPE_NOT_CONFIGURED',
      "Le paiement par carte est momentanément indisponible. Choisissez le virement bancaire.",
    );
  }

  const priced = await priceCart(input.items, country);

  // Le délai de règlement suit le compte destinataire configuré : il peut être
  // modifié depuis le back-office, sans redéploiement.
  const isTransfer = input.paymentMethod === 'BANK_TRANSFER';
  const dueDays = isTransfer ? (await getBankAccount()).dueDays : 0;

  const order = await prisma.$transaction(async (tx) => {
    // La réservation se fait dans la transaction : si un autre client passe
    // commande en parallèle, l'un des deux échoue proprement.
    for (const line of priced.lines) {
      await stock.reserve(tx, line.productId, line.quantity);
    }

    return tx.order.create({
      data: {
        orderNumber: await nextOrderNumber(tx),
        userId: input.userId,
        email: input.email.toLowerCase().trim(),
        phone: input.phone,
        locale: input.locale,
        country,
        status: 'PENDING_PAYMENT',
        paymentMethod: input.paymentMethod,
        paymentStatus: isTransfer ? 'AWAITING_TRANSFER' : 'PENDING',
        subtotalCents: priced.subtotalCents,
        shippingCents: priced.shipping.priceCents,
        totalCents: priced.totalCents,
        vatCents: priced.vatCents,
        shippingAddress: input.shippingAddress as unknown as Prisma.InputJsonValue,
        billingAddress: (input.billingAddress ??
          input.shippingAddress) as unknown as Prisma.InputJsonValue,
        customerNote: input.customerNote,
        bankTransferRef: isTransfer ? bankTransferReference() : null,
        bankTransferDueAt: isTransfer ? new Date(Date.now() + dueDays * 86_400_000) : null,
        items: {
          create: priced.lines.map((l) => ({
            productId: l.productId,
            sku: l.sku,
            name: l.name,
            condition: l.condition,
            vatMode: l.vatMode,
            vatRateBps: l.vatRateBps,
            unitPriceCents: l.unitPriceCents,
            quantity: l.quantity,
            totalCents: l.totalCents,
            imageUrl: l.imageUrl,
          })),
        },
      },
      include: { items: true },
    });
  });

  return { order, shipping: priced.shipping };
}

/** Passage à l'état payé, déclenché par le webhook Stripe ou par un admin (virement reçu). */
export async function markPaid(orderId: string, meta?: { chargeId?: string; userId?: string }) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!order) throw ApiError.notFound('Commande introuvable');

    // Idempotent : un webhook Stripe peut être rejoué plusieurs fois.
    if (order.paymentStatus === 'SUCCEEDED') return order;

    return tx.order.update({
      where: { id: orderId },
      data: {
        status: 'PAID',
        paymentStatus: 'SUCCEEDED',
        paidAt: new Date(),
        // Le numéro de facture naît ici, pas à la commande : la série doit
        // rester continue, et une commande peut mourir avant d'être payée.
        invoiceNumber: order.invoiceNumber ?? (await nextInvoiceNumber(tx)),
        stripeChargeId: meta?.chargeId ?? order.stripeChargeId,
        bankTransferPaidAt:
          order.paymentMethod === 'BANK_TRANSFER' ? new Date() : order.bankTransferPaidAt,
      },
      include: { items: true },
    });
  });
}

export async function cancelOrder(orderId: string, reason: string, userId?: string) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!order) throw ApiError.notFound('Commande introuvable');
    if (order.status === 'SHIPPED' || order.status === 'DELIVERED') {
      throw ApiError.conflict('Une commande expédiée ne peut plus être annulée.', 'ALREADY_SHIPPED');
    }
    if (order.status === 'CANCELLED') return order;

    // Les articles retournent en vente.
    for (const item of order.items) {
      if (item.productId) await stock.release(tx, item.productId, item.quantity);
    }

    return tx.order.update({
      where: { id: orderId },
      data: {
        status: 'CANCELLED',
        paymentStatus: order.paymentStatus === 'SUCCEEDED' ? 'REFUNDED' : 'CANCELLED',
        cancelledAt: new Date(),
        internalNote: [order.internalNote, `Annulée : ${reason}`].filter(Boolean).join('\n'),
      },
      include: { items: true },
    });
  });
}

export interface ShipInput {
  orderId: string;
  carrier: string;
  trackingNumber?: string;
  weightGrams?: number;
  userId: string;
}

export async function shipOrder(input: ShipInput) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: input.orderId },
      include: { items: true },
    });
    if (!order) throw ApiError.notFound('Commande introuvable');
    if (order.paymentStatus !== 'SUCCEEDED') {
      throw ApiError.conflict(
        "La commande n'est pas encore payée : expédition bloquée.",
        'NOT_PAID',
      );
    }
    if (order.status === 'SHIPPED' || order.status === 'DELIVERED') {
      throw ApiError.conflict('Commande déjà expédiée.', 'ALREADY_SHIPPED');
    }

    // Le stock réservé devient une sortie définitive.
    for (const item of order.items) {
      if (item.productId) {
        await stock.consume(tx, item.productId, item.quantity, order.id, input.userId);
      }
    }

    await tx.shipment.create({
      data: {
        orderId: order.id,
        carrier: input.carrier,
        trackingNumber: input.trackingNumber,
        trackingUrl: input.trackingNumber
          ? shipping.buildTrackingUrl(input.carrier, input.trackingNumber)
          : null,
        status: 'HANDED_OVER',
        weightGrams: input.weightGrams,
        shippedAt: new Date(),
      },
    });

    return tx.order.update({
      where: { id: order.id },
      data: { status: 'SHIPPED' },
      include: { items: true, shipments: true },
    });
  });
}

const ORDER_INCLUDE = {
  items: true,
  shipments: { orderBy: { createdAt: 'desc' as const } },
} satisfies Prisma.OrderInclude;

export async function getOrderForCustomer(orderNumber: string, userId?: string, email?: string) {
  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: ORDER_INCLUDE,
  });
  if (!order) throw ApiError.notFound('Commande introuvable');

  // Un invité peut consulter sa commande avec le couple numéro + e-mail.
  const ownedByUser = userId && order.userId === userId;
  const ownedByEmail = email && order.email === email.toLowerCase().trim();
  if (!ownedByUser && !ownedByEmail) throw ApiError.forbidden();

  return order;
}

export async function listCustomerOrders(userId: string, page = 1, perPage = 10) {
  const [total, items] = await Promise.all([
    prisma.order.count({ where: { userId } }),
    prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
      include: ORDER_INCLUDE,
    }),
  ]);

  return {
    items,
    pagination: { page, perPage, total, totalPages: Math.max(1, Math.ceil(total / perPage)) },
  };
}

/**
 * Libère les commandes par virement dont le délai de paiement est dépassé.
 * À déclencher par une tâche planifiée quotidienne.
 */
export async function releaseExpiredTransfers() {
  const expired = await prisma.order.findMany({
    where: {
      paymentMethod: 'BANK_TRANSFER',
      paymentStatus: 'AWAITING_TRANSFER',
      bankTransferDueAt: { lt: new Date() },
    },
    select: { id: true, orderNumber: true },
  });

  for (const order of expired) {
    await cancelOrder(order.id, 'Virement non reçu dans le délai imparti');
  }

  return expired.map((o) => o.orderNumber);
}
