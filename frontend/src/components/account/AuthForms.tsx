'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { ApiError } from '@/lib/api';
import { getDictionary } from '@/i18n';
import { path, type Locale } from '@/lib/routes';

/**
 * Connexion réservée à l'équipe. La boutique ne crée plus de compte client :
 * les acheteurs suivent leur commande par numéro et e-mail.
 */
export function LoginForm({ locale }: { locale: Locale }) {
  const t = getDictionary(locale);
  const router = useRouter();
  const params = useSearchParams();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // `next` permet de revenir à la page demandée après connexion (checkout,
  // page admin…). On n'accepte que des chemins internes.
  const next = params.get('next');
  const destination = next?.startsWith('/') ? next : path(locale, 'account');

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(email.trim(), password);
      router.replace(destination);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t.common.error);
      setSubmitting(false);
    }
  }

  return (
    <AuthShell title={t.account.login.title} subtitle={t.account.login.subtitle}>
      <form onSubmit={submit} className="space-y-4">
        <label className="block">
          <span className="field-label">{t.account.login.email}</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="field"
          />
        </label>

        <label className="block">
          <span className="field-label">{t.account.login.password}</span>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="field"
          />
        </label>

        {error && (
          <p role="alert" className="rounded-lg bg-signal-soft px-4 py-3 text-sm font-medium text-signal">
            {error}
          </p>
        )}

        <button type="submit" disabled={submitting} className="btn btn-primary btn-lg w-full">
          {submitting ? t.common.loading : t.account.login.submit}
        </button>
      </form>

      <p className="mt-6 text-center text-xs leading-relaxed text-smoke-400">
        {t.account.login.staffOnly}
      </p>
    </AuthShell>
  );
}

function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="container-page max-w-md py-14 lg:py-20">
      <h1 className="text-3xl font-bold tracking-tight text-ink">{title}</h1>
      <p className="mt-2 text-sm text-smoke-500">{subtitle}</p>
      <div className="card mt-7 p-6 sm:p-7">{children}</div>
    </div>
  );
}
