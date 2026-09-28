# Voltaris

Boutique en ligne de matériel forestier et d'espaces verts — **neuf et occasion** — pour la **France** et l'**Allemagne**.

Livraison uniquement (aucun retrait en magasin), paiement par **carte bancaire (Stripe)** ou **virement SEPA**, interface et référencement entièrement bilingues FR/DE.

---

## Sommaire

- [Ce que contient le projet](#ce-que-contient-le-projet)
- [Stack technique](#stack-technique)
- [Démarrage rapide](#démarrage-rapide)
- [Structure du dépôt](#structure-du-dépôt)
- [Catalogue livré](#catalogue-livré)
- [Modèle de données](#modèle-de-données)
- [API](#api)
- [Paiements](#paiements)
- [Référencement FR / DE](#référencement-fr--de)
- [Charte graphique](#charte-graphique)
- [Déploiement](#déploiement)
- [À faire avant l'ouverture](#à-faire-avant-louverture)

---

## Ce que contient le projet

| Fonctionnalité | État |
| --- | --- |
| Page d'accueil avec branding, occasions mises en avant, réassurance | ✅ |
| Catalogue : 5 catégories, 33 produits, pagination, recherche | ✅ |
| Filtres avancés : catégorie, état, prix, marque, disponibilité, promotions | ✅ |
| Fiche produit : galerie plein écran, specs, état détaillé, produits liés | ✅ |
| Panier persistant (localStorage), recalculé côté serveur au paiement | ✅ |
| Commande **sans compte** — il n’existe aucune inscription client | ✅ |
| Suivi de commande par numéro + e-mail, page dédiée | ✅ |
| Ajout au panier direct depuis les listes, sans ouvrir la fiche | ✅ |
| Checkout : carte Stripe ou virement SEPA avec référence unique | ✅ |
| Code QR de virement SEPA (EPC069-12), référence pré-remplie | ✅ |
| Rapprochement bancaire automatique par import CAMT.053 | ✅ |
| Compte destinataire modifiable depuis le back-office, sans redéploiement | ✅ |
| Gestion des stocks : réservation, libération, historique tracé | ✅ |
| Livraison seule, grille tarifaire au poids par pays, suivi de colis | ✅ |
| Accès back-office réservé à l'équipe (aucun compte client) | ✅ |
| SEO : hreflang, URL localisées, JSON-LD, sitemap, robots | ✅ |
| Flux produit Google Merchant Center (RSS 2.0, FR et DE) | ✅ |
| Formulaire de contact relayé vers Telegram, avec piège à robots | ✅ |
| Back-office : tableau de bord, produits, stocks, commandes, virements, clients | ✅ |

---

## Stack technique

| Couche | Technologie |
| --- | --- |
| Frontend | Next.js 14 (App Router, RSC) + TailwindCSS + TypeScript |
| Backend | Node.js 20 + Express 4 + TypeScript |
| Base de données | PostgreSQL 16 via Prisma 5 |
| Authentification | JWT (accès 15 min en mémoire) + refresh token httpOnly avec rotation |
| Paiement | Stripe Payment Intents + virement SEPA avec référence de rapprochement |
| Hébergement | Vercel (frontend) + Railway (API + PostgreSQL) |

**Choix notables**

- **Le jeton d'accès ne quitte jamais la mémoire JavaScript.** Il n'est pas stocké dans `localStorage` : en cas de faille XSS il n'est pas exfiltrable. La session survit aux rechargements grâce au cookie `httpOnly` de rafraîchissement, avec rotation à chaque usage.
- **Le panier est recalculé intégralement côté serveur.** Les prix envoyés par le navigateur ne sont jamais utilisés — seule la base fait foi.
- **Le webhook Stripe est la seule source de vérité du paiement.** Le retour navigateur peut être perdu, interrompu ou falsifié ; il ne déclenche rien.
- **Aucune librairie de graphiques.** Le tableau de bord dessine son histogramme en SVG : une seule série de données ne justifie pas 50 ko de dépendance.

---

## Démarrage rapide

### Installation automatique

```bash
node scripts/setup.mjs
```

Le script vérifie les prérequis, génère les fichiers `.env` avec des secrets aléatoires, installe les dépendances des deux applications, démarre PostgreSQL via Docker, applique les migrations, charge le catalogue et génère les visuels. Il est idempotent : un `.env` existant n'est jamais écrasé.

### Installation manuelle

```bash
docker compose up -d
```

```bash
cp backend/.env.example backend/.env && cp frontend/.env.example frontend/.env
```

Générez ensuite deux secrets distincts et reportez-les dans `backend/.env` :

```bash
openssl rand -base64 48
```

```bash
npm install --prefix backend && npm install --prefix frontend
```

```bash
npm run --prefix backend prisma:migrate && npm run --prefix backend db:seed
```

```bash
node scripts/generate-placeholders.mjs
```

### Lancer en développement

```bash
npm install && npm run dev
```

| Adresse | Contenu |
| --- | --- |
| http://localhost:3000/fr | Boutique en français |
| http://localhost:3000/de | Boutique en allemand |
| http://localhost:3000/fr/admin | Back-office |
| http://localhost:4000/health | Sonde de santé de l'API |

Identifiants administrateur par défaut : `admin@voltaris.eu` / `ChangeMoi!2026`.

### Si le port 5432 est déjà occupé

Un PostgreSQL installé sur la machine — ou le conteneur d'un autre projet — occupe souvent déjà le port 5432. Le port publié par `docker compose` est donc paramétrable : créez un `.env` **à la racine du dépôt** avec un port libre, avant de lancer l'installation.

```bash
echo "POSTGRES_PORT=5455" > .env
```

`scripts/setup.mjs` lit cette valeur et l'inscrit dans le `DATABASE_URL` de `backend/.env`. En installation manuelle, reportez le même port vous-même.

### Sans Docker

Si vous disposez déjà d'un PostgreSQL local, créez la base puis renseignez `DATABASE_URL` dans `backend/.env` :

```bash
createdb -U postgres voltaris
```

```
DATABASE_URL="postgresql://postgres:VOTRE_MOT_DE_PASSE@localhost:5432/voltaris?schema=public"
```

---

## Structure du dépôt

```
Voltaris/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma          modèle de données complet
│   │   ├── seed.ts                chargement idempotent
│   │   └── seed-data/             catégories, occasions réelles, catalogue neuf
│   └── src/
│       ├── config/env.ts          validation Zod des variables d'environnement
│       ├── middleware/            auth JWT, validation, gestion d'erreurs
│       ├── services/              logique métier (catalogue, stock, commandes, paiement)
│       └── routes/                API publique + back-office
├── frontend/
│   ├── public/produits/           photos réelles des occasions + visuels du neuf
│   └── src/
│       ├── app/[locale]/          pages, une arborescence pour les deux langues
│       ├── app/feed/[locale]/     flux produit Google Merchant Center
│       ├── components/            UI, checkout, suivi de commande, back-office
│       ├── config/company.ts      ⚠️ VOS DONNÉES DE SOCIÉTÉ — un seul fichier
│       ├── content/pages.ts       CGV, mentions légales, confidentialité, livraison
│       ├── i18n/                  dictionnaires fr / de
│       └── lib/                   client API, routes localisées, panier, formatage
├── scripts/
│   ├── setup.mjs                  installation locale complète
│   ├── preflight.mjs              contrôle avant mise en production
│   ├── import-photos.mjs          vos photos produit → base de données
│   ├── reprice.mjs                recalcul des prix depuis vos relevés marché
│   ├── generate-placeholders.mjs  visuels provisoires du catalogue neuf
│   ├── test-camt053.mjs           test de bout en bout du rapprochement bancaire
│   └── fixtures/                  relevé CAMT.053 d'exemple
└── docker-compose.yml             PostgreSQL de développement
```

---

## Catalogue livré

### Occasions réelles — photographiées, en stock

Trois pièces uniques, décrites à partir des photos du dossier `img-produits`, vendues sous le **régime de la marge** (art. 297 A CGI / § 25a UStG).

| Produit | Prix | Prix neuf | Remise | Photos |
| --- | --- | --- | --- | --- |
| STIHL MS 500i — guide 63 cm, état 9/10 | **849 €** | 1 649 € | −48 % | 8 |
| STIHL MS 500i — révisée atelier, état 8/10 | **749 €** | 1 649 € | −54 % | 5 |
| Tormek T-8 — pack complet HTK-706 | **399 €** | 989 € | −59 % | 14 |

Chaque fiche comporte un bloc **« état de la machine »** distinct de la description commerciale : note sur 10, défauts visibles, usure du guide et de la chaîne. Les photos d'annonce sont celles de la machine réellement vendue — c'est indiqué explicitement au client.

### Catalogue neuf — 30 références

Les modèles les plus vendus et les plus recherchés du segment :

- **Tronçonneuses** — MS 500i, MS 462 C-M, MS 400 C-M, MS 261 C-M, MS 251 C-BE, MS 194 T, MS 180 C-BE, MSA 300 C-O, MSA 220 C-B
- **Débroussailleuses** — FS 131 R, FS 111 R, FS 91 R, FS 55 R, FSA 60 R
- **Outils motorisés** — HS 82 R, BG 86, HT 105, TS 420
- **Affûtage** — Tormek T-8 neuf, affûteur 2-en-1
- **Accessoires** — guide Rollomatic ES Light 63 cm, chaîne Rapid Super, huiles, bidon combiné, casque ADVANCE X-Vent, pantalon anti-coupures, gants, batterie AP 300 S, chargeur AL 500

### Politique de prix sur le neuf

L'objectif est d'être **visiblement le moins cher du marché**. Le prix de vente se calcule à partir du meilleur prix concurrent constaté, qui devient le prix barré :

| Prix marché | Remise | Exemple |
| --- | --- | --- |
| ≥ 500 € | **−200 €** | MS 462 C-M : 1 379 € → **1 179 €** |
| 250 à 500 € | −15 % | BG 86 : 449 € → **379 €** |
| < 250 € | −10 % | Gants Duro : 39 € → **34,90 €** |

La remise forfaitaire de 200 € ne s'applique qu'au-dessus de 500 €. En dessous elle donnerait des prix négatifs — 200 € de moins sur un bidon d'huile à 49 €, ou sur un chargeur à 179 €, n'a pas de sens. Les prix sont arrondis vers le bas : …9 € au-dessus de 100 €, …,90 € en dessous.

La règle vit dans `backend/prisma/seed-data/products-new.ts`, fonction `sellingPrice`.

**Recalculer à partir de vos relevés réels :**

```bash
npm run prices:export > prix.csv
```

Complétez `marche` (meilleur prix concurrent TTC) et `achat` (votre prix d'achat HT), puis :

```bash
npm run prices prix.csv
```

La simulation affiche ligne par ligne l'ancien prix, le nouveau et la marge résultante. `--apply` écrit en base, `--discount 250` change la remise forfaitaire.

**Garde-fou.** Si la colonne `achat` est renseignée, toute ligne dont le prix calculé passe sous le prix d'achat majoré de 5 % est **refusée**, y compris avec `--apply`. À −250 €, la MS 500i tombe sous ce seuil et le script bloque. C'est la seule protection possible : un script ne connaît pas vos remises fournisseur.

> **Les prix marché livrés sont indicatifs** et les stocks sont des valeurs de démarrage. La grille n'a de valeur que si la colonne « marché » reflète vos propres relevés.

### Photos produit

Les trois occasions utilisent **vos photos réelles** (27 clichés issus de `img-produits/`).

Les 30 références neuves n'ont pas de photographie : il n'en existe aucune dans le dossier fourni, et les visuels des fabricants sont protégés par le droit d'auteur — les reprendre exposerait la boutique. Elles affichent donc un **visuel provisoire généré**, aux couleurs de la charte, portant la silhouette de la famille d'outil, le modèle et sa caractéristique déterminante (`72,2 cm³ · 6,0 ch · guide 50 cm`), avec la mention explicite « photo produit à venir ». Deux tronçonneuses ne donnent donc pas deux tuiles identiques.

**Pour passer à vos vraies photos**, déposez-les dans un dossier portant le SKU du produit :

```
img-produits/SM-MS462-50/01.jpg   ← devient la photo principale
img-produits/SM-MS462-50/02.jpg
```

```bash
npm run photos
```

Le script copie les fichiers vers `frontend/public/produits/<slug>/`, remplace les images de la fiche en base et vous dit ce qu'il a fait. Lancé sans argument, il liste tous les SKU et signale ceux qui tournent encore sur un visuel provisoire. `--dry-run` simule, `--sku <SKU>` cible un produit, `--help` détaille les conseils de prise de vue.

Vous pouvez l'exécuter autant de fois que nécessaire, au fil de vos séances photo : les produits sans dossier ne sont jamais touchés.

**Depuis un flux fournisseur.** Si votre grossiste ou la médiathèque revendeur vous donne des URL d'images, l'import se fait sans passer par le disque :

```bash
node scripts/import-photos.mjs --from-csv photos.csv
```

Le fichier contient une ligne par image, dans l'ordre de la galerie :

```
sku,url
SM-MS462-50,https://media.mon-grossiste.fr/ms462/face.jpg
SM-MS462-50,https://media.mon-grossiste.fr/ms462/profil.jpg
```

Le script télécharge, vérifie que la réponse est bien une image (type MIME, taille entre 1 ko et 15 Mo), refuse tout protocole autre que HTTP(S), et signale chaque URL en échec sans interrompre le reste.

> N'utilisez ce mode qu'avec des URL dont vous détenez le **droit d'usage commercial**. Reprendre les photos d'un concurrent ou du site du fabricant sans autorisation est une contrefaçon, et la boutique porte déjà un nom de marque déposée.

**Trois sources légitimes** pour les photos du neuf : vos propres clichés, la médiathèque que votre fournisseur met à disposition de ses revendeurs, ou des visuels sous licence commerciale.

---

## Modèle de données

Points structurants du schéma Prisma :

**Traductions séparées.** `ProductTranslation` et `CategoryTranslation` portent un `slug` propre à chaque langue. Un produit vit donc à `/fr/produit/stihl-ms-500i-occasion-guide-63-cm` et à `/de/produkt/stihl-ms-500i-gebraucht-63-cm-schiene`, avec des balises `hreflang` réciproques.

**Deux compteurs de stock.** `stock` est l'inventaire physique, `reservedStock` la part immobilisée par des commandes en attente de paiement. Le disponible à la vente est la différence. Une commande par virement réserve sans décrémenter ; l'expédition transforme la réservation en sortie définitive ; l'expiration du délai libère la réservation.

**Historique de stock immuable.** Chaque variation crée un `StockMovement` avec son motif, la valeur résultante, la commande et l'opérateur concernés. L'inventaire courant est toujours reconstituable.

**Instantané de commande.** `OrderItem` copie le libellé, le SKU, le prix et le régime de TVA au moment de l'achat. Un changement de prix ou une suppression de produit ne réécrit jamais une commande passée.

**Régime de TVA par produit.** `vatMode` distingue `STANDARD` (TVA ventilée) de `MARGIN` (régime de la marge, TVA ni ventilée ni déductible). La mention correcte s'affiche sur la fiche, dans le panier et sur la facture.

---

## API

Base : `/api`. Toutes les réponses d'erreur suivent la forme `{ error: { code, message, details? } }`.

### Public

| Méthode | Route | Rôle |
| --- | --- | --- |
| `GET` | `/catalog/home` | Occasions, best-sellers et catégories de la page d'accueil |
| `GET` | `/catalog/products` | Liste filtrée et paginée |
| `GET` | `/catalog/products/:slug` | Fiche produit, traductions alternatives, produits liés |
| `GET` | `/catalog/categories` | Arborescence localisée |
| `GET` | `/catalog/facets` | Bornes de prix, marques et états disponibles |
| `GET` | `/catalog/sitemap` | URL du catalogue pour le sitemap |
| `POST` | `/checkout/quote` | Recalcul serveur du panier, TVA et frais de port |
| `POST` | `/checkout/orders` | Création de commande + réservation de stock |
| `GET` | `/checkout/orders/:orderNumber` | Suivi invité (numéro + e-mail) |
| `POST` | `/webhooks/stripe` | Webhook signé — corps brut |

### Compte client — jeton requis

`/auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/me`, `/auth/change-password`
`/account/orders`, `/account/orders/:orderNumber/tracking`, `/account/addresses`

### Back-office — rôle `ADMIN` ou `STAFF`

`/admin/dashboard`
`/admin/products` — CRUD, `POST /:id/stock`, `GET /:id/stock/movements`
`/admin/orders` — `POST /:id/confirm-transfer`, `/:id/ship`, `/:id/cancel`, `/:id/refund`
`/admin/customers` — liste, fiche, changement de rôle (ADMIN seul), révocation de sessions
`/admin/bank` — `POST /statements` (dépôt CAMT.053, `?dryRun=true` pour simuler), `GET /statements`, `GET /statements/:id`, `GET /entries/pending`, `POST /entries/:id/match`, `POST /entries/:id/ignore`
`/admin/categories`, `/admin/shipping-rates`
`/admin/settings/bank` — `GET` lecture (staff), `PUT` / `DELETE` modification (ADMIN seul)

### Contact

`GET /contact` — indique si le formulaire est actif · `POST /contact` — relaie le message vers Telegram

**Mise en service.** Créez un bot avec `@BotFather` sur Telegram, écrivez-lui un message, puis ouvrez `https://api.telegram.org/bot<JETON>/getUpdates` pour lire votre `chat_id`. Reportez les deux valeurs dans `backend/.env` :

```
TELEGRAM_BOT_TOKEN=123456789:AA...
TELEGRAM_CHAT_ID=987654321
```

Sans ces valeurs le formulaire ne s'affiche pas : la page contact garde son e-mail et son téléphone, le visiteur a toujours un moyen de vous joindre.

**Protections.** Trois messages par quart d'heure et par adresse IP — mais seuls les envois aboutis comptent, une faute de frappe dans l'e-mail ne bloque personne. Un champ piège invisible absorbe les robots : ils reçoivent un accusé de succès et rien n'est transmis. Le contenu est échappé avant envoi, un message contenant du balisage ne peut pas détourner le rendu de votre conversation.

**Le jeton ne quitte jamais le serveur.** Le navigateur ne connaît que l'existence, ou non, du formulaire.

> Router les messages clients vers Telegram transfère des données personnelles hors UE (Telegram FZ-LLC, Émirats arabes unis). C'est déclaré dans la politique de confidentialité, avec la recommandation faite au visiteur de ne pas y écrire de données sensibles.
`/admin/maintenance/release-expired-transfers`

---

## Paiements

### Carte bancaire — Stripe

Flux : création de la commande → `PaymentIntent` → `PaymentElement` → `confirmPayment` → retour sur la page de confirmation → **le webhook marque la commande payée**.

Le `PaymentIntent` est créé avec une clé d'idempotence dérivée de l'identifiant de commande : un double clic ne produit pas deux paiements. Le montant provient exclusivement de la base.

Webhook local :

```bash
stripe listen --forward-to localhost:4000/api/webhooks/stripe
```

Événements traités : `payment_intent.succeeded`, `payment_intent.payment_failed`, `payment_intent.canceled`, `charge.refunded`.

Si `STRIPE_SECRET_KEY` est absente, le paiement carte est **masqué proprement** dans l'interface et refusé côté API. Le virement reste disponible : la boutique fonctionne sans compte Stripe.

### Changer le compte destinataire

**Admin → Virements**, tout en haut. Titulaire, IBAN, BIC, banque et délai de règlement se modifient depuis un formulaire, sans redéploiement.

Le changement prend effet **immédiatement** : la page de confirmation et le code QR de toutes les commandes non réglées basculent sur le nouveau compte.

> ⚠️ Les clients ayant déjà reçu l'ancien IBAN par e-mail paieront sur l'ancien compte. Laissez-le ouvert le temps que les virements en cours arrivent — le formulaire le rappelle au moment de valider.

**Contrôles.** La clé IBAN (modulo 97) est vérifiée avant enregistrement : une saisie erronée est refusée plutôt que transformée en QR qui envoie l'argent ailleurs. Le BIC doit faire 8 ou 11 caractères au bon format.

**Droits.** Le staff voit le compte, seul un **administrateur** peut le modifier ou le réinitialiser. C'est l'opération la plus sensible du back-office ; chaque changement est journalisé avec l'auteur et un IBAN masqué.

`backend/.env` reste la valeur de départ : le bouton « Revenir aux valeurs du serveur » supprime la surcharge et y retourne.

### Virement SEPA

À la commande, une référence courte et non ambiguë est générée (`SM-K7M2QX`, alphabet sans `0/O` ni `1/I/L` — elle doit pouvoir être dictée au téléphone). Le stock est réservé pendant `BANK_TRANSFER_DUE_DAYS` jours, 7 par défaut.

La page de confirmation affiche un **code QR de virement** au format **EPC069-12** (« Girocode »), suivi de l'IBAN, du BIC, du montant et de la référence, chacun copiable en un clic.

Le client scanne le code depuis son application bancaire : bénéficiaire, IBAN, montant **et référence** sont pré-remplis, il ne lui reste qu'à valider. C'est le seul moyen fiable d'obtenir la référence exacte dans le libellé — une référence recopiée à la main est fausse ou absente dans une part non négligeable des virements, et chaque libellé illisible devient un rapprochement manuel.

Le format est lu nativement par toutes les applications bancaires allemandes et autrichiennes, et par la plupart des françaises. Les coordonnées restent affichées en clair juste à côté pour les autres.

L'IBAN configuré est validé par sa clé de contrôle (modulo 97, ISO 13616) avant génération du code : un IBAN mal saisi est refusé plutôt que transformé en QR qui envoie l'argent ailleurs. `scripts/preflight.mjs` fait la même vérification.

### Rapprochement automatique — import CAMT.053

**Admin → Virements.** Vous exportez le relevé de votre compte au format **CAMT.053** (ISO 20022, disponible dans toutes les banques européennes) et vous le déposez dans le back-office. Les commandes se règlent seules.

Ce que fait l'import :

1. **Lecture du relevé.** Seules les écritures **au crédit** et **comptabilisées** sont retenues ; les débits et les opérations encore en attente sont ignorés.
2. **Extraction de la référence** dans le libellé — `RmtInf/Ustrd`, référence structurée, `EndToEndId` et complément `AddtlNtryInf` sont tous inspectés. La recherche tolère la suppression des tirets et les changements de casse que pratiquent certaines banques : `ACOMPTE SM8WRU9U` retrouve bien `SM-8WRU9U`. Le numéro de commande `SM-2026-00001` est reconnu comme référence de repli.
3. **Décision**, par écriture :

| Cas | Résultat |
| --- | --- |
| Référence reconnue **et montant exact** | Commande passée en payée, prête à expédier |
| Référence reconnue, **montant différent** | Signalée avec l'écart chiffré — décision humaine |
| Commande déjà réglée | Marquée comme doublon, sans effet |
| Aucune référence exploitable | Listée dans « virements à traiter » |

Un virement incomplet n'encaisse jamais tout seul : expédier une machine à moitié payée coûte plus cher que dix minutes de vérification.

**Simulation systématique.** Le fichier est d'abord analysé sans rien écrire. Vous voyez le détail écriture par écriture, puis vous confirmez — ou pas.

**Rejeu sans risque.** Chaque écriture porte une empreinte SHA-256 calculée sur son contenu stable (compte, date, montant, émetteur, libellé). Deux relevés qui se chevauchent, ou le même fichier redéposé, ne créent aucun doublon ni double encaissement.

**Reprise manuelle.** Les virements sans référence restent listés dans **Virements → À traiter** : vous saisissez le numéro de commande, l'encaissement suit. Ou vous les écartez s'ils ne concernent pas la boutique.

Le tableau de bord affiche le nombre de virements en attente de traitement : c'est de l'argent reçu qu'aucune commande ne réclame encore.

```bash
npm run test:camt
```

Ce test crée deux commandes, fabrique un relevé couvrant les cas réels (paiement exact, sous-paiement, libellé vide, débit, doublon, fichier invalide) et vérifie les 20 comportements attendus. Il écrit aussi `scripts/fixtures/exemple-camt053.xml`, que vous pouvez déposer dans le back-office pour essayer l'écran.

**Ce qui reste à votre main** — et qu'aucun import ne peut décider : constater qu'un virement au montant inattendu correspond bien à telle commande, et expédier. Le code QR de la page de confirmation existe précisément pour réduire ce reliquat : il garantit que la référence figure correctement dans le libellé.

Deux alternatives si vous voulez supprimer même le dépôt du fichier : une **API bancaire** (Qonto, GoCardless Bank Account Data, Bridge, Powens) qui interroge vos écritures en continu, ou **Stripe virement bancaire** avec un IBAN virtuel par commande. Les deux impliquent un tiers et des frais ; l'import CAMT.053 n'implique personne.

En attendant, les commandes dont le délai est dépassé sont libérées par :

```bash
curl -X POST https://votre-api/api/admin/maintenance/release-expired-transfers -H "Authorization: Bearer VOTRE_JETON"
```

À planifier quotidiennement (cron Railway).

---

## Référencement FR / DE

**URL réellement localisées.** Les segments sont traduits — `/fr/catalogue` et `/de/katalog`, `/fr/produit/…` et `/de/produkt/…` — via les `rewrites` de `next.config.mjs`, sans dupliquer l'arborescence de pages. La table de correspondance vit dans `frontend/src/lib/routes.ts` ; les deux fichiers doivent rester alignés.

**hreflang réciproques** sur toutes les pages, y compris les fiches produit dont les slugs diffèrent d'une langue à l'autre, plus `x-default` vers le français.

**Détection de langue** par cookie de préférence, puis en-tête `Accept-Language`, puis français. Le choix de l'utilisateur prime toujours sur celui du navigateur.

**Données structurées** : `OnlineStore` avec `SearchAction` sur l'accueil, `Product` + `Offer` avec état, disponibilité et zones de livraison sur les fiches.

**Maîtrise du budget de crawl** : les pages filtrées, paginées et triées sont en `noindex, follow` et exclues dans `robots.txt`. Seules les pages canoniques sont indexables.

**Garde-fou de préproduction** : `robots.txt` interdit tout le site tant que `NEXT_PUBLIC_ENV` ne vaut pas exactement `production`.

### Parcours client sans compte

Il n'existe **aucune inscription client**. On commande en invité, et on suit sa commande avec le numéro et l'adresse e-mail utilisée :

```
/fr/suivi-commande        /de/sendungsverfolgung
```

Les e-mails de confirmation peuvent pointer directement sur `?order=SM-2026-00001&email=…` : le formulaire est alors pré-rempli et le client voit sa commande sans rien saisir. Un virement encore dû réaffiche l'IBAN et le code QR.

Le message d'erreur est volontairement identique que la commande n'existe pas ou que l'e-mail ne corresponde pas : sinon le formulaire permettrait de deviner quels numéros de commande existent.

`/fr/compte/login` subsiste, réservé à l'équipe. Les comptes du back-office se créent par le seed, ou par `POST /api/admin/customers/staff` (administrateur uniquement).

### Google Merchant Center

Un flux produit RSS 2.0 par marché :

```
https://votre-domaine.eu/feed/fr/products.xml
https://votre-domaine.eu/feed/de/products.xml
```

Déclarez-les dans Merchant Center comme flux planifiés, un par pays. Le flux fournit `id`, `title`, `description` en texte brut, `link`, `image_link` et jusqu'à dix images additionnelles, `availability`, `price` / `sale_price`, `condition`, `brand`, `product_type`, `shipping_weight`, `shipping` et l'identifiant.

Trois décisions notables :

**Seuls les produits réellement photographiés sont soumis.** Google refuse le format SVG et sa politique interdit les visuels de remplacement : envoyer nos placeholders ferait rejeter les articles un par un, avec un risque de suspension du compte pour « image non conforme ». Les 30 références neuves restent visibles sur la boutique mais sortent du flux tant qu'elles n'ont pas de cliché. Aujourd'hui le flux contient donc **3 articles** — vos trois occasions.

**`identifier_exists = no` sur les occasions.** Ce sont des pièces uniques sans code-barres fabricant ; sans cette mention Google les rejette.

**`sale_price` n'apparaît qu'en cas de remise réelle.** `price` porte alors le prix de référence et `sale_price` le prix pratiqué. Google rejette un article dont les deux valeurs sont égales.

Merchant Center exige par ailleurs des pages de politique accessibles — livraison, retours, contact, mentions légales — et une origine HTTPS. Les pages existent ; `scripts/preflight.mjs` vérifie l'HTTPS et les données de société.

Sans GTIN, la diffusion reste limitée. Dès que votre grossiste vous fournit les EAN, ajoutez-les : c'est le levier de visibilité le plus rentable sur Shopping.

---

## Charte graphique

| Rôle | Valeur | Usage |
| --- | --- | --- |
| Encre | `#0B0B0C` | Texte, pied de page, boutons secondaires |
| Signal | `#E1000F` | Actions, prix cassés, badges — **jamais en fond de section** |
| Blanc | `#FFFFFF` | Fond principal |
| Fumée 50→600 | `#FAFAFA` → `#4A4D53` | Séparateurs, textes secondaires, états désactivés |

Le rouge tire son efficacité de sa rareté : il signale l'action à faire et l'économie réalisée, rien d'autre.

**Typographie** — Inter (Google Fonts), chargée via `next/font` : pas de requête externe au rendu, pas de décalage de mise en page.

**Composants** dans `globals.css` : `.btn` et ses variantes, `.field`, `.card`, `.badge`, `.rich-text`. Un seul style de focus (`ring-2 ring-signal`) dans toute l'interface, visible sur fond clair comme sur fond sombre.

**Logo** — silhouette de guide-chaîne avec pignon de renvoi rouge, lisible jusqu'à 20 px de haut.

---

## Déploiement

### 1. Base de données et API — Railway

```bash
railway login && railway init
```

```bash
railway add --database postgres
```

Créez le service API avec **Root Directory = `backend`**, puis renseignez ses variables :

| Variable | Valeur |
| --- | --- |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
| `NODE_ENV` | `production` |
| `JWT_ACCESS_SECRET` | `openssl rand -base64 48` |
| `JWT_REFRESH_SECRET` | une autre valeur, distincte |
| `CORS_ORIGINS` | `https://votre-domaine.eu,https://votre-projet.vercel.app` |
| `FRONTEND_URL` | `https://votre-domaine.eu` |
| `STRIPE_SECRET_KEY` | `sk_live_…` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` |
| `BANK_IBAN`, `BANK_BIC`, `BANK_NAME`, `BANK_ACCOUNT_HOLDER` | vos coordonnées réelles |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | vos identifiants |

Les migrations s'appliquent au démarrage (`prisma migrate deploy`). Chargez le catalogue une fois :

```bash
railway run npm run db:seed
```

### 2. Frontend — Vercel

```bash
cd frontend && vercel link
```

Réglez **Root Directory = `frontend`** dans les paramètres du projet, puis les variables d'environnement :

| Variable | Valeur |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | URL publique du service Railway |
| `API_URL` | URL interne Railway (plus rapide côté serveur) |
| `NEXT_PUBLIC_SITE_URL` | `https://votre-domaine.eu` |
| `NEXT_PUBLIC_ENV` | `production` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_live_…` |

```bash
vercel --prod
```

### 3. Webhook Stripe

Dans le tableau de bord Stripe, créez un endpoint sur `https://votre-api.railway.app/api/webhooks/stripe` abonné à `payment_intent.succeeded`, `payment_intent.payment_failed`, `payment_intent.canceled` et `charge.refunded`. Reportez le secret `whsec_…` dans `STRIPE_WEBHOOK_SECRET` sur Railway.

### 4. Contrôle final

```bash
node scripts/preflight.mjs
```

Le script détecte les secrets par défaut, l'IBAN de démonstration, les clés Stripe dépareillées test/live, les mentions légales incomplètes et les URL restées sur `localhost`. Il sort en code 1 tant qu'un point bloquant subsiste.

---

## À faire avant l'ouverture

1. **Vos données de société** — ouvrez [`frontend/src/config/company.ts`](frontend/src/config/company.ts) et remplissez les douze champs. **C'est le seul fichier à compléter** : les mentions légales, les CGV, la politique de confidentialité, la page contact et les données structurées les reprennent automatiquement. Un bandeau d'avertissement s'affiche sur les pages concernées, et `preflight` bloque, tant qu'un champ manque. Ces mentions sont **obligatoires** en France (art. 6 III LCEN) et en Allemagne (§ 5 DDG).
2. **Coordonnées bancaires** — l'IBAN livré est fictif. Il s'affiche aux clients : remplacez-le avant toute commande réelle.
3. **Mot de passe administrateur** — changez `ADMIN_PASSWORD`.
4. **Prix et stocks du neuf** — alignez-les sur vos conditions d'achat.
5. **Photos du neuf** — remplacez les visuels générés par vos propres clichés (`npm run photos`). Tant qu'ils manquent, ces 30 références sont **absentes de Google Shopping** : Google refuse les images de remplacement.
6. **Guide de la MS 500i révisée** — la longueur exacte n'est pas lisible sur les photos fournies. Elle est annoncée « à confirmer » sur la fiche ; mesurez-la et corrigez la description.
7. **Prix barrés des occasions** — les trois fiches affichent « au lieu de 1 649 € ». Depuis la directive Omnibus, un prix de référence sur une annonce de réduction est encadré : pour une pièce unique jamais vendue, la formulation correcte est « prix du neuf équivalent », pas un prix barré assorti d'« Économisez 800 € ». À reformuler avant l'ouverture.
8. **Nom commercial** — voir ci-dessous.

### La séquence de mise en production

```bash
node scripts/preflight.mjs
```

Tant que ce script sort en code 1, ne déployez pas : il liste exactement ce qui manque. Une fois au vert :

1. Variables Railway (API) et Vercel (frontend) — voir [Déploiement](#déploiement)
2. `NEXT_PUBLIC_ENV=production` sur Vercel, sinon `robots.txt` bloque toute indexation
3. Webhook Stripe créé et `STRIPE_WEBHOOK_SECRET` renseigné, si vous vendez par carte
4. `railway run npm run db:seed` une seule fois, pour charger le catalogue
5. Sitemap soumis dans la Search Console : `https://votre-domaine.eu/sitemap.xml`
6. Flux produit déclarés dans Merchant Center : `/feed/fr/products.xml` et `/feed/de/products.xml`
7. Tâche planifiée quotidienne sur `POST /api/admin/maintenance/release-expired-transfers`

### Sur le nom « Voltaris »

STIHL est une marque déposée d'ANDREAS STIHL AG & Co. KG. Revendre des produits STIHL et les désigner par leur marque est licite dans l'Espace économique européen au titre de l'épuisement des droits. **Employer la marque dans le nom de la boutique et dans le nom de domaine est nettement plus exposé** : cela peut être analysé comme un usage à titre d'enseigne suggérant un lien commercial avec le fabricant, ce que le droit des marques n'autorise pas sans accord.

Le projet applique la précaution d'usage : la mention « revendeur indépendant » et l'attribution explicite des marques citées figurent dans les **mentions légales**. Elle a été retirée du pied de page à votre demande — c'est un choix d'affichage, la protection reste en place là où elle a sa valeur réglementaire. Cela réduit le risque sans le supprimer. Faites valider le nom par un conseil en propriété industrielle avant d'engager la communication et le dépôt du domaine ; un nom propre accompagné de « spécialiste STIHL » en descriptif est la structure habituellement retenue par les revendeurs indépendants.

---

## Commandes utiles

```bash
npm run dev
```

```bash
npm run db:studio
```

```bash
npm run typecheck
```

```bash
npm run db:reset
```

```bash
node scripts/preflight.mjs
```
