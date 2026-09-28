import { cn } from '@/lib/cn';

interface LogoProps {
  className?: string;
  showWordmark?: boolean;
}

/**
 * Marque Voltaris : silhouette de guide-chaîne vue de profil, avec le
 * pignon de renvoi en rouge. Le motif reste lisible à 20 px de haut, ce qui
 * est la contrainte réelle d'un logo d'en-tête.
 */
export function Logo({ className, showWordmark = true }: LogoProps) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <svg viewBox="0 0 40 40" className="h-9 w-9 shrink-0" aria-hidden="true" focusable="false">
        <rect width="40" height="40" rx="9" fill="#0B0B0C" />
        {/* Guide-chaîne */}
        <path
          d="M9 17.5h16.5c2.6 0 4.7 1.1 4.7 2.5s-2.1 2.5-4.7 2.5H9c-1.4 0-2.2-1.1-2.2-2.5S7.6 17.5 9 17.5z"
          fill="#FFFFFF"
        />
        {/* Dents de chaîne */}
        <path
          d="M10 15.6h2.4l.9-2.2M15.4 15.6h2.4l.9-2.2M20.8 15.6h2.4l.9-2.2"
          stroke="#FFFFFF"
          strokeWidth="1.7"
          strokeLinecap="round"
          fill="none"
        />
        {/* Pignon de renvoi */}
        <circle cx="25.6" cy="20" r="2.5" fill="#E1000F" />
        <circle cx="11.4" cy="20" r="1.3" fill="#0B0B0C" />
      </svg>

      {showWordmark && (
        <span className="flex flex-col leading-none">
          <span className="text-[1.0625rem] font-extrabold tracking-tight text-ink">
            Volt<span className="text-signal">aris</span>
          </span>
          <span className="mt-0.5 text-[0.5625rem] font-semibold uppercase tracking-[0.16em] text-smoke-500">
            Forst &amp; Garten
          </span>
        </span>
      )}
    </span>
  );
}
