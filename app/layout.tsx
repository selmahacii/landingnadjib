import type { Metadata } from "next";
import { Tajawal } from "next/font/google";
import "./globals.css";

const tajawal = Tajawal({
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "700", "800"],
  display: "swap",
  preload: true,
  variable: "--font-tajawal",
});

import { MetaPixel } from "@/components/meta/MetaPixel";

export const metadata: Metadata = {
  title: "Porte feuille Classe",
  description: "Porte feuille Classe - التوصيل متوفر لـ 58 ولاية والدفع عند الاستلام",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pixelId = process.env.META_PIXEL_ID;

  return (
    <html lang="ar" dir="rtl" className={tajawal.variable}>
      <body className="font-tajawal antialiased min-h-screen bg-neutral-50 text-neutral-900">
        <MetaPixel pixelId={pixelId} />
        {children}
      </body>
    </html>
  );
}
