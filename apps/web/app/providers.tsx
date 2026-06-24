"use client";

import { AuraProvider } from "@aura/react";
import type { ConsentProfile, ContextModel } from "@aura/protocol";
import { manifest } from "@/manifest/aura.manifest";

const consentProfile: ConsentProfile = {
  behavior: true,
  personalization: true,
  accessibility: true,
};

const context: ContextModel = {
  device: "desktop",
  locale: "en-US",
  viewport: { width: 1440, height: 900 },
  networkQuality: "fast",
  sequenceId: 1,
  domain: { app: "aura-ecommerce-demo" },
};

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuraProvider
      endpoint="/api"
      manifest={manifest}
      userId="demo-user"
      consentProfile={consentProfile}
      context={context}
    >
      {children}
    </AuraProvider>
  );
}
