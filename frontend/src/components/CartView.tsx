'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { useCart } from '@/lib/cart-store';
import { getDictionary } from '@/i18n';
import { formatPrice } from '@/lib/format';
import { path, type Locale } from '@/lib/routes';

export function CartView({ locale }: { locale: Locale }) {
  const t = getDictionary(locale);
  const { lines, hydrated, setQuantity, remove } = useCart();

  if (!hydrated) {
    return (
      <div className="container-page py-16">
        <div className="skeleton h-8 w-48 rounded-lg" />
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_22rem]">
          <div className="space-y-4">
            {[0, 1].map((i) => (
              <div key={i} className="skeleton h-32 rounded-card" />
            ))}
          </div>
          <div className="skeleton h-64 rounded-card" />
        </div>
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="container-page flex flex-col items-center py-24 text-center">
        <ShoppingBag className="h-12 w-12 text-smoke-300" aria-hidden="true" />
        <h1 className="mt-5 text-2xl font-bold tracking-tight text-ink">{t.cart.empty}</h1>
        <Link href={path(locale, 'catalog')} className="btn btn-primary btn-lg mt-7">
          {t.cart.emptyCta}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  const subtotal = lines.reduce((sum, l) => sum + l.priceCents * l.quantity, 0);
  const itemCount = lines.reduce((sum, l) => sum + l.quantity, 0);
  const savings = lines.reduce(
    (sum, l) => sum + (l.compareAtCents ? (l.compareAtCents - l.priceCents) * l.quantity : 0),
    0,
  );

  return (
    <div className="container-page py-8 lg:py-12">
      <h1 className="text-3xl font-bold tracking-tight text-ink">{t.cart.title}</h1>
      <p className="mt-1.5 text-sm text-smoke-500">
        {itemCount} {itemCount > 1 ? t.cart.items : t.cart.item}
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_22rem]">
        <ul className="space-y-4">
          {lines.map((line) => (
            <li key={line.productId} className="card flex gap-4 p-4">
              <Link
                href={path(locale, 'product', line.slug)}
                className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-smoke-100 sm:h-28 sm:w-28"
              >
                {line.imageUrl && (
                  <Image
                    src={line.imageUrl}
                    alt={line.imageAlt}
                    fill
                    sizes="112px"
                    className="object-cover"
                  />
                )}
              </Link>

              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-[0.9375rem] font-semibold text-ink">
                      <Link href={path(locale, 'product', line.slug)} className="hover:text-signal">
                        {line.name}
                      </Link>
                    </h2>
                    <p className="mt-0.5 text-xs text-smoke-400">
                      {t.product.reference} {line.sku}
                      {line.condition !== 'NEW' && ` · ${t.condition[line.condition]}`}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => remove(line.productId)}
                    className="btn btn-ghost h-8 w-8 shrink-0 p-0 text-smoke-400 hover:text-signal"
                    aria-label={`${t.cart.remove} — ${line.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-auto flex flex-wrap items-end justify-between gap-3 pt-3">
                  {line.isUnique ? (
                    <span className="badge-soft">{t.product.uniquePiece}</span>
                  ) : (
                    <div className="flex h-10 items-center rounded-lg border border-smoke-300">
                      <button
                        type="button"
                        onClick={() => setQuantity(line.productId, line.quantity - 1)}
                        className="flex h-full w-9 items-center justify-center text-smoke-600 hover:text-ink"
                        aria-label={`${t.product.quantity} −`}
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-8 text-center text-sm font-semibold tabular">
                        {line.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => setQuantity(line.productId, line.quantity + 1)}
                        disabled={line.quantity >= line.maxQuantity}
                        className="flex h-full w-9 items-center justify-center text-smoke-600 hover:text-ink disabled:opacity-30"
                        aria-label={`${t.product.quantity} +`}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}

                  <div className="text-right">
                    <p className="text-lg font-bold tabular text-ink">
                      {formatPrice(line.priceCents * line.quantity, locale, line.currency)}
                    </p>
                    {line.quantity > 1 && (
                      <p className="text-xs text-smoke-400 tabular">
                        {formatPrice(line.priceCents, locale, line.currency)} × {line.quantity}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <aside className="lg:sticky lg:top-[calc(var(--header-height)+1.5rem)] lg:self-start">
          <div className="card p-6">
            <h2 className="text-lg font-bold tracking-tight text-ink">
              {t.checkout.summary.title}
            </h2>

            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-smoke-500">{t.cart.subtotal}</dt>
                <dd className="font-semibold tabular text-ink">{formatPrice(subtotal, locale)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-smoke-500">{t.cart.shipping}</dt>
                <dd className="text-right text-xs text-smoke-400">{t.cart.shippingAtCheckout}</dd>
              </div>
              {savings > 0 && (
                <div className="flex justify-between text-signal">
                  <dt className="font-medium">{t.product.save}</dt>
                  <dd className="font-bold tabular">−{formatPrice(savings, locale)}</dd>
                </div>
              )}
            </dl>

            <div className="mt-5 flex items-baseline justify-between border-t border-smoke-200 pt-5">
              <span className="text-base font-bold text-ink">{t.cart.total}</span>
              <span className="text-2xl font-extrabold tabular text-ink">
                {formatPrice(subtotal, locale)}
              </span>
            </div>

            <Link href={path(locale, 'checkout')} className="btn btn-primary btn-lg mt-6 w-full">
              {t.cart.checkout}
              <ArrowRight className="h-4 w-4" />
            </Link>

            <Link
              href={path(locale, 'catalog')}
              className="btn btn-ghost btn-md mt-2 w-full text-smoke-500"
            >
              {t.cart.continue}
            </Link>

            <p className="mt-4 text-center text-xs text-smoke-400">{t.product.deliveryOnly}</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
