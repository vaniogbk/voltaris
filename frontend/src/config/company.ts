/**
 * Identité légale de la boutique.
 *
 * ⚠️ C'EST LE SEUL FICHIER À REMPLIR pour rendre les pages juridiques
 * conformes. Les mentions légales, les CGV, la politique de confidentialité,
 * la page contact, les données structurées et le flux Google Merchant Center
 * lisent tous ces valeurs.
 *
 * Tant qu'un champ vaut la chaîne vide, un bandeau d'avertissement s'affiche
 * sur les pages concernées et `scripts/preflight.mjs` bloque la mise en ligne.
 *
 * Les mentions légales sont obligatoires en France (art. 6 III LCEN) comme en
 * Allemagne (§ 5 DDG) : sans elles, la boutique est en infraction dès la
 * première visite.
 */
export interface Company {
  legalName: string;
  tradeName: string;
  legalForm: string;
  capital: string;
  address: {
    line1: string;
    line2: string;
    postalCode: string;
    city: string;
    country: string;
  };
  registrationNumber: string;
  registry: string;
  vatNumber: string;
  publicationDirector: string;
  email: string;
  privacyEmail: string;
  phone: string;
  phoneHours: string;
  jurisdiction: string;
}

export const COMPANY: Company = {
  /** Raison sociale exacte, telle qu'inscrite au registre */
  legalName: '',
  /** Nom commercial affiché aux clients */
  tradeName: 'Voltaris',
  /** SAS, SARL, EURL, GmbH… */
  legalForm: '',
  /** Capital social en euros, sans le symbole. Laissez vide si non applicable. */
  capital: '',

  address: {
    line1: '',
    line2: '',
    postalCode: '',
    city: '',
    country: 'France',
  },

  /** SIREN (9 chiffres) ou numéro de registre équivalent */
  registrationNumber: '',
  /** Greffe d'immatriculation, ex. « RCS Bordeaux » */
  registry: '',
  /** TVA intracommunautaire, ex. FR12345678901 */
  vatNumber: '',

  /** Personne responsable de la publication du site */
  publicationDirector: '',

  email: '',
  /** Adresse de contact pour les demandes RGPD (peut être identique à `email`) */
  privacyEmail: '',
  phone: '',
  /** Horaires affichés sur la page contact */
  phoneHours: 'du lundi au vendredi, de 9 h à 12 h et de 14 h à 18 h',

  /** Tribunal compétent en cas de litige, ex. « Bordeaux » */
  jurisdiction: '',
};

/** Champs sans lesquels le site ne peut pas être ouvert légalement. */
const REQUIRED: Array<[string, string]> = [
  ['legalName', COMPANY.legalName],
  ['legalForm', COMPANY.legalForm],
  ['address.line1', COMPANY.address.line1],
  ['address.postalCode', COMPANY.address.postalCode],
  ['address.city', COMPANY.address.city],
  ['registrationNumber', COMPANY.registrationNumber],
  ['registry', COMPANY.registry],
  ['vatNumber', COMPANY.vatNumber],
  ['publicationDirector', COMPANY.publicationDirector],
  ['email', COMPANY.email],
  ['phone', COMPANY.phone],
  ['jurisdiction', COMPANY.jurisdiction],
];

/** Liste des champs encore vides, pour l'avertissement et le préflight. */
export function missingCompanyFields(): string[] {
  return REQUIRED.filter(([, value]) => !value.trim()).map(([key]) => key);
}

export const isCompanyConfigured = () => missingCompanyFields().length === 0;

/** Adresse postale sur une ligne, pour les données structurées et le pied de page. */
export function formatAddress(separator = ', '): string {
  return [
    COMPANY.address.line1,
    COMPANY.address.line2,
    `${COMPANY.address.postalCode} ${COMPANY.address.city}`.trim(),
    COMPANY.address.country,
  ]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(separator);
}

/** Adresse sur plusieurs lignes, pour l'affichage dans les pages. */
export const addressLines = () =>
  [
    COMPANY.legalName,
    COMPANY.address.line1,
    COMPANY.address.line2,
    `${COMPANY.address.postalCode} ${COMPANY.address.city}`.trim(),
    COMPANY.address.country,
  ]
    .map((part) => part.trim())
    .filter(Boolean);

/**
 * Remplace les marqueurs des textes juridiques par les valeurs configurées.
 * Un marqueur non renseigné reste visible : mieux vaut un trou évident qu'une
 * mention légale silencieusement fausse.
 */
export function fillCompanyPlaceholders(text: string): string {
  const values: Record<string, string> = {
    RAISON_SOCIALE: COMPANY.legalName,
    NOM_COMMERCIAL: COMPANY.tradeName,
    FORME_JURIDIQUE: COMPANY.legalForm,
    CAPITAL: COMPANY.capital,
    ADRESSE_COMPLETE: formatAddress(),
    SIREN: COMPANY.registrationNumber,
    RCS: COMPANY.registry,
    TVA_INTRA: COMPANY.vatNumber,
    DIRECTEUR_PUBLICATION: COMPANY.publicationDirector,
    EMAIL_CONTACT: COMPANY.email,
    EMAIL_DPO: COMPANY.privacyEmail || COMPANY.email,
    TELEPHONE: COMPANY.phone,
    HORAIRES: COMPANY.phoneHours,
    VILLE_TRIBUNAL: COMPANY.jurisdiction,
  };

  return text.replace(/\[\[([A-Z_]+)\]\]/g, (marker, key: string) => {
    const value = values[key];
    return value && value.trim() ? value : marker;
  });
}
