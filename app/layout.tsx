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

export const metadata: Metadata = {
  title: "Porte feuille Classe",
  description: "Porte feuille Classe - التوصيل متوفر لـ 58 ولاية والدفع عند الاستلام",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className={tajawal.variable}>
      <body className="font-tajawal antialiased min-h-screen bg-neutral-50 text-neutral-900">
        {children}
      </body>
    </html>
  );
}
