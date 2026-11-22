import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { VariantPicker } from "../VariantPicker";
import type { Variant } from "@/lib/sheets/variants";

describe("VariantPicker", () => {
  const mockVariants: Variant[] = [
    {
      variant_id: "var_noir",
      nom_variante_ar: "أسود (Noir)",
      supplement_prix_dzd: 0,
      image_url: "https://blob/noir.webp",
      thumb_url: "https://blob/noir_thumb.webp",
      ordre: 1,
      actif: true,
    },
    {
      variant_id: "var_marron",
      nom_variante_ar: "بني (Marron)",
      supplement_prix_dzd: 0,
      image_url: "https://blob/marron.webp",
      thumb_url: "https://blob/marron_thumb.webp",
      ordre: 2,
      actif: true,
    },
  ];

  it("renders each variant's name and thumbnail", () => {
    const onSelect = vi.fn();
    render(<VariantPicker variants={mockVariants} selected="var_noir" onSelect={onSelect} />);

    expect(screen.getByText("أسود (Noir)")).toBeDefined();
    expect(screen.getByText("بني (Marron)")).toBeDefined();
  });

  it("clicking a variant calls onSelect with variant_id", () => {
    const onSelect = vi.fn();
    render(<VariantPicker variants={mockVariants} selected="var_noir" onSelect={onSelect} />);

    const marron = screen.getByText("بني (Marron)");
    fireEvent.click(marron);

    expect(onSelect).toHaveBeenCalledWith("var_marron");
  });
});
