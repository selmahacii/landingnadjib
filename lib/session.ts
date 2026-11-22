import { safeStorage } from "./safeStorage";

export interface AttributionData {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  fbclid?: string;
}

const SESSION_KEY = "cod_session_id";
const ATTR_KEY = "cod_attribution";

export function getOrCreateSessionId(): string {
  const existing = safeStorage.getItem(SESSION_KEY);
  if (existing) {
    return existing;
  }

  let newId: string;
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    newId = crypto.randomUUID();
  } else {
    newId = "sess_" + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
  }

  safeStorage.setItem(SESSION_KEY, newId);
  return newId;
}

export function captureAttribution(): AttributionData {
  const stored = safeStorage.getItem(ATTR_KEY);
  let attribution: AttributionData = {};
  if (stored) {
    try {
      attribution = JSON.parse(stored);
    } catch {
      attribution = {};
    }
  }

  if (typeof window !== "undefined" && window.location && window.location.search) {
    const params = new URLSearchParams(window.location.search);
    const keys: (keyof AttributionData)[] = [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_content",
      "utm_term",
      "fbclid",
    ];

    let updated = false;
    for (const key of keys) {
      const val = params.get(key);
      if (val) {
        attribution[key] = val;
        updated = true;
      }
    }

    if (updated) {
      safeStorage.setItem(ATTR_KEY, JSON.stringify(attribution));
    }
  }

  return attribution;
}
