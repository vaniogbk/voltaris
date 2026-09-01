import Link from 'next/link';

/**
 * La locale n'est pas accessible depuis une page not-found : Next la rend hors
 * du contexte de route. Les deux langues sont donc affichées côte à côte.
 */
export default function NotFound() {
  return (
    <div className="container-page flex flex-col items-center py-28 text-center">
      <p className="text-6xl font-extrabold tracking-tight text-signal">404</p>
      <h1 className="mt-4 text-2xl font-bold tracking-tight text-ink">
        Page introuvable · Seite nicht gefunden
      </h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-smoke-500">
        La page que vous cherchez a peut-être été déplacée, ou le produit n’est plus en ligne.
        <br />
        Die gesuchte Seite wurde möglicherweise verschoben, oder das Produkt ist nicht mehr online.
      </p>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/fr/catalogue" className="btn btn-primary btn-lg">
          Catalogue
        </Link>
        <Link href="/de/katalog" className="btn btn-outline btn-lg">
          Katalog
        </Link>
      </div>
    </div>
  );
}
