# COD Landing Page — Porte feuille Classe — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a production-ready Next.js COD landing page for "Porte feuille Classe" (Algeria market) with a native COD form, Google Sheets as source of truth, Meta Pixel+CAPI tracking, and a Superadmin panel for delivery tariffs, offers, and media.

**Architecture:** Next.js App Router (TypeScript, Tailwind), static/ISR rendering. Google Sheets (Service Account) is the only datastore: tariffs/offers/variants are read with a short ISR cache and `revalidatePath` on admin writes; orders and abandoned carts are appended directly to `Commandes_et_Abandons`. Images go to Vercel Blob via a `sharp`-compressing upload API. No client state library, no DB.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS, `googleapis` (Sheets API v4), `sharp`, `@vercel/blob`, `next/font/google` (Tajawal).

**Spec:** [docs/superpowers/specs/2026-11-22-cod-landing-wallet-design.md](../specs/2026-11-22-cod-landing-wallet-design.md)

## Global Constraints

- `lang="ar" dir="rtl"`, 100% arabic UI copy except the product name "Porte feuille Classe".
- No Zustand/persist, no heavy UI libs, no JS carousel — Tailwind + native React state only.
- Every `localStorage`/`sessionStorage` access goes through a `safeStorage` wrapper (try/catch, never throws).
- Images via `next/image`, WebP/AVIF, explicit width/height (CLS = 0), `priority` only on the hero image.
- No secrets hardcoded; every external credential is an env var and the app must not crash if one is missing (log + degrade, e.g. skip CAPI call).
- Product/offers from spec: 1 pièce = 2000 DA, 2 pièces = 3500 DA; variants (seed empty, names only): Noir, Beige, Vert, Marron, Rouge.
- 34-column schema for `Commandes_et_Abandons` exactly as enumerated in the spec section 5B (order fixed, 1-indexed below in Task 5).
- Never flip `statut_confirmation`/`statut_livraison` programmatically after initial `"En attente"`/`"Non expédiée"` write.
- Never overwrite an existing order/abandoned-cart row on duplicate phone within 24h — only set `flag_doublon` on the **new** row.
- Algerian phone validation accepts `05/06/07`, `+213`, `00213`, converts Eastern Arabic digits to Latin.

## Review Focus

- Phone numbers in Eastern Arabic numerals (`٠٥٥...`) must normalize correctly before validation and before Sheets write — test this explicitly in Task 4.
- WebView without `localStorage`/cookies (Instagram/Facebook in-app browser) must not crash the form or lose `fbclid`/UTM params captured at page load — test in Task 2/9.
- Submitting an order for a phone number that already has an abandoned-cart row in the last 24h must NOT touch that row, only flag the new one — test in Task 6.
- A Sheets API write failure (simulated) must show an Arabic error message and keep the user's typed field values — test in Task 6.
- Selecting a wilaya then switching to another must not leave a stale commune selected, and must not crash if the commune list is momentarily empty — test in Task 8.

---

## File Structure

```
app/
  layout.tsx                      # RTL html, Tajawal font, metadata
  page.tsx                        # landing page (ISR, reads offers/variants/tariffs)
  thank-you/page.tsx              # confirmation page
  admin/
    layout.tsx                    # PIN gate wrapper
    page.tsx                      # redirect -> /admin/delivery
    delivery/page.tsx
    offers/page.tsx
    media/page.tsx
  api/
    order/route.ts
    abandoned-cart/route.ts
    meta-capi/route.ts
    admin/
      login/route.ts
      delivery/route.ts
      offers/route.ts
      upload/route.ts
components/
  landing/
    Gallery.tsx
    VariantPicker.tsx
    OfferPicker.tsx
    OrderForm.tsx
    WilayaCommuneSelect.tsx
    StickyCTA.tsx
    BenefitsSection.tsx
  admin/
    PinForm.tsx
    DeliveryTable.tsx
    OffersTable.tsx
    MediaUploader.tsx
lib/
  safeStorage.ts
  phone.ts                        # normalize + validate Algerian phone
  sheets/
    client.ts                     # Sheets API auth + get/append/update helpers
    init.ts                       # idempotent header/validation/formatting setup
    orders.ts                     # read/write Commandes_et_Abandons
    offers.ts                     # read Offres_Packs
    delivery.ts                   # read/write Tarifs_Livraison
    variants.ts                   # read/write Variantes_Produit
  meta/
    pixel.ts                      # client-side fbq wrapper
    capi.ts                       # server-side CAPI POST + SHA-256 hashing
  session.ts                      # session_id, UTM/fbclid capture
  admin-auth.ts                   # HMAC cookie sign/verify, PIN rate limit
  image.ts                        # sharp compression helpers
data/
  wilayas.json                    # 58 wilayas + communes (ar)
scripts/
  init-sheets.ts                  # one-off: node script calling lib/sheets/init.ts
```

---

### Task 1: Project scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `tailwind.config.ts`, `postcss.config.js`, `next.config.mjs`, `.env.example`, `app/layout.tsx`, `app/globals.css`
- Test: `scripts/__tests__/smoke.test.ts` (or equivalent build check)

