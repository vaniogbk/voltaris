'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  HelpCircle,
  Link2,
  Upload,
  X,
} from 'lucide-react';
import { AdminBankAccount } from './AdminBankAccount';
import { apiBase, apiFetch, ApiError } from '@/lib/api';
import { getDictionary } from '@/i18n';
import { formatDate, formatDateTime, formatPrice } from '@/lib/format';
import type { Locale } from '@/lib/routes';
import { cn } from '@/lib/cn';

type EntryStatus = 'MATCHED' | 'AMOUNT_MISMATCH' | 'ALREADY_PAID' | 'UNMATCHED' | 'IGNORED';

interface ReportEntry {
  fingerprint: string;
  amountCents: number;
  currency: string;
  bookedAt: string;
  debtorName: string | null;
  remittance: string | null;
  status: EntryStatus;
  orderNumber: string | null;
  note: string | null;
  duplicate: boolean;
}

interface ImportReport {
  statementId: string | null;
  fileName: string;
  accountIban: string | null;
  fromDate: string | null;
  toDate: string | null;
  dryRun: boolean;
  totals: {
    credits: number;
    debitsIgnored: number;
    duplicates: number;
    matched: number;
    amountMismatch: number;
    alreadyPaid: number;
    unmatched: number;
    collectedCents: number;
  };
  entries: ReportEntry[];
}

interface PendingEntry {
  id: string;
  amountCents: number;
  currency: string;
  bookedAt: string;
  debtorName: string | null;
  remittance: string | null;
  status: EntryStatus;
  note: string | null;
  statement: { fileName: string; createdAt: string };
  order: { orderNumber: string; totalCents: number; email: string } | null;
}

interface StatementRow {
  id: string;
  fileName: string;
  accountIban: string | null;
  creditCount: number;
  importedCount: number;
  matchedCount: number;
  createdAt: string;
  importedBy: { firstName: string; lastName: string } | null;
}

