import React from "react";
import { getDeliveryTariffs } from "@/lib/sheets/delivery";
import { DeliveryTable } from "@/components/admin/DeliveryTable";

export const revalidate = 0; // Don't cache admin page

export default async function AdminDeliveryPage() {
  const tariffs = await getDeliveryTariffs(true);

  return (
    <div className="space-y-6">
      <DeliveryTable initialTariffs={tariffs} />
    </div>
  );
}