**Interfaces:**
- Produces: root `app/layout.tsx` exporting default `RootLayout({ children })` that sets `<html lang="ar" dir="rtl">` and loads Tajawal via `next/font/google`.

- [ ] **Step 1: Scaffold Next.js app** (`npx create-next-app@latest` with TypeScript + Tailwind + App Router, no `src/` dir)
- [ ] **Step 2: Set `app/layout.tsx`** to `lang="ar" dir="rtl"`, Tajawal font with `display: "swap"`, `preload: true`, default metadata placeholder (title/description filled in Task 7)
- [ ] **Step 3: Write `.env.example`** listing every env var named in this plan (see Task 13 for the final consolidated list) with placeholder values and one-line comments
- [ ] **Step 4: Run `npm run build`**
Expected: builds successfully with the default Next.js starter page
- [ ] **Step 5: Commit** — `feat: scaffold Next.js RTL project`

---

### Task 2: Static data — wilayas/communes, safeStorage, session utils

**Files:**
- Create: `data/wilayas.json`, `lib/safeStorage.ts`, `lib/session.ts`
- Test: `lib/__tests__/safeStorage.test.ts`, `lib/__tests__/session.test.ts`

**Interfaces:**
- Produces: `safeStorage.getItem(key: string): string | null`, `safeStorage.setItem(key: string, value: string): void` (both never throw)
- Produces: `getOrCreateSessionId(): string`, `captureAttribution(): { utm_source?, utm_medium?, utm_campaign?, utm_content?, utm_term?, fbclid? }` reading `URLSearchParams` once per session and persisting via `safeStorage`
- Produces: `wilayas: { code: string; name_ar: string; communes: string[] }[]` exported from `data/wilayas.json`

- [ ] **Step 1: Write failing test** for `safeStorage.getItem` returning `null` when `window.localStorage` throws (mock `Object.defineProperty(window, 'localStorage', { get() { throw new Error() } })`)
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Implement `safeStorage`** in `lib/safeStorage.ts`: every method wrapped in try/catch returning `null`/no-op on failure
- [ ] **Step 4: Run test to verify it passes**
- [ ] **Step 5: Write failing test** for `captureAttribution()` parsing `?fbclid=abc&utm_source=fb` from a mocked `location.search` and persisting it so a second call with empty `location.search` still returns the original values
- [ ] **Step 6: Run test to verify it fails**
- [ ] **Step 7: Implement `session.ts`** using `safeStorage` for persistence, `crypto.randomUUID()` (with fallback) for `getOrCreateSessionId`
- [ ] **Step 8: Run test to verify it passes**
- [ ] **Step 9: Populate `data/wilayas.json`** with all 58 wilayas (codes `01`-`58`) and their communes in Arabic; cross-check count of wilayas (58) and that each has at least one commune
- [ ] **Step 10: Commit** — `feat: add wilaya data, safeStorage, session attribution utils`

---

### Task 3: Phone validation

**Files:**
- Create: `lib/phone.ts`
- Test: `lib/__tests__/phone.test.ts`

**Interfaces:**
- Produces: `normalizePhone(input: string): string | null` → returns `0XXXXXXXXX` format or `null` if invalid

- [ ] **Step 1: Write failing tests** covering: `"0551234567"` → `"0551234567"`; `"+213551234567"` → `"0551234567"`; `"00213551234567"` → `"0551234567"`; `"٠٥٥١٢٣٤٥٦٧"` (Eastern Arabic digits) → `"0551234567"`; `"0551 23 45 67"` (spaces) → `"0551234567"`; `"12345"` → `null`
- [ ] **Step 2: Run tests to verify they fail**
- [ ] **Step 3: Implement `normalizePhone`**: map Eastern Arabic digits (٠-٩) to `0-9`, strip spaces/dashes, collapse `+213`/`00213` prefixes to `0`, validate against `/^0[567]\d{8}$/`
- [ ] **Step 4: Run tests to verify they pass**
- [ ] **Step 5: Commit** — `feat: Algerian phone normalization/validation`

---

### Task 4: Google Sheets client + init script

**Files:**
- Create: `lib/sheets/client.ts`, `lib/sheets/init.ts`, `scripts/init-sheets.ts`
- Test: `lib/sheets/__tests__/client.test.ts` (mock `googleapis`)

**Interfaces:**
- Produces: `getSheetsClient(): Promise<sheets_v4.Sheets>` (auth via `GOOGLE_SERVICE_ACCOUNT_EMAIL`/`GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`, throws a typed `SheetsConfigError` if env vars missing — callers catch and degrade)
- Produces: `appendRow(sheetId: string, tab: string, values: unknown[]): Promise<void>`, `readRange(sheetId: string, range: string): Promise<unknown[][]>`, `updateRange(sheetId: string, range: string, values: unknown[][]): Promise<void>`
- Produces: `ensureSheetsInitialized(sheetId: string): Promise<void>` — idempotent: creates tabs `Commandes_et_Abandons`, `Tarifs_Livraison`, `Offres_Packs`, `Variantes_Produit` if missing, writes header row + data validation (dropdowns) + conditional formatting on `statut_confirmation`/`statut_livraison` only if the header row is empty

