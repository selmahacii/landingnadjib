import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { OrderForm } from "../OrderForm";
import type { Offer } from "@/lib/sheets/offers";
import type { Variant } from "@/lib/sheets/variants";

describe("OrderForm", () => {
  const mockOffer: Offer = {
    offer_id: "pack_1",
    titre_ar: "قطعة واحدة (1)",
    quantite: 1,
    prix_dzd: 2000,
    prix_barre_dzd: 2800,
    badge_ar: "",
    livraison_gratuite: false,
    par_defaut: true,
    ordre: 1,
    actif: true,
  };

  const mockVariant: Variant = {
    variant_id: "var_noir",
    nom_variante_ar: "أسود (Noir)",
    supplement_prix_dzd: 0,
    image_url: "",
    thumb_url: "",
    ordre: 1,
    actif: true,
  };

  const mockDelivery = {
    wilaya_code: "16",
    wilaya_nom: "الجزائر",
    commune: "الجزائر الوسطى",
    mode_livraison: "Domicile" as const,
    prix_livraison: 400,
  };

  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ order_id: "ORD-20261122-TEST" }),
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.clearAllMocks();
  });

  it("submitting with an invalid phone shows an Arabic inline error and does not call fetch", async () => {
    render(
      <OrderForm
        offer={mockOffer}
        variant={mockVariant}
        delivery={mockDelivery}
        onSubmitSuccess={vi.fn()}
      />
    );

    // Fill valid name but invalid phone
    const nameInput = screen.getByTestId("name-input");
    const phoneInput = screen.getByTestId("phone-input");
    const submitBtn = screen.getByTestId("submit-btn");

    fireEvent.change(nameInput, { target: { value: "يوسف بن علي" } });
    fireEvent.change(phoneInput, { target: { value: "12345" } });
    fireEvent.click(submitBtn);

    expect(await screen.findByText(/يرجى إدخال رقم هاتف صحيح/i)).toBeDefined();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("submitting twice quickly results in exactly one fetch call (anti double-click)", async () => {
    let resolvePromise: (value: any) => void;
    global.fetch = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePromise = resolve;
        })
    );

    render(
      <OrderForm
        offer={mockOffer}
        variant={mockVariant}
        delivery={mockDelivery}
        onSubmitSuccess={vi.fn()}
      />
    );

    fireEvent.change(screen.getByTestId("name-input"), { target: { value: "يوسف" } });
    fireEvent.change(screen.getByTestId("phone-input"), { target: { value: "0551234567" } });

    const submitBtn = screen.getByTestId("submit-btn") as HTMLButtonElement;

    // First click
    fireEvent.click(submitBtn);
    expect(global.fetch).toHaveBeenCalledTimes(1);

    // Second immediate click while pending
    fireEvent.click(submitBtn);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(submitBtn.disabled).toBe(true);

    // Resolve
    resolvePromise!({
      ok: true,
      json: async () => ({ order_id: "ORD-123" }),
    });
  });

  it("a honeypot field filled in causes the submit handler to no-op", async () => {
    render(
      <OrderForm
        offer={mockOffer}
        variant={mockVariant}
        delivery={mockDelivery}
        onSubmitSuccess={vi.fn()}
      />
    );

    fireEvent.change(screen.getByTestId("name-input"), { target: { value: "Bot" } });
    fireEvent.change(screen.getByTestId("phone-input"), { target: { value: "0551234567" } });

    // Fill honeypot field
    const honeypot = screen.getByTestId("hp-field");
    fireEvent.change(honeypot, { target: { value: "I am a bot" } });

    const submitBtn = screen.getByTestId("submit-btn");
    fireEvent.click(submitBtn);

    expect(global.fetch).not.toHaveBeenCalled();
  });
});
