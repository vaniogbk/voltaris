import type { Locale } from '@/lib/routes';

export interface StaticPage {
  title: string;
  intro: string;
  body: string;
  /** Vrai tant que des informations légales propres à votre société manquent. */
  needsCompanyData?: boolean;
}

type PageKey = 'shipping' | 'terms' | 'legal' | 'privacy' | 'contact';

/**
 * Contenu des pages d'information.
 *
 * ⚠️ Les pages « mentions légales », « CGV » et « confidentialité » contiennent
 * des marqueurs [[…]] à remplacer par vos données réelles (raison sociale,
 * SIREN, adresse, hébergeur, DPO). Tant qu'ils sont présents, un bandeau
 * d'avertissement s'affiche sur la page.
 */
export const PAGES: Record<Locale, Record<PageKey, StaticPage>> = {
  fr: {
    shipping: {
      title: 'Livraison et délais',
      intro:
        'Nous livrons en France métropolitaine et en Allemagne. Il n’y a pas de retrait en magasin : toutes les commandes sont expédiées.',
      body: `### Zones desservies

Nous expédions vers la **France métropolitaine** et l'**Allemagne**. Nous ne livrons pas la Corse, les DOM-TOM, ni les îles allemandes non reliées par route.

### Délais de préparation

- **Paiement par carte** : commande préparée le jour ouvré suivant la validation du paiement.
- **Paiement par virement SEPA** : la préparation démarre à la réception effective des fonds, soit généralement 1 à 2 jours ouvrés après votre ordre de virement.

### Tarifs

Les frais de port dépendent du poids réel du colis et du pays de destination. Le montant exact s'affiche à l'étape de paiement, avant toute validation.

- Jusqu'à 2 kg — 7,90 € (FR) / 8,90 € (DE), offert dès 150 €
- De 2 à 10 kg — 12,90 € (FR) / 14,90 € (DE), offert dès 300 €
- De 10 à 30 kg — 24,90 € (FR) / 27,90 € (DE)
- Au-delà de 30 kg — expédition sur palette, 89,00 € (FR) / 99,00 € (DE)

### Transporteurs

DPD et Chronopost en France, DHL en Allemagne, DB Schenker pour les envois sur palette. Le numéro de suivi est ajouté à votre compte dès la remise du colis au transporteur.

### Machines thermiques et carburant

Les machines sont expédiées **réservoirs vidés**, conformément à la réglementation sur le transport de marchandises dangereuses. Prévoyez un premier plein à réception.

### Réception du colis

Vérifiez l'état de l'emballage devant le livreur. En cas de dommage visible, émettez des **réserves précises et manuscrites** sur le bordereau et prévenez-nous sous 48 h : sans réserve, le recours contre le transporteur n'est plus possible.`,
    },

    terms: {
      title: 'Conditions générales de vente',
      needsCompanyData: true,
      intro:
        'Les présentes conditions régissent les ventes conclues sur voltaris.eu entre [[RAISON_SOCIALE]] et ses clients.',
      body: `### 1. Objet et acceptation

Toute commande passée sur le site implique l'acceptation sans réserve des présentes conditions générales de vente. Elles prévalent sur tout autre document.

### 2. Produits

Les produits sont proposés **neufs** ou **d'occasion**. Pour chaque occasion, l'annonce précise l'état constaté, une note sur 10, les défauts visibles et les photographies de la machine réellement mise en vente.

Les caractéristiques techniques sont fournies à titre indicatif d'après les données constructeur. Une erreur manifeste dans une fiche produit ne saurait engager la vente à des conditions déraisonnables.

### 3. Prix

Les prix sont indiqués en euros, toutes taxes comprises, hors frais de livraison.

Les produits d'occasion acquis auprès de particuliers sont vendus sous le **régime de la marge bénéficiaire** (article 297 A du CGI). La TVA n'est ni ventilée sur la facture ni récupérable par l'acheteur. Cette mention figure sur chaque fiche produit concernée.

### 4. Commande

La commande est ferme à sa validation. Un récapitulatif complet — articles, montant, adresse de livraison et numéro de commande — s'affiche immédiatement à l'écran. **Conservez ce numéro** : il vous permet, avec votre adresse e-mail, de consulter votre commande et son suivi à tout moment depuis la page « Suivi de commande ». La page de confirmation peut être imprimée ou enregistrée en PDF.

Nous nous réservons le droit d'annuler une commande en cas d'erreur de prix manifeste, de rupture de stock ou de litige de paiement antérieur. Le cas échéant, le remboursement intégral est effectué sous 14 jours.

### 5. Paiement

Deux moyens de paiement sont proposés :

- **Carte bancaire**, via Stripe. Aucune donnée de carte ne transite par nos serveurs ni n'y est stockée.
- **Virement SEPA**. La commande est réservée pendant **7 jours**. Passé ce délai sans réception des fonds, elle est automatiquement annulée et les articles remis en vente.

### 6. Livraison

La livraison s'effectue à l'adresse indiquée lors de la commande. **Aucun retrait sur place n'est possible.** Les délais annoncés sont indicatifs et courent à compter de l'encaissement effectif.

### 7. Droit de rétractation

Conformément aux articles L221-18 et suivants du Code de la consommation, le consommateur dispose de **14 jours** à compter de la réception pour se rétracter, sans motif.

Le produit doit être retourné complet, dans son emballage d'origine, **réservoirs vidés et nettoyés**. Les frais de retour sont à la charge de l'acheteur. Le remboursement intervient sous 14 jours après réception et contrôle du produit.

La valeur du bien peut être diminuée si sa manipulation dépasse ce qui est nécessaire pour en établir la nature et le bon fonctionnement — par exemple une machine ayant réellement servi.

Ce droit ne s'applique pas aux acheteurs professionnels agissant dans le cadre de leur activité.

### 8. Garanties

Les produits neufs bénéficient de la **garantie constructeur** indiquée sur la fiche produit.

Les produits d'occasion bénéficient d'une **garantie commerciale de 3 à 6 mois** selon le modèle, précisée sur chaque annonce. Cette garantie couvre les défauts de fonctionnement, à l'exclusion des pièces d'usure (chaîne, guide, bougie, filtres, embrayage) et des dommages résultant d'un mauvais usage, d'un carburant inadapté ou d'un défaut d'entretien.

S'appliquent en outre la **garantie légale de conformité** (art. L217-3 et suivants du Code de la consommation) et la **garantie des vices cachés** (art. 1641 du Code civil).

### 9. Sécurité d'utilisation

Les machines vendues sont des outils professionnels dangereux. Le port des équipements de protection individuelle est obligatoire. L'acheteur reconnaît avoir la formation et l'aptitude nécessaires à l'usage du matériel commandé. Notre responsabilité ne saurait être engagée en cas d'accident résultant d'un usage non conforme.

### 10. Données personnelles

Le traitement des données est décrit dans notre politique de confidentialité.

### 11. Litiges

Les présentes conditions sont soumises au droit français. En cas de litige, une solution amiable sera recherchée en priorité. Le consommateur peut recourir gratuitement à la plateforme européenne de règlement en ligne des litiges : **ec.europa.eu/consumers/odr**.

À défaut d'accord, les tribunaux compétents sont ceux du ressort de [[VILLE_TRIBUNAL]].`,
    },

    legal: {
      title: 'Mentions légales',
      needsCompanyData: true,
      intro: 'Informations relatives à l’éditeur et à l’hébergement du site voltaris.eu.',
      body: `### Éditeur du site

**[[RAISON_SOCIALE]]**
[[FORME_JURIDIQUE]] au capital de [[CAPITAL]] €
[[ADRESSE_COMPLETE]]

- SIREN : [[SIREN]]
- RCS : [[RCS]]
- TVA intracommunautaire : [[TVA_INTRA]]
- Directeur de la publication : [[DIRECTEUR_PUBLICATION]]
- Contact : [[EMAIL_CONTACT]] — [[TELEPHONE]]

### Hébergement

- **Site web** : Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis
- **Application et base de données** : Railway Corp., 80 Bogart St, Brooklyn, NY 11206, États-Unis

### Propriété intellectuelle

Les textes, la charte graphique et les photographies produites par Voltaris sont sa propriété exclusive. Toute reproduction sans autorisation écrite est interdite.

### Marques citées

**Voltaris est un revendeur indépendant.** Il n'est ni détenu, ni mandaté, ni agréé par les fabricants dont les produits sont proposés à la vente.

Les marques citées sur ce site — notamment STIHL, marque déposée d'ANDREAS STIHL AG & Co. KG (Waiblingen, Allemagne), et TORMEK, marque déposée de Tormek AB (Lindesberg, Suède) — appartiennent à leurs titulaires respectifs. Elles sont utilisées exclusivement pour désigner et décrire les produits proposés, conformément au droit applicable en matière d'épuisement des droits de marque au sein de l'Espace économique européen.`,
    },

    privacy: {
      title: 'Politique de confidentialité',
      needsCompanyData: true,
      intro:
        'Comment nous collectons, utilisons et protégeons vos données personnelles, conformément au RGPD.',
      body: `### Responsable du traitement

**[[RAISON_SOCIALE]]**, [[ADRESSE_COMPLETE]]. Contact : [[EMAIL_DPO]].

### Données collectées

| Finalité | Données | Base légale | Conservation |
| --- | --- | --- | --- |
| Traitement des commandes | identité, adresses, e-mail, téléphone | exécution du contrat | 10 ans (obligation comptable) |
| Compte client | identité, e-mail, mot de passe chiffré | exécution du contrat | jusqu'à suppression du compte |
| Paiement | référence de transaction | exécution du contrat | 13 mois |
| Alertes occasions | e-mail | consentement | jusqu'au retrait du consentement |
| Formulaire de contact | nom, e-mail, message | intérêt légitime (répondre à votre demande) | 12 mois |
| Sécurité et journalisation | adresse IP, agent utilisateur | intérêt légitime | 12 mois |

Les mots de passe sont stockés sous forme de **condensat bcrypt**. Nous n'avons jamais accès à votre mot de passe en clair.

**Aucune donnée de carte bancaire n'est collectée ni stockée par nos soins.** Les paiements par carte sont traités directement par Stripe Payments Europe Ltd., prestataire certifié PCI-DSS niveau 1.

### Destinataires

Vos données sont transmises uniquement à nos sous-traitants, dans la stricte mesure nécessaire :

- **Stripe Payments Europe Ltd.** (Irlande) — traitement des paiements par carte
- **Railway Corp.** (États-Unis) — hébergement applicatif et base de données
- **Vercel Inc.** (États-Unis) — hébergement du site
- **Transporteurs** (DPD, DHL, Chronopost, GLS, DB Schenker) — nom, adresse et téléphone, aux seules fins de livraison
- **Telegram FZ-LLC** (Émirats arabes unis) — les messages envoyés depuis le formulaire de contact nous sont transmis par Telegram. N'y indiquez aucune donnée sensible : pour ces sujets, écrivez-nous directement par e-mail.

Les transferts vers les États-Unis et les Émirats arabes unis sont encadrés par les **clauses contractuelles types** de la Commission européenne.

Nous ne vendons ni ne louons vos données à des tiers.

### Cookies

Le site utilise uniquement des cookies strictement nécessaires : session d'authentification, préférence de langue et contenu du panier. Aucun cookie publicitaire ni traceur tiers n'est déposé. Aucun consentement n'est donc requis pour ces usages.

### Vos droits

Vous disposez des droits d'accès, de rectification, d'effacement, de limitation, d'opposition et de portabilité. Écrivez à **[[EMAIL_DPO]]** ; nous répondons sous un mois.

Vous pouvez également introduire une réclamation auprès de la **CNIL** (cnil.fr) ou, en Allemagne, auprès de l'autorité de protection des données de votre Land.`,
    },

    contact: {
      title: 'Nous contacter',
      intro:
        'Une question sur une machine, une commande ou une livraison ? Écrivez-nous, nous répondons sous 24 heures ouvrées.',
      body: '',
    },
  },

  de: {
    shipping: {
      title: 'Versand und Lieferzeiten',
      intro:
        'Wir liefern nach Deutschland und ins französische Festland. Eine Abholung im Laden ist nicht möglich: Alle Bestellungen werden versendet.',
      body: `### Liefergebiete

Wir versenden nach **Deutschland** und ins **französische Festland**. Nicht beliefert werden Korsika, die französischen Überseegebiete sowie nicht über eine Straße erreichbare deutsche Inseln.

### Bearbeitungszeiten

- **Kartenzahlung**: Bearbeitung am nächsten Werktag nach Zahlungsbestätigung.
- **SEPA-Überweisung**: Die Bearbeitung beginnt mit dem tatsächlichen Zahlungseingang, in der Regel 1 bis 2 Werktage nach Ihrem Überweisungsauftrag.

### Versandkosten

Die Versandkosten richten sich nach dem tatsächlichen Paketgewicht und dem Zielland. Der genaue Betrag wird im Bestellvorgang vor jeder verbindlichen Bestätigung angezeigt.

- Bis 2 kg — 8,90 € (DE) / 7,90 € (FR), ab 150 € kostenlos
- 2 bis 10 kg — 14,90 € (DE) / 12,90 € (FR), ab 300 € kostenlos
- 10 bis 31,5 kg — 27,90 € (DE) / 24,90 € (FR)
- Über 31,5 kg — Palettenversand, 99,00 € (DE) / 89,00 € (FR)

### Versanddienstleister

DHL in Deutschland, DPD und Chronopost in Frankreich, DB Schenker für Palettensendungen. Die Sendungsnummer wird Ihrem Konto hinzugefügt, sobald das Paket übergeben wurde.

### Benzinmaschinen und Kraftstoff

Maschinen werden mit **entleerten Tanks** versendet, entsprechend den Vorschriften für den Transport gefährlicher Güter. Planen Sie eine erste Betankung nach Erhalt ein.

### Warenannahme

Prüfen Sie den Zustand der Verpackung in Anwesenheit des Zustellers. Bei sichtbaren Schäden vermerken Sie **konkrete, handschriftliche Vorbehalte** auf dem Ablieferbeleg und informieren Sie uns innerhalb von 48 Stunden — ohne Vorbehalt ist ein Rückgriff auf den Versanddienstleister ausgeschlossen.`,
    },

    terms: {
      title: 'Allgemeine Geschäftsbedingungen',
      needsCompanyData: true,
      intro:
        'Diese Bedingungen regeln die über voltaris.eu geschlossenen Kaufverträge zwischen [[RAISON_SOCIALE]] und ihren Kunden.',
      body: `### 1. Geltungsbereich

Mit jeder Bestellung über diese Website akzeptieren Sie diese Allgemeinen Geschäftsbedingungen vorbehaltlos. Sie gehen abweichenden Bedingungen vor.

### 2. Produkte

Die Produkte werden **neu** oder **gebraucht** angeboten. Bei jeder Gebrauchtmaschine nennt das Angebot den festgestellten Zustand, eine Note von 10, sichtbare Mängel und Fotos der tatsächlich verkauften Maschine.

Technische Angaben beruhen auf Herstellerdaten und dienen der Orientierung. Ein offensichtlicher Fehler in einer Produktbeschreibung begründet keinen Anspruch auf unangemessene Vertragsbedingungen.

### 3. Preise

Alle Preise verstehen sich in Euro inklusive Mehrwertsteuer, zuzüglich Versandkosten.

Von Privatpersonen erworbene Gebrauchtwaren werden nach der **Differenzbesteuerung gemäß § 25a UStG** verkauft. Die Umsatzsteuer wird nicht ausgewiesen und ist für den Käufer nicht als Vorsteuer abziehbar. Dieser Hinweis erscheint auf jeder betroffenen Produktseite.

### 4. Bestellung

Mit der Bestätigung wird die Bestellung verbindlich. Eine vollständige Übersicht — Artikel, Betrag, Lieferadresse und Bestellnummer — wird unmittelbar auf dem Bildschirm angezeigt. **Bewahren Sie diese Nummer auf**: Zusammen mit Ihrer E-Mail-Adresse können Sie damit jederzeit über die Seite „Sendungsverfolgung“ auf Ihre Bestellung zugreifen. Die Bestätigungsseite lässt sich drucken oder als PDF speichern.

Wir behalten uns vor, eine Bestellung bei offensichtlichem Preisfehler, Nichtverfügbarkeit oder vorangegangenem Zahlungsstreit zu stornieren. In diesem Fall erfolgt die vollständige Erstattung innerhalb von 14 Tagen.

### 5. Zahlung

Zwei Zahlungsarten stehen zur Verfügung:

- **Kreditkarte** über Stripe. Es werden keine Kartendaten über unsere Server geleitet oder dort gespeichert.
- **SEPA-Überweisung**. Die Bestellung bleibt **7 Tage** reserviert. Geht der Betrag bis dahin nicht ein, wird die Bestellung automatisch storniert und die Ware wieder freigegeben.

### 6. Lieferung

Die Lieferung erfolgt an die bei der Bestellung angegebene Adresse. **Eine Abholung ist nicht möglich.** Angegebene Lieferzeiten sind Richtwerte und beginnen mit dem tatsächlichen Zahlungseingang.

### 7. Widerrufsrecht

Verbraucher haben das Recht, binnen **14 Tagen** ab Erhalt der Ware ohne Angabe von Gründen zu widerrufen.

Die Ware ist vollständig, in der Originalverpackung und mit **entleerten, gereinigten Tanks** zurückzusenden. Die Rücksendekosten trägt der Käufer. Die Erstattung erfolgt binnen 14 Tagen nach Eingang und Prüfung der Ware.

Für einen Wertverlust, der auf einen über die Prüfung der Beschaffenheit und Funktionsweise hinausgehenden Umgang zurückzuführen ist — etwa eine tatsächlich eingesetzte Maschine — haben Sie Wertersatz zu leisten.

Für gewerbliche Käufer im Rahmen ihrer Geschäftstätigkeit gilt dieses Recht nicht.

### 8. Gewährleistung und Garantie

Für Neugeräte gilt die auf der Produktseite angegebene **Herstellergarantie**.

Für Gebrauchtmaschinen gewähren wir eine **Händlergarantie von 3 bis 6 Monaten** je nach Modell, wie im jeweiligen Angebot angegeben. Sie deckt Funktionsmängel ab, ausgenommen Verschleißteile (Kette, Schiene, Zündkerze, Filter, Kupplung) sowie Schäden durch unsachgemäßen Gebrauch, ungeeigneten Kraftstoff oder mangelnde Wartung.

Daneben gilt die gesetzliche **Mängelhaftung** nach §§ 434 ff. BGB.

### 9. Sicherheit im Betrieb

Die verkauften Maschinen sind gefährliche Profigeräte. Das Tragen persönlicher Schutzausrüstung ist zwingend erforderlich. Der Käufer bestätigt, über die für den Betrieb erforderliche Ausbildung und Eignung zu verfügen. Für Unfälle infolge nicht bestimmungsgemäßer Verwendung haften wir nicht.

### 10. Personenbezogene Daten

Die Datenverarbeitung ist in unserer Datenschutzerklärung beschrieben.

### 11. Streitbeilegung

Es gilt französisches Recht; zwingende Verbraucherschutzvorschriften des Wohnsitzstaats bleiben unberührt. Verbraucher können die europäische Plattform zur Online-Streitbeilegung kostenfrei nutzen: **ec.europa.eu/consumers/odr**.

Wir sind weder verpflichtet noch bereit, an einem Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.`,
    },

    legal: {
      title: 'Impressum',
      needsCompanyData: true,
      intro: 'Angaben zum Betreiber und zum Hosting von voltaris.eu.',
      body: `### Angaben gemäß § 5 DDG

**[[RAISON_SOCIALE]]**
[[FORME_JURIDIQUE]] mit einem Kapital von [[CAPITAL]] €
[[ADRESSE_COMPLETE]]

- Handelsregister: [[RCS]]
- Registernummer: [[SIREN]]
- Umsatzsteuer-Identifikationsnummer: [[TVA_INTRA]]
- Verantwortlich für den Inhalt: [[DIRECTEUR_PUBLICATION]]
- Kontakt: [[EMAIL_CONTACT]] — [[TELEPHONE]]

### Hosting

- **Website**: Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA 91789, USA
- **Anwendung und Datenbank**: Railway Corp., 80 Bogart St, Brooklyn, NY 11206, USA

### Urheberrecht

Texte, Gestaltung und von Voltaris erstellte Fotografien sind urheberrechtlich geschützt. Jede Vervielfältigung ohne schriftliche Zustimmung ist untersagt.

### Genannte Marken

**Voltaris ist ein unabhängiger Händler.** Wir gehören keinem der Hersteller an, deren Produkte wir anbieten, und sind von diesen weder beauftragt noch autorisiert.

Die auf dieser Website genannten Marken — insbesondere STIHL, eingetragene Marke der ANDREAS STIHL AG & Co. KG (Waiblingen, Deutschland), und TORMEK, eingetragene Marke der Tormek AB (Lindesberg, Schweden) — sind Eigentum ihrer jeweiligen Inhaber. Sie werden ausschließlich zur Bezeichnung und Beschreibung der angebotenen Waren verwendet, im Rahmen der Erschöpfung des Markenrechts im Europäischen Wirtschaftsraum.`,
    },

    privacy: {
      title: 'Datenschutzerklärung',
      needsCompanyData: true,
      intro:
        'Wie wir Ihre personenbezogenen Daten erheben, verwenden und schützen — gemäß DSGVO.',
      body: `### Verantwortlicher

**[[RAISON_SOCIALE]]**, [[ADRESSE_COMPLETE]]. Kontakt: [[EMAIL_DPO]].

### Erhobene Daten

| Zweck | Daten | Rechtsgrundlage | Speicherdauer |
| --- | --- | --- | --- |
| Bestellabwicklung | Name, Adressen, E-Mail, Telefon | Vertragserfüllung | 10 Jahre (handelsrechtliche Pflicht) |
| Kundenkonto | Name, E-Mail, verschlüsseltes Passwort | Vertragserfüllung | bis zur Kontolöschung |
| Zahlung | Transaktionsreferenz | Vertragserfüllung | 13 Monate |
| Benachrichtigungen zu Gebrauchtmaschinen | E-Mail | Einwilligung | bis zum Widerruf |
| Kontaktformular | Name, E-Mail, Nachricht | berechtigtes Interesse (Beantwortung Ihrer Anfrage) | 12 Monate |
| Sicherheit und Protokollierung | IP-Adresse, User-Agent | berechtigtes Interesse | 12 Monate |

Passwörter werden ausschließlich als **bcrypt-Hash** gespeichert. Wir haben zu keinem Zeitpunkt Zugriff auf Ihr Klartextpasswort.

**Kreditkartendaten werden von uns weder erhoben noch gespeichert.** Kartenzahlungen werden direkt von Stripe Payments Europe Ltd. abgewickelt, einem nach PCI-DSS Level 1 zertifizierten Dienstleister.

### Empfänger

Ihre Daten werden ausschließlich an unsere Auftragsverarbeiter übermittelt, und nur soweit erforderlich:

- **Stripe Payments Europe Ltd.** (Irland) — Abwicklung von Kartenzahlungen
- **Railway Corp.** (USA) — Anwendungs- und Datenbank-Hosting
- **Vercel Inc.** (USA) — Website-Hosting
- **Versanddienstleister** (DHL, DPD, Chronopost, GLS, DB Schenker) — Name, Adresse und Telefon, ausschließlich zur Zustellung
- **Telegram FZ-LLC** (Vereinigte Arabische Emirate) — Nachrichten aus dem Kontaktformular werden uns über Telegram zugestellt. Geben Sie dort keine sensiblen Daten an; schreiben Sie uns dafür direkt per E-Mail.

Übermittlungen in die USA und in die Vereinigten Arabischen Emirate erfolgen auf Grundlage der **Standardvertragsklauseln** der Europäischen Kommission.

Wir verkaufen oder vermieten Ihre Daten nicht an Dritte.

### Cookies

Die Website verwendet ausschließlich technisch notwendige Cookies: Anmeldesitzung, Spracheinstellung und Warenkorbinhalt. Es werden keine Werbe-Cookies und keine Tracker Dritter gesetzt. Eine Einwilligung ist hierfür nicht erforderlich.

### Ihre Rechte

Sie haben das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung, Widerspruch und Datenübertragbarkeit. Schreiben Sie an **[[EMAIL_DPO]]**; wir antworten innerhalb eines Monats.

Sie können sich außerdem bei der Datenschutzaufsichtsbehörde Ihres Bundeslandes oder bei der französischen CNIL (cnil.fr) beschweren.`,
    },

    contact: {
      title: 'Kontakt',
      intro:
        'Fragen zu einer Maschine, einer Bestellung oder einer Lieferung? Schreiben Sie uns — wir antworten innerhalb von 24 Werkstunden.',
      body: '',
    },
  },
};

/** Vrai si le contenu comporte encore des marqueurs [[…]] à renseigner. */
export function hasPlaceholders(page: StaticPage): boolean {
  return /\[\[[A-Z_]+\]\]/.test(page.body) || /\[\[[A-Z_]+\]\]/.test(page.intro);
}
