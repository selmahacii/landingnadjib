"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function ThankYouContent() {
  const searchParams = useSearchParams();

  const orderId = searchParams.get("order_id") || "ORD-XXXX";
  const nom = searchParams.get("nom") || "";
  const offre = searchParams.get("offre") || "";
  const variante = searchParams.get("variante") || "";
  const quantite = searchParams.get("quantite") || "1";
  const wilaya = searchParams.get("wilaya") || "";
  const commune = searchParams.get("commune") || "";
  const total = searchParams.get("total") || "0";

  return (
    <div className="min-h-screen bg-neutral-50 py-10 px-4">
      <div className="max-w-md mx-auto bg-white rounded-3xl p-6 sm:p-8 border border-neutral-200/80 shadow-xl space-y-6 text-center">
        {/* Success checkmark badge */}
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
          <svg className="w-9 h-9" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        {/* Heading */}
        <div className="space-y-2">
          <h1 className="text-2xl font-black text-neutral-900">
            شكراً لك! تم تسجيل طلبك بنجاح
          </h1>
          <p className="text-sm text-neutral-600 leading-relaxed">
            {nom ? `عزيزي ${nom}، ` : ""}سيتصل بك فريقنا هاتفياً في أقرب وقت لتأكيد تفاصيل الطلب وبدء عملية الشحن.
          </p>
        </div>

        {/* Order ID banner */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
          <span className="text-xs text-neutral-500 block">رقم الطلب الخاص بك:</span>
          <span className="text-base font-extrabold text-amber-800 font-mono" dir="ltr">
            {orderId}
          </span>
        </div>

        {/* Order Summary Details */}
        <div className="bg-neutral-50 rounded-2xl p-4 border border-neutral-200/70 text-right space-y-3 text-sm">
          <h3 className="font-bold text-neutral-900 border-b border-neutral-200/60 pb-2">
            تفاصيل الطلب:
          </h3>

          <div className="flex justify-between items-center text-neutral-700">
            <span>المنتج:</span>
            <span className="font-semibold text-neutral-900">Porte feuille Classe</span>
          </div>

          {offre && (
            <div className="flex justify-between items-center text-neutral-700">
              <span>العرض:</span>
              <span className="font-semibold text-neutral-900">{offre}</span>
            </div>
          )}

          {variante && (
            <div className="flex justify-between items-center text-neutral-700">
              <span>اللون المختار:</span>
              <span className="font-semibold text-neutral-900">{variante}</span>
            </div>
          )}

          <div className="flex justify-between items-center text-neutral-700">
            <span>الكمية:</span>
            <span className="font-semibold text-neutral-900">{quantite}</span>
          </div>

          {(wilaya || commune) && (
            <div className="flex justify-between items-center text-neutral-700">
              <span>مكان التوصيل:</span>
              <span className="font-semibold text-neutral-900">
                {wilaya} {commune ? `- ${commune}` : ""}
              </span>
            </div>
          )}

          <div className="border-t border-neutral-200/60 pt-2 flex justify-between items-center text-base font-black">
            <span className="text-neutral-900">المبلغ الإجمالي عند الاستلام:</span>
            <span className="text-amber-700 text-lg">{total} دج</span>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-amber-50/60 rounded-xl p-3.5 text-xs text-amber-900 space-y-1 text-right">
          <p className="font-bold">⚠️ ملاحظة هامة:</p>
          <p>يرجى إبقاء هاتفك قريباً منك للرد على مكالمة التأكيد الخاصة بموزع التوصيل.</p>
        </div>

        {/* Back to Home Button */}
        <div>
          <Link
            href="/"
            className="inline-block w-full py-3 px-4 bg-neutral-900 hover:bg-neutral-800 text-white font-bold rounded-xl text-sm transition-colors shadow-sm"
          >
            العودة إلى الصفحة الرئيسية
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ThankYouPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600" />
        </div>
      }
    >
      <ThankYouContent />
    </Suspense>
  );
}
