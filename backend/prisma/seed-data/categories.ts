export interface CategorySeed {
  slug: string;
  position: number;
  icon: string;
  fr: { name: string; slug: string; description: string; metaTitle: string; metaDescription: string };
  de: { name: string; slug: string; description: string; metaTitle: string; metaDescription: string };
}

export const CATEGORIES: CategorySeed[] = [
  {
    slug: 'tronconneuses',
    position: 1,
    icon: 'chainsaw',
    fr: {
      name: 'Tronçonneuses',
      slug: 'tronconneuses',
      description:
        "Tronçonneuses thermiques et à batterie pour l'abattage, l'ébranchage et le bois de chauffage. Modèles particuliers et professionnels, neufs et occasions garanties.",
      metaTitle: 'Tronçonneuses thermiques et à batterie — neuves et occasions',
      metaDescription:
        'Tronçonneuses professionnelles et grand public : abattage, élagage, bois de chauffage. Machines neuves et occasions révisées, livrées en France et en Allemagne.',
    },
    de: {
      name: 'Kettensägen',
      slug: 'kettensaegen',
      description:
        'Benzin- und Akku-Kettensägen für Fällung, Entastung und Brennholz. Modelle für Privat- und Profianwender, neu und geprüft gebraucht.',
      metaTitle: 'Kettensägen — Benzin und Akku, neu und gebraucht',
      metaDescription:
        'Profi- und Hobby-Kettensägen für Fällung, Entastung und Brennholz. Neugeräte und geprüfte Gebrauchtmaschinen, Lieferung nach Deutschland und Frankreich.',
    },
  },
  {
    slug: 'debroussailleuses',
    position: 2,
    icon: 'brushcutter',
    fr: {
      name: 'Débroussailleuses',
      slug: 'debroussailleuses',
      description:
        "Débroussailleuses thermiques et à batterie pour l'entretien des terrains, talus et sous-bois. Harnais, têtes fil et couteaux disponibles.",
      metaTitle: 'Débroussailleuses thermiques et à batterie',
      metaDescription:
        'Débroussailleuses professionnelles pour terrains difficiles, talus et sous-bois. Livraison en France et en Allemagne, paiement carte ou virement.',
    },
    de: {
      name: 'Freischneider',
      slug: 'freischneider',
      description:
        'Benzin- und Akku-Freischneider für Grünflächen, Böschungen und Unterholz. Tragegurte, Mähköpfe und Dickichtmesser verfügbar.',
      metaTitle: 'Freischneider — Benzin und Akku',
      metaDescription:
        'Profi-Freischneider für schwieriges Gelände, Böschungen und Unterholz. Lieferung nach Deutschland und Frankreich, Zahlung per Karte oder Überweisung.',
    },
  },
  {
    slug: 'outils-motorises',
    position: 3,
    icon: 'tools',
    fr: {
      name: 'Outils motorisés',
      slug: 'outils-motorises',
      description:
        'Taille-haies, souffleurs, élagueuses sur perche et découpeuses à disque pour les professionnels du paysage et du bâtiment.',
      metaTitle: 'Taille-haies, souffleurs, élagueuses et découpeuses',
      metaDescription:
        'Outils motorisés professionnels : taille-haies, souffleurs, perches élagueuses, découpeuses à disque. Stock disponible, expédition sous 24 h.',
    },
    de: {
      name: 'Motorgeräte',
      slug: 'motorgeraete',
      description:
        'Heckenscheren, Blasgeräte, Hoch-Entaster und Trennschleifer für Garten-, Landschaftsbau und Baustelle.',
      metaTitle: 'Heckenscheren, Blasgeräte, Hoch-Entaster und Trennschleifer',
      metaDescription:
        'Professionelle Motorgeräte: Heckenscheren, Blasgeräte, Hoch-Entaster, Trennschleifer. Ab Lager verfügbar, Versand innerhalb von 24 Stunden.',
    },
  },
  {
    slug: 'affutage',
    position: 4,
    icon: 'sharpening',
    fr: {
      name: 'Affûtage et entretien',
      slug: 'affutage-entretien',
      description:
        "Systèmes d'affûtage à eau, limes, gabarits et consommables d'entretien pour garder une coupe nette et sûre.",
      metaTitle: "Affûtage et entretien — systèmes à eau, limes et gabarits",
      metaDescription:
        "Systèmes d'affûtage à eau, limes rondes, gabarits et huiles d'entretien. Matériel neuf et occasions pour ateliers et particuliers exigeants.",
    },
    de: {
      name: 'Schärfen und Wartung',
      slug: 'schaerfen-wartung',
      description:
        'Nassschleifsysteme, Feilen, Vorrichtungen und Wartungsmittel für dauerhaft saubere und sichere Schnitte.',
      metaTitle: 'Schärfen und Wartung — Nassschleifsysteme, Feilen, Vorrichtungen',
      metaDescription:
        'Nassschleifsysteme, Rundfeilen, Schleifvorrichtungen und Wartungsöle. Neu und gebraucht, für Werkstatt und anspruchsvolle Privatanwender.',
    },
  },
  {
    slug: 'accessoires',
    position: 5,
    icon: 'accessories',
    fr: {
      name: 'Accessoires et protection',
      slug: 'accessoires-protection',
      description:
        'Guides-chaînes, chaînes, huiles, batteries, chargeurs et équipements de protection individuelle homologués.',
      metaTitle: 'Guides, chaînes, huiles, batteries et équipements de protection',
      metaDescription:
        'Guides-chaînes, chaînes de rechange, huiles moteur et de chaîne, batteries, chargeurs, casques et pantalons anti-coupures homologués EN 381.',
    },
    de: {
      name: 'Zubehör und Schutzausrüstung',
      slug: 'zubehoer-schutzausruestung',
      description:
        'Führungsschienen, Sägeketten, Öle, Akkus, Ladegeräte und geprüfte persönliche Schutzausrüstung.',
      metaTitle: 'Schienen, Ketten, Öle, Akkus und Schutzausrüstung',
      metaDescription:
        'Führungsschienen, Ersatzketten, Motor- und Haftöle, Akkus, Ladegeräte, Helme und Schnittschutzhosen nach EN 381.',
    },
  },
];
