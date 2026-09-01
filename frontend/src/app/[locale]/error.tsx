'use client';

import { useEffect } from 'react';
import { AlertCircle } from 'lucide-react';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Le digest permet de retrouver la trace serveur correspondante.
    console.error('Erreur de rendu :', error.digest ?? error.message);
  }, [error]);

  return (
    <div className="container-page flex flex-col items-center py-28 text-center">
      <AlertCircle className="h-12 w-12 text-signal" aria-hidden="true" />
      <h1 className="mt-5 text-2xl font-bold tracking-tight text-ink">
        Une erreur est survenue · Ein Fehler ist aufgetreten
      </h1>
      <p className="mt-3 max-w-md text-sm text-smoke-500">
        Réessayez dans un instant. Si le problème persiste, contactez-nous.
        <br />
        Versuchen Sie es gleich erneut. Bleibt das Problem bestehen, kontaktieren Sie uns.
      </p>

      <button type="button" onClick={reset} className="btn btn-primary btn-lg mt-8">
        Réessayer · Erneut versuchen
      </button>

      {error.digest && (
        <p className="mt-6 font-mono text-xs text-smoke-400">ref. {error.digest}</p>
      )}
    </div>
  );
}
