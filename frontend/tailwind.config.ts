import type { Config } from 'tailwindcss';

/**
 * Charte Stihl Market : noir / blanc / rouge.
 * Le rouge est réservé aux actions et aux informations commerciales fortes
 * (prix cassés, CTA, badges). Il ne sert jamais de couleur de fond de section :
 * son efficacité vient de sa rareté.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#0B0B0C',
          soft: '#151619',
          muted: '#2A2B2E',
        },
        signal: {
          DEFAULT: '#E1000F', // rouge de marque
          hover: '#C0000D',
          soft: '#FFF1F1',
          ring: 'rgba(225, 0, 15, 0.28)',
        },
        /**
         * Fond général du site. Volontairement en retrait du blanc pur :
         * sur un écran lumineux, une page 100 % blanche fatigue la vue au
         * bout de quelques minutes. Les cartes restent blanches et se
         * détachent donc naturellement de ce fond.
         */
        canvas: {
          DEFAULT: '#F1F1F3',
          raised: '#F7F7F8',
        },
        smoke: {
          50: '#FAFAFA',
          100: '#F4F4F5',
          200: '#E7E7E9',
          300: '#D2D3D6',
          400: '#A3A5AB',
          500: '#74777E',
          600: '#4A4D53',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.08em' }],
      },
      borderRadius: {
        card: '0.75rem',
      },
      boxShadow: {
        card: '0 1px 2px rgba(11, 11, 12, 0.04), 0 8px 24px -12px rgba(11, 11, 12, 0.16)',
        'card-hover': '0 2px 4px rgba(11, 11, 12, 0.06), 0 16px 40px -16px rgba(11, 11, 12, 0.24)',
        focus: '0 0 0 3px rgba(225, 0, 15, 0.28)',
      },
      maxWidth: {
        content: '80rem',
        prose: '68ch',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        /**
         * Défilement en boucle. La piste contient deux copies identiques :
         * translater de la moitié exacte ramène au point de départ, donc la
         * répétition est invisible.
         */
        marquee: {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(-50%)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 260ms cubic-bezier(0.22, 1, 0.36, 1) both',
        shimmer: 'shimmer 1.6s infinite',
        marquee: 'marquee 32s linear infinite',
      },
    },
  },
  plugins: [],
};

export default config;
