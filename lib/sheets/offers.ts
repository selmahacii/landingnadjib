import { readRange, updateRange, appendRow } from "./client";
import { TAB_NAMES } from "./init";

export interface Offer {
  offer_id: string;
  titre_ar: string;
  quantite: number;
  prix_dzd: number;
  prix_barre_dzd: number;
  badge_ar: string;
  livraison_gratuite: boolean;
  par_defaut: boolean;
  ordre: number;
  actif: boolean;
}

export const DEFAULT_OFFERS: Offer[] = [
  {
    offer_id: "pack_1",
    titre_ar: "قطعة واحدة (1)",
    quantite: 1,
    prix_dzd: 2000,
    prix_barre_dzd: 2800,
    badge_ar: "",
    livraison_gratuite: false,
    par_defaut: false,
    ordre: 1,
    actif: true,
  },
  {
    offer_id: "pack_2",
    titre_ar: "قطعتين (2)",
    quantite: 2,
    prix_dzd: 3500,
    prix_barre_dzd: 4500,
    badge_ar: "الأكثر طلباً - توفير 500 دج",
    livraison_gratuite: false,
    par_defaut: true,
    ordre: 2,
    actif: true,
  },
];

export async function getOffers(includeInactive = false): Promise<Offer[]> {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!sheetId) {
    return (includeInactive ? DEFAULT_OFFERS : DEFAULT_OFFERS.filter((o) => o.actif))
      .slice()
      .sort((a, b) => a.ordre - b.ordre);
  }

  try {
    const rows = await readRange(sheetId, `${TAB_NAMES.OFFRES}!A:J`);
    if (!rows || rows.length <= 1) {
      return (includeInactive ? DEFAULT_OFFERS : DEFAULT_OFFERS.filter((o) => o.actif))
        .slice()
        .sort((a, b) => a.ordre - b.ordre);
    }

    const dataRows = rows.slice(1);
    const offers: Offer[] = [];

    for (const row of dataRows) {
      if (!row || !row[0]) continue;

      const offer_id = String(row[0] || "").trim();
      const titre_ar = String(row[1] || "").trim();
      const quantite = parseInt(String(row[2] || "1"), 10) || 1;
      const prix_dzd = parseFloat(String(row[3] || "0")) || 0;
      const prix_barre_dzd = parseFloat(String(row[4] || "0")) || 0;
      const badge_ar = String(row[5] || "").trim();
      const livraison_gratuite = String(row[6] || "").trim().toUpperCase() === "TRUE";
      const par_defaut = String(row[7] || "").trim().toUpperCase() === "TRUE";
      const ordre = parseInt(String(row[8] || "0"), 10) || 0;
      const actif = String(row[9] || "TRUE").trim().toUpperCase() === "TRUE";

      if (actif || includeInactive) {
        offers.push({
          offer_id,
          titre_ar,
          quantite,
          prix_dzd,
          prix_barre_dzd,
          badge_ar,
          livraison_gratuite,
          par_defaut,
          ordre,
          actif,
        });
      }
    }

    return offers.sort((a, b) => a.ordre - b.ordre);
  } catch (error) {
    console.warn("Could not read offers from Sheets, falling back to default offers:", error);
    return (includeInactive ? DEFAULT_OFFERS : DEFAULT_OFFERS.filter((o) => o.actif))
      .slice()
      .sort((a, b) => a.ordre - b.ordre);
  }
}

export async function saveOffer(offer: Offer): Promise<void> {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!sheetId) {
    throw new Error("GOOGLE_SHEET_ID is required to save an offer.");
  }

  const rows = await readRange(sheetId, `${TAB_NAMES.OFFRES}!A:J`);
  const existingRows = rows || [];

  let foundRowIndex = -1;
  for (let i = 1; i < existingRows.length; i++) {
    if (existingRows[i] && existingRows[i][0] === offer.offer_id) {
      foundRowIndex = i;
      break;
    }
  }

  const rowValues = [
    offer.offer_id,
    offer.titre_ar,
    offer.quantite,
    offer.prix_dzd,
    offer.prix_barre_dzd,
    offer.badge_ar,
    offer.livraison_gratuite ? "TRUE" : "FALSE",
    offer.par_defaut ? "TRUE" : "FALSE",
    offer.ordre,
    offer.actif ? "TRUE" : "FALSE",
  ];

  if (foundRowIndex > -1) {
    // 1-indexed in Google Sheets: row 1 is header, row 2 is index 1
    const sheetRowNum = foundRowIndex + 1;
    await updateRange(sheetId, `${TAB_NAMES.OFFRES}!A${sheetRowNum}:J${sheetRowNum}`, [rowValues]);
  } else {
    await appendRow(sheetId, TAB_NAMES.OFFRES, rowValues);
  }
}
