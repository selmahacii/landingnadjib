import { readRange, updateRange, appendRow } from "./client";
import { TAB_NAMES } from "./init";

export interface Variant {
  variant_id: string;
  nom_variante_ar: string;
  supplement_prix_dzd: number;
  image_url: string;
  thumb_url: string;
  ordre: number;
  actif: boolean;
}

export const DEFAULT_VARIANTS: Variant[] = [
  {
    variant_id: "var_noir",
    nom_variante_ar: "أسود (Noir)",
    supplement_prix_dzd: 0,
    image_url: "",
    thumb_url: "",
    ordre: 1,
    actif: true,
  },
  {
    variant_id: "var_beige",
    nom_variante_ar: "بيج (Beige)",
    supplement_prix_dzd: 0,
    image_url: "",
    thumb_url: "",
    ordre: 2,
    actif: true,
  },
  {
    variant_id: "var_vert",
    nom_variante_ar: "أخضر (Vert)",
    supplement_prix_dzd: 0,
    image_url: "",
    thumb_url: "",
    ordre: 3,
    actif: true,
  },
  {
    variant_id: "var_marron",
    nom_variante_ar: "بني (Marron)",
    supplement_prix_dzd: 0,
    image_url: "",
    thumb_url: "",
    ordre: 4,
    actif: true,
  },
  {
    variant_id: "var_rouge",
    nom_variante_ar: "أحمر (Rouge)",
    supplement_prix_dzd: 0,
    image_url: "",
    thumb_url: "",
    ordre: 5,
    actif: true,
  },
];

export async function getVariants(includeInactive = false): Promise<Variant[]> {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!sheetId) {
    return (includeInactive ? DEFAULT_VARIANTS : DEFAULT_VARIANTS.filter((v) => v.actif))
      .slice()
      .sort((a, b) => a.ordre - b.ordre);
  }

  try {
    const rows = await readRange(sheetId, `${TAB_NAMES.VARIANTES}!A:G`);
    if (!rows || rows.length <= 1) {
      return (includeInactive ? DEFAULT_VARIANTS : DEFAULT_VARIANTS.filter((v) => v.actif))
        .slice()
        .sort((a, b) => a.ordre - b.ordre);
    }

    const dataRows = rows.slice(1);
    const variants: Variant[] = [];

    for (const row of dataRows) {
      if (!row || !row[0]) continue;

      const variant_id = String(row[0] || "").trim();
      const nom_variante_ar = String(row[1] || "").trim();
      const supplement_prix_dzd = parseFloat(String(row[2] || "0")) || 0;
      const image_url = String(row[3] || "").trim();
      const thumb_url = String(row[4] || "").trim();
      const ordre = parseInt(String(row[5] || "0"), 10) || 0;
      const actif = String(row[6] || "TRUE").trim().toUpperCase() === "TRUE";

      if (actif || includeInactive) {
        variants.push({
          variant_id,
          nom_variante_ar,
          supplement_prix_dzd,
          image_url,
          thumb_url,
          ordre,
          actif,
        });
      }
    }

    return variants.sort((a, b) => a.ordre - b.ordre);
  } catch (error) {
    console.warn("Could not read variants from Sheets, falling back to defaults:", error);
    return (includeInactive ? DEFAULT_VARIANTS : DEFAULT_VARIANTS.filter((v) => v.actif))
      .slice()
      .sort((a, b) => a.ordre - b.ordre);
  }
}

export async function saveVariant(variant: Variant): Promise<void> {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!sheetId) {
    throw new Error("GOOGLE_SHEET_ID is required to save a variant.");
  }

  const rows = await readRange(sheetId, `${TAB_NAMES.VARIANTES}!A:G`);
  const existingRows = rows || [];

  let foundRowIndex = -1;
  for (let i = 1; i < existingRows.length; i++) {
    if (existingRows[i] && existingRows[i][0] === variant.variant_id) {
      foundRowIndex = i;
      break;
    }
  }

  const rowValues = [
    variant.variant_id,
    variant.nom_variante_ar,
    variant.supplement_prix_dzd,
    variant.image_url,
    variant.thumb_url,
    variant.ordre,
    variant.actif ? "TRUE" : "FALSE",
  ];

  if (foundRowIndex > -1) {
    const sheetRowNum = foundRowIndex + 1;
    await updateRange(sheetId, `${TAB_NAMES.VARIANTES}!A${sheetRowNum}:G${sheetRowNum}`, [rowValues]);
  } else {
    await appendRow(sheetId, TAB_NAMES.VARIANTES, rowValues);
  }
}
