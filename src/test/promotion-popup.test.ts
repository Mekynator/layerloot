import { describe, expect, it } from "vitest";
import {
  normalizePromotionPopupConfig,
  shouldBlockPopupByDismissal,
  shouldRenderPromotionPopup,
} from "@/lib/promotion-popup";

describe("promotion popup helpers", () => {
  it("normalizes legacy popup settings into the builder config", () => {
    const config = normalizePromotionPopupConfig({
      enabled: true,
      title: "Welcome back",
      message: "Browse the newest prints",
      button_text: "Shop now",
      button_link: "/products",
      dismiss_key: "legacy-home",
    });

    expect(config.enabled).toBe(true);
    expect(config.title).toBe("Welcome back");
    expect(config.message).toBe("Browse the newest prints");
    expect(config.elements.some((element) => element.type === "title")).toBe(true);
    expect(config.elements.some((element) => element.type === "button")).toBe(true);
  });

  it("blocks daily popups only within the cooldown window", () => {
    const now = Date.now();
    const config = normalizePromotionPopupConfig({
      enabled: true,
      schedule: { behavior: "day", active: true },
    });

    expect(shouldBlockPopupByDismissal(config, { localSeenAt: String(now - 1_000) }, now)).toBe(true);
    expect(shouldBlockPopupByDismissal(config, { localSeenAt: String(now - 172_800_000) }, now)).toBe(false);
  });

  it("renders only on the intended route when homepage targeting is enabled", () => {
    const config = normalizePromotionPopupConfig({
      enabled: true,
      schedule: {
        active: true,
        homepageOnly: true,
        pageTargets: ["/"],
      },
    });

    expect(shouldRenderPromotionPopup(config, "/", new Date("2026-04-11T12:00:00Z"))).toBe(true);
    expect(shouldRenderPromotionPopup(config, "/products", new Date("2026-04-11T12:00:00Z"))).toBe(false);
  });
});
