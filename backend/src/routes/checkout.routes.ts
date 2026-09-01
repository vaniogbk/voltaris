import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { asyncHandler, validate } from '../middleware/validate.js';
import { optionalAuth } from '../middleware/auth.js';
import * as orderService from '../services/order.service.js';
import * as paymentService from '../services/payment.service.js';
import * as shippingService from '../services/shipping.service.js';
import { prisma } from '../lib/prisma.js';
import { ApiError } from '../lib/errors.js';

export const checkoutRouter = Router();

const checkoutLimiter = rateLimit({ windowMs: 60_000, limit: 20, standardHeaders: 'draft-7' });

const addressSchema = z.object({
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  company: z.string().max(120).optional(),
  line1: z.string().min(1).max(160),
  line2: z.string().max(160).optional(),
  postalCode: z.string().min(4).max(12),
  city: z.string().min(1).max(80),
  country: z.enum(['FR', 'DE']),
  phone: z.string().max(30).optional(),
});

const cartSchema = z
  .array(
    z.object({
      productId: z.string().min(1),
      quantity: z.number().int().min(1).max(20),
    }),
  )
  .min(1)
  .max(30);

/** Recalcule le panier côté serveur : totaux, TVA et frais de port. */
checkoutRouter.post(
  '/quote',
  validate(z.object({ items: cartSchema, country: z.enum(['FR', 'DE']) })),
  asyncHandler(async (req, res) => {
    const priced = await orderService.priceCart(req.body.items, req.body.country);
    res.json({
      lines: priced.lines,
      subtotalCents: priced.subtotalCents,
      shipping: priced.shipping,
      vatCents: priced.vatCents,
      totalCents: priced.totalCents,
      totalWeightGrams: priced.totalWeightGrams,
    });
  }),
);

checkoutRouter.get(
  '/payment-methods',
  asyncHandler(async (_req, res) => {
    res.json({ methods: paymentService.availablePaymentMethods() });
  }),
);

checkoutRouter.get(
  '/shipping-rates',
  validate(z.object({ country: z.enum(['FR', 'DE']).optional() }), 'query'),
  asyncHandler(async (req, res) => {
    const { country } = req.query as { country?: string };
    res.json({ rates: await shippingService.listRates(country) });
  }),
);

const createOrderSchema = z.object({
  items: cartSchema,
  email: z.string().email(),
  phone: z.string().max(30).optional(),
  locale: z.enum(['fr', 'de']).default('fr'),
  shippingAddress: addressSchema,
  billingAddress: addressSchema.optional(),
  paymentMethod: z.enum(['CARD', 'BANK_TRANSFER']),
  customerNote: z.string().max(1000).optional(),
  acceptTerms: z.literal(true, {
    errorMap: () => ({ message: 'Vous devez accepter les conditions générales de vente.' }),
  }),
});

/**
 * Crée la commande, réserve le stock, puis renvoie ce dont le front a besoin
 * pour finaliser : client_secret Stripe, ou coordonnées de virement SEPA.
 */
checkoutRouter.post(
  '/orders',
  checkoutLimiter,
  optionalAuth,
  validate(createOrderSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof createOrderSchema>;

    const { order } = await orderService.createOrder({
      items: body.items,
      email: body.email,
      phone: body.phone,
      locale: body.locale,
      shippingAddress: body.shippingAddress,
      billingAddress: body.billingAddress,
      paymentMethod: body.paymentMethod,
      customerNote: body.customerNote,
      userId: req.auth?.sub,
    });

    if (body.paymentMethod === 'CARD') {
      const intent = await paymentService.createOrRetrievePaymentIntent(order.id);
      return res.status(201).json({
        order: publicOrder(order),
        payment: { method: 'CARD', clientSecret: intent.clientSecret },
      });
    }

    return res.status(201).json({
      order: publicOrder(order),
      payment: {
        method: 'BANK_TRANSFER',
        instructions: await paymentService.bankTransferInstructions(order),
      },
    });
  }),
);

/** Réémet le client_secret si le client revient sur une commande carte non finalisée. */
checkoutRouter.post(
  '/orders/:orderNumber/payment-intent',
  checkoutLimiter,
  validate(z.object({ email: z.string().email() })),
  asyncHandler(async (req, res) => {
    const order = await prisma.order.findUnique({
      where: { orderNumber: req.params.orderNumber },
    });
    if (!order || order.email !== req.body.email.toLowerCase().trim()) {
      throw ApiError.notFound('Commande introuvable');
    }
    const intent = await paymentService.createOrRetrievePaymentIntent(order.id);
    res.json({ clientSecret: intent.clientSecret });
  }),
);

/** Page de confirmation : accessible via numéro de commande + e-mail. */
checkoutRouter.get(
  '/orders/:orderNumber',
  optionalAuth,
  validate(z.object({ email: z.string().email().optional() }), 'query'),
  asyncHandler(async (req, res) => {
    const { email } = req.query as { email?: string };
    const order = await orderService.getOrderForCustomer(
      req.params.orderNumber,
      req.auth?.sub,
      email,
    );

    res.json({
      order: publicOrder(order),
      items: order.items,
      shipments: order.shipments,
      payment:
        order.paymentMethod === 'BANK_TRANSFER'
          ? {
              method: 'BANK_TRANSFER',
              instructions: await paymentService.bankTransferInstructions(order),
            }
          : { method: 'CARD' },
    });
  }),
);

/**
 * Vue client d'une commande.
 *
 * Liste explicite plutôt qu'une diffusion d'objet : la commande porte des
 * champs qui ne doivent jamais sortir — note interne, identifiant utilisateur,
 * références Stripe. Un `...rest` les exposerait dès leur ajout au modèle.
 */
function publicOrder(order: {
  orderNumber: string;
  invoiceNumber: string | null;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  currency: string;
  subtotalCents: number;
  shippingCents: number;
  discountCents: number;
  totalCents: number;
  vatCents: number;
  email: string;
  phone: string | null;
  country: string;
  locale: string;
  createdAt: Date;
  paidAt: Date | null;
  shippingAddress: unknown;
  billingAddress: unknown;
}) {
  return {
    orderNumber: order.orderNumber,
    invoiceNumber: order.invoiceNumber,
    status: order.status,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    currency: order.currency,
    subtotalCents: order.subtotalCents,
    shippingCents: order.shippingCents,
    discountCents: order.discountCents,
    totalCents: order.totalCents,
    vatCents: order.vatCents,
    email: order.email,
    phone: order.phone,
    country: order.country,
    locale: order.locale,
    createdAt: order.createdAt,
    paidAt: order.paidAt,
    shippingAddress: order.shippingAddress,
    billingAddress: order.billingAddress,
  };
}
