import { describe, it, expect, beforeEach } from "vitest";
import { getOrCreateSessionId, captureAttribution } from "../session";
import { safeStorage } from "../safeStorage";

describe("session & attribution", () => {
  beforeEach(() => {
    safeStorage.removeItem("cod_session_id");
    safeStorage.removeItem("cod_attribution");
  });

  it("getOrCreateSessionId generates a non-empty string and persists it", () => {
    const id1 = getOrCreateSessionId();
    expect(id1).toBeTruthy();
    expect(typeof id1).toBe("string");

    const id2 = getOrCreateSessionId();
    expect(id2).toBe(id1);
  });

  it("captureAttribution parses params from location.search and persists them", () => {
    delete (window as any).location;
    window.location = {
      search: "?fbclid=abc123xyz&utm_source=fb&utm_medium=cpc&utm_campaign=winter_sale&utm_content=v1&utm_term=wallet",
    } as any;

    const attr1 = captureAttribution();
    expect(attr1).toEqual({
      fbclid: "abc123xyz",
      utm_source: "fb",
      utm_medium: "cpc",
      utm_campaign: "winter_sale",
      utm_content: "v1",
      utm_term: "wallet",
    });

    // Simulate navigation/empty search
    window.location = { search: "" } as any;
    const attr2 = captureAttribution();
    expect(attr2).toEqual(attr1);
  });
});
