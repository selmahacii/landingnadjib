import { describe, it, expect } from "vitest";
import { calculateTotal } from "../pricing";
import type { Offer } from "@/lib/sheets/offers";

describe("calculateTotal", () => {
  const normalOffer: Offer = {
    offer_id: "pack_1",
    titre_ar: "قطعة واحدة",
    quantite: 1,
    prix_dzd: 2000,
    prix_barre_dzd: 2800,
    badge_ar: "",
    livraison_gratuite: false,
    par_defaut: true,
    ordre: 1,
    actif: true,
  };

  const freeShippingOffer: Offer = {
    ...normalOffer,
    offer_id: "pack_free",
    prix_dzd: 3500,
    livraison_gratuite: true,
  };

  it("adds deliveryPrice to offer price when livraison_gratuite is false", () => {
    const total = calculateTotal({ offer: normalOffer, deliveryPrice: 400 });
    expect(total).toBe(2400);
  });

  it("ignores deliveryPrice and returns only offer price when livraison_gratuite is true", () => {
    const total = calculateTotal({ offer: freeShippingOffer, deliveryPrice: 500 });
    expect(total).toBe(3500);
  });

  it("handles 0 delivery price properly", () => {
    const total = calculateTotal({ offer: normalOffer, deliveryPrice: 0 });
    expect(total).toBe(2000);
  });
});
