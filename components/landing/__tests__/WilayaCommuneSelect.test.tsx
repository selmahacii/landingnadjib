import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { WilayaCommuneSelect } from "../WilayaCommuneSelect";
import type { DeliveryTariff } from "@/lib/sheets/delivery";

describe("WilayaCommuneSelect", () => {
  const mockTariffs: DeliveryTariff[] = [
    { wilaya_code: "16", wilaya_ar: "الجزائر", prix_domicile: 400, prix_stopdesk: 250, actif: true },
    { wilaya_code: "31", wilaya_ar: "وهران", prix_domicile: 600, prix_stopdesk: 350, actif: true },
  ];

  it("selecting a wilaya populates the commune dropdown and resets any previously selected commune to empty", () => {
    const onChange = vi.fn();
    render(<WilayaCommuneSelect tariffs={mockTariffs} onChange={onChange} />);

    const wilayaSelect = screen.getByTestId("wilaya-select") as HTMLSelectElement;
    const communeSelect = screen.getByTestId("commune-select") as HTMLSelectElement;

    // Initially, commune select should be disabled with default placeholder
    expect(communeSelect.disabled).toBe(true);

    // Select Wilaya 16 (الجزائر)
    fireEvent.change(wilayaSelect, { target: { value: "16" } });
    expect(communeSelect.disabled).toBe(false);
    expect(screen.getByText("الجزائر الوسطى")).toBeDefined();

    // Select a commune
    fireEvent.change(communeSelect, { target: { value: "الجزائر الوسطى" } });
    expect(communeSelect.value).toBe("الجزائر الوسطى");

    // Switch to Wilaya 31 (وهران) -> commune must reset to empty!
    fireEvent.change(wilayaSelect, { target: { value: "31" } });
    expect(communeSelect.value).toBe("");
    expect(screen.getByText("السانية")).toBeDefined();
  });

  it("switching mode_livraison between Domicile and Stop Desk updates prix_livraison from matching tariff", () => {
    const onChange = vi.fn();
    render(<WilayaCommuneSelect tariffs={mockTariffs} onChange={onChange} />);

    const wilayaSelect = screen.getByTestId("wilaya-select");
    fireEvent.change(wilayaSelect, { target: { value: "16" } });

    // Default mode is Domicile (400 DA for wilaya 16)
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        wilaya_code: "16",
        mode_livraison: "Domicile",
        prix_livraison: 400,
      })
    );

    // Switch to Stop Desk (250 DA for wilaya 16)
    const stopdeskRadio = screen.getByLabelText(/مكتب|Stop Desk/i);
    fireEvent.click(stopdeskRadio);

    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        wilaya_code: "16",
        mode_livraison: "Stop Desk",
        prix_livraison: 250,
      })
    );
  });
});
