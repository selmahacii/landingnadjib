import React from "react";
import { getSiteSettings } from "@/lib/sheets/settings";
import { SettingsForm } from "@/components/admin/SettingsForm";

export const revalidate = 0; // Don't cache admin page

export default async function AdminSettingsPage() {
  const settings = await getSiteSettings();

  return (
    <div className="space-y-6">
      <SettingsForm initialSettings={settings} />
    </div>
  );
}