- [ ] **Step 1: Write failing test** for `appendRow` calling `sheets.spreadsheets.values.append` with the right `spreadsheetId`/`range`/`valueInputOption`, using a mocked `googleapis` client
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Implement `client.ts`** wrapping `google.auth.JWT` + `google.sheets({version: 'v4'})`, exporting the three helpers above
- [ ] **Step 4: Run test to verify it passes**
- [ ] **Step 5: Write failing test** for `ensureSheetsInitialized` skipping tab/header creation when a header row already exists (mock `spreadsheets.get` returning existing sheet titles + non-empty header range)
- [ ] **Step 6: Run test to verify it fails**
- [ ] **Step 7: Implement `init.ts`**: header arrays for each tab (34 columns for `Commandes_et_Abandons` exactly as spec section 5B lists them 1-34; `Tarifs_Livraison`: `wilaya_code, wilaya_ar, prix_domicile, prix_stopdesk, actif`; `Offres_Packs`: `offer_id, titre_ar, quantite, prix_dzd, prix_barre_dzd, badge_ar, livraison_gratuite, par_defaut, ordre, actif`; `Variantes_Produit`: `variant_id, nom_variante_ar, supplement_prix_dzd, image_url, thumb_url, ordre, actif`), data validation enums for `statut_confirmation` (10 values from spec) and `statut_livraison` (5 values from spec), conditional-formatting color rules matching the spec's color list
- [ ] **Step 8: Run test to verify it passes**
- [ ] **Step 9: Write `scripts/init-sheets.ts`** — small CLI (`tsx scripts/init-sheets.ts`) calling `ensureSheetsInitialized(process.env.GOOGLE_SHEET_ID!)`, printing a success/failure summary
- [ ] **Step 10: Commit** — `feat: Google Sheets client and idempotent init script`

---

### Task 5: Offers, delivery tariffs, variants read layer (admin-writable)

**Files:**
- Create: `lib/sheets/offers.ts`, `lib/sheets/delivery.ts`, `lib/sheets/variants.ts`
- Test: `lib/sheets/__tests__/offers.test.ts`, `lib/sheets/__tests__/delivery.test.ts`, `lib/sheets/__tests__/variants.test.ts`

**Interfaces:**
- Produces: `getOffers(): Promise<Offer[]>` where `Offer = { offer_id, titre_ar, quantite, prix_dzd, prix_barre_dzd, badge_ar, livraison_gratuite: boolean, par_defaut: boolean, ordre: number, actif: boolean }`, sorted by `ordre`, filtered to `actif`
- Produces: `saveOffer(offer: Offer): Promise<void>` (upsert by `offer_id`, append if new row)
- Produces: `getDeliveryTariffs(): Promise<DeliveryTariff[]>` where `DeliveryTariff = { wilaya_code, wilaya_ar, prix_domicile: number, prix_stopdesk: number, actif: boolean }`
- Produces: `saveDeliveryTariff(t: DeliveryTariff): Promise<void>` (upsert by `wilaya_code`)
- Produces: `getVariants(): Promise<Variant[]>` where `Variant = { variant_id, nom_variante_ar, supplement_prix_dzd: number, image_url: string, thumb_url: string, ordre: number, actif: boolean }`
- Produces: `saveVariant(v: Variant): Promise<void>` (upsert by `variant_id`)
- Consumes: `readRange`/`updateRange`/`appendRow` from Task 4

- [ ] **Step 1: Write failing test** for `getOffers()` parsing a mocked sheet range into typed `Offer[]`, sorted by `ordre`, excluding `actif=false`
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Implement `offers.ts`** (`getOffers`, `saveOffer` — find existing row by `offer_id` via `readRange`, `updateRange` if found else `appendRow`)
- [ ] **Step 4: Run test to verify it passes**
- [ ] **Step 5: Write failing test** for `getDeliveryTariffs()` same parsing shape
- [ ] **Step 6: Run test to verify it fails**
- [ ] **Step 7: Implement `delivery.ts`** (mirrors `offers.ts` pattern)
- [ ] **Step 8: Run test to verify it passes**
- [ ] **Step 9: Write failing test** for `getVariants()` same parsing shape
- [ ] **Step 10: Run test to verify it fails**
- [ ] **Step 11: Implement `variants.ts`** (mirrors `offers.ts` pattern)
- [ ] **Step 12: Run test to verify it passes**
- [ ] **Step 13: Commit** — `feat: offers/delivery/variants Sheets read-write layer`

---

### Task 6: Orders + abandoned-cart write layer, duplicate/race handling

**Files:**
- Create: `lib/sheets/orders.ts`
- Test: `lib/sheets/__tests__/orders.test.ts`