export function AdminBankImport({
  locale,
  accessToken,
  isAdmin,
}: {
  locale: Locale;
  accessToken: string;
  isAdmin: boolean;
}) {
  const t = getDictionary(locale);

  const [report, setReport] = useState<ImportReport | null>(null);
  const [pending, setPending] = useState<PendingEntry[]>([]);
  const [history, setHistory] = useState<StatementRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    try {
      const [p, h] = await Promise.all([
        apiFetch<{ entries: PendingEntry[] }>('/api/admin/bank/entries/pending', { accessToken }),
        apiFetch<{ items: StatementRow[] }>('/api/admin/bank/statements', { accessToken }),
      ]);
      setPending(p.entries);
      setHistory(h.items);
    } catch {
      /* la liste reste vide, l'import demeure possible */
    }
  }, [accessToken]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  /**
   * Le fichier est lu côté navigateur et envoyé en XML brut : pas de multipart,
   * donc aucun fichier temporaire côté serveur.
   */
  async function upload(file: File, dryRun: boolean) {
    setBusy(true);
    setError(null);
    try {
      const xml = await file.text();
      const url = `${apiBase()}/api/admin/bank/statements?fileName=${encodeURIComponent(file.name)}&dryRun=${dryRun}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/xml', Authorization: `Bearer ${accessToken}` },
        credentials: 'include',
        body: xml,
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new ApiError(
          response.status,
          payload?.error?.code ?? 'UNKNOWN',
          payload?.error?.message ?? t.common.error,
        );
      }

      setReport(payload.report);
      if (!dryRun) await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t.common.error);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  const [pendingFile, setPendingFile] = useState<File | null>(null);

  function choose(file: File | null) {
    setReport(null);
    setError(null);
    setPendingFile(file);
    if (file) void upload(file, true); // on simule systématiquement d'abord
  }

  return (
    <div className="space-y-8">
      <AdminBankAccount locale={locale} accessToken={accessToken} canEdit={isAdmin} />

      {/* ------------------------------------------------------- dépôt */}
      <section className="card p-6">
        <h2 className="text-lg font-bold tracking-tight text-ink">{t.admin.bank.importTitle}</h2>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-smoke-500">
          {t.admin.bank.importIntro}
        </p>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            choose(e.dataTransfer.files[0] ?? null);
          }}
          className={cn(
            'mt-5 flex flex-col items-center justify-center rounded-card border-2 border-dashed px-6 py-10 text-center transition-colors',
            dragging ? 'border-signal bg-signal-soft/40' : 'border-smoke-300 bg-smoke-50',
          )}
        >
          <Upload className="h-8 w-8 text-smoke-400" aria-hidden="true" />
          <p className="mt-3 text-sm font-medium text-ink">{t.admin.bank.dropHere}</p>
          <p className="mt-1 text-xs text-smoke-500">{t.admin.bank.dropHint}</p>

          <input
            ref={fileRef}
            type="file"
            accept=".xml,application/xml,text/xml"
            className="sr-only"
            onChange={(e) => choose(e.target.files?.[0] ?? null)}
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
            className="btn btn-dark btn-md mt-5"
          >
            {busy ? t.common.loading : t.admin.bank.chooseFile}
          </button>
        </div>

        {error && (
          <p role="alert" className="mt-4 rounded-lg bg-signal-soft px-4 py-3 text-sm font-medium text-signal">
            {error}
          </p>
        )}
      </section>

      {/* ------------------------------------------------------ rapport */}
      {report && (
        <ReportPanel
          report={report}
          locale={locale}
          busy={busy}
          onConfirm={() => pendingFile && upload(pendingFile, false)}
          onDismiss={() => {
            setReport(null);
            setPendingFile(null);
          }}
        />
      )}

      {/* --------------------------------------------- écritures en attente */}
      {pending.length > 0 && (
        <PendingPanel
          entries={pending}
          locale={locale}
          accessToken={accessToken}
          onChanged={refresh}
        />
      )}

      {/* ------------------------------------------------------ historique */}
      {history.length > 0 && (
        <section className="card p-6">
          <h2 className="text-lg font-bold tracking-tight text-ink">{t.admin.bank.history}</h2>
          <ul className="mt-4 divide-y divide-smoke-200">
            {history.map((row) => (
              <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-medium text-ink">
                    <FileText className="h-4 w-4 shrink-0 text-smoke-400" aria-hidden="true" />
                    {row.fileName}
                  </p>
                  <p className="mt-0.5 text-xs text-smoke-400">
                    {formatDateTime(row.createdAt, locale)}
                    {row.importedBy && ` · ${row.importedBy.firstName} ${row.importedBy.lastName}`}
                    {row.accountIban && ` · ${row.accountIban}`}
                  </p>
                </div>
                <p className="shrink-0 text-sm tabular text-smoke-600">
                  <strong className="text-ink">{row.matchedCount}</strong> / {row.importedCount}{' '}
                  {t.admin.bank.matchedShort}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ rapport

function ReportPanel({
  report,
  locale,
  busy,
  onConfirm,
  onDismiss,
}: {
  report: ImportReport;
  locale: Locale;
  busy: boolean;
  onConfirm: () => void;
  onDismiss: () => void;
}) {
  const t = getDictionary(locale);
  const { totals } = report;
  const nothingNew = totals.credits - totals.duplicates === 0;

  return (
    <section className={cn('card p-6', report.dryRun && 'border-2 border-ink')}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-ink">
            {report.dryRun ? t.admin.bank.previewTitle : t.admin.bank.doneTitle}
          </h2>
          <p className="mt-1 text-sm text-smoke-500">
            {report.fileName}
            {report.accountIban && ` · ${report.accountIban}`}
            {report.fromDate &&
              report.toDate &&
              ` · ${formatDate(report.fromDate, locale)} → ${formatDate(report.toDate, locale)}`}
          </p>
        </div>
        <button type="button" onClick={onDismiss} className="btn btn-ghost h-9 w-9 p-0">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label={t.admin.bank.statMatched} value={totals.matched} tone="good" />
        <Stat label={t.admin.bank.statMismatch} value={totals.amountMismatch} tone="warn" />
        <Stat label={t.admin.bank.statUnmatched} value={totals.unmatched} tone="warn" />
        <Stat label={t.admin.bank.statDuplicates} value={totals.duplicates} tone="muted" />
      </div>

      {totals.matched > 0 && (
        <p className="mt-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          {report.dryRun ? t.admin.bank.willCollect : t.admin.bank.collected}{' '}
          <strong className="tabular">{formatPrice(totals.collectedCents, locale)}</strong>
        </p>
      )}

      {nothingNew && (
        <p className="mt-4 rounded-lg bg-smoke-100 px-4 py-3 text-sm text-smoke-600">
          {t.admin.bank.nothingNew}
        </p>
      )}

      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[44rem] text-sm">
          <thead className="border-b border-smoke-200 text-left">
            <tr className="text-xs font-bold uppercase tracking-wide text-smoke-500">
              <th className="py-2 pr-4">{t.admin.bank.colDate}</th>
              <th className="py-2 pr-4 text-right">{t.admin.bank.colAmount}</th>
              <th className="py-2 pr-4">{t.admin.bank.colPayer}</th>
              <th className="py-2 pr-4">{t.admin.bank.colRemittance}</th>
              <th className="py-2">{t.admin.bank.colResult}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-smoke-200">
            {report.entries.map((entry) => (
              <tr key={entry.fingerprint} className={cn(entry.duplicate && 'opacity-50')}>
                <td className="py-2.5 pr-4 whitespace-nowrap text-smoke-600">
                  {formatDate(entry.bookedAt, locale)}
                </td>
                <td className="py-2.5 pr-4 text-right font-semibold tabular text-ink">
                  {formatPrice(entry.amountCents, locale, entry.currency)}
                </td>
                <td className="py-2.5 pr-4 text-smoke-600">{entry.debtorName ?? '—'}</td>
                <td className="max-w-[16rem] truncate py-2.5 pr-4 font-mono text-xs text-smoke-500">
                  {entry.remittance ?? '—'}
                </td>
                <td className="py-2.5">
                  <StatusBadge status={entry.status} locale={locale} />
                  {entry.orderNumber && (
                    <span className="ml-2 font-mono text-xs text-ink">{entry.orderNumber}</span>
                  )}
                  {entry.note && (
                    <p className="mt-0.5 text-xs text-smoke-400">{entry.note}</p>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {report.dryRun && !nothingNew && (
        <div className="mt-6 flex flex-wrap gap-3 border-t border-smoke-200 pt-5">
          <button type="button" disabled={busy} onClick={onConfirm} className="btn btn-primary btn-md">
            {busy ? t.common.loading : t.admin.bank.confirmImport}
          </button>
          <button type="button" onClick={onDismiss} className="btn btn-outline btn-md">
            {t.admin.cancel}
          </button>
          <p className="w-full text-xs text-smoke-500">{t.admin.bank.confirmHint}</p>
        </div>
      )}
    </section>
  );
}

// -------------------------------------------------------- écritures en attente

function PendingPanel({
  entries,
  locale,
  accessToken,
  onChanged,
}: {
  entries: PendingEntry[];
  locale: Locale;
  accessToken: string;
  onChanged: () => void;
}) {
  const t = getDictionary(locale);
  const [editing, setEditing] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function act(id: string, action: 'match' | 'ignore') {
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/admin/bank/entries/${id}/${action}`, {
        method: 'POST',
        accessToken,
        body:
          action === 'match'
            ? { orderNumber: orderNumber.trim() }
            : { reason: 'Écartée depuis le back-office' },
      });
      setEditing(null);
      setOrderNumber('');
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t.common.error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card p-6">
      <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight text-ink">
        <AlertTriangle className="h-5 w-5 text-signal" aria-hidden="true" />
        {t.admin.bank.pendingTitle}
      </h2>
      <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-smoke-500">
        {t.admin.bank.pendingIntro}
      </p>

      {error && (
        <p role="alert" className="mt-4 rounded-lg bg-signal-soft px-4 py-3 text-sm font-medium text-signal">
          {error}
        </p>
      )}

      <ul className="mt-5 divide-y divide-smoke-200">
        {entries.map((entry) => (
          <li key={entry.id} className="py-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-base font-bold tabular text-ink">
                    {formatPrice(entry.amountCents, locale, entry.currency)}
                  </span>
                  <StatusBadge status={entry.status} locale={locale} />
                  <span className="text-xs text-smoke-400">
                    {formatDate(entry.bookedAt, locale)}
                  </span>
                </div>
                <p className="mt-1 text-sm text-smoke-600">{entry.debtorName ?? '—'}</p>
                {entry.remittance && (
                  <p className="mt-0.5 max-w-xl break-words font-mono text-xs text-smoke-500">
                    {entry.remittance}
                  </p>
                )}
                {entry.note && <p className="mt-1 text-xs text-signal">{entry.note}</p>}
              </div>

              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditing(editing === entry.id ? null : entry.id);
                    setOrderNumber(entry.order?.orderNumber ?? '');
                  }}
                  className="btn btn-dark btn-sm"
                >
                  <Link2 className="h-3.5 w-3.5" />
                  {t.admin.bank.linkToOrder}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => act(entry.id, 'ignore')}
                  className="btn btn-outline btn-sm"
                >
                  {t.admin.bank.ignore}
                </button>
              </div>
            </div>

            {editing === entry.id && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void act(entry.id, 'match');
                }}
                className="mt-3 flex flex-wrap items-end gap-3 border-t border-smoke-200 pt-3"
              >
                <label className="min-w-[14rem] flex-1">
                  <span className="field-label">{t.admin.bank.orderNumber}</span>
                  <input
                    autoFocus
                    value={orderNumber}
                    onChange={(e) => setOrderNumber(e.target.value)}
                    placeholder="SM-2026-00001"
                    className="field h-10 font-mono"
                  />
                </label>
                <button type="submit" disabled={busy || !orderNumber.trim()} className="btn btn-primary btn-md">
                  {t.admin.bank.linkAndCollect}
                </button>
                <button type="button" onClick={() => setEditing(null)} className="btn btn-ghost btn-md">
                  {t.admin.cancel}
                </button>
              </form>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

