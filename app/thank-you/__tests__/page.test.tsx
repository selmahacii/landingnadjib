import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ThankYouPage from "../page";

vi.mock("next/navigation", () => ({
  useSearchParams: () => ({
    get: (key: string) => {
      const mockParams: Record<string, string> = {
        order_id: "ORD-20261122-9999",
        nom: "حمزة قادري",
        offre: "قطعتين (2)",
        variante: "أسود (Noir)",
        quantite: "2",
        wilaya: "الجزائر",
        commune: "الجزائر الوسطى",
        total: "3900",
      };
      return mockParams[key] || null;
    },
  }),
}));

describe("ThankYouPage", () => {
  it("renders order ID, customer name, offer, variant, location, and total correctly", () => {
    render(<ThankYouPage />);

    expect(screen.getByText("ORD-20261122-9999")).toBeDefined();
    expect(screen.getByText(/حمزة قادري/)).toBeDefined();
    expect(screen.getByText("قطعتين (2)")).toBeDefined();
    expect(screen.getByText("أسود (Noir)")).toBeDefined();
    expect(screen.getByText(/الجزائر - الجزائر الوسطى/)).toBeDefined();
    expect(screen.getByText("3900 دج")).toBeDefined();
  });
});
