'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Check, Landmark, RotateCcw } from 'lucide-react';
import { apiFetch, ApiError } from '@/lib/api';
import { getDictionary } from '@/i18n';
import { formatDateTime, formatIban } from '@/lib/format';
import type { Locale } from '@/lib/routes';

interface BankAccount {
  holder: string;
  iban: string;
  bic: string;
  bankName: string;
  dueDays: number;
  source: 'database' | 'env';
  updatedAt: string | null;
}

const EMPTY = { holder: '', iban: '', bic: '', bankName: '', dueDays: 7 };

/**
 * Compte destinataire des virements clients.
 *
 * Ces coordonnées sont celles affichées sur la page de confirmation et
 * encodées dans le code QR. Elles vivaient dans le fichier d'environnement :
 * en changer imposait un redéploiement. Elles sont désormais éditables ici et
 * prennent effet immédiatement.
 */
export function AdminBankAccount({
  locale,
  accessToken,
  canEdit,
}: {
  locale: Locale;
  accessToken: string;
  canEdit: boolean;
}) {
  const t = getDictionary(locale);

  const [account, setAccount] = useState<BankAccount | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<{ account: BankAccount }>('/api/admin/settings/bank', {
        accessToken,
      });
      setAccount(data.account);
      setForm({
        holder: data.account.holder,
        iban: data.account.iban,
        bic: data.account.bic,
        bankName: data.account.bankName,
        dueDays: data.account.dueDays,
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t.common.error);
    }
  }, [accessToken, t.common.error]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!saved) return;
    const timer = setTimeout(() => setSaved(false), 4000);
    return () => clearTimeout(timer);
  }, [saved]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const data = await apiFetch<{ account: BankAccount }>('/api/admin/settings/bank', {
        method: 'PUT',
        accessToken,
        body: { ...form, dueDays: Number(form.dueDays) },
      });
      setAccount(data.account);
      setEditing(false);
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t.common.error);
    } finally {
      setBusy(false);
    }
  }

  async function reset() {
    setBusy(true);
    setError(null);
    try {
      await apiFetch('/api/admin/settings/bank', { method: 'DELETE', accessToken });
      setEditing(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t.common.error);
    } finally {
      setBusy(false);
    }
  }

  if (!account) return <div className="skeleton h-56 rounded-card" />;

  const set = (patch: Partial<typeof form>) => setForm((c) => ({ ...c, ...patch }));

  return (
    <section className="card p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight text-ink">
            <Landmark className="h-5 w-5 text-signal" aria-hidden="true" />
            {t.admin.bankAccount.title}
          </h2>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-smoke-500">
            {t.admin.bankAccount.intro}
          </p>
        </div>

        {canEdit && !editing && (
          <button type="button" onClick={() => setEditing(true)} className="btn btn-dark btn-sm">
            {t.admin.bankAccount.change}
          </button>
        )}
      </div>

      {saved && (
        <p className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          <Check className="h-4 w-4" aria-hidden="true" />
          {t.admin.bankAccount.saved}
        </p>
      )}

      {error && (
        <p role="alert" className="mt-4 rounded-lg bg-signal-soft px-4 py-3 text-sm font-medium text-signal">
          {error}
        </p>
      )}

      {!editing ? (
        <>
          <dl className="mt-5 divide-y divide-smoke-200 rounded-lg border border-smoke-200 bg-canvas-raised">
            <Row label={t.confirmation.holder} value={account.holder} />
            <Row label={t.confirmation.bank} value={account.bankName} />
            <Row label={t.confirmation.iban} value={formatIban(account.iban)} mono />
            <Row label={t.confirmation.bic} value={account.bic} mono />
            <Row
              label={t.admin.bankAccount.dueDays}
              value={`${account.dueDays} ${t.admin.bankAccount.days}`}
            />
          </dl>

          <p className="mt-3 text-xs text-smoke-400">
            {account.source === 'env'
              ? t.admin.bankAccount.fromEnv
              : `${t.admin.bankAccount.fromForm}${
                  account.updatedAt ? ` — ${formatDateTime(account.updatedAt, locale)}` : ''
                }`}
          </p>

          {!canEdit && (
            <p className="mt-3 text-xs text-smoke-500">{t.admin.bankAccount.adminOnly}</p>
          )}
        </>
      ) : (
        <form onSubmit={save} className="mt-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="field-label">{t.confirmation.holder}</span>
              <input
                required
                maxLength={70}
                value={form.holder}
                onChange={(e) => set({ holder: e.target.value })}
                className="field"
              />
              <span className="field-hint">{t.admin.bankAccount.holderHint}</span>
            </label>

            <label className="block">
              <span className="field-label">{t.confirmation.bank}</span>
              <input
                required
                maxLength={120}
                value={form.bankName}
                onChange={(e) => set({ bankName: e.target.value })}
                className="field"
              />
            </label>
          </div>

          <label className="block">
            <span className="field-label">{t.confirmation.iban}</span>
            <input
              required
              value={form.iban}
              onChange={(e) => set({ iban: e.target.value.toUpperCase() })}
              placeholder="FR76 3000 1007 9412 3456 7890 185"
              className="field font-mono"
            />
            <span className="field-hint">{t.admin.bankAccount.ibanHint}</span>
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="field-label">{t.confirmation.bic}</span>
              <input
                required
                value={form.bic}
                onChange={(e) => set({ bic: e.target.value.toUpperCase() })}
                placeholder="BDFEFRPPCCT"
                className="field font-mono"
              />
            </label>

            <label className="block">
              <span className="field-label">{t.admin.bankAccount.dueDays}</span>
              <input
                required
                type="number"
                min={1}
                max={30}
                value={form.dueDays}
                onChange={(e) => set({ dueDays: Number(e.target.value) })}
                className="field"
              />
              <span className="field-hint">{t.admin.bankAccount.dueDaysHint}</span>
            </label>
          </div>

          <p className="flex gap-2.5 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm leading-relaxed text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {t.admin.bankAccount.warning}
          </p>

          <div className="flex flex-wrap gap-3 border-t border-smoke-200 pt-4">
            <button type="submit" disabled={busy} className="btn btn-primary btn-md">
              {busy ? t.common.loading : t.admin.save}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setError(null);
                void load();
              }}
              className="btn btn-outline btn-md"
            >
              {t.admin.cancel}
            </button>
            {account.source === 'database' && (
              <button
                type="button"
                disabled={busy}
                onClick={reset}
                className="btn btn-ghost btn-md ml-auto text-smoke-500"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                {t.admin.bankAccount.reset}
              </button>
            )}
          </div>
        </form>
      )}
    </section>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <dt className="text-xs font-medium uppercase tracking-wide text-smoke-500">{label}</dt>
      <dd className={`text-right text-sm font-medium text-ink${mono ? ' font-mono' : ''}`}>
        {value}
      </dd>
    </div>
  );
}
