import { BadgeCheck, Check, RotateCcw, ShieldCheck, Truck } from 'lucide-react';
import { getDictionary } from '@/i18n';
import type { Locale } from '@/lib/routes';
import { cn } from '@/lib/cn';

/**
 * Éléments de réassurance de la page de commande.
 *
 * Ils répondent tous à la même question, celle qui décide d'un virement SEPA :
 * « qu'est-ce qui m'arrive après avoir cliqué ? ». Contrairement à une carte,
 * le virement est irréversible et sans rétrofacturation : l'acheteur engage la
 * totalité du risque, et c'est à la page de le rassurer avant, pas après.
 */

export type CheckoutStep = 'cart' | 'delivery' | 'payment' | 'confirmation';

const ORDER: CheckoutStep[] = ['cart', 'delivery', 'payment', 'confirmation'];

/**
 * Fil d'étapes du parcours d'achat.
 *
 * La commande tient sur une seule page : l'étape courante suit donc le
 * remplissage du formulaire plutôt qu'une navigation. Un indicateur figé
 * donnerait l'impression de ne pas avancer.
 */
export function CheckoutSteps({ locale, current }: { locale: Locale; current: CheckoutStep }) {
  const t = getDictionary(locale);
  const labels: Record<CheckoutStep, string> = {
    cart: t.cart.title,
    delivery: t.checkout.steps.delivery,
    payment: t.checkout.steps.payment,
    confirmation: t.checkout.steps.confirmation,
  };
  const currentIndex = ORDER.indexOf(current);

  return (
    <nav aria-label={t.checkout.title} className="mt-6">
      <ol className="flex items-center gap-2 sm:gap-3">
        {ORDER.map((step, i) => {
          const done = i < currentIndex;
          const active = i === currentIndex;

          return (
            <li key={step} className="flex flex-1 items-center gap-2 sm:gap-3">
              <span
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors',
                  done && 'bg-ink text-white',
                  active && 'bg-signal text-white',
                  !done && !active && 'border border-smoke-300 bg-white text-smoke-400',
                )}
                aria-hidden="true"
              >
                {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </span>

              <span
                className={cn(
                  'hidden whitespace-nowrap text-xs font-semibold sm:inline',
                  active ? 'text-ink' : 'text-smoke-500',
                )}
              >
                {labels[step]}
                {active && <span className="sr-only"> — {t.common.inProgress}</span>}
              </span>

              {/* Trait de liaison, sauf après le dernier jalon. */}
              {i < ORDER.length - 1 && (
                <span
                  aria-hidden="true"
                  className={cn('h-px flex-1 rounded', done ? 'bg-ink' : 'bg-smoke-200')}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * Chronologie de ce qui suit la validation.
 *
 * Elle existe parce qu'aucun e-mail n'est envoyé : sans ce repère, le client
 * valide, ne reçoit rien, et croit que sa commande s'est perdue — alors qu'il
 * a déjà viré l'argent.
 */
export function PaymentTimeline({ locale }: { locale: Locale }) {
  const t = getDictionary(locale);
  const steps = [
    { title: t.checkout.timeline.nowTitle, body: t.checkout.timeline.nowBody },
    { title: t.checkout.timeline.transferTitle, body: t.checkout.timeline.transferBody },
    { title: t.checkout.timeline.prepareTitle, body: t.checkout.timeline.prepareBody },
    { title: t.checkout.timeline.shipTitle, body: t.checkout.timeline.shipBody },
  ];

  return (
    <section className="card p-6">
      <h2 className="text-lg font-bold tracking-tight text-ink">{t.checkout.timeline.title}</h2>

      <ol className="mt-5 space-y-0">
        {steps.map((step, i) => (
          <li key={step.title} className="relative flex gap-4 pb-6 last:pb-0">
            {/* Filet vertical reliant les jalons, interrompu au dernier. */}
            {i < steps.length - 1 && (
              <span
                aria-hidden="true"
                className="absolute left-[13px] top-7 h-[calc(100%-1.75rem)] w-px bg-smoke-200"
              />
            )}

            <span
              className="relative z-10 flex h-[27px] w-[27px] shrink-0 items-center justify-center rounded-full bg-signal text-xs font-bold text-white"
              aria-hidden="true"
            >
              {i + 1}
            </span>

            <div className="min-w-0 pt-0.5">
              <p className="text-sm font-bold text-ink">{step.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-smoke-600">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

/**
 * Garanties, posées juste au-dessus du bouton de validation.
 *
 * Ces arguments existaient déjà sur le site, mais loin de l'endroit où la
 * décision se prend.
 */
export function GuaranteeBand({ locale }: { locale: Locale }) {
  const t = getDictionary(locale);
  const items = [
    { icon: ShieldCheck, label: t.checkout.guarantees.warranty },
    { icon: RotateCcw, label: t.checkout.guarantees.withdrawal },
    { icon: Truck, label: t.checkout.guarantees.shipping },
    { icon: BadgeCheck, label: t.checkout.guarantees.checked },
  ];

  return (
    <section
      aria-label={t.checkout.guarantees.title}
      className="rounded-card border border-smoke-200 bg-canvas-raised p-5"
    >
      <ul className="grid gap-3 sm:grid-cols-2">
        {items.map(({ icon: Icon, label }) => (
          <li key={label} className="flex items-start gap-2.5">
            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-signal" aria-hidden="true" />
            <span className="text-[0.8125rem] leading-snug text-smoke-600">{label}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
