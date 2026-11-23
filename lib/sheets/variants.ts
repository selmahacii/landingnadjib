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
    image_url: "/images/wallets/noir.webp",
    thumb_url: "/images/wallets/noir.webp",
    ordre: 1,
    actif: true,
  },
  {
    variant_id: "var_beige",
    nom_variante_ar: "بيج (Beige)",
    supplement_prix_dzd: 0,
    image_url: "/images/wallets/beige.webp",
    thumb_url: "/images/wallets/beige.webp",
    ordre: 2,
    actif: true,
  },
  {
    variant_id: "var_vert",
    nom_variante_ar: "أخضر (Vert)",
    supplement_prix_dzd: 0,
    image_url: "/images/wallets/vert.webp",
    thumb_url: "/images/wallets/vert.webp",
    ordre: 3,
    actif: true,
  },
  {
    variant_id: "var_marron",
    nom_variante_ar: "بني (Marron)",
    supplement_prix_dzd: 0,
    image_url: "/images/wallets/marron.webp",
    thumb_url: "/images/wallets/marron.webp",
    ordre: 4,
    actif: true,
  },
  {
    variant_id: "var_rouge",
    nom_variante_ar: "أحمر (Rouge)",
    supplement_prix_dzd: 0,
    image_url: "/images/wallets/rouge.webp",
    thumb_url: "/images/wallets/rouge.webp",
    ordre: 5,
    actif: true,
  },
];

function parseDzdNumber(val: unknown, defaultVal = 0): number {
  if (typeof val === "number") return isNaN(val) ? defaultVal : val;
  if (!val) return defaultVal;
  const cleaned = String(val)
    .replace(/[\u00a0\u202f\s]/g, "")
    .replace(/DZD|DA|د\.?ج|دج/gi, "")
    .replace(/,/g, "")
    .trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? defaultVal : num;
}

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
      const supplement_prix_dzd = parseDzdNumber(row[2], 0);
      const defaultVariant = DEFAULT_VARIANTS.find(
        (d) => d.variant_id.toLowerCase() === variant_id.toLowerCase()
      );
      const rawImageUrl = String(row[3] || "").trim();
      const rawThumbUrl = String(row[4] || "").trim();
      const image_url = rawImageUrl || defaultVariant?.image_url || "";
      const thumb_url = rawThumbUrl || defaultVariant?.thumb_url || image_url;
      const ordre = parseInt(String(row[5] || "0"), 10) || defaultVariant?.ordre || 0;
      const actif = String(row[6] || "TRUE").trim().toUpperCase() === "TRUE";

      if (actif || includeInactive) {
        variants.push({
          variant_id,
          nom_variante_ar: nom_variante_ar || defaultVariant?.nom_variante_ar || variant_id,
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
    const rowId = String(existingRows[i]?.[0] || "").trim().toLowerCase();
    if (rowId === variant.variant_id.trim().toLowerCase()) {
      foundRowIndex = i;
      break;
    }
  }

  if (foundRowIndex > -1) {
    const sheetRowNum = foundRowIndex + 1;
    const existingRow = existingRows[foundRowIndex] || [];
    const rowValues = [
      variant.variant_id,
      variant.nom_variante_ar || String(existingRow[1] || ""),
      variant.supplement_prix_dzd !== undefined ? variant.supplement_prix_dzd : (parseFloat(String(existingRow[2] || "0")) || 0),
      variant.image_url !== undefined ? variant.image_url : String(existingRow[3] || ""),
      variant.thumb_url !== undefined ? variant.thumb_url : String(existingRow[4] || ""),
      variant.ordre !== undefined ? variant.ordre : (parseInt(String(existingRow[5] || "0"), 10) || 1),
      variant.actif !== undefined ? (variant.actif ? "TRUE" : "FALSE") : String(existingRow[6] || "TRUE"),
    ];
    await updateRange(sheetId, `${TAB_NAMES.VARIANTES}!A${sheetRowNum}:G${sheetRowNum}`, [rowValues]);
  } else {
    if (existingRows.length === 0) {
      await appendRow(sheetId, TAB_NAMES.VARIANTES, [
        "variant_id",
        "nom_variante_ar",
        "supplement_prix_dzd",
        "image_url",
        "thumb_url",
        "ordre",
        "actif",
      ]);
    }
    const rowValues = [
      variant.variant_id,
      variant.nom_variante_ar,
      variant.supplement_prix_dzd ?? 0,
      variant.image_url ?? "",
      variant.thumb_url ?? "",
      variant.ordre ?? 1,
      variant.actif !== false ? "TRUE" : "FALSE",
    ];
    await appendRow(sheetId, TAB_NAMES.VARIANTES, rowValues);
  }
}
