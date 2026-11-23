import React from "react";
import { getOffers } from "@/lib/sheets/offers";
import { OffersTable } from "@/components/admin/OffersTable";

export const revalidate = 0; // Don't cache admin page

export default async function AdminOffersPage() {
  const offers = await getOffers(true);

  return (
    <div className="space-y-6">
      <OffersTable initialOffers={offers} />
    </div>
  );
}
