import type { ProductSeed } from './types.js';

/** Copie locale volontaire : le seed ne doit pas dépendre du runtime de l'API. */
function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[ßẞ]/g, 'ss')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/**
 * Catalogue neuf : références les plus vendues et les plus recherchées du
 * segment forestier / espaces verts sur les marchés français et allemand.
 *
 * ⚠️ À FAIRE AVANT MISE EN LIGNE
 *   • Les prix ci-dessous sont des prix publics indicatifs constatés sur le
 *     marché. Alignez-les sur vos conditions d'achat et votre marge réelle.
 *   • Les stocks sont des valeurs de démarrage : ajustez-les depuis le
 *     back-office (Admin → Produits → Stock) avant d'ouvrir la boutique.
 *   • Les visuels sont des placeholders générés (scripts/generate-placeholders.mjs).
 *     Remplacez-les par vos propres photos produit.
 */

type NewInput = {
  sku: string;
  slug: string;
  categorySlug: string;
  model: string;
  brand?: string;
  /** Meilleur prix constaté sur le marché, TTC en centimes — sert de prix barré */
  marketPriceCents: number;
  stock: number;
  weightGrams: number;
  featured?: boolean;
  placeholder: string;
  fr: { name: string; tagline: string; body: string; metaTitle: string; metaDescription: string };
  de: { name: string; tagline: string; body: string; metaTitle: string; metaDescription: string };
  specs: { fr: Array<[string, string]>; de: Array<[string, string]> };
};

/**
 * Politique de prix sur le neuf : être visiblement le moins cher du marché.
 *
 * La consigne est « 200 € sous le meilleur prix constaté ». Elle est tenable
 * sur les machines, pas sur les consommables : 200 € de remise sur un bidon
 * d'huile à 49 € donnerait un prix négatif, et sur un chargeur à 179 € un prix
 * très inférieur au coût d'achat. La remise est donc dégressive par palier.
 *
 * ⚠️ Ces paliers ne connaissent pas vos prix d'achat. Confrontez la grille
 * obtenue à vos conditions fournisseur avant l'ouverture : le script
 * scripts/reprice.mjs recalcule tout à partir de vos vrais relevés de marché.
 */
const FLAT_DISCOUNT_CENTS = 20_000; // 200 €
const FLAT_DISCOUNT_FLOOR = 50_000; // appliquée à partir de 500 €

export function sellingPrice(marketCents: number): number {
  if (marketCents >= FLAT_DISCOUNT_FLOOR) {
    return roundToPsychological(marketCents - FLAT_DISCOUNT_CENTS);
  }
  // Entre 250 et 500 € : −15 %. En dessous : −10 %, sur des montants où
  // la marge absolue est trop faible pour absorber davantage.
  const rate = marketCents >= 25_000 ? 0.85 : 0.9;
  return roundToPsychological(Math.round(marketCents * rate));
}

/** Arrondit toujours vers le bas, à un prix qui se lit comme un prix. */
function roundToPsychological(cents: number): number {
  const euros = cents / 100;
  if (euros >= 100) {
    // …9 € : 1449, 949, 379
    return (Math.floor((euros + 1) / 10) * 10 - 1) * 100;
  }
  // …,90 € : 57,90 — jamais en dessous de 0,90 €
  return Math.max(90, Math.floor(euros) * 100 - 10);
}

function build(input: NewInput): ProductSeed {
  return {
    sku: input.sku,
    slug: input.slug,
    categorySlug: input.categorySlug,
    brand: input.brand ?? 'STIHL',
    model: input.model,
    condition: 'NEW',
    priceCents: sellingPrice(input.marketPriceCents),
    compareAtCents: input.marketPriceCents,
    vatMode: 'STANDARD',
    vatRateBps: 2000,
    stock: input.stock,
    lowStockAlert: 2,
    isUnique: false,
    isFeatured: input.featured ?? false,
    weightGrams: input.weightGrams,
    images: [
      {
        url: `/produits/neuf/${input.placeholder}.svg`,
        altFr: `${input.brand ?? 'STIHL'} ${input.model} neuf`,
        altDe: `${input.brand ?? 'STIHL'} ${input.model} neu`,
      },
    ],
    fr: {
      name: input.fr.name,
      slug: input.slug,
      shortDescription: input.fr.tagline,
      description: input.fr.body,
      metaTitle: input.fr.metaTitle,
      metaDescription: input.fr.metaDescription,
    },
    de: {
      name: input.de.name,
      // Slug allemand dérivé du nom allemand : meilleur référencement sur .de
      // qu'un suffixe artificiel accolé au slug français.
      slug: slugify(input.de.name),
      shortDescription: input.de.tagline,
      description: input.de.body,
      metaTitle: input.de.metaTitle,
      metaDescription: input.de.metaDescription,
    },
    specs: input.specs,
  };
}

const GUARANTEE_FR =
  "\n\n---\n\n**Garantie constructeur 2 ans.** Machine neuve, jamais démarrée, livrée dans son emballage d'origine. Expédition sous 24 h ouvrées depuis notre entrepôt.";
const GUARANTEE_DE =
  '\n\n---\n\n**2 Jahre Herstellergarantie.** Neugerät, nie gestartet, Lieferung in der Originalverpackung. Versand innerhalb von 24 Werkstunden ab unserem Lager.';

