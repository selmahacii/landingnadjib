import { getSheetsClient } from "./client";

export const TAB_NAMES = {
  COMMANDES: "Commandes_et_Abandons",
  TARIFS: "Tarifs_Livraison",
  OFFRES: "Offres_Packs",
  VARIANTES: "Variantes_Produit",
  DASHBOARD: "Dashboard_KPI",
  PARAMETRES: "Parametres_Site",
} as const;

export const COMMANDES_COLUMNS = [
  "order_id",
  "date_creation",
  "type_entree",
  "session_id",
  "statut_confirmation",
  "motif_annulation",
  "statut_livraison",
  "nom_complet",
  "telephone_normalise",
  "telephone_secondaire",
  "wilaya_code",
  "wilaya_nom",
  "commune",
  "adresse_livraison",
  "mode_livraison",
  "produit",
  "offre_choisie",
  "variante_choisie",
  "quantite",
  "prix_offre_dzd",
  "prix_livraison_dzd",
  "total_dzd",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "fbclid",
  "device_navigateur",
  "ip_client",
  "temps_sur_page_sec",
  "dernier_champ_rempli",
  "flag_doublon",
  "notes",
] as const;

export const TARIFS_COLUMNS = [
  "wilaya_code",
  "wilaya_ar",
  "prix_domicile",
  "prix_stopdesk",
  "actif",
] as const;

export const OFFRES_COLUMNS = [
  "offer_id",
  "titre_ar",
  "quantite",
  "prix_dzd",
  "prix_barre_dzd",
  "badge_ar",
  "livraison_gratuite",
  "par_defaut",
  "ordre",
  "actif",
] as const;

export const VARIANTES_COLUMNS = [
  "variant_id",
  "nom_variante_ar",
  "supplement_prix_dzd",
  "image_url",
  "thumb_url",
  "ordre",
  "actif",
] as const;

export const DASHBOARD_KPI_ROWS = [
  ["لوحة مؤشرات الأداء الرئيسية (Dashboard KPI) — Porte feuille Classe", "", ""],
  ["", "", ""],
  ["المؤشر", "القيمة المحسوبة", "ملاحظات وتفاصيل"],
  ["إجمالي الطلبات (Commandes)", '=COUNTIF(Commandes_et_Abandons!C:C, "Commande Site")', "عدد الطلبات المقدمة عبر الموقع"],
  ["الطلبات المؤكدة (Confirmées)", '=COUNTIFS(Commandes_et_Abandons!C:C, "Commande Site", Commandes_et_Abandons!E:E, "Confirmée")', "الطلبات المقبولة من فريق التأكيد"],
  ["نسبة التأكيد (Taux de Confirmation)", '=IF(B4>0, B5/B4, 0)', "نسبة الطلبات المؤكدة من الإجمالي"],
  ["الطلبات المسلمة (Livrées)", '=COUNTIF(Commandes_et_Abandons!G:G, "Livrée")', "الطلبات التي تم تسليمها بنجاح للزبون"],
  ["نسبة التسليم (Taux de Livraison)", '=IF(B5>0, B7/B5, 0)', "نسبة التسليم من الطلبات المؤكدة"],
  ["الطلبات الملغاة (Annulées)", '=COUNTIF(Commandes_et_Abandons!E:E, "Annulée*")', "طلبات ملغاة من الزبون أو مكررة"],
  ["السلات المتروكة (Paniers Abandonnés)", '=COUNTIF(Commandes_et_Abandons!C:C, "Panier Abandonné")', "زبائن أدخلوا أرقامهم دون إتمام الطلب"],
  ["إجمالي المبيعات المؤكدة (دج)", '=SUMIFS(Commandes_et_Abandons!AF:AF, Commandes_et_Abandons!C:C, "Commande Site", Commandes_et_Abandons!E:E, "Confirmée")', "مجموع مبالغ الطلبات المؤكدة"],
  ["متوسط قيمة الطلب المؤكد (AOV دج)", '=IF(B5>0, B11/B5, 0)', "متوسط قيمة السلة للطلب المؤكد"],
];

