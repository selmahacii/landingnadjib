import { readRange, updateRange, appendRow } from "./client";
import { TAB_NAMES } from "./init";
import wilayasData from "../../data/wilayas.json";

export interface DeliveryTariff {
  wilaya_code: string;
  wilaya_ar: string;
  prix_domicile: number;
  prix_stopdesk: number;
  actif: boolean;
}

export function getDefaultTariffs(): DeliveryTariff[] {
  return wilayasData.map((w) => {
    const codeNum = parseInt(w.code, 10);
    let domicile = 600;
    let stopdesk = 350;

    if (w.code === "16") {
      domicile = 400;
      stopdesk = 250;
    } else if (["09", "35", "42"].includes(w.code)) {
      domicile = 500;
      stopdesk = 300;
    } else if (codeNum > 47) {
      domicile = 900;
      stopdesk = 600;
    }

    return {
      wilaya_code: w.code,
      wilaya_ar: w.name_ar,
      prix_domicile: domicile,
      prix_stopdesk: stopdesk,
      actif: true,
    };
  });
}

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

export async function getDeliveryTariffs(includeInactive = false): Promise<DeliveryTariff[]> {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!sheetId) {
    return getDefaultTariffs();
  }

  try {
    const rows = await readRange(sheetId, `${TAB_NAMES.TARIFS}!A:E`);
    if (!rows || rows.length <= 1) {
      return getDefaultTariffs();
    }

    const dataRows = rows.slice(1);
    const tariffsMap = new Map<string, DeliveryTariff>();

    for (const row of dataRows) {
      if (!row || !row[0]) continue;

      const wilaya_code = String(row[0] || "").trim();
      const wilaya_ar = String(row[1] || "").trim();
      const prix_domicile = parseDzdNumber(row[2], 0);
      const prix_stopdesk = parseDzdNumber(row[3], 0);
      const actif = String(row[4] || "TRUE").trim().toUpperCase() === "TRUE";

      if (actif || includeInactive) {
        tariffsMap.set(wilaya_code, {
          wilaya_code,
          wilaya_ar,
          prix_domicile,
          prix_stopdesk,
          actif,
        });
      }
    }

    if (includeInactive) {
      // Ensure all 58 wilayas are present in order
      const defaults = getDefaultTariffs();
      return defaults.map((def) => tariffsMap.get(def.wilaya_code) || def);
    }

    return Array.from(tariffsMap.values());
  } catch (error) {
    console.warn("Could not read delivery tariffs from Sheets, falling back to defaults:", error);
    return getDefaultTariffs();
  }
}

export async function saveDeliveryTariff(tariff: DeliveryTariff): Promise<void> {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!sheetId) {
    throw new Error("GOOGLE_SHEET_ID is required to save delivery tariff.");
  }

  const rows = await readRange(sheetId, `${TAB_NAMES.TARIFS}!A:E`);
  const existingRows = rows || [];

  let foundRowIndex = -1;
  for (let i = 1; i < existingRows.length; i++) {
    if (existingRows[i] && existingRows[i][0] === tariff.wilaya_code) {
      foundRowIndex = i;
      break;
    }
  }

  const rowValues = [
    tariff.wilaya_code,
    tariff.wilaya_ar,
    tariff.prix_domicile,
    tariff.prix_stopdesk,
    tariff.actif ? "TRUE" : "FALSE",
  ];

  if (foundRowIndex > -1) {
    const sheetRowNum = foundRowIndex + 1;
    await updateRange(sheetId, `${TAB_NAMES.TARIFS}!A${sheetRowNum}:E${sheetRowNum}`, [rowValues]);
  } else {
    await appendRow(sheetId, TAB_NAMES.TARIFS, rowValues);
  }
}
