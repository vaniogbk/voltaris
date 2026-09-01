'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Expand, X } from 'lucide-react';
import { getDictionary, interpolate } from '@/i18n';
import type { Locale } from '@/lib/routes';
import { cn } from '@/lib/cn';

interface GalleryImage {
  url: string;
  alt: string;
}

export function ProductGallery({
  images,
  locale,
  badge,
}: {
  images: GalleryImage[];
  locale: Locale;
  badge?: React.ReactNode;
}) {
  const t = getDictionary(locale);
  const [index, setIndex] = useState(0);
  const [zoomed, setZoomed] = useState(false);

  const total = images.length;

  const go = useCallback(
    (delta: number) => setIndex((current) => (current + delta + total) % total),
    [total],
  );

  // Navigation clavier : indispensable en plein écran, et confortable ailleurs.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'ArrowRight') go(1);
      if (event.key === 'ArrowLeft') go(-1);
      if (event.key === 'Escape') setZoomed(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go]);

  useEffect(() => {
    document.body.style.overflow = zoomed ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [zoomed]);

  if (total === 0) {
    return <div className="aspect-square rounded-card bg-smoke-100" aria-hidden="true" />;
  }

  const current = images[index];

  return (
    <div>
      <div className="group relative aspect-square overflow-hidden rounded-card border border-smoke-200 bg-smoke-50">
        <Image
          key={current.url}
          src={current.url}
          alt={current.alt}
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="animate-fade-up object-contain"
        />

        {badge && <div className="absolute left-4 top-4 flex flex-wrap gap-2">{badge}</div>}

        <button
          type="button"
          onClick={() => setZoomed(true)}
          className="absolute right-4 top-4 rounded-lg bg-white/90 p-2 text-ink shadow-sm backdrop-blur transition-opacity hover:bg-white"
          aria-label={t.product.gallery}
        >
          <Expand className="h-4 w-4" />
        </button>

        {total > 1 && (
          <>
            <GalleryArrow direction="prev" onClick={() => go(-1)} label={t.common.previous} />
            <GalleryArrow direction="next" onClick={() => go(1)} label={t.common.next} />
            <p className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-smoke-200 bg-white/90 px-2.5 py-1 text-xs font-medium text-smoke-600 backdrop-blur tabular">
              {interpolate(t.product.photoOf, { n: index + 1, total })}
            </p>
          </>
        )}
      </div>

      {total > 1 && (
        <ul className="no-scrollbar mt-3 flex gap-2.5 overflow-x-auto pb-1">
          {images.map((image, i) => (
            <li key={image.url}>
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={interpolate(t.product.photoOf, { n: i + 1, total })}
                aria-current={i === index}
                className={cn(
                  'relative block h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition-colors sm:h-20 sm:w-20',
                  i === index ? 'border-signal' : 'border-smoke-200 hover:border-smoke-400',
                )}
              >
                <Image
                  src={image.url}
                  alt=""
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              </button>
            </li>
          ))}
        </ul>
      )}

      {zoomed && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white/98 backdrop-blur-sm">
          <div className="flex justify-end p-4">
            <button
              type="button"
              onClick={() => setZoomed(false)}
              className="btn btn-outline h-10 w-10 p-0"
              aria-label={t.common.close}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="relative flex-1">
            <Image
              src={current.url}
              alt={current.alt}
              fill
              sizes="100vw"
              className="object-contain p-4"
            />
          </div>
          {total > 1 && (
            <div className="flex items-center justify-center gap-4 p-6">
              <button
                type="button"
                onClick={() => go(-1)}
                className="btn btn-outline h-11 w-11 p-0"
                aria-label={t.common.previous}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <span className="text-sm text-smoke-500 tabular">
                {index + 1} / {total}
              </span>
              <button
                type="button"
                onClick={() => go(1)}
                className="btn btn-outline h-11 w-11 p-0"
                aria-label={t.common.next}
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function GalleryArrow({
  direction,
  onClick,
  label,
}: {
  direction: 'prev' | 'next';
  onClick: () => void;
  label: string;
}) {
  const Icon = direction === 'prev' ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        'absolute top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-ink shadow-sm backdrop-blur',
        'opacity-0 transition-opacity hover:bg-white focus-visible:opacity-100 group-hover:opacity-100',
        direction === 'prev' ? 'left-3' : 'right-3',
      )}
    >
      <Icon className="h-5 w-5" />
    </button>
  );
}
