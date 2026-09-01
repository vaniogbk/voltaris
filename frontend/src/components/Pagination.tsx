import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getDictionary } from '@/i18n';
import type { Locale } from '@/lib/routes';
import { cn } from '@/lib/cn';

interface Props {
  locale: Locale;
  page: number;
  totalPages: number;
  /** Base de l'URL, paramètres de filtre déjà sérialisés et sans `page`. */
  basePath: string;
  search: string;
}

export function Pagination({ locale, page, totalPages, basePath, search }: Props) {
  if (totalPages <= 1) return null;
  const t = getDictionary(locale);

  const href = (target: number) => {
    const params = new URLSearchParams(search);
    if (target === 1) params.delete('page');
    else params.set('page', String(target));
    const query = params.toString();
    return query ? `${basePath}?${query}` : basePath;
  };

  // Fenêtre glissante autour de la page courante : on garde toujours les
  // extrémités accessibles, sans dérouler 40 numéros.
  const window = new Set<number>([1, totalPages, page - 1, page, page + 1]);
  const pages = [...window].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);

  return (
    <nav
      className="mt-10 flex items-center justify-center gap-1.5"
      aria-label={`${t.common.page} ${page} ${t.common.of} ${totalPages}`}
    >
      {page > 1 ? (
        <Link href={href(page - 1)} className="btn btn-outline btn-sm" rel="prev">
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline">{t.common.previous}</span>
        </Link>
      ) : (
        <span className="btn btn-outline btn-sm pointer-events-none opacity-40">
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline">{t.common.previous}</span>
        </span>
      )}

      {pages.map((target, index) => (
        <span key={target} className="flex items-center gap-1.5">
          {index > 0 && target - pages[index - 1] > 1 && (
            <span className="px-1 text-sm text-smoke-400">…</span>
          )}
          <Link
            href={href(target)}
            aria-current={target === page ? 'page' : undefined}
            className={cn(
              'btn btn-sm h-9 w-9 p-0 tabular',
              target === page ? 'btn-dark' : 'btn-outline',
            )}
          >
            {target}
          </Link>
        </span>
      ))}

      {page < totalPages ? (
        <Link href={href(page + 1)} className="btn btn-outline btn-sm" rel="next">
          <span className="hidden sm:inline">{t.common.next}</span>
          <ChevronRight className="h-4 w-4" />
        </Link>
      ) : (
        <span className="btn btn-outline btn-sm pointer-events-none opacity-40">
          <span className="hidden sm:inline">{t.common.next}</span>
          <ChevronRight className="h-4 w-4" />
        </span>
      )}
    </nav>
  );
}
