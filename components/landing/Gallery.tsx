import React from "react";
import Image from "next/image";

interface GalleryProps {
  images: string[];
  activeIndex?: number;
  onSelectImage?: (index: number) => void;
}

export const Gallery: React.FC<GalleryProps> = ({
  images,
  activeIndex = 0,
  onSelectImage,
}) => {
  const safeIndex = images.length > 0 ? Math.min(activeIndex, images.length - 1) : 0;
  const currentImage = images[safeIndex] || "";

  return (
    <div className="w-full flex flex-col gap-3">
      {/* Main Image Display */}
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
            <svg
              className="w-16 h-16 mb-2 text-neutral-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span className="text-sm font-medium">صورة المنتج "Porte feuille Classe"</span>
          </div>
        )}
      </div>

      {/* Thumbnails row if multiple images */}
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
              <Image
                src={img}
                alt={`صورة مصغرة ${idx + 1}`}
                fill
                sizes="64px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
