import { useCallback, useState } from "react";
import type { SnapSettings } from "@/lib/snap-engine";
import { DEFAULT_SNAP_SETTINGS } from "@/lib/snap-engine";

const STORAGE_KEY = "layerloot-snap-settings";

function loadSettings(): SnapSettings {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_SNAP_SETTINGS, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return DEFAULT_SNAP_SETTINGS;
}

export function useSnapSettings() {
  const [settings, setSettingsState] = useState<SnapSettings>(loadSettings);

  const setSettings = useCallback((updater: SnapSettings | ((prev: SnapSettings) => SnapSettings)) => {
    setSettingsState((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const toggleSetting = useCallback((key: keyof SnapSettings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  }, [setSettings]);

  return { settings, setSettings, toggleSetting } as const;
}
