import type { Offer } from "./sheets/offers";

export interface PricingParams {
  offer: Offer;
  deliveryPrice: number;
}

export function calculateTotal({ offer, deliveryPrice }: PricingParams): number {
  if (!offer) return 0;
  if (offer.livraison_gratuite) {
    return offer.prix_dzd;
  }
  return offer.prix_dzd + (deliveryPrice || 0);
}