**Interfaces:**
- Produces: `type OrderInput = { session_id, nom_complet, telephone_normalise, wilaya_code, wilaya_nom, commune, mode_livraison, offre_choisie, variante_choisie, quantite, prix_offre_dzd, prix_livraison_dzd, total_dzd, utm_*, fbclid, device_navigateur, temps_sur_page_sec, dernier_champ_rempli }`
- Produces: `recordOrder(input: OrderInput): Promise<{ order_id: string; flag_doublon: string }>` — generates `ORD-YYYYMMDD-XXXX`, checks last-24h rows for same `telephone_normalise` (via `readRange` on the full sheet, filtered in memory), sets `flag_doublon` on the **new** row only, never modifies existing rows
- Produces: `recordAbandonedCart(input: Omit<OrderInput, 'offre_choisie'|...> & Partial<...>): Promise<{ order_id: string } | { skipped: true }>` — generates `ABN-YYYYMMDD-XXXX`; before writing, checks whether a `Commande Site` row already exists for this `session_id`; if yes, returns `{ skipped: true }` and writes nothing (race-condition rule from the design doc)
- Produces: `isDuplicateWithin10Min(telephone_normalise: string, produit: string): Promise<boolean>` for anti-spam check used by the `/api/order` route (not a hard block — spec says always record, only flag; this helper backs the idempotency-key check, not a UI block)
- Consumes: `appendRow`, `readRange` from Task 4

- [ ] **Step 1: Write failing test** for `recordOrder` writing a row with `statut_confirmation="En attente"`, `statut_livraison="Non expédiée"`, `flag_doublon=""` when no prior row exists for that phone in 24h
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Write failing test** for `recordOrder` setting `flag_doublon="⚠️ Doublon tel (24h) - voir ORD-..."` on the new row, and asserting `updateRange`/mutation of the prior row is never called, when a prior row with the same phone exists within 24h
- [ ] **Step 4: Run test to verify it fails**
- [ ] **Step 5: Implement `recordOrder`** per the two tests above (timestamp in `Africa/Algiers` via `Intl.DateTimeFormat`)
- [ ] **Step 6: Run both tests to verify they pass**
- [ ] **Step 7: Write failing test** for `recordAbandonedCart` returning `{ skipped: true }` and calling `appendRow` zero times when a `Commande Site` row for the same `session_id` already exists
- [ ] **Step 8: Run test to verify it fails**
- [ ] **Step 9: Write failing test** for `recordAbandonedCart` writing `statut_confirmation="En attente"` and never anything else, when no such row exists
- [ ] **Step 10: Run test to verify it fails**
- [ ] **Step 11: Implement `recordAbandonedCart`** per both tests
- [ ] **Step 12: Run tests to verify they pass**
- [ ] **Step 13: Commit** — `feat: order/abandoned-cart recording with duplicate and race-condition rules`

---

### Task 7: Landing page — layout, gallery, variant picker, offer picker, price calc

**Files:**
- Create: `app/page.tsx`, `components/landing/Gallery.tsx`, `components/landing/VariantPicker.tsx`, `components/landing/OfferPicker.tsx`, `components/landing/BenefitsSection.tsx`
- Test: `components/landing/__tests__/OfferPicker.test.tsx`, `components/landing/__tests__/VariantPicker.test.tsx` (React Testing Library)

**Interfaces:**
- Consumes: `getOffers()`, `getVariants()` (Task 5) called server-side in `app/page.tsx` with `export const revalidate = 60`
- Produces: `<OfferPicker offers={Offer[]} selected={string} onSelect={(offer_id: string) => void} />` rendering price, prix barré, économie, badge
- Produces: `<VariantPicker variants={Variant[]} selected={string} onSelect={(variant_id: string) => void} />` swapping the `<Gallery>` main image on click
- Produces: `<Gallery images={string[]} activeIndex={number} />`
- Page composes these into client state (`useState` for selected offer/variant) passed down to `OrderForm` (Task 9)

- [ ] **Step 1: Write failing test** for `OfferPicker`: renders each offer's `titre_ar`/price/badge, clicking an offer calls `onSelect` with its `offer_id`, and the offer flagged `par_defaut` is pre-selected on first render
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Implement `OfferPicker`** (Tailwind cards, no external carousel lib)
- [ ] **Step 4: Run test to verify it passes**
- [ ] **Step 5: Write failing test** for `VariantPicker`: clicking a variant thumbnail calls `onSelect` with its `variant_id`
- [ ] **Step 6: Run test to verify it fails**
- [ ] **Step 7: Implement `VariantPicker`** and `Gallery` (plain `next/image`, no JS carousel, `priority` only on index 0)
- [ ] **Step 8: Run test to verify it passes**
- [ ] **Step 9: Implement `BenefitsSection`** with original Arabic copy (benefits/reassurance icons grid) — no copied text/images from the reference site
- [ ] **Step 10: Compose `app/page.tsx`**: fetch offers/variants/tariffs server-side, render Gallery + VariantPicker + OfferPicker + BenefitsSection + `OrderForm` (stubbed until Task 9) + `StickyCTA` (stub)
- [ ] **Step 11: Run `npm run build`**
Expected: builds with no TypeScript errors
- [ ] **Step 12: Commit** — `feat: landing page gallery/variant/offer selectors`

---

### Task 8: Wilaya/commune select + live total recalculation

**Files:**
- Create: `components/landing/WilayaCommuneSelect.tsx`
- Modify: `app/page.tsx` (wire total calculation)
- Test: `components/landing/__tests__/WilayaCommuneSelect.test.tsx`

**Interfaces:**
- Produces: `<WilayaCommuneSelect tariffs={DeliveryTariff[]} onChange={(sel: { wilaya_code: string; commune: string; mode_livraison: 'Domicile'|'Stop Desk'; prix_livraison: number }) => void} />`
- Produces: `calculateTotal({ offer: Offer; deliveryPrice: number; }): number` pure function in the same file or `lib/pricing.ts`

