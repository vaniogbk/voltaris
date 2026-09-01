import Image from 'next/image';
import Link from 'next/link';
import { QuickAddButton } from './QuickAddButton';
import type { ProductCard as Product } from '@/lib/api';
import type { Locale } from '@/lib/routes';
import { path } from '@/lib/routes';
import { formatPrice } from '@/lib/format';
import { getDictionary, interpolate } from '@/i18n';
import { cn } from '@/lib/cn';

interface Props {
  product: Product;
  locale: Locale;
  priority?: boolean;
  className?: string;
}

export function ProductCard({ product, locale, priority = false, className }: Props) {
  const t = getDictionary(locale);
  const href = path(locale, 'product', product.slug);
  const soldOut = !product.inStock;

  return (
    <article
      className={cn(
        'card-interactive group relative flex flex-col overflow-hidden',
        soldOut && 'opacity-70',
        className,
      )}
    >
      <Link href={href} className="relative block aspect-[4/3] overflow-hidden bg-smoke-100">
        {product.image ? (
          <Image
            src={product.image.url}
            alt={product.image.alt}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            priority={priority}
            className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-smoke-400">
            {product.brand}
          </div>
        )}

        <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap gap-1.5">
          {product.discountPercent != null && (
            <span className="badge-signal">−{product.discountPercent}%</span>
          )}
          {product.condition !== 'NEW' && (
            <span className="badge-dark">{t.condition[product.condition]}</span>
          )}
          {product.isUnique && !soldOut && (
            <span className="badge-outline">{t.product.uniquePiece}</span>
          )}
        </div>

        {soldOut && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-[1px]">
            <span className="badge-dark text-xs">{t.product.outOfStock}</span>
          </div>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-4">
        {product.category && (
          <p className="text-2xs font-semibold uppercase tracking-wider text-smoke-400">
            {product.category.name}
          </p>
        )}

        <h3 className="mt-1.5 text-[0.9375rem] font-semibold leading-snug text-ink">
          <Link href={href} className="after:absolute after:inset-0 after:content-['']">
            {product.name}
          </Link>
        </h3>

        {product.shortDescription && (
          <p className="mt-2 line-clamp-2 text-[0.8125rem] leading-relaxed text-smoke-500">
            {product.shortDescription}
          </p>
        )}

        <div className="mt-auto pt-4">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span
                  className={cn(
                    'text-xl font-bold tabular',
                    product.discountPercent != null ? 'text-signal' : 'text-ink',
                  )}
                >
                  {formatPrice(product.priceCents, locale, product.currency)}
                </span>
                {product.compareAtCents != null && (
                  <span className="text-sm text-smoke-400 line-through tabular">
                    {formatPrice(product.compareAtCents, locale, product.currency)}
                  </span>
                )}
              </div>

              <p className="mt-1 text-2xs text-smoke-400">
                {product.vatMode === 'MARGIN' ? t.product.vatMargin : t.product.vatStandard}
              </p>
            </div>

            <QuickAddButton product={product} locale={locale} />
          </div>

          {!soldOut && product.stock <= 3 && (
            <p className="mt-2 text-xs font-semibold text-signal">
              {product.stock === 1
                ? t.product.lastOne
                : interpolate(t.product.onlyLeft, { n: product.stock })}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}
