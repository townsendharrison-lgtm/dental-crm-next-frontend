"use client";

import { useEffect, useState } from "react";
import {
  adminSettingsApi,
  platformConfigFromSettings,
  DEFAULT_PLATFORM_CONFIG,
} from "@/lib/api/adminSettings";
import type { PlatformConfig } from "@/lib/types";

/** Live platform status messages from Rules Engine settings. */
export function usePlatformConfig() {
  const [config, setConfig] = useState<PlatformConfig>(DEFAULT_PLATFORM_CONFIG);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    adminSettingsApi
      .get()
      .then((settings) => {
        if (!cancelled) setConfig(platformConfigFromSettings(settings));
      })
      .catch(() => {
        /* keep defaults */
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { ...config, ready };
}
