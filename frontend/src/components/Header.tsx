'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronDown, Menu, PackageSearch, Search, ShoppingCart, X } from 'lucide-react';
import { Logo } from './Logo';
import { useCart } from '@/lib/cart-store';
import { getDictionary } from '@/i18n';
import { home, path, type Locale } from '@/lib/routes';
import type { Category } from '@/lib/api';
import { cn } from '@/lib/cn';

interface Props {
  locale: Locale;
  categories: Category[];
}

export function Header({ locale, categories }: Props) {
  const t = getDictionary(locale);
  const router = useRouter();
  const pathname = usePathname();

  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [query, setQuery] = useState('');
  const catalogRef = useRef<HTMLDivElement>(null);

  const lines = useCart((s) => s.lines);
  const hydrated = useCart((s) => s.hydrated);
  const count = hydrated ? lines.reduce((sum, l) => sum + l.quantity, 0) : 0;

  const dealsHref = `${path(locale, 'catalog')}?condition=USED,REFURBISHED`;

  // Aucun panneau ne doit survivre à un changement de page.
  useEffect(() => {
    setMenuOpen(false);
    setSearchOpen(false);
    setCatalogOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  // Le menu Catalogue se ferme au clic extérieur et à la touche Échap.
  useEffect(() => {
    if (!catalogOpen) return;

    function onPointerDown(event: MouseEvent) {
      if (!catalogRef.current?.contains(event.target as Node)) setCatalogOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setCatalogOpen(false);
    }

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [catalogOpen]);

  function submitSearch(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    router.push(`${path(locale, 'catalog')}?q=${encodeURIComponent(trimmed)}`);
    setSearchOpen(false);
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-smoke-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
        <div className="container-page flex h-[var(--header-height)] items-center gap-4">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="btn btn-ghost -ml-2 h-10 w-10 p-0 lg:hidden"
            aria-label={t.nav.menu}
          >
            <Menu className="h-5 w-5" />
          </button>

          <Link href={home(locale)} aria-label={t.meta.siteName}>
            <Logo />
          </Link>

          {/* Deux entrées seulement : l'accueil, et le catalogue qui déroule
              les catégories. Une barre courte reste lisible dans les deux
              langues, où les libellés allemands sont bien plus longs. */}
          <nav className="ml-8 hidden items-center gap-1 lg:flex">
            <Link
              href={home(locale)}
              className={cn(
                'rounded-lg px-3.5 py-2 text-sm font-medium transition-colors hover:bg-canvas hover:text-ink',
                pathname === home(locale) ? 'text-ink' : 'text-smoke-600',
              )}
            >
              {t.nav.home}
            </Link>

            <div className="relative" ref={catalogRef}>
              <button
                type="button"
                onClick={() => setCatalogOpen((v) => !v)}
                aria-expanded={catalogOpen}
                aria-haspopup="true"
                aria-label={t.nav.openCatalog}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors hover:bg-canvas hover:text-ink',
                  catalogOpen || pathname.includes(path(locale, 'catalog'))
                    ? 'text-ink'
                    : 'text-smoke-600',
                )}
              >
                {t.nav.catalog}
                <ChevronDown
                  className={cn('h-4 w-4 transition-transform', catalogOpen && 'rotate-180')}
                  aria-hidden="true"
                />
              </button>

              {catalogOpen && (
                <div className="absolute left-0 top-full z-50 mt-1.5 w-72 animate-fade-up overflow-hidden rounded-card border border-smoke-200 bg-white shadow-card-hover">
                  <ul className="py-1.5">
                    {categories.map((category) => (
                      <li key={category.id}>
                        <Link
                          href={`${path(locale, 'catalog')}?category=${category.slug}`}
                          className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-canvas"
                        >
                          {category.name}
                          <span className="text-xs tabular text-smoke-400">
                            {category.productCount}
                          </span>
                        </Link>
                      </li>
                    ))}

                    <li className="mt-1.5 border-t border-smoke-200 pt-1.5">
                      <Link
                        href={dealsHref}
                        className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm font-bold text-signal transition-colors hover:bg-signal-soft"
                      >
                        {t.nav.deals}
                      </Link>
                    </li>
                  </ul>
                </div>
              )}
            </div>
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-1">
            <form onSubmit={submitSearch} className="hidden xl:block">
              <label className="relative block">
                <span className="sr-only">{t.nav.search}</span>
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-smoke-400" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t.nav.search}
                  className="field h-10 w-60 pl-9 text-[0.8125rem]"
                />
              </label>
            </form>

            <button
              type="button"
              onClick={() => setSearchOpen((v) => !v)}
              className="btn btn-ghost h-10 w-10 p-0 xl:hidden"
              aria-label={t.nav.search}
              aria-expanded={searchOpen}
            >
              <Search className="h-5 w-5" />
            </button>


            {/* Le suivi de commande remplace l'espace client : la boutique ne
                crée plus de compte, on suit sa commande par numéro et e-mail. */}
            <Link
              href={path(locale, 'tracking')}
              className="btn btn-ghost hidden h-10 items-center gap-2 px-3 text-sm font-medium text-smoke-600 hover:text-ink sm:inline-flex"
            >
              <PackageSearch className="h-[18px] w-[18px]" />
              <span className="hidden md:inline">{t.nav.tracking}</span>
            </Link>
            <Link
              href={path(locale, 'tracking')}
              className="btn btn-ghost h-10 w-10 p-0 sm:hidden"
              aria-label={t.nav.tracking}
            >
              <PackageSearch className="h-5 w-5" />
            </Link>

            <Link
              href={path(locale, 'cart')}
              className="btn btn-ghost relative h-10 w-10 p-0"
              aria-label={`${t.nav.cart}${count ? ` (${count})` : ''}`}
            >
              <ShoppingCart className="h-5 w-5" />
              {count > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-signal px-1 text-[0.625rem] font-bold text-white">
                  {count > 9 ? '9+' : count}
                </span>
              )}
            </Link>
          </div>
        </div>

        {searchOpen && (
          <div className="border-t border-smoke-200 bg-white p-4 xl:hidden">
            <form onSubmit={submitSearch} className="container-page flex gap-2 px-0">
              <label className="relative flex-1">
                <span className="sr-only">{t.nav.search}</span>
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-smoke-400" />
                <input
                  autoFocus
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t.nav.search}
                  className="field pl-9"
                />
              </label>
              <button type="submit" className="btn btn-dark btn-md">
                {t.nav.search.split(' ')[0]}
              </button>
            </form>
          </div>
        )}
      </header>

      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-ink/50"
            aria-label={t.nav.close}
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-[min(20rem,85vw)] animate-fade-up flex-col bg-white shadow-2xl">
            <div className="flex h-[var(--header-height)] items-center justify-between border-b border-smoke-200 px-4">
              <Logo />
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="btn btn-ghost h-10 w-10 p-0"
                aria-label={t.nav.close}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto p-3">
              <Link
                href={home(locale)}
                className="flex rounded-lg px-4 py-3 text-sm font-semibold text-ink hover:bg-canvas"
              >
                {t.nav.home}
              </Link>

              <p className="px-4 pb-1 pt-4 text-2xs font-bold uppercase tracking-wider text-smoke-400">
                {t.nav.catalog}
              </p>
              {categories.map((category) => (
                <Link
                  key={category.id}
                  href={`${path(locale, 'catalog')}?category=${category.slug}`}
                  className="flex items-center justify-between rounded-lg px-4 py-3 text-sm font-medium text-ink hover:bg-canvas"
                >
                  {category.name}
                  <span className="text-xs text-smoke-400">{category.productCount}</span>
                </Link>
              ))}
              <Link
                href={dealsHref}
                className="mt-1 flex items-center justify-between rounded-lg bg-signal px-4 py-3 text-sm font-bold text-white"
              >
                {t.nav.deals}
              </Link>

              <hr className="my-3 border-smoke-200" />
              <Link
                href={path(locale, 'tracking')}
                className="flex rounded-lg px-4 py-3 text-sm font-medium text-ink hover:bg-canvas"
              >
                {t.nav.tracking}
              </Link>
              <Link
                href={path(locale, 'shipping')}
                className="flex rounded-lg px-4 py-3 text-sm font-medium text-ink hover:bg-canvas"
              >
                {t.footer.shipping}
              </Link>
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
