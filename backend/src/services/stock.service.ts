import type { Prisma, StockReason } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { ApiError } from '../lib/errors.js';

type Tx = Prisma.TransactionClient;

interface MovementInput {
  productId: string;
  delta: number;
  reason: StockReason;
  note?: string;
  orderId?: string;
  userId?: string;
}

/**
 * Applique un mouvement de stock et journalise la trace correspondante.
 * Toute variation de stock passe par ici : l'historique StockMovement doit
 * toujours pouvoir reconstituer la valeur courante de `Product.stock`.
 */
export async function applyMovement(tx: Tx, input: MovementInput) {
  const product = await tx.product.findUnique({
    where: { id: input.productId },
    select: { id: true, stock: true, sku: true },
  });
  if (!product) throw ApiError.notFound(`Produit ${input.productId} introuvable`);

  const stockAfter = product.stock + input.delta;
  if (stockAfter < 0) {
    throw ApiError.conflict(
      `Stock insuffisant pour ${product.sku} (disponible : ${product.stock}).`,
      'INSUFFICIENT_STOCK',
    );
  }

  await tx.product.update({ where: { id: product.id }, data: { stock: stockAfter } });
  await tx.stockMovement.create({
    data: {
      productId: product.id,
      delta: input.delta,
      stockAfter,
      reason: input.reason,
      note: input.note,
      orderId: input.orderId,
      userId: input.userId,
    },
  });

  return stockAfter;
}

/**
 * Réserve du stock pour une commande en attente de paiement.
 * On incrémente `reservedStock` sans toucher à `stock` : la marchandise reste
 * en inventaire mais n'est plus vendable tant que la commande est ouverte.
 */
export async function reserve(tx: Tx, productId: string, quantity: number) {
  const product = await tx.product.findUnique({
    where: { id: productId },
    select: { stock: true, reservedStock: true, sku: true },
  });
  if (!product) throw ApiError.notFound('Produit introuvable');

  const available = product.stock - product.reservedStock;
  if (available < quantity) {
    throw ApiError.conflict(
      `Stock insuffisant pour ${product.sku} : ${available} disponible(s), ${quantity} demandé(s).`,
      'INSUFFICIENT_STOCK',
      { sku: product.sku, available, requested: quantity },
    );
  }

  await tx.product.update({
    where: { id: productId },
    data: { reservedStock: { increment: quantity } },
  });
}

/** Libère une réservation (commande annulée ou virement non reçu dans les délais). */
export async function release(tx: Tx, productId: string, quantity: number) {
  const product = await tx.product.findUnique({
    where: { id: productId },
    select: { reservedStock: true },
  });
  if (!product) return;
  await tx.product.update({
    where: { id: productId },
    data: { reservedStock: { decrement: Math.min(quantity, product.reservedStock) } },
  });
}

/**
 * Sortie définitive de stock à l'expédition : la réservation devient un
 * décrément réel de l'inventaire.
 */
export async function consume(tx: Tx, productId: string, quantity: number, orderId: string, userId?: string) {
  await release(tx, productId, quantity);
  await applyMovement(tx, {
    productId,
    delta: -quantity,
    reason: 'ORDER_SHIPPED',
    orderId,
    userId,
    note: 'Expédition de commande',
  });
}

/** Ajustement manuel depuis le back-office (inventaire, casse, retour…). */
export async function adjust(
  productId: string,
  delta: number,
  reason: StockReason,
  userId: string,
  note?: string,
) {
  return prisma.$transaction((tx) => applyMovement(tx, { productId, delta, reason, userId, note }));
}

/** Positionne le stock à une valeur absolue, en journalisant l'écart. */
export async function setAbsolute(productId: string, target: number, userId: string, note?: string) {
  return prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({
      where: { id: productId },
      select: { stock: true },
    });
    if (!product) throw ApiError.notFound('Produit introuvable');
    const delta = target - product.stock;
    if (delta === 0) return product.stock;
    return applyMovement(tx, {
      productId,
      delta,
      reason: 'MANUAL_ADJUSTMENT',
      userId,
      note: note ?? `Mise à niveau du stock à ${target}`,
    });
  });
}

export async function getMovements(productId: string, limit = 50) {
  return prisma.stockMovement.findMany({
    where: { productId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      user: { select: { firstName: true, lastName: true, email: true } },
      order: { select: { orderNumber: true } },
    },
  });
}

/** Produits sous le seuil d'alerte, pour le tableau de bord admin. */
export async function getLowStock() {
  const rows = await prisma.$queryRaw<
    Array<{ id: string; sku: string; stock: number; reservedStock: number; lowStockAlert: number }>
  >`
    SELECT id, sku, stock, "reservedStock", "lowStockAlert"
    FROM "Product"
    WHERE status = 'PUBLISHED' AND (stock - "reservedStock") <= "lowStockAlert"
    ORDER BY (stock - "reservedStock") ASC
    LIMIT 50
  `;
  return rows;
}
