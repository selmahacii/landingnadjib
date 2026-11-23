import { readRange, appendRow } from "./client";
import { TAB_NAMES, COMMANDES_COLUMNS } from "./init";

export interface OrderInput {
  session_id: string;
  nom_complet: string;
  telephone_normalise: string;
  telephone_secondaire?: string;
  wilaya_code: string;
  wilaya_nom: string;
  commune: string;
  adresse_livraison?: string;
  mode_livraison: "Domicile" | "Stop Desk";
  offre_choisie: string;
  variante_choisie: string;
  quantite: number;
  prix_offre_dzd: number;
  prix_livraison_dzd: number;
  total_dzd: number;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  fbclid?: string;
  device_navigateur?: string;
  ip_client?: string;
  temps_sur_page_sec?: number;
  dernier_champ_rempli?: string;
  notes?: string;
}

export interface AbandonedCartInput {
  session_id: string;
  telephone_normalise: string;
  nom_complet?: string;
  telephone_secondaire?: string;
  wilaya_code?: string;
  wilaya_nom?: string;
  commune?: string;
  adresse_livraison?: string;
  mode_livraison?: "Domicile" | "Stop Desk";
  offre_choisie?: string;
  variante_choisie?: string;
  quantite?: number;
  prix_offre_dzd?: number;
  prix_livraison_dzd?: number;
  total_dzd?: number;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  fbclid?: string;
  device_navigateur?: string;
  ip_client?: string;
  temps_sur_page_sec?: number;
  dernier_champ_rempli?: string;
  notes?: string;
}

