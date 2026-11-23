import { readRange, updateRange, appendRow } from "./client";
import { TAB_NAMES } from "./init";

export interface SiteSettings {
  header_bg_color: string;   // hex, ex: "#0f172a"
  header_text_color: string; // hex, ex: "#fbbf24"
  header_text_ar: string;    // texte arabe du bandeau
  main_image_url?: string;   // URL de la photo principale du produit dans la galerie
}

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  header_bg_color: "#171717",
  header_text_color: "#fbbf24",
  header_text_ar: "🚚 توصيل متوفر لـ 58 ولاية | 💵 الدفع عند الاستلام بعد معاينة السلعة",
  main_image_url: "/images/wallets/main.webp",
};

export async function getSiteSettings(): Promise<SiteSettings> {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!sheetId) {
    return { ...DEFAULT_SITE_SETTINGS };
  }

  try {
    const rows = await readRange(sheetId, `${TAB_NAMES.PARAMETRES}!A:B`);
    if (!rows || rows.length <= 1) {
      return { ...DEFAULT_SITE_SETTINGS };
    }

    const settingsMap: Record<string, string> = {};
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row && row[0]) {
        const key = String(row[0]).trim();
        const value = String(row[1] ?? "").trim();
        settingsMap[key] = value;
      }
    }

    return {
      header_bg_color: settingsMap["header_bg_color"] || DEFAULT_SITE_SETTINGS.header_bg_color,
      header_text_color: settingsMap["header_text_color"] || DEFAULT_SITE_SETTINGS.header_text_color,
      header_text_ar: settingsMap["header_text_ar"] || DEFAULT_SITE_SETTINGS.header_text_ar,
      main_image_url: settingsMap["main_image_url"] || "",
    };
  } catch (error) {
    console.warn("Could not read site settings from Sheets, falling back to defaults:", error);
    return { ...DEFAULT_SITE_SETTINGS };
  }
}

export async function saveSiteSettings(settings: SiteSettings): Promise<void> {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!sheetId) {
    throw new Error("GOOGLE_SHEET_ID is required to save site settings.");
  }

  const rows = await readRange(sheetId, `${TAB_NAMES.PARAMETRES}!A:B`);
  const existingRows = rows || [];

  const keyMap = new Map<string, number>();
  for (let i = 1; i < existingRows.length; i++) {
    if (existingRows[i] && existingRows[i][0]) {
      keyMap.set(String(existingRows[i][0]).trim(), i + 1); // 1-indexed sheet row number
    }
  }

  const entries: [keyof SiteSettings, string][] = [
    ["header_bg_color", settings.header_bg_color || DEFAULT_SITE_SETTINGS.header_bg_color],
    ["header_text_color", settings.header_text_color || DEFAULT_SITE_SETTINGS.header_text_color],
    ["header_text_ar", settings.header_text_ar || DEFAULT_SITE_SETTINGS.header_text_ar],
    ["main_image_url", settings.main_image_url ?? ""],
  ];

  for (const [key, value] of entries) {
    const sheetRowNum = keyMap.get(key);
    if (sheetRowNum) {
      await updateRange(sheetId, `${TAB_NAMES.PARAMETRES}!A${sheetRowNum}:B${sheetRowNum}`, [
        [key, value],
      ]);
    } else {
      await appendRow(sheetId, TAB_NAMES.PARAMETRES, [key, value]);
      keyMap.set(key, existingRows.length + 1);
    }
  }
}

export async function saveMainImageUrl(url: string): Promise<void> {
  const current = await getSiteSettings();
  await saveSiteSettings({
    ...current,
    main_image_url: url,
  });
}
