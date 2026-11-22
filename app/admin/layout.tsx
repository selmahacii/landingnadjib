import React from "react";
import { cookies } from "next/headers";
import Link from "next/link";
import { verifyAdminCookie } from "@/lib/admin-auth";
import { PinForm } from "@/components/admin/PinForm";

export const metadata = {
  title: "لوحة التحكم - Porte feuille Classe",
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = cookies();
  const token = cookieStore.get("admin_session")?.value;
  const isAuthenticated = token ? verifyAdminCookie(token) : false;

  if (!isAuthenticated) {
    return <PinForm />;
  }

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900" dir="rtl">
      {/* Top Admin Navbar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-6">
              <span className="font-bold text-lg text-amber-600">
                Porte feuille Classe — لوحة الإدارة
              </span>
              <nav className="flex items-center gap-4 text-sm font-medium">
                <Link
                  href="/admin/delivery"
                  className="text-gray-700 hover:text-amber-600 px-3 py-2 rounded-md hover:bg-gray-50 transition"
                >
                  أسعار التوصيل (58 ولاية)
                </Link>
                <Link
                  href="/admin/offers"
                  className="text-gray-700 hover:text-amber-600 px-3 py-2 rounded-md hover:bg-gray-50 transition"
                >
                  العروض والباقات
                </Link>
                <Link
                  href="/admin/media"
                  className="text-gray-700 hover:text-amber-600 px-3 py-2 rounded-md hover:bg-gray-50 transition"
                >
                  الصور والوسائط
                </Link>
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/"
                target="_blank"
                className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg border border-gray-300 transition"
              >
                معاينة المتجر ↗
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 px-4">
        {children}
      </main>
    </div>
  );
}
