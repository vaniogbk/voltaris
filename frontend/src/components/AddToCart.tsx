'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Check, Minus, Plus, ShoppingCart } from 'lucide-react';
import { useCart } from '@/lib/cart-store';
import type { ProductCard } from '@/lib/api';
import { getDictionary } from '@/i18n';
import { path, type Locale } from '@/lib/routes';

export function AddToCart({ product, locale }: { product: ProductCard; locale: Locale }) {
  const t = getDictionary(locale);
  const add = useCart((s) => s.add);
  const lines = useCart((s) => s.lines);
  const hydrated = useCart((s) => s.hydrated);

  const ceiling = product.isUnique ? 1 : Math.max(1, product.stock);
  const [quantity, setQuantity] = useState(1);
  const [justAdded, setJustAdded] = useState(false);

  const inCart = hydrated ? lines.find((l) => l.productId === product.id) : undefined;

  // Le message de confirmation ne doit pas rester affiché indéfiniment.
  useEffect(() => {
    if (!justAdded) return;
    const timer = setTimeout(() => setJustAdded(false), 3000);
    return () => clearTimeout(timer);
  }, [justAdded]);

  if (!product.inStock) {
    return (
      <div className="rounded-lg border border-smoke-200 bg-smoke-50 px-4 py-3.5 text-center">
        <p className="text-sm font-semibold text-smoke-600">{t.product.outOfStock}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        {!product.isUnique && (
          <div className="flex h-13 items-center rounded-lg border border-smoke-300">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1}
              className="flex h-full w-11 items-center justify-center text-smoke-600 transition-colors hover:text-ink disabled:opacity-30"
              aria-label={`${t.product.quantity} −`}
            >
              <Minus className="h-4 w-4" />
            </button>
            <span
              className="w-9 text-center text-sm font-semibold tabular"
              aria-live="polite"
              aria-label={t.product.quantity}
            >
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.min(ceiling, q + 1))}
              disabled={quantity >= ceiling}
              className="flex h-full w-11 items-center justify-center text-smoke-600 transition-colors hover:text-ink disabled:opacity-30"
              aria-label={`${t.product.quantity} +`}
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            add(product, quantity);
            setJustAdded(true);
          }}
          className="btn btn-primary btn-lg flex-1"
        >
          {justAdded ? (
            <>
              <Check className="h-5 w-5" />
              {t.product.added}
            </>
          ) : (
            <>
              <ShoppingCart className="h-5 w-5" />
              {t.product.addToCart}
            </>
          )}
        </button>
      </div>

      {inCart && (
        <Link href={path(locale, 'cart')} className="btn btn-outline btn-md w-full">
          {t.cart.title} ({inCart.quantity})
        </Link>
      )}
    </div>
  );
}