- [ ] **Step 1: Write failing test**: selecting a wilaya populates the commune dropdown with that wilaya's communes and resets any previously selected commune to empty
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Write failing test**: switching mode_livraison between `Domicile`/`Stop Desk` updates `prix_livraison` from the matching tariff row
- [ ] **Step 4: Run test to verify it fails**
- [ ] **Step 5: Implement `WilayaCommuneSelect`** using `data/wilayas.json` for the commune list and `tariffs` prop for prices; guards against an empty commune list (shows disabled placeholder, never crashes)
- [ ] **Step 6: Run tests to verify they pass**
- [ ] **Step 7: Write failing test** for `calculateTotal`: returns `offer.prix_dzd` when `offer.livraison_gratuite` is true regardless of `deliveryPrice`, else `offer.prix_dzd + deliveryPrice`
- [ ] **Step 8: Run test to verify it fails**
- [ ] **Step 9: Implement `calculateTotal`**
- [ ] **Step 10: Run test to verify it passes**
- [ ] **Step 11: Wire into `app/page.tsx`**: show offer price only before a wilaya is picked; show full total (with `0 دج - مجاني` label when free) after
- [ ] **Step 12: Commit** — `feat: wilaya/commune selection and live total calculation`

---

### Task 9: Order form, abandoned-cart detection, sticky CTA

**Files:**
- Create: `components/landing/OrderForm.tsx`, `components/landing/StickyCTA.tsx`
- Modify: `app/page.tsx`
- Test: `components/landing/__tests__/OrderForm.test.tsx`

**Interfaces:**
- Consumes: `normalizePhone` (Task 3), `safeStorage`/`getOrCreateSessionId`/`captureAttribution` (Task 2), `calculateTotal` (Task 8)
- Produces: `<OrderForm offer={Offer} variant={Variant} delivery={{...}} onSubmitSuccess={(order_id: string) => void} />` — POSTs to `/api/order` (Task 10), includes honeypot field, disables submit button on click (anti double-submit), shows Arabic validation errors inline
- Produces: internal 45s abandoned-cart timer + `visibilitychange`/`pagehide` handler using `navigator.sendBeacon('/api/abandoned-cart', ...)`, armed only after a syntactically valid phone has been typed

- [ ] **Step 1: Write failing test**: submitting with an invalid phone shows an Arabic inline error and does not call `fetch`
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Write failing test**: submitting twice quickly (double-click) results in exactly one `fetch` call (button disabled after first click)
- [ ] **Step 4: Run test to verify it fails**
- [ ] **Step 5: Write failing test**: a honeypot field filled in causes the submit handler to no-op (no `fetch` call)
- [ ] **Step 6: Run test to verify it fails**
- [ ] **Step 7: Implement `OrderForm`** per the three tests, plus the 45s timer + `visibilitychange`/`pagehide` beacon wiring (fire once per session, only if phone passed `normalizePhone`)
- [ ] **Step 8: Run tests to verify they pass**
- [ ] **Step 9: Implement `StickyCTA`**: fixed bottom bar on mobile, smooth-scrolls to the form (`scrollIntoView`), hidden once the form is in viewport (simple `IntersectionObserver`, no library)
- [ ] **Step 10: Wire `OrderForm`/`StickyCTA` into `app/page.tsx`**, replacing the stubs from Task 7
- [ ] **Step 11: Commit** — `feat: COD order form with abandoned-cart detection and sticky CTA`

---

### Task 10: `/api/order` and `/api/abandoned-cart` routes

**Files:**
- Create: `app/api/order/route.ts`, `app/api/abandoned-cart/route.ts`
- Test: `app/api/order/__tests__/route.test.ts`, `app/api/abandoned-cart/__tests__/route.test.ts`

**Interfaces:**
- Consumes: `recordOrder`, `recordAbandonedCart`, `isDuplicateWithin10Min` (Task 6)
- Produces: `POST /api/order` — validates body (zod or manual), calls `recordOrder`, retries the Sheets write up to 2 times with backoff on failure, returns `{ order_id }` on success or `{ error: string }` (Arabic message) with the user's fields implicitly preserved client-side (server never echoes partial state back)
- Produces: `POST /api/abandoned-cart` — accepts `sendBeacon` payload (may arrive as `text/plain`; parse defensively), calls `recordAbandonedCart`, always returns 204 (fire-and-forget, client never reads the response)

- [ ] **Step 1: Write failing test**: `POST /api/order` with a valid payload returns 200 and `{ order_id }`, and `recordOrder` was called with the normalized phone
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Write failing test**: `POST /api/order` with an invalid phone returns 400 with an Arabic `error` message, `recordOrder` never called
- [ ] **Step 4: Run test to verify it fails**
- [ ] **Step 5: Write failing test**: when `recordOrder` rejects twice (mock), the route retries once more then returns 503 with an Arabic error
- [ ] **Step 6: Run test to verify it fails**
- [ ] **Step 7: Implement `app/api/order/route.ts`** per the three tests
- [ ] **Step 8: Run tests to verify they pass**
- [ ] **Step 9: Write failing test**: `POST /api/abandoned-cart` always responds 204 even when `recordAbandonedCart` throws (errors are swallowed/logged, never surfaced)
- [ ] **Step 10: Run test to verify it fails**
- [ ] **Step 11: Implement `app/api/abandoned-cart/route.ts`**
- [ ] **Step 12: Run test to verify it passes**
- [ ] **Step 13: Commit** — `feat: order and abandoned-cart API routes`