export const NEW_PRODUCTS: ProductSeed[] = [
  // ============================================================ TRONÇONNEUSES
  build({
    sku: 'SM-MS500I-63',
    slug: 'stihl-ms-500i-guide-63cm',
    categorySlug: 'tronconneuses',
    model: 'MS 500i',
    marketPriceCents: 164_900,
    stock: 4,
    weightGrams: 9_500,
    featured: true,
    placeholder: 'ms-500i',
    fr: {
      name: 'STIHL MS 500i — neuve, guide 63 cm',
      tagline:
        "La tronçonneuse à injection la plus rapide du marché : 0,25 s de la ralenti au plein régime.",
      body: `La **MS 500i** est la première tronçonneuse de série au monde équipée d'une injection électronique. Résultat concret sur le chantier : pas de starter à manipuler, pas de réglage de carburateur, un démarrage fiable par tous les temps et une reprise instantanée quelle que soit l'inclinaison de la machine.

Avec **6,8 ch pour 6,2 kg**, elle affiche le meilleur rapport poids/puissance de sa catégorie. C'est la machine de référence des équipes d'abattage sur gros bois.

- Accélération de 0 à plein régime en **0,25 seconde**
- Injection **STIHL Injection** : autoréglage permanent selon l'altitude et la température
- Filtre à air haute performance : intervalles d'entretien allongés
- Système antivibratoire pour les longues journées de coupe`,
      metaTitle: 'STIHL MS 500i neuve guide 63 cm — tronçonneuse à injection',
      metaDescription:
        "Tronçonneuse professionnelle STIHL MS 500i à injection électronique, 6,8 ch pour 6,2 kg. Guide 63 cm. Neuve, garantie 2 ans, livraison France et Allemagne.",
    },
    de: {
      name: 'STIHL MS 500i — neu, 63-cm-Schiene',
      tagline: 'Die schnellste Einspritz-Kettensäge am Markt: 0,25 s vom Leerlauf auf Vollgas.',
      body: `Die **MS 500i** ist die weltweit erste Serien-Kettensäge mit elektronischer Kraftstoffeinspritzung. Der praktische Nutzen auf der Baustelle: kein Choke, keine Vergasereinstellung, zuverlässiger Start bei jedem Wetter und sofortige Gasannahme in jeder Lage.

Mit **6,8 PS bei 6,2 kg** bietet sie das beste Leistungsgewicht ihrer Klasse. Die Referenzmaschine für Fällteams im Starkholz.

- Beschleunigung von 0 auf Vollgas in **0,25 Sekunden**
- **STIHL Injection**: permanente Selbstregelung nach Höhe und Temperatur
- Hochleistungsluftfilter: verlängerte Wartungsintervalle
- Antivibrationssystem für lange Schnitttage`,
      metaTitle: 'STIHL MS 500i neu 63 cm — Einspritz-Kettensäge',
      metaDescription:
        'Profi-Kettensäge STIHL MS 500i mit elektronischer Einspritzung, 6,8 PS bei 6,2 kg. 63-cm-Schiene. Neu, 2 Jahre Garantie, Versand nach Deutschland und Frankreich.',
    },
    specs: {
      fr: [
        ['Cylindrée', '79,2 cm³'],
        ['Puissance', '5,0 kW / 6,8 ch'],
        ['Poids à sec', '6,2 kg'],
        ['Guide', '63 cm / 25"'],
        ['Chaîne', '3/8" — 1,6 mm'],
        ['Réservoir carburant', '0,77 L'],
        ['Niveau sonore', '107 dB(A)'],
      ],
      de: [
        ['Hubraum', '79,2 cm³'],
        ['Leistung', '5,0 kW / 6,8 PS'],
        ['Trockengewicht', '6,2 kg'],
        ['Schiene', '63 cm / 25"'],
        ['Sägekette', '3/8" — 1,6 mm'],
        ['Kraftstofftank', '0,77 L'],
        ['Schallleistungspegel', '107 dB(A)'],
      ],
    },
  }),

  build({
    sku: 'SM-MS462-50',
    slug: 'stihl-ms-462-cm-guide-50cm',
    categorySlug: 'tronconneuses',
    model: 'MS 462 C-M',
    marketPriceCents: 137_900,
    stock: 6,
    weightGrams: 8_800,
    featured: true,
    placeholder: 'ms-462',
    fr: {
      name: 'STIHL MS 462 C-M — guide 50 cm',
      tagline: "La référence de l'abattage professionnel : 6 ch pour 6 kg, gestion moteur M-Tronic.",
      body: `La **MS 462 C-M** est la tronçonneuse d'abattage la plus vendue chez les professionnels européens. Elle combine une puissance de **6,0 ch** avec un poids contenu de **6,0 kg**, dans un format qui reste maniable toute la journée.

La gestion moteur **M-Tronic** ajuste en continu l'allumage et le dosage du carburant : un seul point de démarrage, pas de réglage saisonnier, une puissance constante quelle que soit la qualité du carburant.

- Couple élevé disponible très bas dans les tours
- Filtre à air à séparation cyclonique : jusqu'à 5× moins d'entretien
- Réglage de la tension de chaîne latéral, accessible sans outil`,
      metaTitle: 'STIHL MS 462 C-M neuve guide 50 cm — tronçonneuse abattage',
      metaDescription:
        "Tronçonneuse d'abattage professionnelle STIHL MS 462 C-M, 6 ch pour 6 kg, gestion M-Tronic. Guide 50 cm. Neuve, garantie 2 ans, expédition 24 h.",
    },
    de: {
      name: 'STIHL MS 462 C-M — 50-cm-Schiene',
      tagline: 'Die Referenz im Profi-Fällschnitt: 6 PS bei 6 kg, M-Tronic Motormanagement.',
      body: `Die **MS 462 C-M** ist die meistverkaufte Fällsäge bei europäischen Profis. Sie verbindet **6,0 PS** Leistung mit einem Gewicht von nur **6,0 kg** in einem den ganzen Tag handlichen Format.

Das **M-Tronic** Motormanagement regelt Zündzeitpunkt und Kraftstoffdosierung permanent: ein einziger Startpunkt, keine saisonale Einstellung, konstante Leistung unabhängig von der Kraftstoffqualität.

- Hohes Drehmoment schon bei niedrigen Drehzahlen
- Luftfilter mit Zyklonvorabscheidung: bis zu 5× weniger Wartung
- Seitliche Kettenschnellspannung, werkzeuglos zugänglich`,
      metaTitle: 'STIHL MS 462 C-M neu 50 cm — Fällsäge',
      metaDescription:
        'Profi-Fällsäge STIHL MS 462 C-M, 6 PS bei 6 kg, M-Tronic. 50-cm-Schiene. Neu, 2 Jahre Garantie, Versand in 24 Stunden.',
    },
    specs: {
      fr: [
        ['Cylindrée', '72,2 cm³'],
        ['Puissance', '4,4 kW / 6,0 ch'],
        ['Poids à sec', '6,0 kg'],
        ['Guide', '50 cm / 20"'],
        ['Chaîne', '3/8" — 1,6 mm'],
        ['Gestion moteur', 'M-Tronic'],
      ],
      de: [
        ['Hubraum', '72,2 cm³'],
        ['Leistung', '4,4 kW / 6,0 PS'],
        ['Trockengewicht', '6,0 kg'],
        ['Schiene', '50 cm / 20"'],
        ['Sägekette', '3/8" — 1,6 mm'],
        ['Motormanagement', 'M-Tronic'],
      ],
    },
  }),

  build({
    sku: 'SM-MS400-45',
    slug: 'stihl-ms-400-cm-guide-45cm',
    categorySlug: 'tronconneuses',
    model: 'MS 400 C-M',
    marketPriceCents: 114_900,
    stock: 5,
    weightGrams: 8_200,
    featured: true,
    placeholder: 'ms-400',
    fr: {
      name: 'STIHL MS 400 C-M — guide 45 cm',
      tagline: 'Premier moteur à piston magnésium de série : 4,8 ch pour seulement 5,7 kg.',
      body: `La **MS 400 C-M** inaugure le **piston en alliage de magnésium**, une première mondiale sur une tronçonneuse de série. Un piston plus léger, c'est moins d'inertie, donc une montée en régime plus vive et une usure réduite.

Le résultat : **4,8 ch pour 5,7 kg**, un rapport que l'on trouvait jusqu'ici uniquement sur des machines de compétition. Elle se place idéalement entre la MS 362 et la MS 462.

- Piston magnésium : accélération franche, moteur plus vif
- Gestion **M-Tronic** intégrale
- Idéale pour l'abattage de bois moyen et le façonnage`,
      metaTitle: 'STIHL MS 400 C-M neuve guide 45 cm — piston magnésium',
      metaDescription:
        'Tronçonneuse STIHL MS 400 C-M à piston magnésium, 4,8 ch pour 5,7 kg, M-Tronic. Guide 45 cm. Neuve, garantie 2 ans.',
    },
    de: {
      name: 'STIHL MS 400 C-M — 45-cm-Schiene',
      tagline: 'Erster Serien-Magnesiumkolben: 4,8 PS bei nur 5,7 kg.',
      body: `Die **MS 400 C-M** führt den **Kolben aus Magnesiumlegierung** ein — eine Weltneuheit bei Serien-Kettensägen. Ein leichterer Kolben bedeutet weniger Massenträgheit, also spontaneren Drehzahlaufbau und geringeren Verschleiß.

Das Ergebnis: **4,8 PS bei 5,7 kg**, ein Verhältnis, das man bisher nur von Wettkampfmaschinen kannte. Sie positioniert sich genau zwischen MS 362 und MS 462.

- Magnesiumkolben: spontane Beschleunigung, lebendiger Motor
- Durchgängiges **M-Tronic** Management
- Ideal für Fällung im Mittelholz und zur Aufarbeitung`,
      metaTitle: 'STIHL MS 400 C-M neu 45 cm — Magnesiumkolben',
      metaDescription:
        'Kettensäge STIHL MS 400 C-M mit Magnesiumkolben, 4,8 PS bei 5,7 kg, M-Tronic. 45-cm-Schiene. Neu, 2 Jahre Garantie.',
    },
    specs: {
      fr: [
        ['Cylindrée', '66,8 cm³'],
        ['Puissance', '3,5 kW / 4,8 ch'],
        ['Poids à sec', '5,7 kg'],
        ['Guide', '45 cm / 18"'],
        ['Piston', 'Alliage de magnésium'],
        ['Gestion moteur', 'M-Tronic'],
      ],
      de: [
        ['Hubraum', '66,8 cm³'],
        ['Leistung', '3,5 kW / 4,8 PS'],
        ['Trockengewicht', '5,7 kg'],
        ['Schiene', '45 cm / 18"'],
        ['Kolben', 'Magnesiumlegierung'],
        ['Motormanagement', 'M-Tronic'],
      ],
    },
  }),

  build({
    sku: 'SM-MS261-40',
    slug: 'stihl-ms-261-cm-guide-40cm',
    categorySlug: 'tronconneuses',
    model: 'MS 261 C-M',
    marketPriceCents: 101_900,
    stock: 8,
    weightGrams: 7_400,
    featured: true,
    placeholder: 'ms-261',
    fr: {
      name: 'STIHL MS 261 C-M — guide 40 cm',
      tagline: "La polyvalente des professionnels : éclaircie, façonnage, bois de chauffage.",
      body: `La **MS 261 C-M** est la tronçonneuse la plus vendue de la gamme professionnelle. Elle couvre l'essentiel du travail forestier courant : éclaircie, ébranchage, façonnage, bois de chauffage.

**4,9 kg à sec** pour **3,9 ch** : elle se manie d'une main en fin de journée, ce que ne permettent pas les machines d'abattage plus lourdes.

- Gestion **M-Tronic** : démarrage constant, aucun réglage
- Système antivibratoire particulièrement efficace sur cette cylindrée
- Consommation et émissions réduites (moteur 2-MIX)`,
      metaTitle: 'STIHL MS 261 C-M neuve guide 40 cm — tronçonneuse polyvalente',
      metaDescription:
        'Tronçonneuse professionnelle polyvalente STIHL MS 261 C-M, 3,9 ch pour 4,9 kg, M-Tronic. Guide 40 cm. Neuve, garantie 2 ans.',
    },
    de: {
      name: 'STIHL MS 261 C-M — 40-cm-Schiene',
      tagline: 'Der Allrounder der Profis: Durchforstung, Aufarbeitung, Brennholz.',
      body: `Die **MS 261 C-M** ist die meistverkaufte Säge der Profi-Baureihe. Sie deckt die gängige Waldarbeit ab: Durchforstung, Entastung, Aufarbeitung, Brennholz.

**4,9 kg** Trockengewicht bei **3,9 PS**: Sie lässt sich auch am Ende eines langen Tages noch einhändig führen — anders als schwerere Fällsägen.

- **M-Tronic**: konstanter Start, keine Einstellung nötig
- Besonders wirksames Antivibrationssystem in dieser Hubraumklasse
- Reduzierter Verbrauch und Emissionen (2-MIX-Motor)`,
      metaTitle: 'STIHL MS 261 C-M neu 40 cm — Allround-Kettensäge',
      metaDescription:
        'Vielseitige Profi-Kettensäge STIHL MS 261 C-M, 3,9 PS bei 4,9 kg, M-Tronic. 40-cm-Schiene. Neu, 2 Jahre Garantie.',
    },
    specs: {
      fr: [
        ['Cylindrée', '50,2 cm³'],
        ['Puissance', '2,9 kW / 3,9 ch'],
        ['Poids à sec', '4,9 kg'],
        ['Guide', '40 cm / 16"'],
        ['Chaîne', '.325" — 1,6 mm'],
        ['Gestion moteur', 'M-Tronic'],
      ],
      de: [
        ['Hubraum', '50,2 cm³'],
        ['Leistung', '2,9 kW / 3,9 PS'],
        ['Trockengewicht', '4,9 kg'],
        ['Schiene', '40 cm / 16"'],
        ['Sägekette', '.325" — 1,6 mm'],
        ['Motormanagement', 'M-Tronic'],
      ],
    },
  }),

  build({
    sku: 'SM-MS251-40',
    slug: 'stihl-ms-251-c-be-guide-40cm',
    categorySlug: 'tronconneuses',
    model: 'MS 251 C-BE',
    marketPriceCents: 65_900,
    stock: 10,
    weightGrams: 7_000,
    placeholder: 'ms-251',
    fr: {
      name: 'STIHL MS 251 C-BE — guide 40 cm',
      tagline: 'Le meilleur choix pour le bois de chauffage : puissante, simple, sans outil.',
      body: `La **MS 251 C-BE** est la machine idéale pour préparer plusieurs stères par an sans se ruiner. **2,2 kW** suffisent largement pour du bois de chauffage jusqu'à 35 cm de diamètre.

Le suffixe **C-BE** désigne deux équipements de confort qui changent l'usage au quotidien :
- **ErgoStart** : effort de lancement divisé par deux, démarrage sans à-coup
- **Tension de chaîne sans outil** : plus besoin de chercher la clé combinée

Un bon compromis entre robustesse professionnelle et facilité d'usage pour un particulier régulier.`,
      metaTitle: 'STIHL MS 251 C-BE neuve guide 40 cm — bois de chauffage',
      metaDescription:
        'Tronçonneuse STIHL MS 251 C-BE avec ErgoStart et tension de chaîne sans outil. Guide 40 cm, 2,2 kW. Idéale bois de chauffage. Neuve, garantie 2 ans.',
    },
    de: {
      name: 'STIHL MS 251 C-BE — 40-cm-Schiene',
      tagline: 'Die beste Wahl fürs Brennholz: kräftig, einfach, werkzeuglos.',
      body: `Die **MS 251 C-BE** ist die ideale Maschine, um mehrere Raummeter pro Jahr aufzuarbeiten, ohne das Budget zu sprengen. **2,2 kW** reichen für Brennholz bis 35 cm Durchmesser problemlos aus.

Das Kürzel **C-BE** steht für zwei Komfortmerkmale, die den Alltag verändern:
- **ErgoStart**: halbierte Anwerfkraft, ruckfreier Start
- **Werkzeuglose Kettenspannung**: kein Suchen nach dem Kombischlüssel

Ein guter Kompromiss aus Profi-Robustheit und Bedienkomfort für regelmäßige Privatanwender.`,
      metaTitle: 'STIHL MS 251 C-BE neu 40 cm — Brennholzsäge',
      metaDescription:
        'Kettensäge STIHL MS 251 C-BE mit ErgoStart und werkzeugloser Kettenspannung. 40-cm-Schiene, 2,2 kW. Ideal für Brennholz. Neu, 2 Jahre Garantie.',
    },
    specs: {
      fr: [
        ['Cylindrée', '45,6 cm³'],
        ['Puissance', '2,2 kW / 3,0 ch'],
        ['Poids à sec', '4,9 kg'],
        ['Guide', '40 cm / 16"'],
        ['Équipements', 'ErgoStart + tension de chaîne sans outil'],
      ],
      de: [
        ['Hubraum', '45,6 cm³'],
        ['Leistung', '2,2 kW / 3,0 PS'],
        ['Trockengewicht', '4,9 kg'],
        ['Schiene', '40 cm / 16"'],
        ['Ausstattung', 'ErgoStart + werkzeuglose Kettenspannung'],
      ],
    },
  }),

  build({
    sku: 'SM-MS194T-35',
    slug: 'stihl-ms-194-t-guide-35cm',
    categorySlug: 'tronconneuses',
    model: 'MS 194 T',
    marketPriceCents: 68_900,
    stock: 5,
    weightGrams: 5_200,
    placeholder: 'ms-194t',
    fr: {
      name: 'STIHL MS 194 T — tronçonneuse d’élagage, guide 35 cm',
      tagline: 'Poignée haute pour le travail sur corde : 3,3 kg, la plus légère de sa catégorie.',
      body: `La **MS 194 T** est une tronçonneuse à **poignée haute**, conçue pour le travail en hauteur des grimpeurs élagueurs. Son poids de **3,3 kg** en fait la plus légère machine thermique de sa catégorie.

⚠️ **Usage réservé aux professionnels formés.** Les tronçonneuses à poignée haute sont destinées exclusivement au travail arboricole sur corde et harnais, par des opérateurs certifiés.

- Centre de gravité optimisé pour l'utilisation à une main en position d'élagage
- Anneau d'accrochage intégré pour la longe
- Moteur 2-MIX : moins de consommation, moins de fumée dans la couronne`,
      metaTitle: 'STIHL MS 194 T neuve — tronçonneuse élagage poignée haute',
      metaDescription:
        "Tronçonneuse d'élagage STIHL MS 194 T à poignée haute, 3,3 kg, guide 35 cm. Pour grimpeurs élagueurs professionnels. Neuve, garantie 2 ans.",
    },
    de: {
      name: 'STIHL MS 194 T — Baumpflegesäge, 35-cm-Schiene',
      tagline: 'Top-Handle für die Seilklettertechnik: 3,3 kg, die leichteste ihrer Klasse.',
      body: `Die **MS 194 T** ist eine **Top-Handle-Kettensäge** für die Arbeit in der Baumkrone. Mit **3,3 kg** ist sie die leichteste Benzinmaschine ihrer Klasse.

⚠️ **Nur für geschulte Fachkräfte.** Top-Handle-Sägen sind ausschließlich für die Baumpflege in Seilklettertechnik durch zertifizierte Anwender bestimmt.

- Optimierter Schwerpunkt für den einhändigen Einsatz in Kletterposition
- Integrierte Öse für die Sicherungsleine
- 2-MIX-Motor: weniger Verbrauch, weniger Abgase in der Krone`,
      metaTitle: 'STIHL MS 194 T neu — Top-Handle Baumpflegesäge',
      metaDescription:
        'Baumpflegesäge STIHL MS 194 T Top-Handle, 3,3 kg, 35-cm-Schiene. Für zertifizierte Baumkletterer. Neu, 2 Jahre Garantie.',
    },
    specs: {
      fr: [
        ['Cylindrée', '31,8 cm³'],
        ['Puissance', '1,4 kW / 1,9 ch'],
        ['Poids à sec', '3,3 kg'],
        ['Guide', '35 cm / 14"'],
        ['Type', 'Poignée haute — travail sur corde'],
      ],
      de: [
        ['Hubraum', '31,8 cm³'],
        ['Leistung', '1,4 kW / 1,9 PS'],
        ['Trockengewicht', '3,3 kg'],
        ['Schiene', '35 cm / 14"'],
        ['Bauart', 'Top-Handle — Seilklettertechnik'],
      ],
    },
  }),

  build({
    sku: 'SM-MS180-35',
    slug: 'stihl-ms-180-c-be-guide-35cm',
    categorySlug: 'tronconneuses',
    model: 'MS 180 C-BE',
    marketPriceCents: 30_900,
    stock: 15,
    weightGrams: 5_800,
    placeholder: 'ms-180',
    fr: {
      name: 'STIHL MS 180 C-BE — guide 35 cm',
      tagline: "L'entrée de gamme la plus vendue : légère, fiable, sans outil.",
      body: `La **MS 180 C-BE** est la tronçonneuse la plus vendue au monde. Pour l'entretien d'un jardin, l'élagage bas et quelques stères par an, elle fait exactement le travail attendu — sans surdimensionnement inutile.

**3,9 kg**, démarrage assisté **ErgoStart**, tension de chaîne **sans outil** : c'est la machine que l'on prête sans crainte et que l'on range sans entretien complexe.`,
      metaTitle: 'STIHL MS 180 C-BE neuve guide 35 cm — tronçonneuse jardin',
      metaDescription:
        'Tronçonneuse STIHL MS 180 C-BE, 3,9 kg, ErgoStart et tension sans outil. Guide 35 cm. Idéale entretien de jardin. Neuve, garantie 2 ans.',
    },
    de: {
      name: 'STIHL MS 180 C-BE — 35-cm-Schiene',
      tagline: 'Der meistverkaufte Einstieg: leicht, zuverlässig, werkzeuglos.',
      body: `Die **MS 180 C-BE** ist die weltweit meistverkaufte Kettensäge. Für Gartenpflege, niedrigen Baumschnitt und ein paar Raummeter im Jahr macht sie genau das, was man erwartet — ohne unnötige Überdimensionierung.

**3,9 kg**, **ErgoStart** Anwerfhilfe, **werkzeuglose** Kettenspannung: die Maschine, die man bedenkenlos verleiht und ohne aufwendige Wartung wegräumt.`,
      metaTitle: 'STIHL MS 180 C-BE neu 35 cm — Gartensäge',
      metaDescription:
        'Kettensäge STIHL MS 180 C-BE, 3,9 kg, ErgoStart und werkzeuglose Spannung. 35-cm-Schiene. Ideal für die Gartenpflege. Neu, 2 Jahre Garantie.',
    },
    specs: {
      fr: [
        ['Cylindrée', '31,8 cm³'],
        ['Puissance', '1,5 kW / 2,0 ch'],
        ['Poids à sec', '3,9 kg'],
        ['Guide', '35 cm / 14"'],
        ['Équipements', 'ErgoStart + tension de chaîne sans outil'],
      ],
      de: [
        ['Hubraum', '31,8 cm³'],
        ['Leistung', '1,5 kW / 2,0 PS'],
        ['Trockengewicht', '3,9 kg'],
        ['Schiene', '35 cm / 14"'],
        ['Ausstattung', 'ErgoStart + werkzeuglose Kettenspannung'],
      ],
    },
  }),

  build({
    sku: 'SM-MSA300-CO',
    slug: 'stihl-msa-300-c-o-sans-batterie',
    categorySlug: 'tronconneuses',
    model: 'MSA 300 C-O',
    marketPriceCents: 99_900,
    stock: 4,
    weightGrams: 6_500,
    featured: true,
    placeholder: 'msa-300',
    fr: {
      name: 'STIHL MSA 300 C-O — à batterie, sans batterie ni chargeur',
      tagline: 'La première tronçonneuse à batterie de classe professionnelle : 24 m/s de chaîne.',
      body: `La **MSA 300 C-O** est la tronçonneuse à batterie la plus puissante du marché professionnel. Sa vitesse de chaîne de **24 m/s** égale celle d'une thermique de 50 cm³ — sans bruit de moteur, sans gaz d'échappement, sans vibration de combustion.

C'est la machine qui rend le travail à batterie crédible en milieu urbain, en intérieur, ou dans les zones où les nuisances sonores sont réglementées.

- Trois modes de puissance sélectionnables selon la tâche
- Écran de contrôle intégré : autonomie, mode, diagnostic
- Compatible batteries **STIHL AP System** (AP 300 S, AP 500 S)

*Livrée sans batterie ni chargeur — à commander séparément.*`,
      metaTitle: 'STIHL MSA 300 C-O neuve — tronçonneuse à batterie professionnelle',
      metaDescription:
        'Tronçonneuse à batterie professionnelle STIHL MSA 300 C-O, chaîne à 24 m/s, système AP. Livrée sans batterie. Neuve, garantie 2 ans.',
    },
    de: {
      name: 'STIHL MSA 300 C-O — Akku, ohne Akku und Ladegerät',
      tagline: 'Die erste Akku-Kettensäge der Profiklasse: 24 m/s Kettengeschwindigkeit.',
      body: `Die **MSA 300 C-O** ist die leistungsstärkste Akku-Kettensäge im Profisegment. Ihre Kettengeschwindigkeit von **24 m/s** entspricht der einer 50-cm³-Benzinsäge — ohne Motorenlärm, ohne Abgase, ohne Verbrennungsvibrationen.

Die Maschine, die Akkuarbeit im urbanen Raum, in Innenräumen und in lärmgeschützten Zonen erst glaubwürdig macht.

- Drei wählbare Leistungsstufen je nach Aufgabe
- Integriertes Display: Restlaufzeit, Modus, Diagnose
- Kompatibel mit **STIHL AP System** Akkus (AP 300 S, AP 500 S)

*Lieferung ohne Akku und Ladegerät — separat zu bestellen.*`,
      metaTitle: 'STIHL MSA 300 C-O neu — Profi-Akku-Kettensäge',
      metaDescription:
        'Profi-Akku-Kettensäge STIHL MSA 300 C-O, 24 m/s Kettengeschwindigkeit, AP System. Ohne Akku geliefert. Neu, 2 Jahre Garantie.',
    },
    specs: {
      fr: [
        ['Type', 'Batterie — système STIHL AP'],
        ['Vitesse de chaîne', '24 m/s'],
        ['Poids sans batterie', '3,9 kg'],
        ['Guide', '40 cm / 16"'],
        ['Livraison', 'Sans batterie ni chargeur'],
      ],
      de: [
        ['Bauart', 'Akku — STIHL AP System'],
        ['Kettengeschwindigkeit', '24 m/s'],
        ['Gewicht ohne Akku', '3,9 kg'],
        ['Schiene', '40 cm / 16"'],
        ['Lieferumfang', 'Ohne Akku und Ladegerät'],
      ],
    },
  }),

  build({
    sku: 'SM-MSA220-CB',
    slug: 'stihl-msa-220-c-b-sans-batterie',
    categorySlug: 'tronconneuses',
    model: 'MSA 220 C-B',
    marketPriceCents: 58_900,
    stock: 7,
    weightGrams: 5_000,
    placeholder: 'msa-220',
    fr: {
      name: 'STIHL MSA 220 C-B — à batterie, sans batterie ni chargeur',
      tagline: 'Puissance équivalente à une 40 cm³ thermique, en silence.',
      body: `La **MSA 220 C-B** offre les performances d'une tronçonneuse thermique de 40 cm³ dans un format à batterie de **3,0 kg** (sans batterie). Elle est le choix de référence pour l'élagage urbain, les collectivités et les paysagistes.

- Tension de chaîne **sans outil**
- Frein de chaîne **QuickStop Super** : arrêt en une fraction de seconde
- Compatible **STIHL AP System**

*Livrée sans batterie ni chargeur — à commander séparément.*`,
      metaTitle: 'STIHL MSA 220 C-B neuve — tronçonneuse à batterie',
      metaDescription:
        'Tronçonneuse à batterie STIHL MSA 220 C-B, 3,0 kg, frein QuickStop Super, système AP. Sans batterie. Neuve, garantie 2 ans.',
    },
    de: {
      name: 'STIHL MSA 220 C-B — Akku, ohne Akku und Ladegerät',
      tagline: 'Leistung einer 40-cm³-Benzinsäge, geräuschlos.',
      body: `Die **MSA 220 C-B** bietet die Leistung einer 40-cm³-Benzinsäge in einem **3,0 kg** leichten Akkuformat (ohne Akku). Die Referenzwahl für urbane Baumpflege, Kommunen und Landschaftsgärtner.

- **Werkzeuglose** Kettenspannung
- Kettenbremse **QuickStop Super**: Stillstand in Sekundenbruchteilen
- Kompatibel mit **STIHL AP System**

*Lieferung ohne Akku und Ladegerät — separat zu bestellen.*`,
      metaTitle: 'STIHL MSA 220 C-B neu — Akku-Kettensäge',
      metaDescription:
        'Akku-Kettensäge STIHL MSA 220 C-B, 3,0 kg, QuickStop Super, AP System. Ohne Akku. Neu, 2 Jahre Garantie.',
    },
    specs: {
      fr: [
        ['Type', 'Batterie — système STIHL AP'],
        ['Poids sans batterie', '3,0 kg'],
        ['Guide', '35 cm / 14"'],
        ['Frein de chaîne', 'QuickStop Super'],
        ['Livraison', 'Sans batterie ni chargeur'],
      ],
      de: [
        ['Bauart', 'Akku — STIHL AP System'],
        ['Gewicht ohne Akku', '3,0 kg'],
        ['Schiene', '35 cm / 14"'],
        ['Kettenbremse', 'QuickStop Super'],
        ['Lieferumfang', 'Ohne Akku und Ladegerät'],
      ],
    },
  }),

  // ========================================================= DÉBROUSSAILLEUSES
  build({
    sku: 'SM-FS131R',
    slug: 'stihl-fs-131-r-debroussailleuse',
    categorySlug: 'debroussailleuses',
    model: 'FS 131 R',
    marketPriceCents: 86_900,
    stock: 6,
    weightGrams: 9_000,
    featured: true,
    placeholder: 'fs-131',
    fr: {
      name: 'STIHL FS 131 R — débroussailleuse thermique',
      tagline: 'Poignée circulaire, 36,3 cm³ : la machine des grandes surfaces et des talus.',
      body: `La **FS 131 R** est faite pour les surfaces que l'on mesure en hectares. Son moteur **4-MIX** de **36,3 cm³** délivre un couple élevé à bas régime — exactement ce qu'il faut pour attaquer la ronce et le taillis sans caler.

La **poignée circulaire** (suffixe R) offre une liberté de mouvement totale sur terrain accidenté, talus et fossés, là où un guidon deux-mains gêne.

- Moteur **4-MIX** : couple de 4-temps, simplicité du 2-temps (pas de vidange)
- Réduction de consommation d'environ 20 % par rapport à un 2-temps équivalent
- Harnais et protection fournis`,
      metaTitle: 'STIHL FS 131 R neuve — débroussailleuse professionnelle 36,3 cm³',
      metaDescription:
        'Débroussailleuse professionnelle STIHL FS 131 R, moteur 4-MIX 36,3 cm³, poignée circulaire. Pour talus et broussailles denses. Neuve, garantie 2 ans.',
    },
    de: {
      name: 'STIHL FS 131 R — Freischneider',
      tagline: 'Rundumgriff, 36,3 cm³: die Maschine für große Flächen und Böschungen.',
      body: `Die **FS 131 R** ist für Flächen gemacht, die man in Hektar misst. Ihr **4-MIX**-Motor mit **36,3 cm³** liefert hohes Drehmoment bei niedriger Drehzahl — genau das Richtige, um Brombeeren und Gestrüpp anzugehen, ohne abzuwürgen.

Der **Rundumgriff** (Kürzel R) gibt volle Bewegungsfreiheit in unebenem Gelände, an Böschungen und Gräben, wo ein Zweihandgriff stört.

- **4-MIX**-Motor: Drehmoment eines Viertakters, Einfachheit eines Zweitakters (kein Ölwechsel)
- Rund 20 % weniger Verbrauch als ein vergleichbarer Zweitakter
- Traggurt und Schutz im Lieferumfang`,
      metaTitle: 'STIHL FS 131 R neu — Profi-Freischneider 36,3 cm³',
      metaDescription:
        'Profi-Freischneider STIHL FS 131 R, 4-MIX-Motor 36,3 cm³, Rundumgriff. Für Böschungen und dichtes Gestrüpp. Neu, 2 Jahre Garantie.',
    },
    specs: {
      fr: [
        ['Cylindrée', '36,3 cm³'],
        ['Puissance', '1,4 kW / 1,9 ch'],
        ['Poids', '5,8 kg'],
        ['Moteur', '4-MIX'],
        ['Poignée', 'Circulaire'],
        ['Livré avec', 'Harnais + protection + tête fil'],
      ],
      de: [
        ['Hubraum', '36,3 cm³'],
        ['Leistung', '1,4 kW / 1,9 PS'],
        ['Gewicht', '5,8 kg'],
        ['Motor', '4-MIX'],
        ['Griff', 'Rundumgriff'],
        ['Lieferumfang', 'Traggurt + Schutz + Mähkopf'],
      ],
    },
  }),

  build({
    sku: 'SM-FS111R',
    slug: 'stihl-fs-111-r-debroussailleuse',
    categorySlug: 'debroussailleuses',
    model: 'FS 111 R',
    marketPriceCents: 73_900,
    stock: 7,
    weightGrams: 8_400,
    placeholder: 'fs-111',
    fr: {
      name: 'STIHL FS 111 R — débroussailleuse thermique',
      tagline: 'Le juste milieu : 31,4 cm³ pour un usage intensif sans excès de poids.',
      body: `La **FS 111 R** couvre le travail d'entretien intensif — bords de route, parcs, zones enherbées — avec un poids de **5,7 kg** qui reste supportable sur une journée complète.

Moteur **4-MIX** : le couple d'un 4-temps sans la contrainte d'une vidange, avec une consommation nettement inférieure à un 2-temps de puissance équivalente.`,
      metaTitle: 'STIHL FS 111 R neuve — débroussailleuse 31,4 cm³ 4-MIX',
      metaDescription:
        'Débroussailleuse STIHL FS 111 R, moteur 4-MIX 31,4 cm³, poignée circulaire, 5,7 kg. Entretien intensif. Neuve, garantie 2 ans.',
    },
    de: {
      name: 'STIHL FS 111 R — Freischneider',
      tagline: 'Die goldene Mitte: 31,4 cm³ für intensiven Einsatz ohne Übergewicht.',
      body: `Die **FS 111 R** deckt intensive Pflegearbeiten ab — Straßenränder, Parks, Grünflächen — bei einem Gewicht von **5,7 kg**, das über einen ganzen Tag erträglich bleibt.

**4-MIX**-Motor: das Drehmoment eines Viertakters ohne Ölwechsel, mit deutlich geringerem Verbrauch als ein leistungsgleicher Zweitakter.`,
      metaTitle: 'STIHL FS 111 R neu — Freischneider 31,4 cm³ 4-MIX',
      metaDescription:
        'Freischneider STIHL FS 111 R, 4-MIX-Motor 31,4 cm³, Rundumgriff, 5,7 kg. Für intensive Pflege. Neu, 2 Jahre Garantie.',
    },
    specs: {
      fr: [
        ['Cylindrée', '31,4 cm³'],
        ['Puissance', '1,05 kW / 1,4 ch'],
        ['Poids', '5,7 kg'],
        ['Moteur', '4-MIX'],
        ['Poignée', 'Circulaire'],
      ],
      de: [
        ['Hubraum', '31,4 cm³'],
        ['Leistung', '1,05 kW / 1,4 PS'],
        ['Gewicht', '5,7 kg'],
        ['Motor', '4-MIX'],
        ['Griff', 'Rundumgriff'],
      ],
    },
  }),

  build({
    sku: 'SM-FS91R',
    slug: 'stihl-fs-91-r-debroussailleuse',
    categorySlug: 'debroussailleuses',
    model: 'FS 91 R',
    marketPriceCents: 59_900,
    stock: 9,
    weightGrams: 8_000,
    placeholder: 'fs-91',
    fr: {
      name: 'STIHL FS 91 R — débroussailleuse thermique',
      tagline: 'Compacte et polyvalente : 28,4 cm³, 5,3 kg, la plus vendue en collectivité.',
      body: `La **FS 91 R** est la débroussailleuse la plus répandue dans les services techniques municipaux. Elle traite l'herbe haute, les orties et les jeunes ronces sans difficulté, tout en restant assez légère pour un usage prolongé.

Moteur **4-MIX** économe, poignée circulaire, harnais simple fourni.`,
      metaTitle: 'STIHL FS 91 R neuve — débroussailleuse 28,4 cm³',
      metaDescription:
        'Débroussailleuse STIHL FS 91 R, 28,4 cm³, 4-MIX, 5,3 kg, poignée circulaire. Modèle le plus vendu en collectivité. Neuve, garantie 2 ans.',
    },
    de: {
      name: 'STIHL FS 91 R — Freischneider',
      tagline: 'Kompakt und vielseitig: 28,4 cm³, 5,3 kg, Bestseller bei Kommunen.',
      body: `Die **FS 91 R** ist der am weitesten verbreitete Freischneider in kommunalen Bauhöfen. Sie bewältigt hohes Gras, Brennnesseln und junge Brombeeren mühelos und bleibt dabei leicht genug für den Dauereinsatz.

Sparsamer **4-MIX**-Motor, Rundumgriff, einfacher Traggurt im Lieferumfang.`,
      metaTitle: 'STIHL FS 91 R neu — Freischneider 28,4 cm³',
      metaDescription:
        'Freischneider STIHL FS 91 R, 28,4 cm³, 4-MIX, 5,3 kg, Rundumgriff. Bestseller bei Kommunen. Neu, 2 Jahre Garantie.',
    },
    specs: {
      fr: [
        ['Cylindrée', '28,4 cm³'],
        ['Puissance', '0,95 kW / 1,3 ch'],
        ['Poids', '5,3 kg'],
        ['Moteur', '4-MIX'],
        ['Poignée', 'Circulaire'],
      ],
      de: [
        ['Hubraum', '28,4 cm³'],
        ['Leistung', '0,95 kW / 1,3 PS'],
        ['Gewicht', '5,3 kg'],
        ['Motor', '4-MIX'],
        ['Griff', 'Rundumgriff'],
      ],
    },
  }),

  build({
    sku: 'SM-FS55R',
    slug: 'stihl-fs-55-r-debroussailleuse',
    categorySlug: 'debroussailleuses',
    model: 'FS 55 R',
    marketPriceCents: 38_900,
    stock: 12,
    weightGrams: 7_000,
    placeholder: 'fs-55',
    fr: {
      name: 'STIHL FS 55 R — débroussailleuse thermique',
      tagline: "L'entrée de gamme robuste : 27,2 cm³ pour 5,0 kg.",
      body: `La **FS 55 R** est la débroussailleuse d'entrée de gamme la plus fiable de sa catégorie. Moteur 2-temps simple, peu de pièces d'usure, réparation facile : c'est un outil qui dure.

Idéale pour un terrain de quelques milliers de mètres carrés, des bordures et des zones que la tondeuse n'atteint pas.`,
      metaTitle: 'STIHL FS 55 R neuve — débroussailleuse 27,2 cm³',
      metaDescription:
        'Débroussailleuse STIHL FS 55 R, 27,2 cm³, 5,0 kg, poignée circulaire. Entrée de gamme robuste. Neuve, garantie 2 ans.',
    },
    de: {
      name: 'STIHL FS 55 R — Freischneider',
      tagline: 'Der robuste Einstieg: 27,2 cm³ bei 5,0 kg.',
      body: `Die **FS 55 R** ist der zuverlässigste Einstiegs-Freischneider ihrer Klasse. Einfacher Zweitaktmotor, wenige Verschleißteile, leicht zu reparieren: ein Werkzeug, das hält.

Ideal für Grundstücke von einigen tausend Quadratmetern, Randstreifen und Bereiche, die der Rasenmäher nicht erreicht.`,
      metaTitle: 'STIHL FS 55 R neu — Freischneider 27,2 cm³',
      metaDescription:
        'Freischneider STIHL FS 55 R, 27,2 cm³, 5,0 kg, Rundumgriff. Robuster Einstieg. Neu, 2 Jahre Garantie.',
    },
    specs: {
      fr: [
        ['Cylindrée', '27,2 cm³'],
        ['Puissance', '0,75 kW / 1,0 ch'],
        ['Poids', '5,0 kg'],
        ['Moteur', '2-temps'],
        ['Poignée', 'Circulaire'],
      ],
      de: [
        ['Hubraum', '27,2 cm³'],
        ['Leistung', '0,75 kW / 1,0 PS'],
        ['Gewicht', '5,0 kg'],
        ['Motor', 'Zweitakt'],
        ['Griff', 'Rundumgriff'],
      ],
    },
  }),

  build({
    sku: 'SM-FSA60R',
    slug: 'stihl-fsa-60-r-sans-batterie',
    categorySlug: 'debroussailleuses',
    model: 'FSA 60 R',
    marketPriceCents: 27_900,
    stock: 10,
    weightGrams: 4_500,
    placeholder: 'fsa-60',
    fr: {
      name: 'STIHL FSA 60 R — coupe-herbe à batterie, sans batterie',
      tagline: 'Silencieux, 2,8 kg, prêt en une seconde : le coupe-herbe du quotidien.',
      body: `La **FSA 60 R** pèse **2,8 kg** sans batterie et se met en marche instantanément. Pas de mélange à préparer, pas de lanceur à tirer : on presse la gâchette.

Pour l'entretien régulier d'un jardin, elle remplace avantageusement une machine thermique — surtout tôt le matin ou en zone résidentielle.

*Livrée sans batterie ni chargeur — système STIHL AK.*`,
      metaTitle: 'STIHL FSA 60 R neuve — coupe-herbe à batterie',
      metaDescription:
        'Coupe-herbe à batterie STIHL FSA 60 R, 2,8 kg, système AK. Silencieux, sans mélange. Sans batterie. Neuf, garantie 2 ans.',
    },
    de: {
      name: 'STIHL FSA 60 R — Akku-Motorsense, ohne Akku',
      tagline: 'Leise, 2,8 kg, in einer Sekunde einsatzbereit: die Motorsense für jeden Tag.',
      body: `Die **FSA 60 R** wiegt **2,8 kg** ohne Akku und ist sofort startbereit. Kein Gemisch anmischen, kein Anwerfen: einfach den Schalthebel drücken.

Für die regelmäßige Gartenpflege ersetzt sie eine Benzinmaschine mit Vorteilen — besonders früh am Morgen oder im Wohngebiet.

*Lieferung ohne Akku und Ladegerät — STIHL AK System.*`,
      metaTitle: 'STIHL FSA 60 R neu — Akku-Motorsense',
      metaDescription:
        'Akku-Motorsense STIHL FSA 60 R, 2,8 kg, AK System. Leise, ohne Gemisch. Ohne Akku. Neu, 2 Jahre Garantie.',
    },
    specs: {
      fr: [
        ['Type', 'Batterie — système STIHL AK'],
        ['Poids sans batterie', '2,8 kg'],
        ['Largeur de coupe', '28 cm'],
        ['Livraison', 'Sans batterie ni chargeur'],
      ],
      de: [
        ['Bauart', 'Akku — STIHL AK System'],
        ['Gewicht ohne Akku', '2,8 kg'],
        ['Schnittbreite', '28 cm'],
        ['Lieferumfang', 'Ohne Akku und Ladegerät'],
      ],
    },
  }),

  // ========================================================= OUTILS MOTORISÉS
  build({
    sku: 'SM-HS82R-75',
    slug: 'stihl-hs-82-r-taille-haie-75cm',
    categorySlug: 'outils-motorises',
    model: 'HS 82 R',
    marketPriceCents: 74_900,
    stock: 6,
    weightGrams: 7_200,
    featured: true,
    placeholder: 'hs-82r',
    fr: {
      name: 'STIHL HS 82 R — taille-haie thermique 75 cm',
      tagline: 'Lame 75 cm à double tranchant : la haie de plusieurs centaines de mètres.',
      body: `Le **HS 82 R** est conçu pour les longs linéaires de haie que l'on taille deux fois par an. Sa lame de **75 cm** à double tranchant coupe dans les deux sens du mouvement, ce qui divise par deux le nombre de passes.

- Écartement des dents adapté aux **branches jusqu'à 33 mm**
- Poignée arrière rotative sur 5 positions : coupe verticale sans torsion du poignet
- Système antivibratoire : indispensable sur les longues sessions`,
      metaTitle: 'STIHL HS 82 R neuf — taille-haie thermique 75 cm',
      metaDescription:
        'Taille-haie thermique professionnel STIHL HS 82 R, lame 75 cm double tranchant, poignée rotative. Neuf, garantie 2 ans.',
    },
    de: {
      name: 'STIHL HS 82 R — Benzin-Heckenschere 75 cm',
      tagline: 'Doppelseitiges 75-cm-Messer: für Hecken von mehreren hundert Metern.',
      body: `Die **HS 82 R** ist für lange Heckenzeilen gebaut, die zweimal im Jahr geschnitten werden. Das doppelseitige **75-cm-Messer** schneidet in beide Bewegungsrichtungen und halbiert so die Anzahl der Durchgänge.

- Zahnabstand für **Äste bis 33 mm**
- Hinterer Griff in 5 Positionen drehbar: Vertikalschnitt ohne Handgelenkverdrehung
- Antivibrationssystem: unverzichtbar bei langen Einsätzen`,
      metaTitle: 'STIHL HS 82 R neu — Benzin-Heckenschere 75 cm',
      metaDescription:
        'Profi-Benzin-Heckenschere STIHL HS 82 R, 75-cm-Doppelmesser, drehbarer Griff. Neu, 2 Jahre Garantie.',
    },
    specs: {
      fr: [
        ['Cylindrée', '22,7 cm³'],
        ['Longueur de lame', '75 cm'],
        ['Poids', '5,9 kg'],
        ['Écartement des dents', '33 mm'],
        ['Poignée', 'Rotative 5 positions'],
      ],
      de: [
        ['Hubraum', '22,7 cm³'],
        ['Messerlänge', '75 cm'],
        ['Gewicht', '5,9 kg'],
        ['Zahnabstand', '33 mm'],
        ['Griff', 'Drehbar, 5 Positionen'],
      ],
    },
  }),

  build({
    sku: 'SM-BG86',
    slug: 'stihl-bg-86-souffleur',
    categorySlug: 'outils-motorises',
    model: 'BG 86',
    marketPriceCents: 44_900,
    stock: 8,
    weightGrams: 6_000,
    placeholder: 'bg-86',
    fr: {
      name: 'STIHL BG 86 — souffleur à main thermique',
      tagline: 'Le souffleur à main le plus puissant de sa catégorie : 810 m³/h.',
      body: `Le **BG 86** déplace **810 m³ d'air par heure**, ce qui en fait le souffleur à main le plus performant de sa gamme. Il traite en une passe ce qu'un modèle électrique met trois passes à rassembler.

- Buse ronde ou plate, interchangeable sans outil
- Poignée déportée : le poids ne repose pas sur le poignet
- Kit aspirateur-broyeur disponible en option`,
      metaTitle: 'STIHL BG 86 neuf — souffleur thermique à main 810 m³/h',
      metaDescription:
        'Souffleur à main thermique STIHL BG 86, 810 m³/h, buse interchangeable. Le plus puissant de sa catégorie. Neuf, garantie 2 ans.',
    },
    de: {
      name: 'STIHL BG 86 — Benzin-Handblasgerät',
      tagline: 'Das stärkste Handblasgerät seiner Klasse: 810 m³/h.',
      body: `Das **BG 86** bewegt **810 m³ Luft pro Stunde** und ist damit das leistungsstärkste Handblasgerät seiner Baureihe. Es erledigt in einem Durchgang, wofür ein Elektromodell drei braucht.

- Rund- oder Flachdüse, werkzeuglos wechselbar
- Versetzter Griff: das Gewicht lastet nicht auf dem Handgelenk
- Saug-Häcksler-Satz optional erhältlich`,
      metaTitle: 'STIHL BG 86 neu — Benzin-Handblasgerät 810 m³/h',
      metaDescription:
        'Benzin-Handblasgerät STIHL BG 86, 810 m³/h, wechselbare Düse. Das stärkste seiner Klasse. Neu, 2 Jahre Garantie.',
    },
    specs: {
      fr: [
        ['Cylindrée', '27,2 cm³'],
        ['Débit d’air', '810 m³/h'],
        ['Vitesse d’air', '80 m/s'],
        ['Poids', '4,4 kg'],
      ],
      de: [
        ['Hubraum', '27,2 cm³'],
        ['Luftdurchsatz', '810 m³/h'],
        ['Luftgeschwindigkeit', '80 m/s'],
        ['Gewicht', '4,4 kg'],
      ],
    },
  }),

  build({
    sku: 'SM-HT105',
    slug: 'stihl-ht-105-elagueuse-sur-perche',
    categorySlug: 'outils-motorises',
    model: 'HT 105',
    marketPriceCents: 89_900,
    stock: 4,
    weightGrams: 9_500,
    placeholder: 'ht-105',
    fr: {
      name: 'STIHL HT 105 — élagueuse sur perche télescopique',
      tagline: 'Portée jusqu’à 3,90 m : élaguer depuis le sol, sans échelle ni nacelle.',
      body: `La **HT 105** permet d'atteindre des branches à **près de 4 mètres** de hauteur en gardant les deux pieds au sol. C'est un gain de sécurité considérable par rapport à une échelle, et une économie évidente face à une location de nacelle.

- Perche **télescopique** : réglage continu de la longueur selon la branche
- Tête de coupe orientable pour attaquer la branche au bon angle
- Moteur **4-MIX** : couple élevé, faible consommation`,
      metaTitle: 'STIHL HT 105 neuve — élagueuse sur perche télescopique 3,90 m',
      metaDescription:
        'Élagueuse sur perche télescopique STIHL HT 105, portée 3,90 m, moteur 4-MIX. Élagage depuis le sol. Neuve, garantie 2 ans.',
    },
    de: {
      name: 'STIHL HT 105 — Teleskop-Hoch-Entaster',
      tagline: 'Reichweite bis 3,90 m: entasten vom Boden aus, ohne Leiter und Hubsteiger.',
      body: `Mit der **HT 105** erreichen Sie Äste in **fast 4 Metern** Höhe, während beide Füße auf dem Boden bleiben. Ein erheblicher Sicherheitsgewinn gegenüber der Leiter und eine klare Ersparnis gegenüber der Hubsteigermiete.

- **Teleskopschaft**: stufenlose Längeneinstellung je nach Ast
- Schwenkbarer Schneidkopf für den richtigen Anschnittwinkel
- **4-MIX**-Motor: hohes Drehmoment, geringer Verbrauch`,
      metaTitle: 'STIHL HT 105 neu — Teleskop-Hoch-Entaster 3,90 m',
      metaDescription:
        'Teleskop-Hoch-Entaster STIHL HT 105, Reichweite 3,90 m, 4-MIX-Motor. Entasten vom Boden. Neu, 2 Jahre Garantie.',
    },
    specs: {
      fr: [
        ['Cylindrée', '31,4 cm³'],
        ['Longueur totale', '270 à 390 cm'],
        ['Poids', '7,3 kg'],
        ['Guide', '30 cm'],
        ['Moteur', '4-MIX'],
      ],
      de: [
        ['Hubraum', '31,4 cm³'],
        ['Gesamtlänge', '270 bis 390 cm'],
        ['Gewicht', '7,3 kg'],
        ['Schiene', '30 cm'],
        ['Motor', '4-MIX'],
      ],
    },
  }),

  build({
    sku: 'SM-TS420',
    slug: 'stihl-ts-420-decoupeuse',
    categorySlug: 'outils-motorises',
    model: 'TS 420',
    marketPriceCents: 114_900,
    stock: 5,
    weightGrams: 12_500,
    placeholder: 'ts-420',
    fr: {
      name: 'STIHL TS 420 — découpeuse à disque 350 mm',
      tagline: 'Béton, acier, enrobé : la découpeuse de chantier la plus répandue.',
      body: `La **TS 420** est la découpeuse thermique de référence sur les chantiers de voirie et de bâtiment. Disque de **350 mm**, profondeur de coupe de **125 mm** : elle traverse une dalle, un enrobé ou une buse béton sans forcer.

- Filtre à air à **long life** : jusqu'à 1 an sans remplacement en usage normal
- Bras de coupe réversible pour la coupe à ras d'un mur
- Raccord d'eau intégré : abattage des poussières de silice

⚠️ Le port d'un masque **FFP3** et de protections auditives est obligatoire lors de la coupe à sec de matériaux minéraux.`,
      metaTitle: 'STIHL TS 420 neuve — découpeuse à disque 350 mm',
      metaDescription:
        'Découpeuse thermique STIHL TS 420, disque 350 mm, profondeur 125 mm, raccord d’eau. Béton, acier, enrobé. Neuve, garantie 2 ans.',
    },
    de: {
      name: 'STIHL TS 420 — Trennschleifer 350 mm',
      tagline: 'Beton, Stahl, Asphalt: der verbreitetste Trennschleifer auf der Baustelle.',
      body: `Die **TS 420** ist der Referenz-Trennschleifer im Straßen- und Hochbau. **350-mm-Scheibe**, **125 mm** Schnitttiefe: Sie durchtrennt Platten, Asphalt und Betonrohre ohne Mühe.

- **Long-Life**-Luftfilter: bis zu einem Jahr ohne Wechsel im Normalbetrieb
- Umsetzbarer Schneidarm für wandbündige Schnitte
- Integrierter Wasseranschluss: Bindung von Quarzstaub

⚠️ Beim Trockenschnitt mineralischer Werkstoffe sind eine **FFP3-Maske** und Gehörschutz zwingend erforderlich.`,
      metaTitle: 'STIHL TS 420 neu — Trennschleifer 350 mm',
      metaDescription:
        'Benzin-Trennschleifer STIHL TS 420, 350-mm-Scheibe, 125 mm Schnitttiefe, Wasseranschluss. Beton, Stahl, Asphalt. Neu, 2 Jahre Garantie.',
    },
    specs: {
      fr: [
        ['Cylindrée', '66,7 cm³'],
        ['Puissance', '3,2 kW / 4,4 ch'],
        ['Diamètre de disque', '350 mm'],
        ['Profondeur de coupe', '125 mm'],
        ['Poids', '9,6 kg'],
      ],
      de: [
        ['Hubraum', '66,7 cm³'],
        ['Leistung', '3,2 kW / 4,4 PS'],
        ['Scheibendurchmesser', '350 mm'],
        ['Schnitttiefe', '125 mm'],
        ['Gewicht', '9,6 kg'],
      ],
    },
  }),

  // =============================================================== AFFÛTAGE
  build({
    sku: 'SM-TORMEK-T8-NEUF',
    slug: 'tormek-t-8-neuf',
    categorySlug: 'affutage',
    brand: 'Tormek',
    model: 'T-8',
    marketPriceCents: 79_900,
    stock: 3,
    weightGrams: 21_000,
    featured: true,
    placeholder: 'tormek-t8',
    fr: {
      name: 'Tormek T-8 — neuf, système d’affûtage à eau',
      tagline: 'Meule 250 mm à 90 tr/min : un tranchant parfait sans jamais brûler l’acier.',
      body: `Le **Tormek T-8** affûte à l'eau, à **90 tr/min**. À cette vitesse, l'acier ne monte jamais en température : la trempe est intacte, le fil tient plus longtemps qu'après un passage sur touret.

Carter en **zinc moulé sous pression**, arbre inoxydable **EzyLock**, moteur industriel prévu pour le service continu. La machine est conçue pour durer des décennies.

- Meule **SG-250** grain 220, transformable en grain 1000 avec le SP-650
- Bande de cuir de polissage pour la finition
- Support universel micro-réglable
- **Garantie constructeur 7 ans**

Fabriqué en Suède.`,
      metaTitle: 'Tormek T-8 neuf — système d’affûtage à eau 250 mm',
      metaDescription:
        'Système d’affûtage à eau Tormek T-8 neuf, meule 250 mm, 90 tr/min, garantie 7 ans. Fabriqué en Suède. Livraison France et Allemagne.',
    },
    de: {
      name: 'Tormek T-8 — neu, Nassschleifsystem',
      tagline: '250-mm-Stein bei 90 U/min: perfekte Schneiden, ohne den Stahl je zu verbrennen.',
      body: `Die **Tormek T-8** schleift nass bei **90 U/min**. Bei dieser Drehzahl erwärmt sich der Stahl nie: Die Härtung bleibt erhalten, die Schneide hält länger als nach dem Trockenschliff.

Gehäuse aus **Zink-Druckguss**, Edelstahlwelle mit **EzyLock**, Industriemotor für Dauerbetrieb. Eine Maschine, die Jahrzehnte hält.

- **SG-250** Stein, Körnung 220, mit SP-650 auf 1000 umstellbar
- Lederabziehscheibe für den Feinabzug
- Feinjustierbare Universalstütze
- **7 Jahre Herstellergarantie**

Hergestellt in Schweden.`,
      metaTitle: 'Tormek T-8 neu — Nassschleifsystem 250 mm',
      metaDescription:
        'Tormek T-8 Nassschleifsystem neu, 250-mm-Stein, 90 U/min, 7 Jahre Garantie. Hergestellt in Schweden. Versand nach Deutschland und Frankreich.',
    },
    specs: {
      fr: [
        ['Meule', 'SG-250 — 250 × 50 mm'],
        ['Vitesse', '90 tr/min'],
        ['Alimentation', '230 V — 200 W'],
        ['Poids', '18,2 kg'],
        ['Garantie', '7 ans'],
        ['Fabrication', 'Suède'],
      ],
      de: [
        ['Schleifstein', 'SG-250 — 250 × 50 mm'],
        ['Drehzahl', '90 U/min'],
        ['Anschluss', '230 V — 200 W'],
        ['Gewicht', '18,2 kg'],
        ['Garantie', '7 Jahre'],
        ['Herstellung', 'Schweden'],
      ],
    },
  }),

  build({
    sku: 'SM-AFF-2EN1-52',
    slug: 'affuteur-2-en-1-5-2mm',
    categorySlug: 'affutage',
    model: '2 en 1 — 5,2 mm',
    marketPriceCents: 4_200,
    stock: 30,
    weightGrams: 300,
    placeholder: 'affuteur-2en1',
    fr: {
      name: 'Affûteur 2 en 1 — 5,2 mm (chaînes 3/8")',
      tagline: 'Affûte la dent et abaisse le limiteur en un seul geste.',
      body: `L'**affûteur 2 en 1** combine deux limes rondes et une lime plate dans un seul guide. Un passage : la dent est affûtée **et** le limiteur de profondeur est ramené à la bonne hauteur.

C'est l'erreur la plus courante en affûtage manuel — oublier le limiteur — et ce guide la rend impossible. Compte de passes identique sur chaque dent grâce aux repères d'angle gravés.

Pour chaînes **3/8"** (MS 462, MS 500i, MS 400…). Vérifiez le pas de votre chaîne avant commande.`,
      metaTitle: 'Affûteur 2 en 1 STIHL 5,2 mm — chaînes 3/8"',
      metaDescription:
        'Affûteur 2 en 1 STIHL 5,2 mm pour chaînes 3/8". Affûte la dent et abaisse le limiteur en une passe. Livraison rapide France et Allemagne.',
    },
    de: {
      name: 'Feilgerät 2-in-1 — 5,2 mm (3/8"-Ketten)',
      tagline: 'Schärft den Zahn und senkt den Tiefenbegrenzer in einem Arbeitsgang.',
      body: `Das **2-in-1-Feilgerät** vereint zwei Rundfeilen und eine Flachfeile in einer Führung. Ein Durchgang: Der Zahn wird geschärft **und** der Tiefenbegrenzer auf das richtige Maß gebracht.

Der häufigste Fehler beim Handschärfen — den Tiefenbegrenzer zu vergessen — wird damit unmöglich. Gleiche Zugzahl an jedem Zahn dank eingravierter Winkelmarkierungen.

Für **3/8"**-Ketten (MS 462, MS 500i, MS 400…). Prüfen Sie die Teilung Ihrer Kette vor der Bestellung.`,
      metaTitle: 'STIHL Feilgerät 2-in-1 5,2 mm — 3/8"-Ketten',
      metaDescription:
        'STIHL 2-in-1-Feilgerät 5,2 mm für 3/8"-Ketten. Schärft Zahn und Tiefenbegrenzer in einem Zug. Schneller Versand nach Deutschland und Frankreich.',
    },
    specs: {
      fr: [
        ['Diamètre de lime', '5,2 mm'],
        ['Pas de chaîne', '3/8"'],
        ['Contenu', '2 limes rondes + 1 lime plate + guide'],
      ],
      de: [
        ['Feilendurchmesser', '5,2 mm'],
        ['Kettenteilung', '3/8"'],
        ['Inhalt', '2 Rundfeilen + 1 Flachfeile + Führung'],
      ],
    },
  }),

  // ============================================================== ACCESSOIRES
  build({
    sku: 'SM-GUIDE-ESL-63',
    slug: 'guide-rollomatic-es-light-63cm',
    categorySlug: 'accessoires',
    model: 'Rollomatic ES Light 63 cm',
    marketPriceCents: 12_900,
    stock: 12,
    weightGrams: 1_400,
    placeholder: 'guide-63',
    fr: {
      name: 'Guide STIHL Rollomatic ES Light — 63 cm, 3/8", 1,6 mm',
      tagline: 'Jusqu’à 500 g de moins qu’un guide massif équivalent.',
      body: `Le **Rollomatic ES Light** intègre une couche de polymère entre deux flancs d'acier. Résultat : un guide de **63 cm** nettement plus léger qu'un guide massif, sans perte de rigidité.

Sur une journée d'abattage, cet allègement au bout du bras se ressent réellement.

- Pignon de renvoi remplaçable
- Rails traités par induction
- Compatible **MS 500i**, MS 661, MS 881

Pas **3/8"**, jauge **1,6 mm / 0,063"**, **84 maillons**.`,
      metaTitle: 'Guide STIHL Rollomatic ES Light 63 cm 3/8" 1,6 mm',
      metaDescription:
        'Guide-chaîne STIHL Rollomatic ES Light 63 cm, 3/8", 1,6 mm, 84 maillons. Allégé, pignon remplaçable. Compatible MS 500i et MS 661.',
    },
    de: {
      name: 'STIHL Rollomatic ES Light Schiene — 63 cm, 3/8", 1,6 mm',
      tagline: 'Bis zu 500 g leichter als eine vergleichbare Vollstahlschiene.',
      body: `Die **Rollomatic ES Light** hat eine Polymerschicht zwischen zwei Stahlwangen. Ergebnis: eine **63-cm**-Schiene, die deutlich leichter ist als eine Vollstahlschiene, ohne an Steifigkeit zu verlieren.

Über einen Fälltag hinweg macht sich dieses geringere Gewicht am ausgestreckten Arm deutlich bemerkbar.

- Austauschbarer Umlenkstern
- Induktionsgehärtete Führungsstege
- Kompatibel mit **MS 500i**, MS 661, MS 881

Teilung **3/8"**, Nutbreite **1,6 mm / 0,063"**, **84 Treibglieder**.`,
      metaTitle: 'STIHL Rollomatic ES Light 63 cm 3/8" 1,6 mm',
      metaDescription:
        'STIHL Rollomatic ES Light Führungsschiene 63 cm, 3/8", 1,6 mm, 84 Treibglieder. Leicht, austauschbarer Umlenkstern. Für MS 500i und MS 661.',
    },
    specs: {
      fr: [
        ['Longueur', '63 cm / 25"'],
        ['Pas', '3/8"'],
        ['Jauge', '1,6 mm / 0,063"'],
        ['Maillons', '84'],
        ['Compatibilité', 'MS 500i, MS 661, MS 881'],
      ],
      de: [
        ['Länge', '63 cm / 25"'],
        ['Teilung', '3/8"'],
        ['Nutbreite', '1,6 mm / 0,063"'],
        ['Treibglieder', '84'],
        ['Kompatibilität', 'MS 500i, MS 661, MS 881'],
      ],
    },
  }),

  build({
    sku: 'SM-CHAINE-RS-84',
    slug: 'chaine-rapid-super-38-16mm-84e',
    categorySlug: 'accessoires',
    model: 'Rapid Super 3/8" 1,6 mm 84E',
    marketPriceCents: 4_200,
    stock: 40,
    weightGrams: 700,
    placeholder: 'chaine-rs',
    fr: {
      name: 'Chaîne STIHL Rapid Super — 3/8", 1,6 mm, 84 maillons',
      tagline: 'Gouge carrée : la chaîne la plus agressive du catalogue, pour bois propre.',
      body: `La **Rapid Super** (RS) utilise une **gouge carrée** au lieu de la gouge arrondie classique. Le rendement de coupe est nettement supérieur — c'est la chaîne des professionnels de l'abattage.

Contrepartie à connaître : elle s'émousse plus vite au contact de la terre ou de l'écorce sale. Réservez-la au bois propre et gardez une Rapid Micro pour le bois souillé.

Compatible avec le guide Rollomatic ES / ES Light **63 cm** ci-dessus.`,
      metaTitle: 'Chaîne STIHL Rapid Super 3/8" 1,6 mm 84 maillons',
      metaDescription:
        'Chaîne STIHL Rapid Super à gouge carrée, 3/8", 1,6 mm, 84 maillons. Rendement de coupe maximal pour l’abattage professionnel.',
    },
    de: {
      name: 'STIHL Rapid Super Sägekette — 3/8", 1,6 mm, 84 Treibglieder',
      tagline: 'Vierkantzahn: die aggressivste Kette im Programm, für sauberes Holz.',
      body: `Die **Rapid Super** (RS) hat einen **Vierkantzahn** statt des klassischen Halbmeißelzahns. Die Schnittleistung liegt deutlich höher — die Kette der Fällprofis.

Zu wissen: Sie stumpft bei Erd- oder Rindenkontakt schneller ab. Setzen Sie sie auf sauberem Holz ein und behalten Sie eine Rapid Micro für verschmutztes Holz.

Passend zur oben genannten Rollomatic ES / ES Light Schiene **63 cm**.`,
      metaTitle: 'STIHL Rapid Super Kette 3/8" 1,6 mm 84 Treibglieder',
      metaDescription:
        'STIHL Rapid Super Sägekette mit Vierkantzahn, 3/8", 1,6 mm, 84 Treibglieder. Maximale Schnittleistung für den Profi-Fällschnitt.',
    },
    specs: {
      fr: [
        ['Pas', '3/8"'],
        ['Jauge', '1,6 mm / 0,063"'],
        ['Maillons', '84'],
        ['Type de gouge', 'Carrée (Rapid Super)'],
      ],
      de: [
        ['Teilung', '3/8"'],
        ['Nutbreite', '1,6 mm / 0,063"'],
        ['Treibglieder', '84'],
        ['Zahnform', 'Vierkant (Rapid Super)'],
      ],
    },
  }),

  build({
    sku: 'SM-HUILE-SYNTH-5L',
    slug: 'huile-chaine-synthplus-5l',
    categorySlug: 'accessoires',
    model: 'SynthPlus 5 L',
    marketPriceCents: 4_900,
    stock: 50,
    weightGrams: 5_200,
    placeholder: 'huile-chaine',
    fr: {
      name: 'Huile de chaîne STIHL SynthPlus — 5 litres',
      tagline: 'Adhérence renforcée, biodégradable à plus de 60 %.',
      body: `La **SynthPlus** est une huile de chaîne synthétique à adhérence renforcée : elle reste sur la chaîne au lieu d'être projetée, ce qui réduit la consommation d'environ **30 %** par rapport à une huile minérale.

- Biodégradable à plus de **60 %**
- Utilisable jusqu'à **−15 °C** sans épaississement
- Protège le pignon de renvoi et les rails du guide

Bidon de **5 litres** avec bec verseur.`,
      metaTitle: 'Huile de chaîne STIHL SynthPlus 5 L — biodégradable',
      metaDescription:
        'Huile de chaîne STIHL SynthPlus 5 litres, adhérence renforcée, biodégradable à plus de 60 %, utilisable jusqu’à −15 °C.',
    },
    de: {
      name: 'STIHL SynthPlus Haftöl — 5 Liter',
      tagline: 'Verstärkte Haftung, über 60 % biologisch abbaubar.',
      body: `**SynthPlus** ist ein synthetisches Haftöl mit verstärkter Haftwirkung: Es bleibt an der Kette, statt abgeschleudert zu werden, was den Verbrauch gegenüber Mineralöl um rund **30 %** senkt.

- Über **60 %** biologisch abbaubar
- Bis **−15 °C** einsetzbar, ohne zu verdicken
- Schützt Umlenkstern und Führungsstege

**5-Liter**-Kanister mit Ausgießer.`,
      metaTitle: 'STIHL SynthPlus Haftöl 5 L — biologisch abbaubar',
      metaDescription:
        'STIHL SynthPlus Haftöl 5 Liter, verstärkte Haftung, über 60 % biologisch abbaubar, bis −15 °C einsetzbar.',
    },
    specs: {
      fr: [
        ['Contenance', '5 litres'],
        ['Type', 'Synthétique, adhérence renforcée'],
        ['Biodégradabilité', '> 60 %'],
        ['Température mini', '−15 °C'],
      ],
      de: [
        ['Inhalt', '5 Liter'],
        ['Typ', 'Synthetisch, haftverstärkt'],
        ['Bioabbaubarkeit', '> 60 %'],
        ['Min. Temperatur', '−15 °C'],
      ],
    },
  }),

  build({
    sku: 'SM-HUILE-2T-1L',
    slug: 'huile-moteur-2t-hp-ultra-1l',
    categorySlug: 'accessoires',
    model: 'HP Ultra 1 L',
    marketPriceCents: 3_200,
    stock: 60,
    weightGrams: 1_100,
    placeholder: 'huile-2t',
    fr: {
      name: 'Huile moteur 2-temps STIHL HP Ultra — 1 litre',
      tagline: 'Entièrement synthétique : moteur propre, garantie préservée.',
      body: `La **HP Ultra** est l'huile 2-temps entièrement synthétique de la gamme. Elle réduit fortement les dépôts de calamine sur le piston et dans l'échappement — c'est ce qui allonge concrètement la durée de vie d'un moteur de tronçonneuse.

Dosage : **1 volume pour 50** d'essence (2 %). Un bidon de 1 L prépare **50 litres** de mélange.

⚠️ L'usage d'une huile non conforme peut faire tomber la garantie constructeur de votre machine.`,
      metaTitle: 'Huile moteur 2-temps STIHL HP Ultra 1 L — synthétique',
      metaDescription:
        'Huile moteur 2-temps STIHL HP Ultra 1 litre, entièrement synthétique, dosage 1:50. Réduit les dépôts, préserve la garantie.',
    },
    de: {
      name: 'STIHL HP Ultra Zweitaktmotoröl — 1 Liter',
      tagline: 'Vollsynthetisch: sauberer Motor, Garantie erhalten.',
      body: `**HP Ultra** ist das vollsynthetische Zweitaktöl der Baureihe. Es reduziert Ölkohleablagerungen an Kolben und Auspuff erheblich — genau das verlängert die Lebensdauer eines Kettensägenmotors spürbar.

Mischung: **1 Teil auf 50** Teile Benzin (2 %). Ein 1-Liter-Kanister ergibt **50 Liter** Gemisch.

⚠️ Die Verwendung nicht freigegebener Öle kann die Herstellergarantie Ihrer Maschine erlöschen lassen.`,
      metaTitle: 'STIHL HP Ultra Zweitaktöl 1 L — vollsynthetisch',
      metaDescription:
        'STIHL HP Ultra Zweitaktmotoröl 1 Liter, vollsynthetisch, Mischung 1:50. Reduziert Ablagerungen, erhält die Garantie.',
    },
    specs: {
      fr: [
        ['Contenance', '1 litre'],
        ['Type', 'Entièrement synthétique'],
        ['Dosage', '1:50 (2 %)'],
        ['Mélange obtenu', '50 litres'],
      ],
      de: [
        ['Inhalt', '1 Liter'],
        ['Typ', 'Vollsynthetisch'],
        ['Mischung', '1:50 (2 %)'],
        ['Ergibt', '50 Liter Gemisch'],
      ],
    },
  }),

  build({
    sku: 'SM-CASQUE-ADVX',
    slug: 'casque-forestier-advance-x-vent',
    categorySlug: 'accessoires',
    model: 'ADVANCE X-Vent',
    marketPriceCents: 18_900,
    stock: 14,
    weightGrams: 900,
    featured: true,
    placeholder: 'casque',
    fr: {
      name: 'Casque forestier STIHL ADVANCE X-Vent',
      tagline: 'Coque ventilée, visière grillagée et coquilles antibruit — un seul équipement.',
      body: `Le **ADVANCE X-Vent** réunit les trois protections obligatoires du travail à la tronçonneuse : **casque**, **visière** et **protection auditive**.

Sa coque ventilée évacue la chaleur, ce qui change tout sur une journée d'été — c'est la raison principale pour laquelle les opérateurs finissent par retirer un casque classique.

- Serrage micrométrique à molette, réglable d'une main
- Visière grillagée à haute visibilité, relevable
- Coquilles antibruit **SNR 25 dB**
- Conforme **EN 397**, **EN 1731**, **EN 352-3**

⚠️ Le port d'un casque forestier complet est obligatoire pour tout travail à la tronçonneuse.`,
      metaTitle: 'Casque forestier STIHL ADVANCE X-Vent — visière et antibruit',
      metaDescription:
        'Casque forestier STIHL ADVANCE X-Vent avec visière grillagée et coquilles antibruit SNR 25 dB. Conforme EN 397, EN 1731, EN 352-3.',
    },
    de: {
      name: 'STIHL ADVANCE X-Vent Forsthelm',
      tagline: 'Belüftete Schale, Gitter-Visier und Kapselgehörschutz — in einem Set.',
      body: `Der **ADVANCE X-Vent** vereint die drei vorgeschriebenen Schutzausrüstungen für die Kettensägenarbeit: **Helm**, **Visier** und **Gehörschutz**.

Die belüftete Schale leitet Wärme ab — an einem Sommertag macht das den Unterschied. Genau deshalb setzen Anwender klassische Helme irgendwann ab.

- Drehknopf-Feinverstellung, einhändig bedienbar
- Hochsichtbares Gitter-Visier, hochklappbar
- Kapselgehörschutz **SNR 25 dB**
- Konform nach **EN 397**, **EN 1731**, **EN 352-3**

⚠️ Ein vollständiger Forsthelm ist bei jeder Kettensägenarbeit vorgeschrieben.`,
      metaTitle: 'STIHL ADVANCE X-Vent Forsthelm — Visier und Gehörschutz',
      metaDescription:
        'STIHL ADVANCE X-Vent Forsthelm mit Gitter-Visier und Kapselgehörschutz SNR 25 dB. Konform nach EN 397, EN 1731, EN 352-3.',
    },
    specs: {
      fr: [
        ['Normes', 'EN 397 / EN 1731 / EN 352-3'],
        ['Atténuation', 'SNR 25 dB'],
        ['Visière', 'Grillagée, relevable'],
        ['Réglage', 'Molette micrométrique'],
      ],
      de: [
        ['Normen', 'EN 397 / EN 1731 / EN 352-3'],
        ['Dämmwert', 'SNR 25 dB'],
        ['Visier', 'Gitter, hochklappbar'],
        ['Verstellung', 'Drehknopf-Feinverstellung'],
      ],
    },
  }),

  build({
    sku: 'SM-PANTALON-ERGO',
    slug: 'pantalon-anti-coupures-function-ergo',
    categorySlug: 'accessoires',
    model: 'FUNCTION Ergo',
    marketPriceCents: 14_900,
    stock: 18,
    weightGrams: 1_300,
    placeholder: 'pantalon',
    fr: {
      name: 'Pantalon anti-coupures STIHL FUNCTION Ergo — classe 1',
      tagline: 'Neuf couches de fibres longues qui bloquent la chaîne en une fraction de seconde.',
      body: `Le **FUNCTION Ergo** protège la jambe avant selon la **classe 1 (EN 381-5)** : la doublure résiste à une chaîne lancée à **20 m/s**.

Le principe est mécanique : au contact, les fibres longues sont arrachées et s'enroulent instantanément autour du pignon, ce qui bloque la chaîne avant qu'elle n'atteigne la peau.

- Coupe préformée aux genoux : moins de fatigue en flexion
- Zones élastiques à l'arrière pour la liberté de mouvement
- Ceinture ajustable, passants larges

⚠️ Un pantalon anti-coupures **ne dispense pas** des règles de sécurité : il protège d'un contact accidentel, pas d'une erreur de gestuelle.`,
      metaTitle: 'Pantalon anti-coupures STIHL FUNCTION Ergo classe 1 EN 381-5',
      metaDescription:
        'Pantalon anti-coupures STIHL FUNCTION Ergo, classe 1 EN 381-5, protection jusqu’à 20 m/s. Coupe préformée, zones élastiques.',
    },
    de: {
      name: 'STIHL FUNCTION Ergo Schnittschutzhose — Klasse 1',
      tagline: 'Neun Lagen Langfasern, die die Kette in Sekundenbruchteilen blockieren.',
      body: `Die **FUNCTION Ergo** schützt das vordere Bein nach **Klasse 1 (EN 381-5)**: Die Einlage hält einer Kette mit **20 m/s** stand.

Das Prinzip ist mechanisch: Bei Kontakt werden die Langfasern herausgerissen und wickeln sich sofort um das Kettenrad — die Kette blockiert, bevor sie die Haut erreicht.

- Vorgeformter Kniebereich: weniger Ermüdung beim Beugen
- Elastische Zonen am Rücken für Bewegungsfreiheit
- Verstellbarer Bund, breite Schlaufen

⚠️ Eine Schnittschutzhose **ersetzt keine** Sicherheitsregeln: Sie schützt vor unbeabsichtigtem Kontakt, nicht vor falscher Arbeitstechnik.`,
      metaTitle: 'STIHL FUNCTION Ergo Schnittschutzhose Klasse 1 EN 381-5',
      metaDescription:
        'STIHL FUNCTION Ergo Schnittschutzhose, Klasse 1 EN 381-5, Schutz bis 20 m/s. Vorgeformter Schnitt, elastische Zonen.',
    },
    specs: {
      fr: [
        ['Norme', 'EN 381-5 — classe 1'],
        ['Protection', 'Jusqu’à 20 m/s'],
        ['Zone protégée', 'Jambe avant, forme A'],
        ['Entretien', 'Lavable à 40 °C'],
      ],
      de: [
        ['Norm', 'EN 381-5 — Klasse 1'],
        ['Schutz', 'Bis 20 m/s'],
        ['Schutzbereich', 'Vorderbein, Form A'],
        ['Pflege', 'Waschbar bei 40 °C'],
      ],
    },
  }),

  build({
    sku: 'SM-GANTS-DURO',
    slug: 'gants-dynamic-duro',
    categorySlug: 'accessoires',
    model: 'DYNAMIC Duro',
    marketPriceCents: 3_900,
    stock: 35,
    weightGrams: 250,
    placeholder: 'gants',
    fr: {
      name: 'Gants de travail STIHL DYNAMIC Duro',
      tagline: 'Paume renforcée Kevlar : résistants à l’abrasion et aux coupures légères.',
      body: `Les **DYNAMIC Duro** sont conçus pour la manutention de bois, le débardage et l'entretien machine — pas pour la coupe.

Paume renforcée en **Kevlar**, dos aéré, poignet élastique. Ils tiennent bien plus longtemps qu'un gant de manutention standard sur du bois écorcé.

Disponibles en tailles S à XXL — précisez votre taille en commentaire de commande.`,
      metaTitle: 'Gants de travail STIHL DYNAMIC Duro — paume Kevlar',
      metaDescription:
        'Gants de travail STIHL DYNAMIC Duro avec paume renforcée Kevlar. Manutention de bois, débardage, entretien machine. Tailles S à XXL.',
    },
    de: {
      name: 'STIHL DYNAMIC Duro Arbeitshandschuhe',
      tagline: 'Kevlar-verstärkte Handfläche: abriebfest und schnitthemmend.',
      body: `Die **DYNAMIC Duro** sind für Holztransport, Rücken und Maschinenwartung gemacht — nicht für den Sägeeinsatz.

**Kevlar**-verstärkte Handfläche, belüfteter Handrücken, elastisches Bündchen. Sie halten an entrindetem Holz deutlich länger als Standard-Arbeitshandschuhe.

Erhältlich in den Größen S bis XXL — geben Sie Ihre Größe im Bestellkommentar an.`,
      metaTitle: 'STIHL DYNAMIC Duro Arbeitshandschuhe — Kevlar-Handfläche',
      metaDescription:
        'STIHL DYNAMIC Duro Arbeitshandschuhe mit Kevlar-verstärkter Handfläche. Holztransport, Rücken, Wartung. Größen S bis XXL.',
    },
    specs: {
      fr: [
        ['Renfort', 'Kevlar en paume'],
        ['Tailles', 'S à XXL'],
        ['Usage', 'Manutention, entretien — pas de coupe'],
      ],
      de: [
        ['Verstärkung', 'Kevlar in der Handfläche'],
        ['Größen', 'S bis XXL'],
        ['Einsatz', 'Transport, Wartung — nicht zum Sägen'],
      ],
    },
  }),

  build({
    sku: 'SM-BIDON-COMBI',
    slug: 'bidon-combine-5l-3l',
    categorySlug: 'accessoires',
    model: 'Bidon combiné 5 L / 3 L',
    marketPriceCents: 6_500,
    stock: 20,
    weightGrams: 1_800,
    placeholder: 'bidon',
    fr: {
      name: 'Bidon combiné STIHL — 5 L carburant + 3 L huile de chaîne',
      tagline: 'Un seul contenant pour les deux pleins, avec becs anti-débordement.',
      body: `Le **bidon combiné** réunit le carburant (**5 L**) et l'huile de chaîne (**3 L**) dans un contenant unique, avec une poignée centrale. Une seule chose à porter jusqu'au chantier.

Les deux becs verseurs sont équipés d'un **système anti-débordement** : le flux se coupe quand le réservoir est plein. Sur une tronçonneuse, un débordement d'huile signifie une machine glissante et un sol pollué.

Homologué **UN** pour le transport de carburant.`,
      metaTitle: 'Bidon combiné STIHL 5 L carburant + 3 L huile de chaîne',
      metaDescription:
        'Bidon combiné STIHL 5 litres carburant et 3 litres huile de chaîne, becs anti-débordement, homologué UN pour le transport.',
    },
    de: {
      name: 'STIHL Kombikanister — 5 L Kraftstoff + 3 L Haftöl',
      tagline: 'Ein Behälter für beide Füllungen, mit Überlaufstopp.',
      body: `Der **Kombikanister** vereint Kraftstoff (**5 L**) und Haftöl (**3 L**) in einem Behälter mit zentralem Tragegriff. Nur ein Teil, das zum Einsatzort getragen werden muss.

Beide Ausgießer haben einen **Überlaufstopp**: Der Fluss stoppt, sobald der Tank voll ist. An einer Kettensäge bedeutet übergelaufenes Öl eine rutschige Maschine und einen verschmutzten Boden.

**UN**-zugelassen für den Kraftstofftransport.`,
      metaTitle: 'STIHL Kombikanister 5 L Kraftstoff + 3 L Haftöl',
      metaDescription:
        'STIHL Kombikanister 5 Liter Kraftstoff und 3 Liter Haftöl, Überlaufstopp, UN-Zulassung für den Transport.',
    },
    specs: {
      fr: [
        ['Carburant', '5 litres'],
        ['Huile de chaîne', '3 litres'],
        ['Becs', 'Anti-débordement'],
        ['Homologation', 'UN — transport de carburant'],
      ],
      de: [
        ['Kraftstoff', '5 Liter'],
        ['Haftöl', '3 Liter'],
        ['Ausgießer', 'Überlaufstopp'],
        ['Zulassung', 'UN — Kraftstofftransport'],
      ],
    },
  }),

  build({
    sku: 'SM-BAT-AP300S',
    slug: 'batterie-stihl-ap-300-s',
    categorySlug: 'accessoires',
    model: 'AP 300 S',
    marketPriceCents: 27_900,
    stock: 10,
    weightGrams: 1_900,
    placeholder: 'batterie-ap300',
    fr: {
      name: 'Batterie STIHL AP 300 S — 281 Wh',
      tagline: 'La batterie professionnelle du système AP : 281 Wh, indicateur de charge intégré.',
      body: `L'**AP 300 S** est la batterie de référence du système professionnel **STIHL AP**. Avec **281 Wh**, elle alimente une MSA 220 C-B pendant environ **45 minutes de coupe effective**.

- Indicateur de charge à 4 LED, consultable sans machine
- Gestion thermique : pas de coupure brutale en pleine charge de travail
- Compatible avec toutes les machines **AP System** (MSA, FSA, HSA, BGA)

Chargeur **AL 500** vendu séparément.`,
      metaTitle: 'Batterie STIHL AP 300 S 281 Wh — système AP professionnel',
      metaDescription:
        'Batterie STIHL AP 300 S, 281 Wh, indicateur de charge 4 LED. Compatible MSA, FSA, HSA, BGA du système AP professionnel.',
    },
    de: {
      name: 'STIHL AP 300 S Akku — 281 Wh',
      tagline: 'Der Profi-Akku des AP Systems: 281 Wh, integrierte Ladeanzeige.',
      body: `Der **AP 300 S** ist der Referenzakku des professionellen **STIHL AP** Systems. Mit **281 Wh** versorgt er eine MSA 220 C-B rund **45 Minuten** effektive Schnittzeit.

- Ladeanzeige mit 4 LEDs, auch ohne Maschine ablesbar
- Thermomanagement: kein abrupter Abschaltvorgang unter Volllast
- Kompatibel mit allen **AP System** Geräten (MSA, FSA, HSA, BGA)

Ladegerät **AL 500** separat erhältlich.`,
      metaTitle: 'STIHL AP 300 S Akku 281 Wh — Profi AP System',
      metaDescription:
        'STIHL AP 300 S Akku, 281 Wh, Ladeanzeige mit 4 LEDs. Kompatibel mit MSA, FSA, HSA, BGA des Profi-AP-Systems.',
    },
    specs: {
      fr: [
        ['Capacité', '281 Wh'],
        ['Système', 'STIHL AP'],
        ['Poids', '1,7 kg'],
        ['Indicateur', '4 LED'],
      ],
      de: [
        ['Kapazität', '281 Wh'],
        ['System', 'STIHL AP'],
        ['Gewicht', '1,7 kg'],
        ['Anzeige', '4 LEDs'],
      ],
    },
  }),

  build({
    sku: 'SM-CHARG-AL500',
    slug: 'chargeur-stihl-al-500',
    categorySlug: 'accessoires',
    model: 'AL 500',
    marketPriceCents: 17_900,
    stock: 12,
    weightGrams: 1_500,
    placeholder: 'chargeur-al500',
    fr: {
      name: 'Chargeur rapide STIHL AL 500',
      tagline: 'Recharge une AP 300 S à 80 % en 25 minutes.',
      body: `L'**AL 500** est le chargeur rapide du système AP. Il ramène une **AP 300 S** à **80 % de charge en 25 minutes** — le temps d'une pause, et la machine repart.

Ventilation active pour maintenir la batterie à température optimale pendant la charge, ce qui préserve la durée de vie des cellules.

Pour une équipe qui travaille toute la journée à la batterie, c'est le chargeur qui rend le système viable.`,
      metaTitle: 'Chargeur rapide STIHL AL 500 — 80 % en 25 minutes',
      metaDescription:
        'Chargeur rapide STIHL AL 500 avec ventilation active. Recharge une AP 300 S à 80 % en 25 minutes. Système AP professionnel.',
    },
    de: {
      name: 'STIHL AL 500 Schnellladegerät',
      tagline: 'Lädt einen AP 300 S in 25 Minuten auf 80 %.',
      body: `Das **AL 500** ist das Schnellladegerät des AP Systems. Es bringt einen **AP 300 S** in **25 Minuten auf 80 %** — die Dauer einer Pause, und die Maschine läuft weiter.

Aktive Belüftung hält den Akku während des Ladens auf optimaler Temperatur und schont so die Lebensdauer der Zellen.

Für ein Team, das den ganzen Tag mit Akku arbeitet, macht dieses Ladegerät das System erst praktikabel.`,
      metaTitle: 'STIHL AL 500 Schnellladegerät — 80 % in 25 Minuten',
      metaDescription:
        'STIHL AL 500 Schnellladegerät mit aktiver Belüftung. Lädt einen AP 300 S in 25 Minuten auf 80 %. Profi-AP-System.',
    },
    specs: {
      fr: [
        ['Type', 'Charge rapide, ventilation active'],
        ['Système', 'STIHL AP'],
        ['Temps de charge', '80 % en 25 min (AP 300 S)'],
      ],
      de: [
        ['Typ', 'Schnellladung, aktive Belüftung'],
        ['System', 'STIHL AP'],
        ['Ladezeit', '80 % in 25 min (AP 300 S)'],
      ],
    },
  }),
].map((p) => ({
  ...p,
  fr: { ...p.fr, description: p.fr.description + GUARANTEE_FR },
  de: { ...p.de, description: p.de.description + GUARANTEE_DE },
}));
