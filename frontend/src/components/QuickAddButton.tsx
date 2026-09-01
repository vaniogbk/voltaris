'use client';

import { useEffect, useState } from 'react';
import { Check, ShoppingCart } from 'lucide-react';
import { useCart } from '@/lib/cart-store';
import type { ProductCard } from '@/lib/api';
import { getDictionary } from '@/i18n';
import type { Locale } from '@/lib/routes';
import { cn } from '@/lib/cn';

/**
 * Ajout au panier depuis une liste, sans ouvrir la fiche produit.
 *
 * La carte entière est un lien : ce bouton doit donc passer au-dessus de la
 * zone cliquable (`z-10`) et arrêter la propagation, sans quoi le clic
 * naviguerait vers la fiche au lieu d'ajouter au panier.
 */
export function QuickAddButton({
  product,
  locale,
  className,
}: {
  product: ProductCard;
  locale: Locale;
  className?: string;
}) {
  const t = getDictionary(locale);
  const add = useCart((s) => s.add);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!added) return;
    const timer = setTimeout(() => setAdded(false), 2000);
    return () => clearTimeout(timer);
  }, [added]);

  if (!product.inStock) return null;

  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        add(product, 1);
        setAdded(true);
      }}
      aria-label={`${t.product.addToCart} — ${product.name}`}
      title={t.product.addToCart}
      className={cn('btn-quick relative z-10', added && 'border-signal bg-signal text-white', className)}
    >
      {added ? (
        <Check className="h-[18px] w-[18px]" aria-hidden="true" />
      ) : (
        <ShoppingCart className="h-[18px] w-[18px]" aria-hidden="true" />
      )}
      <span aria-live="polite" className="sr-only">
        {added ? t.product.added : ''}
      </span>
    </button>
  );
}
