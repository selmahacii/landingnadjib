import type { Metadata, Viewport } from "next";
import { Tajawal, Cairo, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const tajawal = Tajawal({
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "700", "800"],
  display: "swap",
  preload: true,
  variable: "--font-tajawal",
});

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["600", "700", "800", "900"],
  display: "swap",
  variable: "--font-cairo",
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  display: "swap",
  variable: "--font-heading",
});

import { MetaPixel } from "@/components/meta/MetaPixel";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: "Porte feuille Classe",
  description: "Porte feuille Classe - التوصيل متوفر لـ 58 ولاية والدفع عند الاستلام",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pixelId =
    process.env.NEXT_PUBLIC_META_PIXEL_ID || process.env.META_PIXEL_ID;

  return (
    <html lang="ar" dir="rtl" className={`${tajawal.variable} ${cairo.variable} ${plusJakarta.variable}`}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
      </head>
      <body className="font-tajawal antialiased min-h-screen bg-neutral-50 text-neutral-900 overflow-x-hidden">
        <MetaPixel pixelId={pixelId} />
        {children}
      </body>
    </html>
  );
}
