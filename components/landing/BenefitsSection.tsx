import React from "react";

export const BenefitsSection: React.FC = () => {
  const benefits = [
    {
      title: "توصيل سريع لـ 58 ولاية",
      description: "طلبك يصلك إلى باب دارك أو أقرب مكتب في أقصر وقت ممكن وبمتابعة مستمرة.",
      icon: (
        <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
    },
    {
      title: "الدفع عند الاستلام (COD)",
      description: "لا تدفع شيئاً مسبقاً! عاين طلبك وافحصه بكل راحة قبل دفع ثمنه لعون التوصيل.",
      icon: (
        <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
    },
    {
      title: "جودة ممتازة ولمسة فاخرة",
      description: "محفظة Porte feuille Classe مصنوعة بعناية فائقة لتضمن المتانة والأناقة اليومية.",
      icon: (
        <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ),
    },
    {
      title: "خدمة زبائن ومتابعة مستمرة",
      description: "فريقنا متواجد ومستعد لمساعدتك والإجابة على أي تساؤل حتى استلام طلبك برضا تام.",
      icon: (
        <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
  ];

  const features = [
    "تصميم عصري ونحيف يناسب الجيب بدون انتفاخ",
    "سعة تخزين ذكية تتسع للبطاقات البنكية، بطاقة الهوية ورخص السياقة",
    "مساحة مخصصة ومريحة للأوراق النقدية بكل أمان",
    "خياطة متقنة ومواد مختارة تقاوم التلف والتمزق",
  ];

  return (
    <section className="my-8 space-y-6">
      {/* Product highlights */}
      <div className="bg-white rounded-2xl p-6 border border-neutral-200/80 shadow-sm space-y-4">
        <h3 className="text-lg font-extrabold text-neutral-900 border-b border-neutral-100 pb-3">
          مميزات محفظة Porte feuille Classe
        </h3>
        <ul className="space-y-3">
          {features.map((feat, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">
                ✓
              </span>
              <span className="text-neutral-700 text-sm leading-relaxed">{feat}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Trust badges grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {benefits.map((b, i) => (
          <div
            key={i}
            className="flex items-start gap-3.5 p-4 bg-white rounded-xl border border-neutral-200/70 shadow-sm"
          >
            <div className="p-2.5 rounded-lg bg-amber-50 shrink-0 border border-amber-100">
              {b.icon}
            </div>
            <div>
              <h4 className="font-bold text-neutral-900 text-sm mb-1">{b.title}</h4>
              <p className="text-xs text-neutral-600 leading-normal">{b.description}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
