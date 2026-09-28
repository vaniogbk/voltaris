import { NextResponse, type NextRequest } from 'next/server';

const LOCALES = ['fr', 'de'] as const;
const DEFAULT_LOCALE = 'fr';
const COOKIE = 'voltaris_locale';

/**
 * Choix de la langue à l'arrivée sur une URL sans préfixe.
 * Ordre de priorité : choix explicite mémorisé > Accept-Language > français.
 */
function detectLocale(request: NextRequest): string {
  const saved = request.cookies.get(COOKIE)?.value;
  if (saved && (LOCALES as readonly string[]).includes(saved)) return saved;

  const header = request.headers.get('accept-language') ?? '';
  const preferred = header
    .split(',')
    .map((part) => {
      const [tag, q] = part.trim().split(';q=');
      return { tag: tag.split('-')[0].toLowerCase(), q: q ? Number(q) : 1 };
    })
    .sort((a, b) => b.q - a.q)
    .find((entry) => (LOCALES as readonly string[]).includes(entry.tag));

  return preferred?.tag ?? DEFAULT_LOCALE;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const hasLocale = LOCALES.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );

  if (hasLocale) {
    // Mémorise la langue effectivement consultée pour les visites suivantes.
    const current = pathname.split('/')[1];
    const response = NextResponse.next();
    if (request.cookies.get(COOKIE)?.value !== current) {
      response.cookies.set(COOKIE, current, {
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
        sameSite: 'lax',
      });
    }
    return response;
  }

  const locale = detectLocale(request);
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === '/' ? '' : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  // On laisse passer les fichiers statiques, les images, le flux produit et
  // les routes techniques : `feed` porte déjà sa locale dans l'URL et ne doit
  // pas être redirigé.
  matcher: [
    '/((?!api|feed|_next/static|_next/image|produits|favicon.ico|robots.txt|sitemap.xml|.*\\.).*)',
  ],
};