---

### Task 11: Thank-you page

**Files:**
- Create: `app/thank-you/page.tsx`
- Modify: `components/landing/OrderForm.tsx` (redirect with query params on success)

**Interfaces:**
- Consumes: `order_id` and order summary passed via query string (non-sensitive fields only: order_id, offer title, variant, quantity, wilaya, commune, total)

- [ ] **Step 1: Implement `app/thank-you/page.tsx`** reading `useSearchParams()`, rendering the Arabic summary (order id, nom, offre, variante(s), quantité, wilaya/commune, total)
- [ ] **Step 2: Modify `OrderForm`** `onSubmitSuccess` to `router.push('/thank-you?...')` with the summary fields URL-encoded
- [ ] **Step 3: Manual check**: submit the form locally, confirm the thank-you page renders all fields correctly
- [ ] **Step 4: Commit** — `feat: thank-you confirmation page`

---

### Task 12: Meta Pixel (client) + CAPI (server) with dedup

**Files:**
- Create: `lib/meta/pixel.ts`, `lib/meta/capi.ts`, `app/api/meta-capi/route.ts`
- Modify: `app/layout.tsx` (Pixel base code + PageView), `app/page.tsx` (ViewContent), `components/landing/OrderForm.tsx` (InitiateCheckout on first focus, Purchase only via server after order recorded)
- Test: `lib/meta/__tests__/capi.test.ts`

**Interfaces:**
- Produces: `trackPixelEvent(event: 'PageView'|'ViewContent'|'InitiateCheckout'|'Purchase', params: object, eventId: string): void` (no-op if `window.fbq` absent)
- Produces: `sendCapiEvent({ event_name, event_id, event_source_url, user_data: { ph?, fn?, ln?, ct?, st?, country?, client_ip_address?, client_user_agent?, fbp?, fbc? }, custom_data }): Promise<{ ok: boolean; status?: number }>` — hashes `ph`/`fn`/`ln`/`ct`/`st`/`country` with SHA-256 before sending, no-ops with a logged warning if `META_PIXEL_ID`/`META_CAPI_TOKEN` are unset (never throws)
- Produces: `POST /api/meta-capi` route accepting `{ event_name, event_id, ...order fields }`, builds the hashed payload server-side, calls `sendCapiEvent`