function getAlgiersTimestamp(): { isoString: string; dateCode: string; formatted: string } {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("fr-CA", {
    timeZone: "Africa/Algiers",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  // fr-CA produces YYYY-MM-DD, HH:mm:ss
  const parts = formatter.formatToParts(now);
  const partMap: Record<string, string> = {};
  for (const p of parts) {
    partMap[p.type] = p.value;
  }

  const yyyy = partMap.year;
  const mm = partMap.month;
  const dd = partMap.day;
  const hour = partMap.hour || "00";
  const min = partMap.minute || "00";
  const sec = partMap.second || "00";

  const dateCode = `${yyyy}${mm}${dd}`;
  const formatted = `${yyyy}-${mm}-${dd} ${hour}:${min}:${sec}`;

  return { isoString: now.toISOString(), dateCode, formatted };
}

function generateRandomSuffix(length = 4): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function isDuplicateWithin10Min(
  telephone_normalise: string,
  produit = "Porte feuille Classe"
): Promise<boolean> {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!sheetId) return false;

  try {
    const rows = await readRange(sheetId, `${TAB_NAMES.COMMANDES}!A:J`);
    if (!rows || rows.length <= 1) return false;

    const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
    for (let i = rows.length - 1; i >= 1; i--) {
      const row = rows[i];
      if (!row) continue;
      const rowPhone = String(row[8] || "").trim();
      const rowDateStr = String(row[1] || "").trim();
      const rowTime = Date.parse(rowDateStr);

      if (rowPhone === telephone_normalise) {
        if (!isNaN(rowTime) && rowTime >= tenMinutesAgo) {
          return true;
        }
      }
    }
    return false;
  } catch {
    return false;
  }
}

export async function recordOrder(
  input: OrderInput
): Promise<{ order_id: string; flag_doublon: string }> {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  const { dateCode, formatted } = getAlgiersTimestamp();
  const order_id = `ORD-${dateCode}-${generateRandomSuffix()}`;

  let flag_doublon = "";

  if (sheetId) {
    try {
      const rows = await readRange(sheetId, `${TAB_NAMES.COMMANDES}!A:J`);
      if (rows && rows.length > 1) {
        const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;

        for (let i = rows.length - 1; i >= 1; i--) {
          const row = rows[i];
          if (!row) continue;
          const priorOrderId = String(row[0] || "").trim();
          const priorDateStr = String(row[1] || "").trim();
          const priorPhone = String(row[8] || "").trim();

          if (priorPhone === input.telephone_normalise) {
            const priorTime = Date.parse(priorDateStr);
            if (isNaN(priorTime) || priorTime >= twentyFourHoursAgo) {
              flag_doublon = `⚠️ Doublon tel (24h) - voir ${priorOrderId}`;
              break;
            }
          }
        }
      }
    } catch (e) {
      console.warn("Could not check duplicate orders:", e);
    }
  }

  // Schema of 34 columns (index 0 to 33)
  const rowValues: unknown[] = new Array(34).fill("");
  rowValues[0] = order_id;
  rowValues[1] = formatted;
  rowValues[2] = "Commande Site";
  rowValues[3] = input.session_id;
  rowValues[4] = "En attente"; // statut_confirmation (initial)
  rowValues[5] = ""; // motif_annulation
  rowValues[6] = "Non expédiée"; // statut_livraison (initial)
  rowValues[7] = input.nom_complet;
  rowValues[8] = input.telephone_normalise;
  rowValues[9] = input.telephone_secondaire || "";
  rowValues[10] = input.wilaya_code;
  rowValues[11] = input.wilaya_nom;
  rowValues[12] = input.commune;
  rowValues[13] = input.adresse_livraison || "";
  rowValues[14] = input.mode_livraison;
  rowValues[15] = "Porte feuille Classe";
  rowValues[16] = input.offre_choisie;
  rowValues[17] = input.variante_choisie;
  rowValues[18] = input.quantite;
  rowValues[19] = input.prix_offre_dzd;
  rowValues[20] = input.prix_livraison_dzd;
  rowValues[21] = input.total_dzd;
  rowValues[22] = input.utm_source || "";
  rowValues[23] = input.utm_medium || "";
  rowValues[24] = input.utm_campaign || "";
  rowValues[25] = input.utm_content || "";
  rowValues[26] = input.utm_term || "";
  rowValues[27] = input.fbclid || "";
  rowValues[28] = input.device_navigateur || "";
  rowValues[29] = input.ip_client || "";
  rowValues[30] = input.temps_sur_page_sec !== undefined ? input.temps_sur_page_sec : "";
  rowValues[31] = input.dernier_champ_rempli || "";
  rowValues[32] = flag_doublon;
  rowValues[33] = input.notes || "";

  if (sheetId) {
    await appendRow(sheetId, TAB_NAMES.COMMANDES, rowValues);
  }

  return { order_id, flag_doublon };
}

export async function recordAbandonedCart(
  input: AbandonedCartInput
): Promise<{ order_id: string } | { skipped: true }> {
  const sheetId = process.env.GOOGLE_SHEET_ID;

  if (sheetId) {
    try {
      const rows = await readRange(sheetId, `${TAB_NAMES.COMMANDES}!A:D`);
      if (rows && rows.length > 1) {
        // Check if an order already exists for this session_id (columns: A=order_id, B=date, C=type_entree, D=session_id)
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row) continue;
          const typeEntree = String(row[2] || "").trim();
          const sessionId = String(row[3] || "").trim();

          if (sessionId === input.session_id && typeEntree === "Commande Site") {
            // Race condition rule: A real order was already placed for this session!
            return { skipped: true };
          }
        }
      }
    } catch (e) {
      console.warn("Could not check session orders:", e);
    }
  }

  const { dateCode, formatted } = getAlgiersTimestamp();
  const order_id = `ABN-${dateCode}-${generateRandomSuffix()}`;

  const rowValues: unknown[] = new Array(34).fill("");
  rowValues[0] = order_id;
  rowValues[1] = formatted;
  rowValues[2] = "Panier Abandonné";
  rowValues[3] = input.session_id;
  rowValues[4] = "En attente"; // statut_confirmation (initial)
  rowValues[5] = ""; // motif_annulation
  rowValues[6] = "Non expédiée"; // statut_livraison (initial)
  rowValues[7] = input.nom_complet || "";
  rowValues[8] = input.telephone_normalise;
  rowValues[9] = input.telephone_secondaire || "";
  rowValues[10] = input.wilaya_code || "";
  rowValues[11] = input.wilaya_nom || "";
  rowValues[12] = input.commune || "";
  rowValues[13] = input.adresse_livraison || "";
  rowValues[14] = input.mode_livraison || "";
  rowValues[15] = "Porte feuille Classe";
  rowValues[16] = input.offre_choisie || "";
  rowValues[17] = input.variante_choisie || "";
  rowValues[18] = input.quantite || 1;
  rowValues[19] = input.prix_offre_dzd || 0;
  rowValues[20] = input.prix_livraison_dzd || 0;
  rowValues[21] = input.total_dzd || 0;
  rowValues[22] = input.utm_source || "";
  rowValues[23] = input.utm_medium || "";
  rowValues[24] = input.utm_campaign || "";
  rowValues[25] = input.utm_content || "";
  rowValues[26] = input.utm_term || "";
  rowValues[27] = input.fbclid || "";
  rowValues[28] = input.device_navigateur || "";
  rowValues[29] = input.ip_client || "";
  rowValues[30] = input.temps_sur_page_sec !== undefined ? input.temps_sur_page_sec : "";
  rowValues[31] = input.dernier_champ_rempli || "";
  rowValues[32] = ""; // flag_doublon
  rowValues[33] = input.notes || "";

  if (sheetId) {
    await appendRow(sheetId, TAB_NAMES.COMMANDES, rowValues);
  }

  return { order_id };
}
