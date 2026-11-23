"use client";

import React, { useRef, useEffect, useState } from "react";
import Image from "next/image";
import type { Variant } from "@/lib/sheets/variants";

export interface GalleryProps {
  images?: string[];
  variants?: Variant[];
  selectedVariantId?: string;
  onSelectVariant?: (variantId: string) => void;
  activeIndex?: number;
  onSelectImage?: (index: number) => void;
  layout?: "grid" | "stack";
}

const colorSwatchMap: Record<string, string> = {
  var_noir: "#18181b",
  var_beige: "#d4b996",
  var_vert: "#2d4a3e",
  var_marron: "#5c3317",
  var_rouge: "#881337",
};

export const Gallery: React.FC<GalleryProps> = ({
  images = [],
  variants,
  selectedVariantId,
  onSelectVariant,
  activeIndex = 0,
  onSelectImage,
  layout = "stack",
}) => {
  const swipeContainerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // 1. Backwards compatibility: If legacy pure image array is passed without variants
  if (!variants || variants.length === 0) {
    const safeIndex = images.length > 0 ? Math.min(activeIndex, images.length - 1) : 0;
    const currentImage = images[safeIndex] || "";

    if (layout === "grid") {
      if (images.length === 0) {
        return (
          <div className="w-full aspect-square bg-neutral-100 rounded-2xl overflow-hidden border border-neutral-200/80 shadow-sm flex flex-col items-center justify-center text-neutral-400 p-6 text-center">
            <svg className="w-16 h-16 mb-2 text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-sm font-medium">صورة المنتج "Porte feuille Classe"</span>
          </div>
        );
      }

      return (
        <div className="grid grid-cols-2 gap-3 w-full">
          {images.map((img, idx) => {
            const isSelected = idx === safeIndex;
            return (
              <div
                key={idx}
                onClick={() => onSelectImage?.(idx)}
                className={`relative aspect-square bg-neutral-100 rounded-2xl overflow-hidden border border-neutral-200/80 shadow-sm cursor-pointer transition-all ${
                  isSelected ? "ring-2 ring-amber-600 border-amber-600 shadow-md" : "hover:border-neutral-300"
                }`}
              >
                <Image
                  src={img}
                  alt={`صورة المنتج ${idx + 1}`}
                  fill
                  sizes="(max-width: 768px) 50vw, 300px"
                  priority={idx === 0}
                  className="object-cover"
                />
              </div>
            );
          })}
        </div>
      );
    }

    // Default legacy stack mode
    return (
      <div className="w-full flex flex-col gap-3">
        <div className="relative w-full aspect-square bg-neutral-100 rounded-2xl overflow-hidden border border-neutral-200/80 shadow-sm flex items-center justify-center">
          {currentImage ? (
            <Image
              src={currentImage}
              alt="Porte feuille Classe"
              fill
              sizes="(max-width: 768px) 100vw, 600px"
              priority={safeIndex === 0}
              className="object-cover"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-neutral-400 p-6 text-center">
              <svg className="w-16 h-16 mb-2 text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-sm font-medium">صورة المنتج "Porte feuille Classe"</span>
            </div>
          )}
        </div>

        {images.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {images.map((img, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onSelectImage?.(idx)}
                className={`relative w-16 h-16 rounded-xl overflow-hidden border-2 shrink-0 transition-all ${
                  idx === safeIndex
                    ? "border-amber-600 ring-2 ring-amber-600/30 shadow-sm"
                    : "border-neutral-200 opacity-70 hover:opacity-100"
                }`}
              >
                <Image src={img} alt={`صورة مصغرة ${idx + 1}`} fill sizes="64px" className="object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // 2. Modern Variant-Driven Independent Cards & Swipe Mode
  const activeVariantId = selectedVariantId || variants[0]?.variant_id || "";
  const activeIndexComputed = Math.max(
    0,
    variants.findIndex((v) => v.variant_id === activeVariantId)
  );

  // Automatically scroll swipe container when active variant changes
  useEffect(() => {
    if (!activeVariantId) return;
    const targetEl = cardRefs.current[activeVariantId];
    if (targetEl && typeof targetEl.scrollIntoView === "function") {
      targetEl.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [activeVariantId]);

  const handleSelectVariantCard = (variantId: string, idx: number) => {
    if (onSelectVariant) {
      onSelectVariant(variantId);
    }
    if (onSelectImage) {
      onSelectImage(idx);
    }
  };

  const handlePrevSlide = () => {
    const prevIdx = activeIndexComputed > 0 ? activeIndexComputed - 1 : variants.length - 1;
    const prevVariant = variants[prevIdx];
    if (prevVariant) {
      handleSelectVariantCard(prevVariant.variant_id, prevIdx);
    }
  };

  const handleNextSlide = () => {
    const nextIdx = activeIndexComputed < variants.length - 1 ? activeIndexComputed + 1 : 0;
    const nextVariant = variants[nextIdx];
    if (nextVariant) {
      handleSelectVariantCard(nextVariant.variant_id, nextIdx);
    }
  };

  return (
    <div className="w-full space-y-3" dir="rtl">
      {/* Visual Swipe Helper Banner (Mobile/Tablet) */}
      <div className="flex items-center justify-between text-xs text-neutral-500 px-1 md:hidden">
        <span className="flex items-center gap-1 font-medium text-neutral-600">
          <span>👈 اسحب لمشاهدة باقي الألوان 👉</span>
        </span>
        <span className="font-mono font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
          {activeIndexComputed + 1} / {variants.length}
        </span>
      </div>

      {/* SWIPE CONTAINER (Mobile Carousel) */}
      <div className="relative md:hidden">
        {/* Navigation Arrow Previous (Left in RTL is visually Right) */}
        <button
          type="button"
          onClick={handlePrevSlide}
          aria-label="اللون السابق"
          className="absolute -right-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white/90 hover:bg-white text-neutral-800 shadow-md border border-neutral-200 flex items-center justify-center transition active:scale-95"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Navigation Arrow Next (Right in RTL is visually Left) */}
        <button
          type="button"
          onClick={handleNextSlide}
          aria-label="اللون التالي"
          className="absolute -left-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white/90 hover:bg-white text-neutral-800 shadow-md border border-neutral-200 flex items-center justify-center transition active:scale-95"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Horizontal Swipe Track */}
        <div
          ref={swipeContainerRef}
          className="flex gap-3 overflow-x-auto snap-x snap-mandatory scroll-smooth no-scrollbar py-2 px-1 touch-pan-x"
        >
          {variants.map((v, idx) => {
            const isSelected = v.variant_id === activeVariantId;
            const swatchColor = colorSwatchMap[v.variant_id] || "#737373";
            const imageUrl = v.image_url || "/images/wallets/noir.webp";

            return (
              <div
                key={v.variant_id}
                ref={(el) => {
                  cardRefs.current[v.variant_id] = el;
                }}
                onClick={() => handleSelectVariantCard(v.variant_id, idx)}
                className={`relative w-[82vw] max-w-[320px] aspect-square shrink-0 snap-center rounded-2xl overflow-hidden bg-neutral-100 border-2 cursor-pointer transition-all duration-300 flex items-center justify-center ${
                  isSelected
                    ? "border-amber-600 ring-4 ring-amber-500/20 shadow-lg scale-[1.01]"
                    : "border-neutral-200/90 hover:border-neutral-300 opacity-95"
                }`}
              >
                <Image
                  src={imageUrl}
                  alt={v.nom_variante_ar}
                  fill
                  sizes="320px"
                  priority={idx === 0}
                  className="object-contain p-4 hover:scale-105 transition-transform duration-300"
                />

                {/* Color Name Badge */}
                <div className="absolute bottom-3 right-3 left-3 flex items-center justify-between pointer-events-none">
                  <span
                    className={`text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm transition-colors ${
                      isSelected
                        ? "bg-amber-600 text-white"
                        : "bg-white/95 text-neutral-800 backdrop-blur-sm"
                    }`}
                  >
                    <span
                      className="w-3 h-3 rounded-full border border-black/20 shrink-0"
                      style={{ backgroundColor: swatchColor }}
                    />
                    <span>{v.nom_variante_ar}</span>
                  </span>
                  {isSelected && (
                    <span className="text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-0.5 rounded-full shadow-sm">
                      محدد ✓
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Swipe Pagination Dots */}
        <div className="flex items-center justify-center gap-2 mt-3">
          {variants.map((v, idx) => {
            const isSelected = v.variant_id === activeVariantId;
            const swatchColor = colorSwatchMap[v.variant_id] || "#737373";
            return (
              <button
                key={v.variant_id}
                type="button"
                onClick={() => handleSelectVariantCard(v.variant_id, idx)}
                aria-label={v.nom_variante_ar}
                className={`transition-all duration-300 rounded-full flex items-center justify-center ${
                  isSelected
                    ? "w-8 h-3 bg-amber-600 shadow-sm"
                    : "w-3 h-3 bg-neutral-300 hover:bg-neutral-400"
                }`}
              >
                {isSelected && (
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-white inline-block"
                    style={{ backgroundColor: swatchColor === "#18181b" ? "#ffffff" : swatchColor }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* DESKTOP 2-COLUMN GRID (Matching Reference Screenshot) */}
      <div className="hidden md:grid md:grid-cols-2 gap-3.5 w-full">
        {variants.map((v, idx) => {
          const isSelected = v.variant_id === activeVariantId;
          const swatchColor = colorSwatchMap[v.variant_id] || "#737373";
          const imageUrl = v.image_url || "/images/wallets/noir.webp";

          return (
            <div
              key={v.variant_id}
              ref={(el) => {
                if (!cardRefs.current[v.variant_id]) {
                  cardRefs.current[v.variant_id] = el;
                }
              }}
              onClick={() => handleSelectVariantCard(v.variant_id, idx)}
              className={`relative aspect-square bg-neutral-100 rounded-2xl overflow-hidden border-2 cursor-pointer transition-all duration-300 flex items-center justify-center group ${
                isSelected
                  ? "border-amber-600 ring-4 ring-amber-500/25 shadow-lg scale-[1.01]"
                  : "border-neutral-200/90 hover:border-amber-300 hover:shadow-sm"
              }`}
            >
              <Image
                src={imageUrl}
                alt={v.nom_variante_ar}
                fill
                sizes="(max-width: 1024px) 50vw, 300px"
                priority={idx === 0}
                className="object-contain p-4 group-hover:scale-105 transition-transform duration-300"
              />

              {/* Color Name Badge Overlay */}
              <div className="absolute bottom-2.5 right-2.5 left-2.5 flex items-center justify-between pointer-events-none">
                <span
                  className={`text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-sm transition-colors ${
                    isSelected
                      ? "bg-amber-600 text-white"
                      : "bg-white/95 text-neutral-800 backdrop-blur-sm group-hover:bg-amber-50"
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full border border-black/20 shrink-0"
                    style={{ backgroundColor: swatchColor }}
                  />
                  <span>{v.nom_variante_ar}</span>
                </span>
                {isSelected && (
                  <span className="text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full shadow-sm">
                    محدد ✓
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
