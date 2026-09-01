'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { getDictionary } from '@/i18n';
import type { Locale } from '@/lib/routes';

const OPTIONS = ['relevance', 'price_asc', 'price_desc', 'newest', 'discount'] as const;

export function SortSelect({ locale }: { locale: Locale }) {
  const t = getDictionary(locale);
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const current = params.get('sort') ?? 'relevance';

  function change(value: string) {
    const next = new URLSearchParams(params.toString());
    if (value === 'relevance') next.delete('sort');
    else next.set('sort', value);
    next.delete('page');
    router.push(`${pathname}?${next.toString()}`, { scroll: false });
  }

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="hidden whitespace-nowrap text-smoke-500 sm:inline">
        {t.catalog.sort.label}
      </span>
      <select
        value={current}
        onChange={(e) => change(e.target.value)}
        className="field h-10 w-auto min-w-[11rem] text-sm"
      >
        {OPTIONS.map((option) => (
          <option key={option} value={option}>
            {t.catalog.sort[option]}
          </option>
        ))}
      </select>
    </label>
  );
}
