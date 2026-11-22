# Landing page COD — Portefeuille Classe (Design V1)

## Intention et pourquoi

Construire une landing page Cash-on-Delivery (COD) pour le marché algérien, rapide et fiable sur les WebViews Instagram/Facebook, pour vendre un portefeuille ("Porte feuille Classe") avec un formulaire de commande intégré, un suivi Meta (Pixel + CAPI) propre, et un panneau Superadmin permettant de piloter tarifs de livraison, offres/packs et photos sans redéploiement.

Le Google Sheet est la source de vérité opérationnelle : le confirmateur travaille dedans, change les statuts, et le site ne doit jamais écraser son travail.

## Produit (contenu V1)

- Nom produit : **Porte feuille Classe**
- Offres : `1 pièce = 2000 DA`, `2 pièces = 3500 DA` (pas de palier 3 pièces en V1 ; l'admin peut en ajouter un plus tard)
- Variantes couleur (seed vide, images à uploader via `/admin/media`) : Noir, Beige, Vert, Marron, Rouge
- Structure de page reprise du site de référence (chicoutfit.net/products/porte-feuille-classe) : bandeau haut "توصيل لـ58 ولاية | الدفع عند الاستلام", galerie photo + swatches couleur collants au formulaire, bloc bénéfices/icônes sous le fold, formulaire COD wilaya→commune. Aucune image ni texte du site source n'est copié : uniquement le rythme de mise en page.

## Goals

- Page livrable en production sur Vercel, 100% arabe RTL, rapide sur WebView mobile (LCP < 1.5s visé, Lighthouse mobile ≥ 95)
- Formulaire COD → Google Sheet avec distinction stricte commande normale / panier abandonné, sans jamais écraser un statut modifié par le confirmateur
- Double tracking Meta Pixel + CAPI dédupliqué par `event_id`
- Superadmin (`/admin`, protégé par PIN) pour tarifs de livraison, offres/packs, et galerie photo/variantes (upload + compression WebP automatique)

## Non-goals (V1)

- Dashboard `Dashboard_KPI` avec formules automatiques (ratio LPV/clics, EMQ, etc.) — **reporté en V2**, les données brutes nécessaires (34 colonnes) sont bien enregistrées dès la V1, donc le dashboard pourra être ajouté sans migration.
- Cache KV/Edge intermédiaire devant Google Sheets (approche hybride C) — à ajouter seulement si le volume de trafic le justifie.
- Compression client-side bonus en plus de la compression serveur (sharp) — la compression serveur seule suffit pour la V1.

## Anti-goals

- Ne jamais faire passer automatiquement un panier abandonné ou une commande en "Confirmée"/statut avancé — seul le confirmateur modifie ces colonnes dans le Sheet.
- Ne jamais écraser une ligne existante (même numéro de tel en doublon) : on ajoute un flag, on ne touche pas à la ligne existante.
- Zéro crash sur WebView Instagram/Facebook à cause de `localStorage`/cookies restreints.

## Contraintes

- Next.js App Router + TypeScript + Tailwind, déployable Vercel, rendu statique/ISR
- Pas de librairie UI lourde (pas de Zustand persist, pas de carrousel JS obèse, pas de Framer Motion lourd)
- `safeStorage` (wrapper try/catch) pour tout accès `localStorage`
- Stockage images : Vercel Blob (variable d'env `BLOB_READ_WRITE_TOKEN`) — pas d'écriture dans `public/` en prod
- Clés externes (Blob, Meta Pixel/CAPI, `ADMIN_SECRET_KEY`) pas encore disponibles → code prêt avec variables d'environnement, aucune valeur en dur, le site doit démarrer et fonctionner en mode dégradé clair si une clé manque (ex: CAPI désactivé proprement avec log, pas de crash)

## Approche retenue (et alternatives écartées)

**Retenue — Approche A : Google Sheets comme source de vérité unique.**
Le site lit les tarifs/offres/variantes depuis le Sheet via l'API Sheets (Service Account), avec un cache court + `revalidatePath` déclenché par les actions admin. Les commandes et paniers abandonnés sont écrits directement dans l'onglet `Commandes_et_Abandons`. Aucune base de données.

**Écartée — Approche B : base de données + sync one-way vers Sheets.**
Plus robuste mais contredit l'exigence centrale : le confirmateur doit pouvoir modifier le statut *directement* dans le Sheet et que ça fasse foi immédiatement, sans resynchronisation bidirectionnelle risquée.

**Écartée (V1) — Approche C : cache KV/Edge devant Sheets.**
Meilleure résilience sous fort trafic, mais complexité additionnelle non justifiée tant que le volume reste modéré. Réévaluable en V2 si les quotas Sheets API (~300 req/min) deviennent un problème réel.

## Décisions techniques (mes choix, par défaut)

- **Police** : Tajawal via `next/font/google`, `display: swap`, preload.
- **Validation téléphone algérien** : regex couvrant `05/06/07`, `+213`, `00213`, conversion automatique chiffres arabes-indiens → latins.
- **Détection panier abandonné** : timer 45s sans soumission après saisie d'un téléphone valide, + `visibilitychange`/`pagehide` avec `navigator.sendBeacon` vers `/api/abandoned-cart`.
- **Idempotence commande** : clé `session_id + téléphone`, verrouillage du bouton (anti double clic), vérif doublon 10 min (anti-spam) et flag doublon 24h (sans toucher aux lignes existantes).
- **Admin** : protégé par cookie signé posé après saisie du PIN `ADMIN_SECRET_KEY` (pas de vraie session utilisateur, un seul rôle).
- **Compression image** : `sharp` côté serveur dans `/api/admin/upload`, conversion WebP qualité 80, strip EXIF, resize 1200px (galerie) / 400px (miniature variante), upload vers Vercel Blob, retour du ratio avant/après affiché au superadmin.
- **34 colonnes du Sheet** : créées avec en-têtes figés, listes déroulantes (Data Validation) sur `statut_confirmation` et `statut_livraison`, mise en forme conditionnelle par couleur, au premier appel d'initialisation (script d'init idempotent, ne recrée rien si déjà présent).
- **Wilayas/communes** : fichier JSON statique local complet des 58 wilayas (déjà partiellement visible sur le site de référence, à compléter avec les communes), zéro appel réseau pour l'affichage.

## Décisions complémentaires (suite à la revue builder)

- **Google Sheet** : le client crée le Sheet et le Service Account Google (compte de service avec clé JSON), partage le Sheet en "Editeur" à l'email du compte de service, puis colle l'ID du Sheet + le JSON en variables d'env (`GOOGLE_SHEET_ID`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`). Le script d'init (appelé une fois, manuellement) crée les onglets/en-têtes/validations s'ils n'existent pas déjà — idempotent, donc rejouable sans risque.
- **Auth admin** : cookie signé HMAC-SHA256 (secret = `ADMIN_SECRET_KEY`), expiration 24h, limite de 5 tentatives de PIN par IP sur 15 minutes (compteur en mémoire, suffisant pour une V1 mono-instance Vercel).
- **Race condition panier abandonné/commande** : avant d'écrire une ligne "Panier Abandonné", l'API vérifie qu'aucune ligne "Commande Site" n'existe déjà pour ce `session_id` ; si oui, elle n'écrit rien (la commande a gagné la course).
- **Wilayas/communes** : compilation d'un JSON statique à partir de la liste officielle des 58 wilayas et de leurs communes (listes publiques couramment utilisées par les sites COD algériens), vérifiée pour cohérence des codes 01→58.
- **Domaine** : déploiement initial sur le domaine `*.vercel.app` fourni par Vercel ; un domaine personnalisé pourra être branché plus tard sans changement de code (à signaler si le Pixel Meta nécessite un domaine vérifié).
- **Doublon (anti-spam 10 min)** : la commande n'est jamais bloquée côté client — elle est enregistrée avec `flag_doublon` rempli, à charge du confirmateur de trancher dans le Sheet (conforme à la règle "ne jamais toucher à la ligne existante").
- **Copy marketing arabe** : rédigé par le builder (bénéfices, réassurance, CTA, page de remerciement) en arabe algérien clair, aucun texte du site source repris.
- **Quota API Sheets** : retry avec backoff (jusqu'à 2 tentatives) sur les écritures ; en cas d'échec final, message d'erreur clair en arabe et conservation des champs saisis (déjà prévu en section "cas limites").
- **Cache lectures Sheets** : ISR `revalidate: 60` sur les données tarifs/offres/variantes, plus `revalidatePath('/')` déclenché immédiatement après chaque sauvegarde admin pour un reflet instantané.
- **Prix total affiché** : avant sélection de wilaya, la page affiche le prix de l'offre seul ; dès qu'une wilaya est choisie, le total se recalcule avec les frais de livraison (sauf si `livraison_gratuite` est actif sur l'offre, auquel cas livraison = 0 دج affiché explicitement).

## Ce qui reste au charge du builder (plan d'implémentation)

- Détail exact des composants React et de l'arborescence de fichiers
- Script d'initialisation des 3 onglets Google Sheets (en-têtes, validations, couleurs) et de l'onglet `Commandes_et_Abandons`
- Détail des endpoints API (`/api/order`, `/api/abandoned-cart`, `/api/admin/*`, `/api/meta-capi`) et de leurs contrats
- Plan de tests pour chaque point de la section 8 de la demande originale (build propre, upload+compression, simulation WebView, bout-en-bout Sheet, CAPI test event)
- Liste finale des variables d'environnement Vercel à documenter

## Validation attendue avant la fin de la V1

1. `npm run build` propre, zéro erreur TypeScript
2. Upload photo produit + variante (> 1 Mo) dans `/admin/media`, vérification compression WebP, création d'une offre dans `/admin/offers` avec reflet instantané sur la landing
3. Simulation User-Agent Instagram WebView : rendu RTL, bascule d'offres, changement de photo au clic variante, sélection Wilaya→Commune
4. Bout-en-bout : panier abandonné puis commande normale même numéro → 34 colonnes correctes, dropdowns/couleurs actifs, panier abandonné intact, nouvelle commande avec `flag_doublon`
5. Envoi CAPI vers `META_TEST_EVENT_CODE`, event_id dédupliqué
6. Liste des variables d'environnement Vercel documentée
