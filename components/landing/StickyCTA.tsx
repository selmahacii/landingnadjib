"use client";

import React, { useEffect, useState } from "react";

interface StickyCTAProps {
  targetId?: string;
  price?: number;
}

export const StickyCTA: React.FC<StickyCTAProps> = ({
  targetId = "order-form-section",
  price,
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const target = document.getElementById(targetId);
    if (!target) return;
    if (typeof window === "undefined" || !("IntersectionObserver" in window)) return;

    // Use native IntersectionObserver: hide sticky button when form is visible in viewport
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(!entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [targetId]);

  const handleScroll = () => {
    const target = document.getElementById(targetId);
    if (target) {
      target.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div
      id="mobile-sticky-cta"
      className={`fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-neutral-200/80 p-3 shadow-2xl sm:hidden transition-all duration-300 ${
        isVisible
          ? "translate-y-0 opacity-100"
          : "translate-y-full opacity-0 pointer-events-none"
      }`}
    >
      <div className="max-w-md mx-auto flex items-center justify-between gap-3">
        {price !== undefined && price > 0 && (
          <div className="text-right">
            <span className="block text-xs text-neutral-500">المجموع:</span>
            <span className="text-base font-black text-amber-700">{price} دج</span>
          </div>
        )}
        <button
          type="button"
          onClick={handleScroll}
          className="flex-1 bg-gradient-to-r from-amber-600 to-amber-700 active:from-amber-700 active:to-amber-800 text-white font-extrabold py-3 px-4 rounded-xl shadow-md text-sm text-center transition-transform active:scale-95 cursor-pointer"
        >
          اطلب الآن — الدفع عند الاستلام 🛒
        </button>
      </div>
    </div>
  );
};
