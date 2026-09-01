'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/cn';

export interface HeroImage {
  url: string;
  alt: string;
}

/** Intervalle entre deux changements automatiques. */
const ROTATE_MS = 4200;

/** Nombre de vignettes visibles de part et d'autre de celle de face. */
const VISIBLE_SIDES = 2;

/**
 * Carrousel 3D des machines en stock, en arrière-plan du hero.
 *
 * Disposition en éventail : la photo centrale fait face au visiteur, les
 * voisines s'inclinent et s'enfoncent en profondeur. Le changement est
 * aléatoire — pas un défilement régulier — pour que deux visites successives
 * ne montrent pas la même séquence.
 *
 * L'ensemble est décoratif : il est masqué aux technologies d'assistance, les
 * mêmes photos étant accessibles sur les fiches produit. Il reste néanmoins
 * manipulable à la souris, une photo de côté venant au centre au clic.
 */
export function HeroBackdrop({ images }: { images: HeroImage[] }) {
  const [slides, setSlides] = useState(images);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  const count = slides.length;

  /**
   * Le brassage a lieu après montage, jamais pendant le rendu : tiré au rendu,
   * il donnerait un ordre côté serveur et un autre à l'hydratation, et React
   * rejetterait le décalage. Le premier affichage suit donc l'ordre de l'API,
   * et l'éventail se réorganise dans la foulée.
   */
  useEffect(() => {
    if (images.length < 2) return;
    setSlides(shuffle(images));
    setActive(Math.floor(Math.random() * images.length));
  }, [images]);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReducedMotion(query.matches);
    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);

  /**
   * Choisit la prochaine photo de face, au hasard.
   *
   * On vise d'abord les photos qui ne sont ni au centre ni immédiatement à
   * côté : sans cette exclusion, un tirage sur trois donnerait un mouvement
   * d'un cran, indiscernable d'un défilement.
   *
   * Ce vivier n'est retenu que s'il compte au moins trois photos. Avec quatre
   * photos en stock, la seule non-voisine est l'opposée : le carrousel ferait
   * l'aller-retour entre deux images et les deux autres ne passeraient jamais
   * à l'écran. On reprend alors tout le stock sauf la photo courante.
   */
  const pickNext = useCallback(() => {
    setActive((current) => {
      if (count < 2) return current;

      const distant: number[] = [];
      const others: number[] = [];
      for (let i = 0; i < count; i++) {
        if (i === current) continue;
        others.push(i);
        if (Math.abs(signedOffset(i, current, count)) > 1) distant.push(i);
      }

      const pool = distant.length >= 3 ? distant : others;
      return pool[Math.floor(Math.random() * pool.length)];
    });
  }, [count]);

  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (paused || reducedMotion || count < 2) return;
    timer.current = setInterval(pickNext, ROTATE_MS);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [paused, reducedMotion, count, pickNext]);

  if (count === 0) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
    >
      {/* La scène occupe 90 % de la largeur dans les deux cas, mais pas la
          même place.

          Sur grand écran, elle sert de fond et glisse vers la droite : la
          photo de face doit rester dégagée de la colonne de texte, qui tient
          à elle seule la moitié gauche du conteneur.

          Sur téléphone, le titre occupe toute la largeur. Un éventail derrière
          lui serait à la fois illisible et invisible ; il descend donc sous
          les boutons, dans la hauteur que le hero lui réserve, et s'affiche
          alors sans voile. */}
      <div
        className={cn(
          'pointer-events-auto absolute bottom-6 left-[5%] h-64 w-[90%]',
          // Pas de `lg:bottom-auto` ici : il annulerait le `bottom` posé par
          // `lg:inset-y-0`, la scène retomberait à une hauteur nulle et les
          // vignettes se centreraient sur le bord haut du hero.
          'lg:inset-y-0 lg:left-[13%] lg:h-auto',
        )}
        style={{ perspective: '1600px', perspectiveOrigin: 'center' }}
      >
        {slides.map((image, index) => {
          const offset = signedOffset(index, active, count);
          const distance = Math.abs(offset);
          const hidden = distance > VISIBLE_SIDES;

          return (
            <button
              key={image.url}
              type="button"
              // Décoratif : le carrousel ne doit pas ajouter douze arrêts au
              // parcours clavier avant le premier bouton utile du hero.
              tabIndex={-1}
              onClick={() => setActive(index)}
              className={cn(
                'absolute left-1/2 top-1/2 block aspect-[4/3] w-[68%] sm:w-[52%] lg:w-[44%] lg:max-w-[36rem]',
                'overflow-hidden rounded-2xl bg-smoke-100 shadow-card-hover',
                'transition-[transform,opacity] duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)]',
                'motion-reduce:transition-none',
                hidden && 'pointer-events-none',
              )}
              style={{
                transform: slideTransform(offset, reducedMotion),
                // La photo de face passe devant ses voisines, et ainsi de
                // suite vers l'extérieur de l'éventail.
                zIndex: VISIBLE_SIDES + 1 - distance,
                // Les vignettes visibles restent opaques : une photo qu'on
                // voit au travers d'une autre donne un effet de fantôme, pas
                // de profondeur. Celle-ci se lit à l'échelle, à l'inclinaison
                // et à l'ombre. L'opacité ne sert qu'aux entrées et sorties
                // de l'éventail — et à masquer les voisines quand l'animation
                // est désactivée, faute de quoi les cinq se superposeraient au
                // centre en un magma illisible.
                opacity: hidden || (reducedMotion && distance > 0) ? 0 : 1,
              }}
            >
              <Image
                src={image.url}
                alt=""
                fill
                sizes="(max-width: 640px) 68vw, (max-width: 1024px) 47vw, 40vw"
                loading="lazy"
                className="object-cover"
              />
              {/* Assombrit les vignettes latérales : la profondeur se lit
                  autant à la lumière qu'à la perspective. */}
              <span
                className="absolute inset-0 bg-ink transition-opacity duration-[900ms]"
                style={{ opacity: distance * 0.2 }}
              />
            </button>
          );
        })}
      </div>

      {/* Voiles réservés au grand écran, seul cas où l'éventail passe derrière
          le texte. Sur téléphone il est sous les boutons, donc rien à voiler. */}
      <div
        className="absolute inset-0 hidden lg:block"
        style={{
          backgroundImage:
            'linear-gradient(to right, #fff 0%, #fff 30%, rgba(255,255,255,0.74) 48%, rgba(255,255,255,0.10) 72%, rgba(255,255,255,0) 100%)',
        }}
      />
      <div
        className="absolute inset-0 hidden lg:block"
        style={{
          backgroundImage:
            'linear-gradient(to bottom, #fff 0%, rgba(255,255,255,0) 16%, rgba(255,255,255,0) 84%, #fff 100%)',
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------- géométrie

/**
 * Position d'une vignette par rapport à celle de face, en tenant compte du
 * bouclage : sur douze photos, l'écart entre la 11 et la 0 vaut 1, pas 11.
 */
function signedOffset(index: number, active: number, count: number): number {
  let offset = index - active;
  if (offset > count / 2) offset -= count;
  if (offset < -count / 2) offset += count;
  return offset;
}

/** Place une vignette dans l'éventail selon son écart au centre. */
function slideTransform(offset: number, reducedMotion: boolean): string {
  const centered = 'translate(-50%, -50%)';

  // Sans animation, seule la photo de face reste visible, à plat : les autres
  // sont masquées par leur opacité.
  if (reducedMotion) return `${centered} translateZ(0)`;

  if (offset === 0) return `${centered} translateX(0) translateZ(0) rotateY(0deg) scale(1)`;

  const direction = Math.sign(offset);
  const distance = Math.abs(offset);

  // L'écartement croît moins vite que la profondeur : les vignettes se
  // resserrent en s'éloignant, ce qui produit la fuite caractéristique du
  // Cover Flow plutôt qu'un simple alignement incliné.
  const shift = direction * (58 + (distance - 1) * 40);
  const depth = -170 * distance;
  const rotation = -direction * (38 + (distance - 1) * 6);
  const scale = 1 - distance * 0.12;

  return `${centered} translateX(${shift}%) translateZ(${depth}px) rotateY(${rotation}deg) scale(${scale})`;
}

/** Mélange de Fisher-Yates, appliqué à une copie. */
function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
