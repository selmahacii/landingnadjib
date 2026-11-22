import { getOffers } from "@/lib/sheets/offers";
import { getVariants } from "@/lib/sheets/variants";
import { getDeliveryTariffs } from "@/lib/sheets/delivery";
import { LandingClient } from "@/components/landing/LandingClient";

export const revalidate = 60;

export default async function LandingPage() {
  const [offers, variants, tariffs] = await Promise.all([
    getOffers(),
    getVariants(),
    getDeliveryTariffs(),
  ]);

  return <LandingClient offers={offers} variants={variants} tariffs={tariffs} />;
}
