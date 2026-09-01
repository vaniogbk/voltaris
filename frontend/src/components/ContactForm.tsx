'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Mail, Phone, Send } from 'lucide-react';
import { apiFetch, ApiError } from '@/lib/api';
import { COMPANY } from '@/config/company';
import { getDictionary } from '@/i18n';
import { path, type Locale } from '@/lib/routes';

interface FormState {
  name: string;
  email: string;
  orderNumber: string;
  subject: string;
  message: string;
  /** Piège à robots : masqué en CSS, jamais rempli par un humain. */
  website: string;
}

const EMPTY: FormState = {
  name: '',
  email: '',
  orderNumber: '',
  subject: '',
  message: '',
  website: '',
};

export function ContactForm({ locale }: { locale: Locale }) {
  const t = getDictionary(locale);

  const [form, setForm] = useState<FormState>(EMPTY);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // `null` tant que l'API n'a pas répondu : on n'affiche ni le formulaire ni
  // son absence avant de savoir, pour éviter un clignotement.
  const [enabled, setEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    apiFetch<{ formEnabled: boolean }>('/api/contact')
      .then((data) => setEnabled(data.formEnabled))
      .catch(() => setEnabled(false));
  }, []);

  const set = (patch: Partial<FormState>) => setForm((current) => ({ ...current, ...patch }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSending(true);
    setError(null);
    try {
      await apiFetch('/api/contact', {
        method: 'POST',
        body: { ...form, locale },
      });
      setSent(true);
      setForm(EMPTY);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t.common.error);
    } finally {
      setSending(false);
    }
  }

  if (enabled === null) {
    return <div className="skeleton mt-10 h-96 rounded-card" />;
  }

  // Sans Telegram configuré, la page contact serait vide : on affiche les
  // coordonnées directes à la place. Si elles ne sont pas non plus renseignées,
  // on renvoie vers les mentions légales, où elles sont obligatoires.
  if (!enabled) return <DirectContact locale={locale} />;

  if (sent) {
    return (
      <div className="card mt-10 flex flex-col items-center p-8 text-center">
        <CheckCircle2 className="h-10 w-10 text-emerald-600" aria-hidden="true" />
        <h2 className="mt-4 text-xl font-bold tracking-tight text-ink">{t.contact.sentTitle}</h2>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-smoke-600">{t.contact.sentBody}</p>
        <button type="button" onClick={() => setSent(false)} className="btn btn-outline btn-md mt-6">
          {t.contact.sendAnother}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card mt-10 space-y-4 p-6 sm:p-7">
      <h2 className="text-xl font-bold tracking-tight text-ink">{t.contact.formTitle}</h2>
      <p className="!mt-1 text-sm text-smoke-500">{t.contact.formSubtitle}</p>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="field-label">
            {t.contact.name}
            <span className="ml-0.5 text-signal">*</span>
          </span>
          <input
            required
            minLength={2}
            maxLength={80}
            autoComplete="name"
            value={form.name}
            onChange={(e) => set({ name: e.target.value })}
            className="field"
          />
        </label>

        <label className="block">
          <span className="field-label">
            {t.contact.email}
            <span className="ml-0.5 text-signal">*</span>
          </span>
          <input
            required
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={(e) => set({ email: e.target.value })}
            className="field"
          />
        </label>
      </div>

      <label className="block">
        <span className="field-label">{t.contact.orderNumber}</span>
        <input
          maxLength={40}
          placeholder="SM-2026-00000"
          value={form.orderNumber}
          onChange={(e) => set({ orderNumber: e.target.value })}
          className="field font-mono"
        />
        <span className="field-hint">{t.contact.orderNumberHint}</span>
      </label>

      <label className="block">
        <span className="field-label">
          {t.contact.subject}
          <span className="ml-0.5 text-signal">*</span>
        </span>
        <input
          required
          minLength={2}
          maxLength={120}
          value={form.subject}
          onChange={(e) => set({ subject: e.target.value })}
          className="field"
        />
      </label>

      <label className="block">
        <span className="field-label">
          {t.contact.message}
          <span className="ml-0.5 text-signal">*</span>
        </span>
        <textarea
          required
          minLength={10}
          maxLength={3000}
          rows={6}
          value={form.message}
          onChange={(e) => set({ message: e.target.value })}
          className="field"
        />
        <span className="field-hint">
          {form.message.length} / 3000 — {t.contact.messageHint}
        </span>
      </label>

      {/* Piège à robots. `aria-hidden` et `tabIndex` le retirent aussi des
          lecteurs d'écran et de la navigation au clavier. */}
      <div className="absolute left-[-9999px]" aria-hidden="true">
        <label>
          Site web
          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={form.website}
            onChange={(e) => set({ website: e.target.value })}
          />
        </label>
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-signal-soft px-4 py-3 text-sm font-medium text-signal">
          {error}
        </p>
      )}

      <button type="submit" disabled={sending} className="btn btn-primary btn-lg w-full">
        <Send className="h-4 w-4" />
        {sending ? t.contact.sending : t.contact.send}
      </button>

      <p className="!mt-3 text-xs leading-relaxed text-smoke-400">{t.contact.privacyNote}</p>
    </form>
  );
}

/** Repli affiché quand le formulaire n'est pas opérationnel. */
function DirectContact({ locale }: { locale: Locale }) {
  const t = getDictionary(locale);

  return (
    <div className="card mt-10 p-6 sm:p-7">
      <h2 className="text-xl font-bold tracking-tight text-ink">{t.contact.directTitle}</h2>

      {COMPANY.email || COMPANY.phone ? (
        <dl className="mt-5 space-y-4 text-sm">
          {COMPANY.email && (
            <div className="flex items-start gap-3">
              <Mail className="mt-0.5 h-4 w-4 shrink-0 text-signal" aria-hidden="true" />
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-smoke-500">
                  {t.contact.byEmail}
                </dt>
                <dd className="mt-0.5">
                  <a
                    href={`mailto:${COMPANY.email}`}
                    className="font-semibold text-ink hover:text-signal"
                  >
                    {COMPANY.email}
                  </a>
                </dd>
              </div>
            </div>
          )}

          {COMPANY.phone && (
            <div className="flex items-start gap-3">
              <Phone className="mt-0.5 h-4 w-4 shrink-0 text-signal" aria-hidden="true" />
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-smoke-500">
                  {t.contact.byPhone}
                </dt>
                <dd className="mt-0.5 text-ink">
                  <a href={`tel:${COMPANY.phone.replace(/\s/g, '')}`} className="font-semibold hover:text-signal">
                    {COMPANY.phone}
                  </a>
                  <span className="ml-2 text-smoke-500">{COMPANY.phoneHours}</span>
                </dd>
              </div>
            </div>
          )}
        </dl>
      ) : (
        <p className="mt-4 text-sm leading-relaxed text-smoke-600">
          {t.contact.directFallback}{' '}
          <Link href={path(locale, 'legal')} className="font-semibold text-signal hover:underline">
            {t.footer.legal}
          </Link>
          .
        </p>
      )}
    </div>
  );
}
