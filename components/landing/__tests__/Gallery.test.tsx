import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Gallery } from "../Gallery";
import type { Variant } from "@/lib/sheets/variants";

describe("Gallery component (Minimalist)", () => {
  const mockImages = [
    "https://example.com/img1.webp",
    "https://example.com/img2.webp",
    "https://example.com/img3.webp",
    "https://example.com/img4.webp",
  ];

  const mockVariants: Variant[] = [
    {
      variant_id: "var_noir",
      nom_variante_ar: "أسود (Noir)",
      supplement_prix_dzd: 0,
      image_url: "/images/wallets/noir.webp",
      thumb_url: "/images/wallets/noir.webp",
      ordre: 1,
      actif: true,
    },
    {
      variant_id: "var_beige",
      nom_variante_ar: "بيج (Beige)",
      supplement_prix_dzd: 0,
      image_url: "/images/wallets/beige.webp",
      thumb_url: "/images/wallets/beige.webp",
      ordre: 2,
      actif: true,
    },
    {
      variant_id: "var_vert",
      nom_variante_ar: "أخضر (Vert)",
      supplement_prix_dzd: 0,
      image_url: "/images/wallets/vert.webp",
      thumb_url: "/images/wallets/vert.webp",
      ordre: 3,
      actif: true,
    },
  ];

  it("with layout='grid' renders all images in a grid-cols-2 container without separate thumbnail buttons", () => {
    const onSelect = vi.fn();
    const { container } = render(
      <Gallery
        images={mockImages}
        layout="grid"
        activeIndex={1}
        onSelectImage={onSelect}
      />
    );

    const gridContainer = container.querySelector(".grid-cols-2");
    expect(gridContainer).toBeDefined();
    expect(gridContainer).not.toBeNull();

    const renderedImages = gridContainer?.querySelectorAll("img");
    expect(renderedImages?.length).toBe(4);

    const thumbnailScrollbar = container.querySelector(".overflow-x-auto");
    expect(thumbnailScrollbar).toBeNull();
  });

  it("default layout='stack' renders single main image plus thumbnails row", () => {
    const { container } = render(<Gallery images={mockImages} />);

    const thumbnailRow = container.querySelector(".overflow-x-auto");
    expect(thumbnailRow).not.toBeNull();
  });

  it("with variants renders full-width minimal slides and calls onSelectVariant on click", () => {
    const onSelectVariant = vi.fn();
    const { container } = render(
      <Gallery
        variants={mockVariants}
        selectedVariantId="var_beige"
        onSelectVariant={onSelectVariant}
      />
    );

    // Each variant has its own full-width slide (snap-center w-full)
    const slides = container.querySelectorAll(".snap-center");
    expect(slides.length).toBe(3);

    // Minimalist: no cluttered text banners
    expect(screen.queryByText(/اسحب لمشاهدة باقي الألوان/i)).toBeNull();
    expect(screen.queryByText(/1 \/ 5/i)).toBeNull();
    expect(screen.queryByText(/محدد ✓/i)).toBeNull();

    // Clicking a slide triggers onSelectVariant
    const noirSlide = slides[0];
    expect(noirSlide).toBeDefined();
    if (noirSlide) {
      fireEvent.click(noirSlide);
      expect(onSelectVariant).toHaveBeenCalledWith("var_noir");
    }
  });

  it("renders discreet navigation buttons for multi-variant gallery", () => {
    const onSelectVariant = vi.fn();
    render(
      <Gallery
        variants={mockVariants}
        selectedVariantId="var_noir"
        onSelectVariant={onSelectVariant}
      />
    );

    expect(screen.getByLabelText("التالي")).toBeDefined();
    expect(screen.getByLabelText("السابق")).toBeDefined();
  });
});
