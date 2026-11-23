import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { LandingClient } from "../LandingClient";
import type { Offer } from "@/lib/sheets/offers";
import type { Variant } from "@/lib/sheets/variants";
import type { DeliveryTariff } from "@/lib/sheets/delivery";
import type { SiteSettings } from "@/lib/sheets/settings";

beforeAll(() => {
  class MockIntersectionObserver {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
  }
  window.IntersectionObserver = MockIntersectionObserver as any;
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/lib/meta/pixel", () => ({
  trackPixelEvent: vi.fn(),
}));

describe("LandingClient header settings", () => {
  const mockOffers: Offer[] = [
    {
      offer_id: "pack_1",
      titre_ar: "عرض 1",
      quantite: 1,
      prix_dzd: 2000,
      prix_barre_dzd: 2800,
      badge_ar: "",
      livraison_gratuite: false,
      par_defaut: true,
      ordre: 1,
      actif: true,
    },
  ];

  const mockVariants: Variant[] = [
    {
      variant_id: "var_noir",
      nom_variante_ar: "أسود",
      supplement_prix_dzd: 0,
      image_url: "/img.jpg",
      thumb_url: "/thumb.jpg",
      ordre: 1,
      actif: true,
    },
  ];

  const mockTariffs: DeliveryTariff[] = [
    {
      wilaya_code: "16",
      wilaya_ar: "الجزائر",
      prix_domicile: 400,
      prix_stopdesk: 250,
      actif: true,
    },
  ];

  it("applies siteSettings header_bg_color, header_text_color and header_text_ar to header element", () => {
    const customSettings: SiteSettings = {
      header_bg_color: "#0f172a",
      header_text_color: "#38bdf8",
      header_text_ar: "تخفيضات خاصة اليوم فقط",
    };

    render(
      <LandingClient
        offers={mockOffers}
        variants={mockVariants}
        tariffs={mockTariffs}
        siteSettings={customSettings}
      />
    );

    const header = screen.getByRole("banner");
    expect(header).toBeDefined();
    expect(header.style.backgroundColor).toBe("rgb(15, 23, 42)");
    expect(header.style.color).toBe("rgb(56, 189, 248)");
    expect(header.textContent).toContain("تخفيضات خاصة اليوم فقط");
  });
});
