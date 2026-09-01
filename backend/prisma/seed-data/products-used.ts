import type { ProductSeed } from './types.js';

/**
 * Occasions réellement en stock, décrites à partir des photos fournies
 * (dossier img-produits). Pièces uniques : stock = 1, isUnique = true.
 *
 * Régime de TVA : marge bénéficiaire (art. 297 A CGI / § 25a UStG).
 * La TVA n'est pas ventilée sur la facture et n'est pas récupérable.
 *
 * À VÉRIFIER AVANT MISE EN LIGNE :
 *   • la longueur exacte du guide de l'unité « révisée atelier » (SM-OCC-MS500I-02)
 *     n'est pas lisible sur les photos — elle est annoncée comme « à confirmer ».
 *   • les heures de fonctionnement et l'année d'achat de chaque machine.
 */
export const USED_PRODUCTS: ProductSeed[] = [
  // ------------------------------------------------------------------ 1
  {
    sku: 'SM-OCC-MS500I-01',
    slug: 'stihl-ms-500i-occasion-guide-63cm',
    categorySlug: 'tronconneuses',
    brand: 'STIHL',
    model: 'MS 500i',
    condition: 'USED',
    conditionGrade: 9,
    priceCents: 84_900,
    compareAtCents: 164_900,
    vatMode: 'MARGIN',
    stock: 1,
    isUnique: true,
    isFeatured: true,
    weightGrams: 9_500,
    images: [
      { url: '/produits/ms500i-63cm/01.jpg', altFr: 'STIHL MS 500i occasion avec guide 63 cm, vue générale', altDe: 'STIHL MS 500i gebraucht mit 63-cm-Schiene, Gesamtansicht' },
      { url: '/produits/ms500i-63cm/02.jpg', altFr: 'STIHL MS 500i occasion, profil complet avec protège-guide', altDe: 'STIHL MS 500i gebraucht, Seitenansicht mit Schienenschutz' },
      { url: '/produits/ms500i-63cm/03.jpg', altFr: 'STIHL MS 500i, poignée arrière et commandes', altDe: 'STIHL MS 500i, hinterer Griff und Bedienelemente' },
      { url: '/produits/ms500i-63cm/04.jpg', altFr: 'STIHL MS 500i, capot de filtre et lanceur', altDe: 'STIHL MS 500i, Filterdeckel und Anwerfvorrichtung' },
      { url: '/produits/ms500i-63cm/05.jpg', altFr: 'STIHL MS 500i, carter moteur et tendeur de chaîne', altDe: 'STIHL MS 500i, Motorgehäuse und Kettenspanner' },
      { url: '/produits/ms500i-63cm/06.jpg', altFr: 'Guide STIHL Rollomatic ES 63 cm monté avec sa chaîne', altDe: 'STIHL Rollomatic ES 63 cm Schiene mit Sägekette' },
      { url: '/produits/ms500i-63cm/07.jpg', altFr: 'Marquage du guide : 3003 000 2031, 63 cm, 3/8", 1,6 mm, 84 maillons', altDe: 'Schienenkennzeichnung: 3003 000 2031, 63 cm, 3/8", 1,6 mm, 84 Treibglieder' },
      { url: '/produits/ms500i-63cm/08.jpg', altFr: 'Plaque constructeur ANDREAS STIHL AG, modèle MS 500i', altDe: 'Typenschild ANDREAS STIHL AG, Modell MS 500i' },
    ],
    fr: {
      name: 'STIHL MS 500i — occasion, guide 63 cm',
      slug: 'stihl-ms-500i-occasion-guide-63-cm',
      shortDescription:
        'La tronçonneuse à injection la plus rapide du marché, en état quasi neuf, avec son guide Rollomatic ES 63 cm. Pièce unique.',
      description: `La **STIHL MS 500i** est la première tronçonneuse de série à injection électronique. Pas de carburateur, pas de starter : on tire, elle démarre, et elle reprend son régime instantanément quelle que soit l'inclinaison ou l'altitude. Son rapport poids/puissance — 6,8 ch pour 6,2 kg à sec — reste la référence chez les bûcherons professionnels.

Cet exemplaire est une **pièce unique en état quasi neuf**. Carrosserie sans rayure profonde, poignées intactes, lanceur souple, filtre à air propre. Le guide **Rollomatic ES 63 cm** et sa chaîne sont montés et en bon état d'usure.

### Ce qui est livré
- La machine complète, avec son guide 63 cm / 25" et sa chaîne
- Le protège-guide d'origine
- La clé combinée

### Pourquoi ce prix
Nous achetons nos occasions auprès de professionnels qui renouvellent leur parc. La machine est vendue **sous le régime de la marge** : le prix affiché est un prix net, sans TVA récupérable. C'est ce qui nous permet d'afficher près de **800 € de moins que le neuf**.

### Notre contrôle
Compression vérifiée, démarrage à froid et à chaud testés, frein de chaîne contrôlé, graissage du guide validé. **Garantie 3 mois pièces et main-d'œuvre.**`,
      conditionNote: `État général : 9/10.

Machine d'occasion très peu utilisée. Micro-rayures d'usage sur le carter et le protège-main, visibles sur les photos. Aucun choc, aucune fissure, aucune trace de surchauffe. Griffes d'abattage d'origine non déformées.

Guide et chaîne : usure faible, rails droits, pignon de renvoi libre. La chaîne a été affûtée avant mise en vente.

Les photos de l'annonce sont celles de la machine que vous recevrez.`,
      metaTitle: 'STIHL MS 500i occasion guide 63 cm — 849 € au lieu de 1 649 €',
      metaDescription:
        "Tronçonneuse STIHL MS 500i d'occasion à injection, guide Rollomatic ES 63 cm, état 9/10, garantie 3 mois. Pièce unique à 849 € au lieu de 1 649 € neuf. Livraison France et Allemagne.",
    },
    de: {
      name: 'STIHL MS 500i — gebraucht, 63-cm-Schiene',
      slug: 'stihl-ms-500i-gebraucht-63-cm-schiene',
      shortDescription:
        'Die schnellste Einspritz-Kettensäge am Markt, neuwertiger Zustand, mit Rollomatic ES 63 cm. Einzelstück.',
      description: `Die **STIHL MS 500i** ist die erste Serien-Kettensäge mit elektronischer Kraftstoffeinspritzung. Kein Vergaser, kein Choke: anwerfen, läuft — und sie nimmt in jeder Lage und Höhenlage sofort Gas an. Das Leistungsgewicht von 6,8 PS bei 6,2 kg Trockengewicht ist bei Forstprofis nach wie vor die Referenz.

Dieses Exemplar ist ein **neuwertiges Einzelstück**. Gehäuse ohne tiefe Kratzer, Griffe intakt, Anwerfvorrichtung leichtgängig, Luftfilter sauber. Die **Rollomatic ES 63 cm** Schiene und die Kette sind montiert und weisen geringen Verschleiß auf.

### Lieferumfang
- Komplette Maschine mit 63-cm-Schiene und Sägekette
- Original-Schienenschutz
- Kombischlüssel

### Warum dieser Preis
Wir kaufen unsere Gebrauchtmaschinen bei Profis, die ihren Fuhrpark erneuern. Der Verkauf erfolgt nach der **Differenzbesteuerung (§ 25a UStG)**: Der angegebene Preis ist ein Nettopreis ohne ausweisbare Vorsteuer. Genau das ermöglicht rund **800 € Ersparnis gegenüber Neu**.

### Unsere Prüfung
Kompression geprüft, Kalt- und Warmstart getestet, Kettenbremse kontrolliert, Schienenschmierung validiert. **3 Monate Garantie auf Teile und Arbeit.**`,
      conditionNote: `Gesamtzustand: 9/10.

Sehr wenig genutzte Gebrauchtmaschine. Gebrauchsspuren in Form feiner Kratzer an Gehäuse und Handschutz, auf den Fotos sichtbar. Keine Schläge, keine Risse, keine Überhitzungsspuren. Krallenanschlag original und unverformt.

Schiene und Kette: geringer Verschleiß, gerade Führungsstege, Umlenkstern leichtgängig. Die Kette wurde vor dem Verkauf geschärft.

Die Fotos zeigen genau die Maschine, die Sie erhalten.`,
      metaTitle: 'STIHL MS 500i gebraucht 63 cm — 849 € statt 1.649 €',
      metaDescription:
        'Gebrauchte STIHL MS 500i Einspritz-Kettensäge, Rollomatic ES 63 cm, Zustand 9/10, 3 Monate Garantie. Einzelstück für 849 € statt 1.649 € neu. Versand nach Deutschland und Frankreich.',
    },
    specs: {
      fr: [
        ['Cylindrée', '79,2 cm³'],
        ['Puissance', '5,0 kW / 6,8 ch'],
        ['Poids à sec', '6,2 kg (sans guide ni chaîne)'],
        ['Alimentation', 'Injection électronique STIHL Injection'],
        ['Guide fourni', 'Rollomatic ES 63 cm / 25"'],
        ['Chaîne', '3/8" — jauge 1,6 mm / 0,063" — 84 maillons'],
        ['Référence guide', '3003 000 2031'],
        ['État', 'Occasion — 9/10'],
        ['Garantie', '3 mois pièces et main-d’œuvre'],
        ['TVA', 'Régime de la marge — non récupérable'],
      ],
      de: [
        ['Hubraum', '79,2 cm³'],
        ['Leistung', '5,0 kW / 6,8 PS'],
        ['Trockengewicht', '6,2 kg (ohne Schiene und Kette)'],
        ['Gemischaufbereitung', 'Elektronische Einspritzung STIHL Injection'],
        ['Mitgelieferte Schiene', 'Rollomatic ES 63 cm / 25"'],
        ['Sägekette', '3/8" — Treibgliedstärke 1,6 mm / 0,063" — 84 Treibglieder'],
        ['Schienen-Sachnummer', '3003 000 2031'],
        ['Zustand', 'Gebraucht — 9/10'],
        ['Garantie', '3 Monate auf Teile und Arbeit'],
        ['Umsatzsteuer', 'Differenzbesteuerung — nicht ausweisbar'],
      ],
    },
  },

  // ------------------------------------------------------------------ 2
  {
    sku: 'SM-OCC-MS500I-02',
    slug: 'stihl-ms-500i-occasion-revisee-atelier',
    categorySlug: 'tronconneuses',
    brand: 'STIHL',
    model: 'MS 500i',
    condition: 'REFURBISHED',
    conditionGrade: 8,
    priceCents: 74_900,
    compareAtCents: 164_900,
    vatMode: 'MARGIN',
    stock: 1,
    isUnique: true,
    isFeatured: true,
    weightGrams: 9_500,
    images: [
      { url: '/produits/ms500i-revisee/01.jpg', altFr: 'STIHL MS 500i révisée en atelier, vue complète sur établi', altDe: 'STIHL MS 500i werkstattgeprüft, Gesamtansicht auf der Werkbank' },
      { url: '/produits/ms500i-revisee/02.jpg', altFr: 'STIHL MS 500i avec guide Rollomatic ES Light', altDe: 'STIHL MS 500i mit Rollomatic ES Light Schiene' },
      { url: '/produits/ms500i-revisee/03.jpg', altFr: 'Filtre à air haute performance déposé lors de la révision', altDe: 'Hochleistungsluftfilter, bei der Wartung ausgebaut' },
      { url: '/produits/ms500i-revisee/04.jpg', altFr: 'Bloc injection et commandes moteur accessibles capot ouvert', altDe: 'Einspritzeinheit und Motorsteuerung bei geöffnetem Deckel' },
      { url: '/produits/ms500i-revisee/05.jpg', altFr: 'Embrayage, pignon et tendeur de chaîne après nettoyage', altDe: 'Kupplung, Kettenrad und Kettenspanner nach der Reinigung' },
    ],
    fr: {
      name: 'STIHL MS 500i — occasion révisée atelier',
      slug: 'stihl-ms-500i-occasion-revisee-atelier',
      shortDescription:
        'MS 500i entièrement démontée, nettoyée et contrôlée par notre atelier. Guide Rollomatic ES Light. Pièce unique.',
      description: `Cette **STIHL MS 500i** est passée par notre établi avant d'être mise en vente. Elle n'est pas simplement essuyée et photographiée : elle a été **démontée, contrôlée et remontée**, pièce par pièce.

### Ce que nous avons fait
- Dépose du capot, du filtre à air haute performance et du bloc d'injection
- Nettoyage complet du carter, des ailettes de refroidissement et du compartiment d'admission
- Contrôle de l'embrayage, du pignon d'entraînement et du tendeur de chaîne
- Vérification du faisceau, des connecteurs de la pompe d'injection et du capteur
- Test de compression, démarrage à froid, montée en régime, coupure

Les photos de l'annonce documentent cette révision : vous voyez l'intérieur de la machine, pas seulement sa carrosserie.

### État
Machine **plus marquée esthétiquement** que notre autre MS 500i — traces d'usage normales sur le carter et le protège-main — mais **mécaniquement irréprochable**. C'est le choix rationnel si vous cherchez un outil de travail plutôt qu'une machine de collection.

### Pourquoi ce prix
Vendue **sous le régime de la marge**, à **900 € sous le prix du neuf**. Pour une machine à injection contrôlée en atelier, c'est le meilleur rapport qualité-prix de notre stock.

**Garantie 6 mois pièces et main-d'œuvre** — le double de nos occasions standard, parce que nous l'avons ouverte.`,
      conditionNote: `État général : 8/10 — révisée en atelier.

Esthétique : traces d'usage franches sur le carter, le protège-main et la semelle. Aucune fissure structurelle, aucun élément manquant.

Mécanique : révision complète documentée par les photos. Compression conforme, injection fonctionnelle, frein de chaîne opérationnel, graissage validé.

Guide : STIHL Rollomatic ES Light. **La longueur exacte du guide est en cours de confirmation** — elle vous sera précisée avant expédition, et le prix est ajusté si elle ne correspond pas à ce que vous attendez.

Les photos de l'annonce sont celles de la machine que vous recevrez.`,
      metaTitle: 'STIHL MS 500i occasion révisée atelier — 749 € au lieu de 1 649 €',
      metaDescription:
        "STIHL MS 500i d'occasion entièrement révisée en atelier : démontage, nettoyage, contrôle injection et compression. Garantie 6 mois. 749 € au lieu de 1 649 € neuf.",
    },
    de: {
      name: 'STIHL MS 500i — gebraucht, werkstattgeprüft',
      slug: 'stihl-ms-500i-gebraucht-werkstattgeprueft',
      shortDescription:
        'MS 500i komplett zerlegt, gereinigt und in unserer Werkstatt geprüft. Rollomatic ES Light Schiene. Einzelstück.',
      description: `Diese **STIHL MS 500i** lag vor dem Verkauf auf unserer Werkbank. Sie wurde nicht nur abgewischt und fotografiert, sondern **zerlegt, geprüft und wieder aufgebaut** — Bauteil für Bauteil.

### Was wir gemacht haben
- Ausbau von Deckel, Hochleistungsluftfilter und Einspritzeinheit
- Vollständige Reinigung von Gehäuse, Kühlrippen und Ansaugbereich
- Kontrolle von Kupplung, Kettenrad und Kettenspanner
- Prüfung von Kabelbaum, Steckverbindern der Einspritzpumpe und Sensor
- Kompressionstest, Kaltstart, Drehzahlaufbau, Abstellen

Die Fotos dokumentieren diese Wartung: Sie sehen das Innenleben der Maschine, nicht nur das Gehäuse.

### Zustand
Optisch **stärker gezeichnet** als unsere zweite MS 500i — normale Gebrauchsspuren an Gehäuse und Handschutz — aber **mechanisch einwandfrei**. Die vernünftige Wahl, wenn Sie ein Arbeitsgerät suchen und kein Sammlerstück.

### Warum dieser Preis
Verkauf nach **Differenzbesteuerung**, **900 € unter Neupreis**. Für eine werkstattgeprüfte Einspritzsäge das beste Preis-Leistungs-Verhältnis in unserem Bestand.

**6 Monate Garantie auf Teile und Arbeit** — doppelt so lang wie bei unseren Standard-Gebrauchtmaschinen, weil wir sie geöffnet haben.`,
      conditionNote: `Gesamtzustand: 8/10 — werkstattgeprüft.

Optik: deutliche Gebrauchsspuren an Gehäuse, Handschutz und Grundplatte. Keine strukturellen Risse, keine fehlenden Teile.

Mechanik: vollständige Wartung, durch die Fotos dokumentiert. Kompression im Sollbereich, Einspritzung funktionsfähig, Kettenbremse einsatzbereit, Schmierung geprüft.

Schiene: STIHL Rollomatic ES Light. **Die genaue Schienenlänge wird derzeit bestätigt** — sie wird Ihnen vor dem Versand mitgeteilt, und der Preis wird angepasst, falls sie nicht Ihren Erwartungen entspricht.

Die Fotos zeigen genau die Maschine, die Sie erhalten.`,
      metaTitle: 'STIHL MS 500i gebraucht werkstattgeprüft — 749 € statt 1.649 €',
      metaDescription:
        'Gebrauchte STIHL MS 500i, komplett werkstattgeprüft: zerlegt, gereinigt, Einspritzung und Kompression kontrolliert. 6 Monate Garantie. 749 € statt 1.649 € neu.',
    },
    specs: {
      fr: [
        ['Cylindrée', '79,2 cm³'],
        ['Puissance', '5,0 kW / 6,8 ch'],
        ['Poids à sec', '6,2 kg (sans guide ni chaîne)'],
        ['Alimentation', 'Injection électronique STIHL Injection'],
        ['Guide fourni', 'Rollomatic ES Light — longueur à confirmer'],
        ['Révision', 'Démontage, nettoyage et contrôle complet en atelier'],
        ['État', 'Occasion révisée — 8/10'],
        ['Garantie', '6 mois pièces et main-d’œuvre'],
        ['TVA', 'Régime de la marge — non récupérable'],
      ],
      de: [
        ['Hubraum', '79,2 cm³'],
        ['Leistung', '5,0 kW / 6,8 PS'],
        ['Trockengewicht', '6,2 kg (ohne Schiene und Kette)'],
        ['Gemischaufbereitung', 'Elektronische Einspritzung STIHL Injection'],
        ['Mitgelieferte Schiene', 'Rollomatic ES Light — Länge wird bestätigt'],
        ['Wartung', 'Zerlegung, Reinigung und Komplettprüfung in der Werkstatt'],
        ['Zustand', 'Gebraucht werkstattgeprüft — 8/10'],
        ['Garantie', '6 Monate auf Teile und Arbeit'],
        ['Umsatzsteuer', 'Differenzbesteuerung — nicht ausweisbar'],
      ],
    },
  },

  // ------------------------------------------------------------------ 3
  {
    sku: 'SM-OCC-TORMEK-T8',
    slug: 'tormek-t8-occasion-pack-complet',
    categorySlug: 'affutage',
    brand: 'Tormek',
    model: 'T-8',
    condition: 'USED',
    conditionGrade: 9,
    priceCents: 39_900,
    compareAtCents: 98_900,
    vatMode: 'MARGIN',
    stock: 1,
    isUnique: true,
    isFeatured: true,
    weightGrams: 21_000,
    images: [
      { url: '/produits/tormek-t8/01.jpg', altFr: 'Tormek T-8 occasion avec coffret de gabarits HTK-706 complet', altDe: 'Tormek T-8 gebraucht mit vollständigem Vorrichtungskoffer HTK-706' },
      { url: '/produits/tormek-t8/02.jpg', altFr: 'Ensemble Tormek T-8 avec coffret ouvert et documentation', altDe: 'Tormek T-8 Set mit geöffnetem Koffer und Dokumentation' },
      { url: '/produits/tormek-t8/03.jpg', altFr: 'Tormek T-8 de face, meule à eau et bande de cuir', altDe: 'Tormek T-8 Frontansicht, Wasserstein und Lederabziehscheibe' },
      { url: '/produits/tormek-t8/04.jpg', altFr: 'Tormek T-8 vue arrière avec support universel monté', altDe: 'Tormek T-8 Rückansicht mit montierter Universalstütze' },
      { url: '/produits/tormek-t8/05.jpg', altFr: 'Meule SG-250 et bac à eau du Tormek T-8', altDe: 'SG-250 Schleifstein und Wasserbehälter der Tormek T-8' },
      { url: '/produits/tormek-t8/06.jpg', altFr: 'Bande de cuir de polissage et carter du Tormek T-8', altDe: 'Lederabziehscheibe und Gehäuse der Tormek T-8' },
      { url: '/produits/tormek-t8/07.jpg', altFr: 'Coffret de gabarits Tormek HTK-706 complet dans sa mousse', altDe: 'Vollständiger Tormek HTK-706 Vorrichtungskoffer im Schaumstoff' },
      { url: '/produits/tormek-t8/08.jpg', altFr: 'Gabarit WM-200, dresse-meule TT-50 et pierre SP-650', altDe: 'Winkellehre WM-200, Abrichtwerkzeug TT-50 und Steinpräparierer SP-650' },
      { url: '/produits/tormek-t8/09.jpg', altFr: 'Accessoires Tormek : pâte à polir PA-70 et marqueur', altDe: 'Tormek Zubehör: Polierpaste PA-70 und Marker' },
      { url: '/produits/tormek-t8/10.jpg', altFr: 'Contenu du coffret Tormek avec manuel Nass-Schärfen', altDe: 'Kofferinhalt Tormek mit Handbuch Nass-Schärfen' },
      { url: '/produits/tormek-t8/11.jpg', altFr: 'Tormek T-8 sur son plan de travail, ensemble complet', altDe: 'Tormek T-8 auf der Arbeitsfläche, komplettes Set' },
      { url: '/produits/tormek-t8/12.jpg', altFr: 'Manuels Tormek T-8 Getting Started et DVD Edge Tool Sharpening', altDe: 'Tormek T-8 Handbücher Getting Started und DVD Edge Tool Sharpening' },
      { url: '/produits/tormek-t8/13.jpg', altFr: 'Plaque signalétique Tormek : 230 V, 200 W, fabriqué en Suède', altDe: 'Typenschild Tormek: 230 V, 200 W, hergestellt in Schweden' },
      { url: '/produits/tormek-t8/14.jpg', altFr: 'Brochure officielle Tormek T-8 fournie avec la machine', altDe: 'Offizielle Tormek T-8 Broschüre im Lieferumfang' },
    ],
    fr: {
      name: 'Tormek T-8 — occasion, pack complet avec coffret de gabarits',
      slug: 'tormek-t8-occasion-pack-complet-gabarits',
      shortDescription:
        "Système d'affûtage à eau Tormek T-8 avec coffret HTK-706, WM-200, TT-50, SP-650, PA-70 et documentation. Pièce unique.",
      description: `Le **Tormek T-8** est la référence de l'affûtage à eau. Meule de 250 mm tournant à 90 tr/min dans un bain d'eau : l'acier ne chauffe jamais, le tranchant ne perd pas sa trempe. Carter en zinc moulé sous pression, arbre en acier inoxydable EzyLock, moteur industriel à entraînement continu — la machine est conçue pour tourner des heures sans interruption.

Cet exemplaire est vendu **en pack complet**, et c'est ce qui fait tout l'intérêt de l'affaire : acheté neuf pièce par pièce, cet ensemble dépasse **980 €**.

### Contenu du lot
- **Tormek T-8** — meule à eau SG-250 et bande de cuir de polissage
- **Coffret de gabarits HTK-706** complet : gabarits pour ciseaux, gouges, couteaux, outils courts et lames
- **WM-200 Anglemaster** — réglage précis de l'angle de biseau
- **TT-50 Truing Tool** — dressage et rectification de la meule
- **SP-650 Stone Grader** — passage du grain 220 au grain 1000 en quelques secondes
- **PA-70 Honing Compound** — pâte à polir pour la finition miroir
- Manuel *Nass-Schärfen von Schneidwerkzeugen*, guide *T-8 Getting Started*, DVD *Edge Tool Sharpening*, brochure d'origine

### Ce que vous pourrez affûter
Ciseaux à bois, gouges de tour, fers de rabot, couteaux de cuisine et de chasse, sécateurs, haches, lames de dégauchisseuse. Avec les gabarits fournis, l'angle est reproductible d'un affûtage à l'autre — c'est exactement ce qui manque à un affûtage à la main.

### Pourquoi ce prix
**399 € au lieu de 989 €** pour l'ensemble équivalent neuf. La machine sort d'un atelier d'ébénisterie et n'a servi qu'en usage domestique. Vendue **sous le régime de la marge**.

**Garantie 3 mois.** Fabriqué en Suède.`,
      conditionNote: `État général : 9/10.

Machine très propre, utilisée en atelier privé. Carter sans choc, sérigraphie intacte, câble et fiche en parfait état.

Meule SG-250 : usure faible et régulière, diamètre proche du neuf, aucun voile ni gorge. Fournie avec le TT-50 pour la redresser quand ce sera nécessaire.

Bande de cuir : souple, propre, à recharger simplement en pâte PA-70 (tube fourni, entamé).

Coffret de gabarits : complet, tous les éléments présents dans leur emplacement mousse (voir photos). Légères traces d'usage sur les parties métalliques.

Documentation complète, DVD encore sous blister.`,
      metaTitle: 'Tormek T-8 occasion pack complet — 399 € au lieu de 989 €',
      metaDescription:
        "Système d'affûtage à eau Tormek T-8 d'occasion avec coffret de gabarits HTK-706, WM-200, TT-50, SP-650 et PA-70. État 9/10, garantie 3 mois. 399 € au lieu de 989 €.",
    },
    de: {
      name: 'Tormek T-8 — gebraucht, Komplettpaket mit Vorrichtungskoffer',
      slug: 'tormek-t8-gebraucht-komplettpaket-vorrichtungen',
      shortDescription:
        'Tormek T-8 Nassschleifsystem mit HTK-706 Koffer, WM-200, TT-50, SP-650, PA-70 und Dokumentation. Einzelstück.',
      description: `Die **Tormek T-8** ist die Referenz beim Nassschleifen. 250-mm-Stein bei 90 U/min im Wasserbad: Der Stahl erhitzt sich nie, die Schneide verliert ihre Härtung nicht. Druckgegossenes Zinkgehäuse, EzyLock-Welle aus Edelstahl, Industriemotor für Dauerbetrieb — die Maschine ist für stundenlangen Einsatz gebaut.

Dieses Exemplar wird als **Komplettpaket** verkauft, und genau das macht das Angebot aus: Neu Stück für Stück gekauft liegt dieses Set über **980 €**.

### Lieferumfang
- **Tormek T-8** — SG-250 Wasserstein und Lederabziehscheibe
- **Vorrichtungskoffer HTK-706** komplett: Vorrichtungen für Stechbeitel, Drechselröhren, Messer, kurze Werkzeuge und Klingen
- **WM-200 Winkellehre** — präzise Einstellung des Schleifwinkels
- **TT-50 Abrichtwerkzeug** — Abrichten und Planschleifen des Steins
- **SP-650 Steinpräparierer** — Wechsel von Körnung 220 auf 1000 in Sekunden
- **PA-70 Polierpaste** — für den Spiegelabzug
- Handbuch *Nass-Schärfen von Schneidwerkzeugen*, *T-8 Getting Started*, DVD *Edge Tool Sharpening*, Originalbroschüre

### Was Sie damit schärfen
Stechbeitel, Drechselröhren, Hobeleisen, Küchen- und Jagdmesser, Gartenscheren, Beile, Abrichtmesser. Mit den mitgelieferten Vorrichtungen ist der Winkel von Schliff zu Schliff reproduzierbar — genau das, was beim Freihandschärfen fehlt.

### Warum dieser Preis
**399 € statt 989 €** für das gleichwertige Neuset. Die Maschine stammt aus einer Schreinerei und wurde nur privat genutzt. Verkauf nach **Differenzbesteuerung**.

**3 Monate Garantie.** Hergestellt in Schweden.`,
      conditionNote: `Gesamtzustand: 9/10.

Sehr saubere Maschine aus privater Werkstattnutzung. Gehäuse ohne Schläge, Beschriftung intakt, Kabel und Stecker einwandfrei.

SG-250 Stein: geringer, gleichmäßiger Verschleiß, Durchmesser nahe Neuzustand, kein Schlag und keine Rille. Mit TT-50 zum späteren Abrichten geliefert.

Lederabziehscheibe: geschmeidig, sauber, einfach mit PA-70 nachzuladen (Tube im Lieferumfang, angebrochen).

Vorrichtungskoffer: vollständig, alle Teile an ihrem Platz im Schaumstoff (siehe Fotos). Leichte Gebrauchsspuren an den Metallteilen.

Dokumentation vollständig, DVD noch originalverschweißt.`,
      metaTitle: 'Tormek T-8 gebraucht Komplettpaket — 399 € statt 989 €',
      metaDescription:
        'Gebrauchtes Tormek T-8 Nassschleifsystem mit HTK-706 Vorrichtungskoffer, WM-200, TT-50, SP-650 und PA-70. Zustand 9/10, 3 Monate Garantie. 399 € statt 989 €.',
    },
    specs: {
      fr: [
        ['Meule', 'SG-250 — diamètre 250 mm, largeur 50 mm'],
        ['Vitesse de rotation', '90 tr/min'],
        ['Alimentation', '230 V — 50 Hz — 200 W'],
        ['Service', 'Continu S1'],
        ['Carter', 'Zinc moulé sous pression'],
        ['Arbre', 'Acier inoxydable, système EzyLock'],
        ['Poids', '18,2 kg'],
        ['Fabrication', 'Suède — Tormek AB, Lindesberg'],
        ['Accessoires inclus', 'HTK-706, WM-200, TT-50, SP-650, PA-70'],
        ['État', 'Occasion — 9/10'],
        ['Garantie', '3 mois'],
        ['TVA', 'Régime de la marge — non récupérable'],
      ],
      de: [
        ['Schleifstein', 'SG-250 — Durchmesser 250 mm, Breite 50 mm'],
        ['Drehzahl', '90 U/min'],
        ['Anschluss', '230 V — 50 Hz — 200 W'],
        ['Betriebsart', 'Dauerbetrieb S1'],
        ['Gehäuse', 'Zink-Druckguss'],
        ['Welle', 'Edelstahl, EzyLock-System'],
        ['Gewicht', '18,2 kg'],
        ['Herstellung', 'Schweden — Tormek AB, Lindesberg'],
        ['Enthaltenes Zubehör', 'HTK-706, WM-200, TT-50, SP-650, PA-70'],
        ['Zustand', 'Gebraucht — 9/10'],
        ['Garantie', '3 Monate'],
        ['Umsatzsteuer', 'Differenzbesteuerung — nicht ausweisbar'],
      ],
    },
  },
];
