import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { OfferPicker } from "../OfferPicker";
import type { Offer } from "@/lib/sheets/offers";

describe("OfferPicker", () => {
  const mockOffers: Offer[] = [
    {
      offer_id: "pack_1",
      titre_ar: "قطعة واحدة (1)",
      quantite: 1,
      prix_dzd: 2000,
      prix_barre_dzd: 2800,
      badge_ar: "",
      livraison_gratuite: false,
      par_defaut: false,
      ordre: 1,
      actif: true,
    },
    {
      offer_id: "pack_2",
      titre_ar: "قطعتين (2)",
      quantite: 2,
      prix_dzd: 3500,
      prix_barre_dzd: 4500,
      badge_ar: "الأكثر طلباً - توفير 500 دج",
      livraison_gratuite: false,
      par_defaut: true,
      ordre: 2,
      actif: true,
    },
  ];

  it("renders each offer's title, price, crossed price, and badge", () => {
    const onSelect = vi.fn();
    render(<OfferPicker offers={mockOffers} selected="pack_2" onSelect={onSelect} />);

    expect(screen.getByText("قطعة واحدة (1)")).toBeDefined();
    expect(screen.getByText("قطعتين (2)")).toBeDefined();
    expect(screen.getByText(/2000/)).toBeDefined();
    expect(screen.getByText(/3500/)).toBeDefined();
    expect(screen.getByText("الأكثر طلباً - توفير 500 دج")).toBeDefined();
  });

  it("calls onSelect with offer_id when clicked", () => {
    const onSelect = vi.fn();
    render(<OfferPicker offers={mockOffers} selected="pack_2" onSelect={onSelect} />);

    const offer1 = screen.getByText("قطعة واحدة (1)");
    fireEvent.click(offer1);

    expect(onSelect).toHaveBeenCalledWith("pack_1");
  });
});
