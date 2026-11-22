import { describe, it, expect } from "vitest";
import { normalizePhone } from "../phone";

describe("normalizePhone (Algerian phone validation & normalization)", () => {
  it("keeps valid standard 10-digit number as-is", () => {
    expect(normalizePhone("0551234567")).toBe("0551234567");
    expect(normalizePhone("0661234567")).toBe("0661234567");
    expect(normalizePhone("0771234567")).toBe("0771234567");
  });

  it("normalizes international +213 prefix", () => {
    expect(normalizePhone("+213551234567")).toBe("0551234567");
    expect(normalizePhone("+213661234567")).toBe("0661234567");
    expect(normalizePhone("+213771234567")).toBe("0771234567");
  });

  it("normalizes international 00213 prefix", () => {
    expect(normalizePhone("00213551234567")).toBe("0551234567");
  });

  it("converts Eastern Arabic digits (٠-٩) to Latin digits", () => {
    expect(normalizePhone("٠٥٥١٢٣٤٥٦٧")).toBe("0551234567");
    expect(normalizePhone("+٢١٣٥٥١٢٣٤٥٦٧")).toBe("0551234567");
  });

  it("strips spaces, dashes, parentheses and dots", () => {
    expect(normalizePhone("0551 23 45 67")).toBe("0551234567");
    expect(normalizePhone("0551-23-45-67")).toBe("0551234567");
    expect(normalizePhone("(0551) 23.45.67")).toBe("0551234567");
  });

  it("returns null for invalid numbers or invalid prefixes", () => {
    expect(normalizePhone("12345")).toBeNull();
    expect(normalizePhone("")).toBeNull();
    expect(normalizePhone("021123456")).toBeNull(); // Fixe/landline not COD mobile
    expect(normalizePhone("0451234567")).toBeNull(); // Invalid prefix 04
    expect(normalizePhone("05512345678")).toBeNull(); // Too long (11 digits)
    expect(normalizePhone("abcdefghij")).toBeNull();
  });
});
