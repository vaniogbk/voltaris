import type { Metadata } from 'next';
import { Suspense } from 'react';
import { LoginForm } from '@/components/account/AuthForms';
import { getDictionary } from '@/i18n';
import type { Locale } from '@/lib/routes';

export function generateMetadata({ params }: { params: { locale: Locale } }): Metadata {
  return {
    title: getDictionary(params.locale).account.login.title,
    robots: { index: false, follow: false },
  };
}

export default function LoginPage({ params }: { params: { locale: Locale } }) {
  // useSearchParams impose une frontière Suspense pour le rendu statique.
  return (
    <Suspense fallback={<div className="container-page max-w-md py-20"><div className="skeleton h-80 rounded-card" /></div>}>
      <LoginForm locale={params.locale} />
    </Suspense>
  );
}