// ------------------------------------------------------------------ éléments

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'good' | 'warn' | 'muted';
}) {
  return (
    <div
      className={cn(
        'rounded-lg border p-4',
        tone === 'good' && value > 0
          ? 'border-emerald-200 bg-emerald-50'
          : tone === 'warn' && value > 0
            ? 'border-signal/25 bg-signal-soft'
            : 'border-smoke-200 bg-smoke-50',
      )}
    >
      <p className="text-2xl font-bold tabular text-ink">{value}</p>
      <p className="mt-0.5 text-xs font-medium text-smoke-500">{label}</p>
    </div>
  );
}

function StatusBadge({ status, locale }: { status: EntryStatus; locale: Locale }) {
  const t = getDictionary(locale);

  const tone: Record<EntryStatus, string> = {
    MATCHED: 'bg-emerald-50 text-emerald-700',
    AMOUNT_MISMATCH: 'bg-signal-soft text-signal',
    UNMATCHED: 'bg-amber-50 text-amber-800',
    ALREADY_PAID: 'bg-smoke-100 text-smoke-600',
    IGNORED: 'bg-smoke-100 text-smoke-500',
  };

  const Icon =
    status === 'MATCHED' ? CheckCircle2 : status === 'UNMATCHED' ? HelpCircle : AlertTriangle;

  return (
    <span className={cn('badge', tone[status])}>
      <Icon className="h-3 w-3" aria-hidden="true" />
      {t.admin.bank.status[status]}
    </span>
  );
}