- [ ] **Step 1: Write failing test**: `sendCapiEvent` hashes `ph` with SHA-256 before building the request body (assert the mocked `fetch` body's `ph` is a 64-char hex string, not the raw phone)
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Write failing test**: `sendCapiEvent` returns `{ ok: false }` without throwing and without calling `fetch` when `META_CAPI_TOKEN` is unset
- [ ] **Step 4: Run test to verify it fails**
- [ ] **Step 5: Implement `capi.ts`** per both tests (Node `crypto.createHash('sha256')`)
- [ ] **Step 6: Run tests to verify they pass**
- [ ] **Step 7: Implement `pixel.ts`** (thin `window.fbq(...)` wrapper, no-op guarded)
- [ ] **Step 8: Add Pixel base script + `PageView`** in `app/layout.tsx` using `next/script` `strategy="afterInteractive"`, generating one `event_id` for PageView shared with a server-side `/api/meta-capi` call fired from a `useEffect`
- [ ] **Step 9: Add `ViewContent`** fire in `app/page.tsx` client component on mount, `value` = default offer price, same dual browser+server pattern
- [ ] **Step 10: Add `InitiateCheckout`** fire in `OrderForm` on first field focus (once per session, guarded via `safeStorage`)
- [ ] **Step 11: Add `Purchase`** fire only inside `/api/order` route (Task 10) immediately after `recordOrder` succeeds — server-side CAPI call plus returning the `event_id` to the client so the browser Pixel fires the matching `Purchase` for dedup
- [ ] **Step 12: Implement `app/api/meta-capi/route.ts`** as the shared POST endpoint used by steps 8-11
- [ ] **Step 13: Commit** — `feat: Meta Pixel + CAPI tracking with event_id dedup`

---

### Task 13: Admin auth (PIN gate)

**Files:**
- Create: `lib/admin-auth.ts`, `app/admin/layout.tsx`, `components/admin/PinForm.tsx`, `app/api/admin/login/route.ts`
- Test: `lib/__tests__/admin-auth.test.ts`

**Interfaces:**
- Produces: `signAdminCookie(): string` (HMAC-SHA256 over a fixed payload + expiry timestamp, secret = `ADMIN_SECRET_KEY`), `verifyAdminCookie(cookie: string): boolean`
- Produces: `checkPinRateLimit(ip: string): boolean` (in-memory map, max 5 attempts / 15 min / IP)
- Produces: `POST /api/admin/login` — body `{ pin }`, compares to `ADMIN_SECRET_KEY`, sets signed cookie (24h expiry) on success, rate-limited per above

- [ ] **Step 1: Write failing test**: `verifyAdminCookie` returns `false` for a cookie signed with a different secret, and `false` for one past its expiry timestamp
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Implement `admin-auth.ts`**
- [ ] **Step 4: Run test to verify it passes**
- [ ] **Step 5: Write failing test**: `checkPinRateLimit` returns `false` on the 6th attempt within 15 minutes for the same IP, `true` for a different IP
- [ ] **Step 6: Run test to verify it fails**
- [ ] **Step 7: Implement rate limiter** (simple `Map<string, { count, windowStart }>`)
- [ ] **Step 8: Run test to verify it passes**
- [ ] **Step 9: Implement `app/api/admin/login/route.ts`**, `components/admin/PinForm.tsx`, `app/admin/layout.tsx`** (redirects to PIN form if cookie missing/invalid, renders children otherwise)
- [ ] **Step 10: Manual check**: visit `/admin`, confirm PIN gate blocks access, correct PIN grants access for 24h
- [ ] **Step 11: Commit** — `feat: admin PIN authentication`

---

### Task 14: Admin — delivery tariffs page

**Files:**
- Create: `app/admin/delivery/page.tsx`, `components/admin/DeliveryTable.tsx`, `app/api/admin/delivery/route.ts`
- Test: `app/api/admin/delivery/__tests__/route.test.ts`

**Interfaces:**
- Consumes: `getDeliveryTariffs`, `saveDeliveryTariff` (Task 5)
- Produces: `POST /api/admin/delivery` (auth-gated via `verifyAdminCookie`) — body `DeliveryTariff`, calls `saveDeliveryTariff`, then `revalidatePath('/')`

- [ ] **Step 1: Write failing test**: `POST /api/admin/delivery` without a valid admin cookie returns 401 and never calls `saveDeliveryTariff`
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Write failing test**: with a valid cookie, calls `saveDeliveryTariff` with the posted body and calls `revalidatePath('/')`
- [ ] **Step 4: Run test to verify it fails**
- [ ] **Step 5: Implement the route**
- [ ] **Step 6: Run tests to verify they pass**
- [ ] **Step 7: Implement `DeliveryTable`/`app/admin/delivery/page.tsx`**: table of all 58 wilayas with editable `prix_domicile`/`prix_stopdesk`/`actif`, saves one row per edit via the route above
- [ ] **Step 8: Manual check**: edit a tariff, confirm it reflects on the landing page's wilaya selector without a redeploy
- [ ] **Step 9: Commit** — `feat: admin delivery tariffs page`

---

### Task 15: Admin — offers/packs page

**Files:**
- Create: `app/admin/offers/page.tsx`, `components/admin/OffersTable.tsx`, `app/api/admin/offers/route.ts`
- Test: `app/api/admin/offers/__tests__/route.test.ts`

**Interfaces:**
- Consumes: `getOffers`, `saveOffer` (Task 5)
- Produces: `POST /api/admin/offers` (auth-gated) — body `Offer`, calls `saveOffer`, then `revalidatePath('/')`

- [ ] **Step 1: Write failing test**: unauthenticated request returns 401
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Write failing test**: authenticated request calls `saveOffer` and `revalidatePath('/')`
- [ ] **Step 4: Run test to verify it fails**
- [ ] **Step 5: Implement the route**
- [ ] **Step 6: Run tests to verify they pass**
- [ ] **Step 7: Implement `OffersTable`/`app/admin/offers/page.tsx`**: create/edit/reorder/disable offers, editing `titre_ar`, `quantite`, `prix_dzd`, `prix_barre_dzd`, `badge_ar`, `livraison_gratuite`, `par_defaut`, `ordre`, `actif`
- [ ] **Step 8: Manual check**: create a 2-piece offer, confirm it appears instantly in the landing page's `OfferPicker`
- [ ] **Step 9: Commit** — `feat: admin offers/packs page`

---

### Task 16: Admin — media upload with compression

**Files:**
- Create: `lib/image.ts`, `app/admin/media/page.tsx`, `components/admin/MediaUploader.tsx`, `app/api/admin/upload/route.ts`
- Test: `lib/__tests__/image.test.ts`, `app/api/admin/upload/__tests__/route.test.ts`

**Interfaces:**
- Produces: `compressImage(buffer: Buffer, kind: 'gallery' | 'thumb'): Promise<{ buffer: Buffer; sizeBefore: number; sizeAfter: number }>` — `gallery` resizes to max width 1200px, `thumb` to max width 400px, both WebP quality 80, EXIF stripped
- Produces: `POST /api/admin/upload` (auth-gated) — accepts multipart file + `kind` + optional `variant_id`, compresses via `compressImage`, uploads to Vercel Blob (`put()` from `@vercel/blob`), calls `saveVariant` (Task 5) with the resulting URL when `variant_id` is present, else updates the gallery list, then `revalidatePath('/')`, returns `{ url, sizeBefore, sizeAfter }`

- [ ] **Step 1: Write failing test**: `compressImage` on a >1MB JPEG fixture with `kind='gallery'` returns a buffer under 150KB and `sizeAfter < sizeBefore`
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Write failing test**: `compressImage` with `kind='thumb'` returns a buffer under 35KB
- [ ] **Step 4: Run test to verify it fails**
- [ ] **Step 5: Implement `compressImage`** with `sharp` per both tests
- [ ] **Step 6: Run tests to verify they pass**
- [ ] **Step 7: Write failing test**: `POST /api/admin/upload` without a valid admin cookie returns 401
- [ ] **Step 8: Run test to verify it fails**
- [ ] **Step 9: Write failing test**: authenticated upload calls `compressImage`, then Blob `put()`, then `saveVariant`/gallery update, then `revalidatePath('/')`, returning `{ url, sizeBefore, sizeAfter }`
- [ ] **Step 10: Run test to verify it fails**
- [ ] **Step 11: Implement the route**, no writes to `public/`
- [ ] **Step 12: Run tests to verify they pass**
- [ ] **Step 13: Implement `MediaUploader`/`app/admin/media/page.tsx`**: drag-drop or file-picker upload, shows "Mo → Ko (-XX%)" compression ratio, lets superadmin assign an uploaded image to a variant or to the main gallery order
- [ ] **Step 14: Manual check**: upload a >1MB JPEG as a variant photo, confirm the compression ratio display and that the variant's image updates on the landing page
- [ ] **Step 15: Commit** — `feat: admin media upload with automatic WebP compression`

---

### Task 17: Environment variables documentation + deployment checklist

**Files:**
- Modify: `.env.example`
- Create: `docs/DEPLOYMENT.md`

**Interfaces:** none (documentation task)

- [ ] **Step 1: Finalize `.env.example`** with every var used across Tasks 1-16: `GOOGLE_SHEET_ID`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`, `BLOB_READ_WRITE_TOKEN`, `META_PIXEL_ID`, `META_CAPI_TOKEN`, `META_TEST_EVENT_CODE`, `ADMIN_SECRET_KEY`
- [ ] **Step 2: Write `docs/DEPLOYMENT.md`**: steps to create the Google Service Account + share the Sheet, run `tsx scripts/init-sheets.ts`, create the Vercel Blob store, set all env vars on Vercel, and the full validation checklist from the design doc section "Validation attendue"
- [ ] **Step 3: Commit** — `docs: deployment checklist and environment variables`

---

### Task 18: End-to-end verification pass

**Files:** none (verification only — may add fixtures under `test/fixtures/` if needed)

- [ ] **Step 1: Run `npm run build`** — expect zero TypeScript errors, zero SSR warnings
- [ ] **Step 2: Run the full test suite** (`npm test`) — expect all tests from Tasks 2-16 passing
- [ ] **Step 3: Manual: upload test** — in `/admin/media`, upload a >1MB product photo and a >1MB variant photo; confirm compression ratios shown and sizes meet the <150KB/<35KB targets; in `/admin/offers`, create a temporary 2-piece offer and confirm it appears instantly on the landing page
- [ ] **Step 4: Manual: WebView simulation** — load the page with a spoofed `User-Agent` (Instagram Mobile WebView string) via browser devtools device emulation; confirm HTTP 200, RTL rendering, offer switching recalculates price+delivery, variant click swaps the gallery image, wilaya→commune selection works
- [ ] **Step 5: Manual: end-to-end Sheets test** — submit an abandoned cart (fill phone, wait 45s) then a normal 2-piece order with the same phone; confirm in the Google Sheet: 34 columns populated including `offre_choisie`/`variante_choisie`/`quantite`, dropdowns/colors active on `statut_confirmation`/`statut_livraison`, the abandoned row stays `Panier Abandonné`/`En attente`, the new order row carries `flag_doublon`
- [ ] **Step 6: Manual: CAPI test** — submit an order with `META_TEST_EVENT_CODE` set, confirm in Meta Events Manager (test events) that `Purchase` arrives with correct `value`/`num_items` and the same `event_id` as the browser Pixel event (shown as deduplicated)
- [ ] **Step 7: Confirm `docs/DEPLOYMENT.md`** lists every required env var with no omissions, cross-checked against `.env.example`
- [ ] **Step 8: Commit** — `test: end-to-end verification pass` (if any fixtures were added)

---

## Self-Review Notes

- **Spec coverage:** clone/CRO rhythm (Task 7), Arabic RTL (Task 1), wilayas/communes + admin tariffs (Tasks 2/14), abandoned-cart vs order detection + 34-column schema + dedup/race rules (Tasks 4/6/10), Meta Pixel+CAPI+dedup (Task 12), admin media+compression (Task 16), thank-you page (Task 11), build/upload/WebView/e2e/CAPI/env-var validation (Task 18) — all covered. `Dashboard_KPI` formulas are explicitly out of scope for V1 per the design doc's non-goals.
- **Type consistency:** `Offer`, `DeliveryTariff`, `Variant`, `OrderInput` types are defined once (Tasks 5/6) and reused by name in every later task's Interfaces block.
- **Review Focus coverage:** Eastern Arabic phone digits (Task 3), WebView storage/attribution safety (Task 2 + Task 9's guarded timer), duplicate-phone-no-overwrite (Task 6), Sheets write failure UX (Task 10), wilaya/commune reset safety (Task 8) — each has an owning task and test.
