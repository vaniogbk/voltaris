import Link from 'next/link';
import { CreditCard, Landmark, ShieldCheck, Truck } from 'lucide-react';
import { Logo } from './Logo';
import { LocaleSwitcher } from './LocaleSwitcher';
import { getDictionary } from '@/i18n';
import { path, type Locale } from '@/lib/routes';
import type { Category } from '@/lib/api';

export function Footer({ locale, categories }: { locale: Locale; categories: Category[] }) {
  const t = getDictionary(locale);
  const year = new Date().getFullYear();

  return (
    <footer className="mt-24 border-t border-smoke-200 bg-canvas-raised text-ink">
      <div className="container-page grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-smoke-500">
            {t.footer.aboutBody}
          </p>

          <ul className="mt-6 space-y-2.5 text-sm text-smoke-600">
            <li className="flex items-center gap-2.5">
              <Truck className="h-4 w-4 shrink-0 text-signal" />
              {t.home.trust.shippingTitle}
            </li>
            <li className="flex items-center gap-2.5">
              <ShieldCheck className="h-4 w-4 shrink-0 text-signal" />
              {t.home.trust.checkedTitle}
            </li>
          </ul>
        </div>

        <nav aria-labelledby="footer-shop">
          <h2 id="footer-shop" className="text-sm font-bold uppercase tracking-wider text-ink">
            {t.footer.shopTitle}
          </h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li>
              <Link
                href={`${path(locale, 'catalog')}?condition=USED,REFURBISHED`}
                className="font-semibold text-signal hover:underline"
              >
                {t.nav.deals}
              </Link>
            </li>
            {categories.map((category) => (
              <li key={category.id}>
                <Link
                  href={`${path(locale, 'catalog')}?category=${category.slug}`}
                  className="text-smoke-500 transition-colors hover:text-ink"
                >
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-labelledby="footer-help">
          <h2 id="footer-help" className="text-sm font-bold uppercase tracking-wider text-ink">
            {t.footer.helpTitle}
          </h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li>
              <Link href={path(locale, 'shipping')} className="text-smoke-500 hover:text-ink">
                {t.footer.shipping}
              </Link>
            </li>
            <li>
              <Link href={path(locale, 'contact')} className="text-smoke-500 hover:text-ink">
                {t.footer.contact}
              </Link>
            </li>
            <li>
              <Link href={path(locale, 'tracking')} className="text-smoke-500 hover:text-ink">
                {t.nav.tracking}
              </Link>
            </li>
          </ul>
        </nav>

        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-ink">
            {t.checkout.payment.title}
          </h2>
          <div className="mt-4 flex items-start gap-3 text-smoke-500">
            <CreditCard className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <Landmark className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <span className="text-sm leading-relaxed">{t.footer.paymentMethods}</span>
          </div>
        </div>
      </div>

      {/* La mention « revendeur indépendant » a été retirée d'ici à la demande
          du client. Elle reste dans les mentions légales, où elle a sa place
          réglementaire et où elle protège tout autant. */}
      {/* La colonne « Informations » a été retirée à la demande du client.
          Les trois liens restent ici, en ligne : les mentions légales doivent
          être « directement et en permanence accessibles » (art. 6 III LCEN),
          et le § 5 DDG impose la même chose en Allemagne, où l'absence de lien
          vers l'Impressum est un motif de mise en demeure courant. */}
      <div className="border-t border-smoke-200">
        <div className="container-page flex flex-col gap-3 py-6 text-xs text-smoke-400 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {t.meta.siteName}. {t.footer.rights}
          </p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
            <LocaleSwitcher locale={locale} />
            <nav aria-label={t.footer.legalTitle} className="flex flex-wrap gap-x-5 gap-y-1.5">
            <Link href={path(locale, 'terms')} className="hover:text-ink">
              {t.footer.terms}
            </Link>
            <Link href={path(locale, 'legal')} className="hover:text-ink">
              {t.footer.legal}
            </Link>
              <Link href={path(locale, 'privacy')} className="hover:text-ink">
                {t.footer.privacy}
              </Link>
            </nav>
          </div>
        </div>
      </div>
    </footer>
  );
}
