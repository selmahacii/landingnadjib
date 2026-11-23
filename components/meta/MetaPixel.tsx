"use client";

import React, { useEffect } from "react";
import Script from "next/script";
import { trackPixelEvent } from "@/lib/meta/pixel";

interface MetaPixelProps {
  pixelId?: string;
}

export const MetaPixel: React.FC<MetaPixelProps> = ({ pixelId: propPixelId }) => {
  const pixelId =
    propPixelId ||
    process.env.NEXT_PUBLIC_META_PIXEL_ID ||
    process.env.META_PIXEL_ID;

  useEffect(() => {
    if (!pixelId) return;

    // Generate deduplication event_id for PageView
    const eventId = `pv_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    // Client-side pixel track
    trackPixelEvent("PageView", {}, eventId);

    // Server-side CAPI dual-fire with the SAME event_id
    fetch("/api/meta-capi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_name: "PageView",
        event_id: eventId,
        event_source_url: window.location.href,
      }),
    }).catch(() => {});
  }, [pixelId]);

  if (!pixelId) return null;

  return (
    <>
      <Script
        id="fb-pixel"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${pixelId}');
          `,
        }}
      />
    </>
  );
};
