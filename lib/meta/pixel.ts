declare global {
  interface Window {
    fbq?: (...args: any[]) => void;
    _fbq?: (...args: any[]) => void;
  }
}

export function trackPixelEvent(
  event: "PageView" | "ViewContent" | "InitiateCheckout" | "Purchase",
  params: Record<string, any> = {},
  eventId?: string
): void {
  try {
    if (typeof window === "undefined" || typeof window.fbq !== "function") {
      return;
    }

    if (eventId) {
      window.fbq("track", event, params, { eventID: eventId });
    } else {
      window.fbq("track", event, params);
    }
  } catch (error) {
    console.warn("Meta Pixel track error (non-fatal):", error);
  }
}
