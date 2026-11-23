"use client";

import React, { useRef, useEffect } from "react";
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
  const slideRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const isProgrammaticScroll = useRef(false);

  // 1. Backwards compatibility for image-only array (unit tests & fallback)
  if (!variants || variants.length === 0) {
    const safeIndex = images.length > 0 ? Math.min(activeIndex, images.length - 1) : 0;
    const currentImage = images[safeIndex] || "";

    if (layout === "grid") {
      if (images.length === 0) {
        return (
          <div className="w-full aspect-square bg-neutral-100 rounded-2xl overflow-hidden flex flex-col items-center justify-center text-neutral-400 p-6 text-center">
            <svg className="w-16 h-16 mb-2 text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-sm font-medium">Porte feuille Classe</span>
          </div>
        );
      }

      return (
        <div className="grid grid-cols-2 gap-3 w-full">
          {images.map((img, idx) => (
            <div
              key={idx}
              onClick={() => onSelectImage?.(idx)}
              className="relative aspect-square bg-neutral-100 rounded-2xl overflow-hidden cursor-pointer"
            >
              <Image
                src={img}
                alt={`صورة المنتج ${idx + 1}`}
                fill
                sizes="(max-width: 768px) 50vw, 300px"
                priority={idx === 0}
                className="object-contain p-2"
              />
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="w-full flex flex-col gap-3">
        <div className="relative w-full aspect-square bg-[#ebebeb] rounded-none md:rounded-2xl overflow-hidden flex items-center justify-center">
          {currentImage ? (
            <Image
              src={currentImage}
              alt="Porte feuille Classe"
              fill
              sizes="(max-width: 768px) 100vw, 600px"
              priority={safeIndex === 0}
              className="object-contain"
            />
          ) : (
            <span className="text-sm font-medium text-neutral-400">Porte feuille Classe</span>
          )}
        </div>
        {images.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {images.map((img, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onSelectImage?.(idx)}
                className={`relative w-16 h-16 rounded-xl overflow-hidden shrink-0 transition-opacity ${
                  idx === safeIndex ? "opacity-100 ring-2 ring-neutral-900" : "opacity-60 hover:opacity-100"
                }`}
              >
                <Image src={img} alt={`صورة مصغرة ${idx + 1}`} fill sizes="64px" className="object-contain p-1" />
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // 2. Minimalist Full-Width Variant Swipe Slider
  const activeVariantId = selectedVariantId || variants[0]?.variant_id || "";
  const activeIndexComputed = Math.max(
    0,
    variants.findIndex((v) => v.variant_id === activeVariantId)
  );

  // Smooth slide to active variant when selectedVariantId changes
  useEffect(() => {
    if (!activeVariantId) return;
    const targetSlide = slideRefs.current[activeVariantId];
    if (targetSlide && typeof targetSlide.scrollIntoView === "function") {
      isProgrammaticScroll.current = true;
      targetSlide.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
      const timer = setTimeout(() => {
        isProgrammaticScroll.current = false;
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [activeVariantId]);

  const handleSelectVariant = (variantId: string, idx: number) => {
    if (onSelectVariant) {
      onSelectVariant(variantId);
    }
    if (onSelectImage) {
      onSelectImage(idx);
    }
  };

  // Detect swipe end to update active variant
  const handleScroll = () => {
    if (isProgrammaticScroll.current || !swipeContainerRef.current) return;
    const container = swipeContainerRef.current;
    const containerRect = container.getBoundingClientRect();
    const centerPoint = containerRect.left + containerRect.width / 2;

    let closestId = "";
    let minDistance = Infinity;

    variants.forEach((v) => {
      const slide = slideRefs.current[v.variant_id];
      if (slide) {
        const rect = slide.getBoundingClientRect();
        const slideCenter = rect.left + rect.width / 2;
        const dist = Math.abs(centerPoint - slideCenter);
        if (dist < minDistance) {
          minDistance = dist;
          closestId = v.variant_id;
        }
      }
    });

    if (closestId && closestId !== activeVariantId) {
      const idx = variants.findIndex((v) => v.variant_id === closestId);
      handleSelectVariant(closestId, idx);
    }
  };

  const handlePrev = () => {
    const prevIdx = activeIndexComputed > 0 ? activeIndexComputed - 1 : variants.length - 1;
    const prev = variants[prevIdx];
    if (prev) handleSelectVariant(prev.variant_id, prevIdx);
  };

  const handleNext = () => {
    const nextIdx = activeIndexComputed < variants.length - 1 ? activeIndexComputed + 1 : 0;
    const next = variants[nextIdx];
    if (next) handleSelectVariant(next.variant_id, nextIdx);
  };

  return (
    <div className="w-full relative group" dir="rtl">
      {/* Full-Width Swipe Carousel Track with 0 Border on Mobile */}
      <div
        ref={swipeContainerRef}
        onScroll={handleScroll}
        className="w-full flex overflow-x-auto snap-x snap-mandatory scroll-smooth no-scrollbar touch-pan-x rounded-none md:rounded-2xl bg-[#ebebeb] shadow-none"
      >
        {variants.map((v, idx) => {
          const isSelected = v.variant_id === activeVariantId;
          const imageUrl = v.image_url || "/images/wallets/noir.webp";

          return (
            <div
              key={v.variant_id}
              ref={(el) => {
                slideRefs.current[v.variant_id] = el;
              }}
              onClick={() => handleSelectVariant(v.variant_id, idx)}
              className="w-full shrink-0 snap-center aspect-square relative flex items-center justify-center cursor-pointer select-none bg-[#ebebeb]"
            >
              <Image
                src={imageUrl}
                alt={v.nom_variante_ar}
                fill
                sizes="(max-width: 768px) 100vw, 550px"
                priority={idx === 0}
                className="object-contain"
              />
            </div>
          );
        })}
      </div>

      {/* Minimal Discreet Navigation Arrows */}
      {variants.length > 1 && (
        <>
          <button
            type="button"
            onClick={handlePrev}
            aria-label="السابق"
            className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white/80 hover:bg-white text-neutral-800 shadow-sm flex items-center justify-center transition-all opacity-80 hover:opacity-100 active:scale-95"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <button
            type="button"
            onClick={handleNext}
            aria-label="التالي"
            className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white/80 hover:bg-white text-neutral-800 shadow-sm flex items-center justify-center transition-all opacity-80 hover:opacity-100 active:scale-95"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </>
      )}

      {/* Clean Minimalist Pagination Dots */}
      {variants.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 py-3">
          {variants.map((v, idx) => {
            const isSelected = v.variant_id === activeVariantId;
            return (
              <button
                key={v.variant_id}
                type="button"
                onClick={() => handleSelectVariant(v.variant_id, idx)}
                aria-label={`انتقال إلى ${v.nom_variante_ar}`}
                className={`transition-all duration-300 rounded-full ${
                  isSelected
                    ? "w-5 h-1.5 bg-neutral-900"
                    : "w-1.5 h-1.5 bg-neutral-300 hover:bg-neutral-400"
                }`}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};
