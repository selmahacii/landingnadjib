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

  it("renders 1 color selector when quantity is 1 and 2 color selectors when quantity is 2", () => {
    const mockVariants: Variant[] = [
      { variant_id: "vert", nom_variante_ar: "أخضر", supplement_prix_dzd: 0, image_url: "", thumb_url: "", ordre: 1, actif: true },
      { variant_id: "noir", nom_variante_ar: "أسود", supplement_prix_dzd: 0, image_url: "", thumb_url: "", ordre: 2, actif: true },
      { variant_id: "beige", nom_variante_ar: "بيج", supplement_prix_dzd: 0, image_url: "", thumb_url: "", ordre: 3, actif: true },
    ];

    const offer1: Offer = { ...mockOffer, quantite: 1 };
    const { rerender } = render(
      <OrderForm
        offer={offer1}
        variants={mockVariants}
        selectedVariantIds={["vert"]}
        onSubmitSuccess={vi.fn()}
      />
    );

    // With quantity 1, exactly 1 "Couleur" header should be rendered
    expect(screen.getByText("Couleur")).toBeDefined();
    expect(screen.queryByText("Couleur 1")).toBeNull();
    expect(screen.queryByText("Couleur 2")).toBeNull();

    // With quantity 2 (offer_2), both "Couleur 1" and "Couleur 2" should be rendered
    const offer2: Offer = { ...mockOffer, offer_id: "offer_2", titre_ar: "عرض قطعتين", quantite: 2, prix_dzd: 3500 };
    rerender(
      <OrderForm
        offer={offer2}
        variants={mockVariants}
        selectedVariantIds={["vert", "noir"]}
        onSubmitSuccess={vi.fn()}
      />
    );

    expect(screen.getByText("Couleur 1")).toBeDefined();
    expect(screen.getByText("Couleur 2")).toBeDefined();
  });

  it("clicking swatches for piece 1 and piece 2 calls onSelectVariantAt with correct indices", () => {
    const mockVariants: Variant[] = [
      { variant_id: "vert", nom_variante_ar: "أخضر", supplement_prix_dzd: 0, image_url: "", thumb_url: "", ordre: 1, actif: true },
      { variant_id: "noir", nom_variante_ar: "أسود", supplement_prix_dzd: 0, image_url: "", thumb_url: "", ordre: 2, actif: true },
    ];

    const onSelectVariantAt = vi.fn();
    const offer2: Offer = { ...mockOffer, quantite: 2, prix_dzd: 3500 };

    render(
      <OrderForm
        offer={offer2}
        variants={mockVariants}
        selectedVariantIds={["vert", "noir"]}
        onSelectVariantAt={onSelectVariantAt}
        onSubmitSuccess={vi.fn()}
      />
    );

    // Swatches are rendered for both item 1 and item 2
    const greenButtons = screen.getAllByRole("button", { name: /choisir couleur green/i });
    expect(greenButtons).toHaveLength(2); // One in row 1, one in row 2

    // Click green in row 2
    fireEvent.click(greenButtons[1]);
    expect(onSelectVariantAt).toHaveBeenCalledWith(1, "vert");

    const blackButtons = screen.getAllByRole("button", { name: /choisir couleur black/i });
    // Click black in row 1
    fireEvent.click(blackButtons[0]);
    expect(onSelectVariantAt).toHaveBeenCalledWith(0, "noir");
  });

  it("summary box displays formatted prices with DA and updates when wilaya is selected", () => {
    const mockTariffs = [
      { wilaya_code: "16", wilaya_ar: "الجزائر", prix_domicile: 400, prix_stopdesk: 250, actif: true },
    ];

    render(
      <OrderForm
        offer={{ ...mockOffer, prix_dzd: 2000 }}
        tariffs={mockTariffs}
        onSubmitSuccess={vi.fn()}
      />
    );

    // Initial state: Sous-total is 2,000.00 DA, Livraison is "--", Total is "--"
    expect(screen.getByText("2,000.00 DA")).toBeDefined();
    const dashes = screen.getAllByText("--");
    expect(dashes.length).toBeGreaterThanOrEqual(2);

    // Select Wilaya 16
    const wilayaSelect = screen.getByTestId("wilaya-select");
    fireEvent.change(wilayaSelect, { target: { value: "16" } });

    // After selection: Livraison is 400.00 DA, Total is 2,400.00 DA
    expect(screen.getByText("400.00 DA")).toBeDefined();
    expect(screen.getByText("2,400.00 DA")).toBeDefined();
  });
});
