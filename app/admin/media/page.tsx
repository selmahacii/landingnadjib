import React from "react";
import { getVariants } from "@/lib/sheets/variants";
import { getSiteSettings } from "@/lib/sheets/settings";
import { MediaUploader } from "@/components/admin/MediaUploader";

export const revalidate = 0; // Don't cache admin page
export const dynamic = "force-dynamic";

export default async function AdminMediaPage() {
  const [variants, siteSettings] = await Promise.all([
    getVariants(true),
    getSiteSettings(),
  ]);

  return (
    <div className="space-y-6">
      <MediaUploader
        initialVariants={variants}
        initialMainImage={siteSettings.main_image_url || ""}
      />
    </div>
  );
}
