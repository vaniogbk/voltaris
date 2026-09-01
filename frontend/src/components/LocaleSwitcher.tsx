'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Languages } from 'lucide-react';
import { getDictionary } from '@/i18n';
import { switchLocale, type Locale } from '@/lib/routes';
import { cn } from '@/lib/cn';

/**
 * Bascule de langue, reléguée au pied de page.
 *
 * La langue est choisie automatiquement d'après celle du navigateur : le
 * visiteur n'a normalement rien à faire. Ce lien reste néanmoins nécessaire
 * pour le cas réel d'un germanophone sur une machine configurée en français,
 * qui n'aurait sinon aucun moyen d'atteindre la version allemande.
 *
 * Le choix est mémorisé par le middleware et prime ensuite sur la détection.
 */
export function LocaleSwitcher({ locale, className }: { locale: Locale; className?: string }) {
  const t = getDictionary(locale);
  const pathname = usePathname();
  const other: Locale = locale === 'fr' ? 'de' : 'fr';

  return (
    <Link
      href={switchLocale(pathname, other)}
      hrefLang={other}
      className={cn(
        'inline-flex items-center gap-1.5 text-xs text-smoke-400 transition-colors hover:text-ink',
        className,
      )}
      aria-label={t.common.changeLanguage}
    >
      <Languages className="h-3.5 w-3.5" aria-hidden="true" />
      {other === 'de' ? 'Deutsch' : 'Français'}
    </Link>
  );
}
