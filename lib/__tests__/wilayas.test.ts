import { describe, it, expect } from "vitest";
import wilayas from "../../data/wilayas.json";

describe("wilayas.json dataset", () => {
  it("contains exactly 58 wilayas", () => {
    expect(wilayas).toHaveLength(58);
  });

  it("has valid 01-58 codes and non-empty communes", () => {
    wilayas.forEach((w, index) => {
      const expectedCode = String(index + 1).padStart(2, "0");
      expect(w.code).toBe(expectedCode);
      expect(w.name_ar).toBeTruthy();
      expect(Array.isArray(w.communes)).toBe(true);
      expect(w.communes.length).toBeGreaterThan(0);
    });
  });
});
