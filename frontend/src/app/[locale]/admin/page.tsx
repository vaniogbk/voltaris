import type { Metadata } from 'next';
import { AdminApp } from '@/components/admin/AdminApp';
import { getDictionary } from '@/i18n';
import type { Locale } from '@/lib/routes';

export function generateMetadata({ params }: { params: { locale: Locale } }): Metadata {
  return {
    title: getDictionary(params.locale).admin.title,
    robots: { index: false, follow: false, nocache: true },
  };
}

export default function AdminPage({ params }: { params: { locale: Locale } }) {
  return <AdminApp locale={params.locale} />;
}
