import { CreditCard, Headphones, ShieldCheck, Truck } from 'lucide-react';
import { getDictionary } from '@/i18n';
import type { Locale } from '@/lib/routes';

/**
 * Bande de réassurance, en défilement continu.
 *
 * Remplace les quatre encarts qui occupaient un écran entier : les mêmes
 * arguments passent en une ligne, sans repousser le catalogue plus bas.
 *
 * La piste est dupliquée pour boucler sans saut ; la copie est masquée aux
 * lecteurs d'écran, qui ne doivent entendre le message qu'une fois.
 */
export function TrustBand({ locale }: { locale: Locale }) {
  const t = getDictionary(locale);

  const items = [
    { icon: Truck, label: t.home.trust.shippingTitle },
    { icon: ShieldCheck, label: t.home.trust.checkedTitle },
    { icon: CreditCard, label: t.home.trust.paymentTitle },
    { icon: Headphones, label: t.home.trust.adviceTitle },
  ];

  const strip = (hidden: boolean) => (
    <ul
      aria-hidden={hidden || undefined}
      className="flex shrink-0 items-center gap-10 pr-10 sm:gap-14 sm:pr-14"
    >
      {items.map(({ icon: Icon, label }) => (
        <li key={label} className="flex shrink-0 items-center gap-2.5 whitespace-nowrap">
          <Icon className="h-4 w-4 shrink-0 text-signal" aria-hidden="true" />
          <span className="text-[0.8125rem] font-medium text-smoke-600">{label}</span>
        </li>
      ))}
    </ul>
  );

  return (
    <section
      aria-label={t.home.trust.bandLabel}
      className="overflow-hidden border-y border-smoke-200 bg-white py-3"
    >
      <div className="flex w-max motion-safe:animate-marquee motion-reduce:animate-none">
        {strip(false)}
        {strip(true)}
      </div>
    </section>
  );
}
