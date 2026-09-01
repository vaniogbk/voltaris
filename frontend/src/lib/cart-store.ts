'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { ProductCard } from './api';

export interface CartLine {
  productId: string;
  sku: string;
  slug: string;
  name: string;
  priceCents: number;
  compareAtCents: number | null;
  currency: string;
  condition: ProductCard['condition'];
  vatMode: ProductCard['vatMode'];
  imageUrl: string | null;
  imageAlt: string;
  quantity: number;
  /** Stock disponible au moment de l'ajout, pour borner le sélecteur de quantité. */
  maxQuantity: number;
  isUnique: boolean;
}

interface CartState {
  lines: CartLine[];
  hydrated: boolean;
  add: (product: ProductCard, quantity?: number) => void;
  setQuantity: (productId: string, quantity: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
  count: () => number;
  subtotalCents: () => number;
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      hydrated: false,

      add: (product, quantity = 1) =>
        set((state) => {
          // Une pièce unique ne peut jamais être commandée en plusieurs exemplaires.
          const ceiling = product.isUnique ? 1 : Math.max(1, product.stock);
          const existing = state.lines.find((l) => l.productId === product.id);

          if (existing) {
            return {
              lines: state.lines.map((l) =>
                l.productId === product.id
                  ? { ...l, quantity: Math.min(l.quantity + quantity, ceiling) }
                  : l,
              ),
            };
          }

          const line: CartLine = {
            productId: product.id,
            sku: product.sku,
            slug: product.slug,
            name: product.name,
            priceCents: product.priceCents,
            compareAtCents: product.compareAtCents,
            currency: product.currency,
            condition: product.condition,
            vatMode: product.vatMode,
            imageUrl: product.image?.url ?? null,
            imageAlt: product.image?.alt ?? product.name,
            quantity: Math.min(quantity, ceiling),
            maxQuantity: ceiling,
            isUnique: product.isUnique,
          };
          return { lines: [...state.lines, line] };
        }),

      setQuantity: (productId, quantity) =>
        set((state) => ({
          lines:
            quantity <= 0
              ? state.lines.filter((l) => l.productId !== productId)
              : state.lines.map((l) =>
                  l.productId === productId
                    ? { ...l, quantity: Math.min(quantity, l.maxQuantity) }
                    : l,
                ),
        })),

      remove: (productId) =>
        set((state) => ({ lines: state.lines.filter((l) => l.productId !== productId) })),

      clear: () => set({ lines: [] }),

      count: () => get().lines.reduce((sum, l) => sum + l.quantity, 0),

      subtotalCents: () => get().lines.reduce((sum, l) => sum + l.priceCents * l.quantity, 0),
    }),
    {
      name: 'stihl-market-cart',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ lines: state.lines }),
      onRehydrateStorage: () => (state) => {
        // Empêche le décalage de rendu serveur/client : les composants
        // attendent `hydrated` avant d'afficher un compteur.
        if (state) state.hydrated = true;
      },
    },
  ),
);
