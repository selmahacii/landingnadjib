# Guide de Déploiement et Configuration — Landing COD "Porte feuille Classe"

Ce guide détaille pas à pas la configuration des services tiers, les variables d'environnement requises, le déploiement sur Vercel, et la checklist de validation en production.

---

## 1. Variables d'Environnement

Toutes les variables d'environnement suivantes doivent être définies sur Vercel (dans **Project Settings > Environment Variables**) et localement dans un fichier `.env.local` pour le développement.

| Variable | Description | Exemple |
|---|---|---|
| `GOOGLE_SHEET_ID` | L'ID extrait de l'URL du Google Sheet (`https://docs.google.com/spreadsheets/d/<ID>/edit`) | `1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms` |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Email du compte de service Google Cloud | `sheets-sa@mon-projet.iam.gserviceaccount.com` |
| `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | Clé privée RSA du compte de service (contenant `\n` pour les sauts de ligne) | `"-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"` |
| `BLOB_READ_WRITE_TOKEN` | Token d'accès en lecture/écriture à Vercel Blob Storage | `vercel_blob_rw_xxxxxxxxxxxx` |
| `META_PIXEL_ID` | Identifiant du Pixel Meta pour le suivi côté navigateur | `123456789012345` |
| `META_CAPI_TOKEN` | Token d'accès API Conversions Meta (généré dans Meta Events Manager) | `EAAxxxxxxxxxxxxxxxxxxxx` |
| `META_TEST_EVENT_CODE` | Code d'événement de test optionnel (Meta Events Manager > Tester les événements) | `TEST12345` |
| `ADMIN_SECRET_KEY` | Code PIN secret pour accéder à `/admin` et signer les sessions HMAC-SHA256 | `mon-super-pin-secret-1234` |

---

## 2. Configuration Google Sheets & Service Account

1. **Créer un projet Google Cloud :**
   - Rendez-vous sur la [Google Cloud Console](https://console.cloud.google.com/).
   - Créez un nouveau projet (ex: `cod-wallet-landing`).
   - Activez l'API **Google Sheets API** dans la bibliothèque des API.

2. **Créer un Compte de Service (Service Account) :**
   - Dans **IAM & Admin > Service Accounts**, cliquez sur **Create Service Account**.
   - Nom : `cod-sheets-writer`.
   - Cliquez sur **Create and Continue**, puis **Done**.
   - Cliquez sur le compte créé, allez dans l'onglet **Keys**, puis **Add Key > Create new key > JSON**.
   - Téléchargez le fichier JSON contenant `client_email` et `private_key`.

3. **Créer et partager le Google Sheet :**
   - Créez un nouveau Google Sheet vierge sur [Google Drive](https://sheets.google.com).
   - Nommez-le par exemple `Commandes - Porte feuille Classe`.
   - Cliquez sur **Partager** en haut à droite.
   - Ajoutez l'adresse email du compte de service (`client_email`) avec les droits **Éditeur (Editor)**.
   - Notez l'ID du Google Sheet dans l'URL.

4. **Initialiser automatiquement le Sheet (5 onglets, 34 colonnes, validations, couleurs, KPI) :**
   - Renseignez les variables dans `.env.local` :
     ```bash
     GOOGLE_SHEET_ID=...
     GOOGLE_SERVICE_ACCOUNT_EMAIL=...
     GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="..."
     ```
   - Exécutez le script d'initialisation idempotent :
     ```bash
     npx tsx scripts/init-sheets.ts
     ```
     *(Ou sous PowerShell si vous préférez forcer le fichier d'environnement : `npx tsx --env-file=.env.local scripts/init-sheets.ts`)*
   - Ce script crée automatiquement les 5 onglets requis :
     - `Commandes_et_Abandons` (34 colonnes avec validations déroulantes et couleurs)
     - `Tarifs_Livraison` (58 wilayas préremplies)
     - `Offres_Packs` (Packs 1 et 2 pièces préremplis)
     - `Variantes_Produit` (5 coloris : Noir, Beige, Vert, Marron, Rouge)
     - `Dashboard_KPI` (Formules Google Sheets dynamiques : Taux de confirmation, CA confirmé, AOV, etc.)

---

## 3. Configuration Vercel Blob Storage

1. Dans le tableau de bord Vercel de votre projet, allez dans l'onglet **Storage**.
2. Cliquez sur **Create Database** et sélectionnez **Blob**.
3. Associez le magasin Blob à votre projet.
4. Vercel injectera automatiquement la variable d'environnement `BLOB_READ_WRITE_TOKEN`.

---

## 4. Configuration Meta Pixel & Conversions API (CAPI)

1. Dans le [Gestionnaire d'événements Meta (Events Manager)](https://business.facebook.com/events_manager2) :
   - Récupérez votre **Pixel ID** (`META_PIXEL_ID`).
   - Dans **Paramètres > API Conversions > Générer un jeton d'accès**, générez votre token serveur (`META_CAPI_TOKEN`).
2. Pour tester en pré-production :
   - Allez dans l'onglet **Tester les événements**.
   - Notez le code de test fourni (ex: `TEST12345`) et renseignez-le dans `META_TEST_EVENT_CODE`.
   - Lors de la soumission de commandes, vérifiez que les événements `Purchase`, `PageView` et `ViewContent` arrivent en double (navigateur + serveur) et sont bien **dédupliqués** grâce à l'`event_id`.

---

## 5. Déploiement sur Vercel

1. Poussez la branche `cod-landing-wallet` sur votre dépôt distant (GitHub / GitLab).
2. Liez le projet sur Vercel.
3. Définissez toutes les variables d'environnement listées dans la section 1.
4. Lancez le déploiement.
5. Le build Next.js s'exécutera avec succès (`next build`).

---

## 6. Checklist de Validation Opérationnelle

Avant le lancement de campagnes publicitaires, vérifier les 6 points du spec :

- [ ] **1. Build propre :** `npm run build` s'exécute avec 0 erreur TypeScript et 0 warning bloquant.
- [ ] **2. Panneau Admin & Médias :**
  - Accéder à `/admin` -> le formulaire PIN bloque l'accès si non authentifié.
  - Saisir le bon `ADMIN_SECRET_KEY` -> accès accordé pour 24h.
  - Dans `/admin/media`, uploader une photo > 1 Mo pour une variante -> compression WebP automatique (< 150 Ko pour galerie, < 35 Ko pour miniature) et affichage du ratio d'économie.
  - Dans `/admin/offers`, créer ou modifier une offre -> reflet instantané sur la landing page sans redéploiement grâce à `revalidatePath('/')`.
- [ ] **3. Simulation WebView Instagram / Facebook :**
  - Ouvrir la landing page avec un User-Agent simulant une WebView mobile.
  - Vérifier la mise en page RTL et la police Tajawal.
  - Cliquer sur les variantes couleur -> l'image principale change instantanément.
  - Sélectionner Wilaya -> Commune -> recalcul automatique du tarif de livraison et du total sans rechargement.
- [ ] **4. Enregistrement Sheets & Règles anti-doublon :**
  - Remplir le numéro de téléphone et attendre 45 secondes sans valider -> une ligne `Panier Abandonné` est enregistrée dans l'onglet `Commandes_et_Abandons` avec `statut_confirmation = "En attente"`.
  - Soumettre ensuite une commande avec le même numéro -> une nouvelle ligne `Commande Site` est enregistrée avec `flag_doublon = "DOUBLON_24H"`. La ligne du panier abandonné reste inchangée et n'est jamais écrasée.
- [ ] **5. Meta Pixel & CAPI :**
  - Tester avec `META_TEST_EVENT_CODE` actif -> les événements sont reçus et indiqués comme dédupliqués dans Meta Events Manager.
- [ ] **6. Page de confirmation :**
  - Après validation de la commande, redirection immédiate vers `/thank-you` affichant le récapitulatif complet de la commande en arabe.
