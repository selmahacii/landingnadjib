import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Gallery } from "../Gallery";

describe("Gallery component", () => {
  const mockImages = [
    "https://example.com/img1.webp",
    "https://example.com/img2.webp",
    "https://example.com/img3.webp",
    "https://example.com/img4.webp",
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

    // No separate horizontal thumbnails scrollbar row
    const thumbnailScrollbar = container.querySelector(".overflow-x-auto");
    expect(thumbnailScrollbar).toBeNull();
  });

  it("default layout='stack' renders single main image plus thumbnails row", () => {
    const { container } = render(<Gallery images={mockImages} />);

    // In stack mode, separate thumbnails row exists
    const thumbnailRow = container.querySelector(".overflow-x-auto");
    expect(thumbnailRow).not.toBeNull();
  });
});
