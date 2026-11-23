import { getOffers } from "@/lib/sheets/offers";
import { getVariants } from "@/lib/sheets/variants";
import { getDeliveryTariffs } from "@/lib/sheets/delivery";
import { getSiteSettings } from "@/lib/sheets/settings";
import { LandingClient } from "@/components/landing/LandingClient";

export const revalidate = 0;
export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const [offers, variants, tariffs, siteSettings] = await Promise.all([
    getOffers(),
    getVariants(),
    getDeliveryTariffs(),
    getSiteSettings(),
  ]);

  return (
    <LandingClient
      offers={offers}
      variants={variants}
      tariffs={tariffs}
      siteSettings={siteSettings}
    />
  );
}
