export interface SeedTranslation {
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  conditionNote?: string;
  metaTitle: string;
  metaDescription: string;
}

export interface SeedImage {
  url: string;
  altFr: string;
  altDe: string;
}

export interface ProductSeed {
  sku: string;
  slug: string;
  categorySlug: string;
  brand: string;
  model?: string;
  condition: 'NEW' | 'USED' | 'REFURBISHED';
  conditionGrade?: number;
  /** Prix TTC en centimes */
  priceCents: number;
  compareAtCents?: number;
  vatMode?: 'STANDARD' | 'MARGIN';
  vatRateBps?: number;
  stock: number;
  lowStockAlert?: number;
  isUnique?: boolean;
  isFeatured?: boolean;
  weightGrams: number;
  images: SeedImage[];
  fr: SeedTranslation;
  de: SeedTranslation;
  specs: {
    fr: Array<[string, string]>;
    de: Array<[string, string]>;
  };
}
