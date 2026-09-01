import { AlertTriangle } from 'lucide-react';
import { RichText } from './RichText';
import { hasPlaceholders, type StaticPage } from '@/content/pages';
import { fillCompanyPlaceholders, missingCompanyFields } from '@/config/company';
import type { Locale } from '@/lib/routes';

export function StaticPageView({ page, locale }: { page: StaticPage; locale: Locale }) {
  // Les valeurs de frontend/src/config/company.ts sont injectées ici : les
  // textes juridiques restent lisibles en un seul fichier, l'identité de la
  // société n'est saisie qu'une fois.
  const intro = fillCompanyPlaceholders(page.intro);
  const body = fillCompanyPlaceholders(page.body);

  const missing = page.needsCompanyData ? missingCompanyFields() : [];
  const incomplete = missing.length > 0 && hasPlaceholders({ ...page, intro, body });

  return (
    <article className="container-page max-w-3xl py-12 lg:py-16">
      <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">{page.title}</h1>
      <p className="mt-4 text-lg leading-relaxed text-smoke-600">{intro}</p>

      {incomplete && (
        <div className="mt-8 flex gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <div className="leading-relaxed">
            <p>
              {locale === 'de'
                ? 'Diese Seite ist noch unvollständig. Tragen Sie Ihre Firmendaten in frontend/src/config/company.ts ein — ein einziges Feld pro Angabe, alle Rechtstexte übernehmen sie automatisch.'
                : 'Cette page est encore incomplète. Renseignez vos données de société dans frontend/src/config/company.ts — un seul champ par information, toutes les pages juridiques les reprennent.'}
            </p>
            <p className="mt-2 font-mono text-xs">{missing.join(' · ')}</p>
          </div>
        </div>
      )}

      <RichText content={body} className="mt-10" />
    </article>
  );
}