export const STATUT_CONFIRMATION_VALUES = [
  "En attente",
  "Confirmée",
  "Injoignable 1",
  "Injoignable 2",
  "Injoignable 3",
  "Rappeler plus tard",
  "Annulée - Client",
  "Annulée - Doublon",
  "Faux numéro",
  "Test",
] as const;

export const STATUT_LIVRAISON_VALUES = [
  "Non expédiée",
  "En préparation",
  "Expédiée",
  "Livrée",
  "Retournée",
] as const;

export async function ensureSheetsInitialized(sheetId: string): Promise<void> {
  const client = await getSheetsClient();

  const metadata = await client.spreadsheets.get({
    spreadsheetId: sheetId,
  });

  const existingSheets = metadata.data.sheets || [];
  const existingSheetMap = new Map<string, number>();
  existingSheets.forEach((s) => {
    if (s.properties?.title && s.properties.sheetId != null) {
      existingSheetMap.set(s.properties.title, s.properties.sheetId);
    }
  });

  const requiredTabs = [
    { title: TAB_NAMES.COMMANDES, headers: COMMANDES_COLUMNS },
    { title: TAB_NAMES.TARIFS, headers: TARIFS_COLUMNS },
    { title: TAB_NAMES.OFFRES, headers: OFFRES_COLUMNS },
    { title: TAB_NAMES.VARIANTES, headers: VARIANTES_COLUMNS },
    { title: TAB_NAMES.DASHBOARD, headers: ["المؤشر", "القيمة المحسوبة", "ملاحظات وتفاصيل"] },
  ];

  // 1. Add any missing sheets
  const addSheetRequests: any[] = [];
  for (const tab of requiredTabs) {
    if (!existingSheetMap.has(tab.title)) {
      addSheetRequests.push({
        addSheet: {
          properties: {
            title: tab.title,
          },
        },
      });
    }
  }

  if (addSheetRequests.length > 0) {
    const res = await client.spreadsheets.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: {
        requests: addSheetRequests,
      },
    });

    res?.data?.replies?.forEach((reply: any) => {
      if (reply.addSheet?.properties?.title && reply.addSheet.properties.sheetId != null) {
        existingSheetMap.set(reply.addSheet.properties.title, reply.addSheet.properties.sheetId);
      }
    });
  }

  // 2. Set headers if empty
  for (const tab of requiredTabs) {
    const headerCheck = await client.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${tab.title}!A1:Z1`,
    });

    if (!headerCheck.data.values || headerCheck.data.values.length === 0) {
      const valuesToInsert =
        tab.title === TAB_NAMES.DASHBOARD
          ? DASHBOARD_KPI_ROWS
          : [tab.headers as unknown as unknown[]];

      await client.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: `${tab.title}!A1`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: valuesToInsert,
        },
      });
    }
  }

  // 3. Setup data validations and conditional formatting on Commandes_et_Abandons if newly initialized
  const commandesSheetId = existingSheetMap.get(TAB_NAMES.COMMANDES);
  if (commandesSheetId !== undefined && addSheetRequests.some((r) => r.addSheet?.properties?.title === TAB_NAMES.COMMANDES)) {
    // Column E (index 4) = statut_confirmation
    // Column G (index 6) = statut_livraison
    const formattingRequests = [
      {
        setDataValidation: {
          range: {
            sheetId: commandesSheetId,
            startRowIndex: 1,
            startColumnIndex: 4,
            endColumnIndex: 5,
          },
          rule: {
            condition: {
              type: "ONE_OF_LIST",
              values: STATUT_CONFIRMATION_VALUES.map((val) => ({ userEnteredValue: val })),
            },
            showCustomUi: true,
            strict: true,
          },
        },
      },
      {
        setDataValidation: {
          range: {
            sheetId: commandesSheetId,
            startRowIndex: 1,
            startColumnIndex: 6,
            endColumnIndex: 7,
          },
          rule: {
            condition: {
              type: "ONE_OF_LIST",
              values: STATUT_LIVRAISON_VALUES.map((val) => ({ userEnteredValue: val })),
            },
            showCustomUi: true,
            strict: true,
          },
        },
      },
    ];

    await client.spreadsheets.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: {
        requests: formattingRequests,
      },
    });
  }
}
