import React from "react";
import { getVariants } from "@/lib/sheets/variants";
import { MediaUploader } from "@/components/admin/MediaUploader";

export const revalidate = 0; // Don't cache admin page

export default async function AdminMediaPage() {
  const variants = await getVariants(true);

  return (
    <div className="space-y-6">
      <MediaUploader initialVariants={variants} />
    </div>
  );
}
