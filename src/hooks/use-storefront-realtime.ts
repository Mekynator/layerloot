import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { diag } from "@/lib/storefront-diagnostics";

/**
 * Subscribes to backend changes for content tables published by the Admin project,
 * and invalidates the matching React Query caches so the storefront updates within ~1s
 * instead of waiting for poll/window-focus refetch.
 *
 * Mount once, near the top of the React tree.
 */
export function useStorefrontRealtime() {
  const qc = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("storefront-publish-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "site_blocks" },
        (payload) => {
          diag("realtime", "site_blocks change", payload.eventType);
          qc.invalidateQueries({ queryKey: ["site-blocks"] });
          qc.invalidateQueries({ queryKey: ["storefront-catalog"] });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "campaigns" },
        (payload) => {
          diag("realtime", "campaigns change", payload.eventType);
          qc.invalidateQueries({ queryKey: ["active-campaign"] });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "site_settings" },
        (payload) => {
          diag("realtime", "site_settings change", payload.eventType);
          qc.invalidateQueries({ queryKey: ["published-setting"] });
          qc.invalidateQueries({ queryKey: ["site-page"] });
          qc.invalidateQueries({ queryKey: ["nav-links"] });
          qc.invalidateQueries({ queryKey: ["static-section-settings"] });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "site_pages" },
        () => {
          qc.invalidateQueries({ queryKey: ["site-page"] });
          qc.invalidateQueries({ queryKey: ["site-blocks"] });
          qc.invalidateQueries({ queryKey: ["nav-links"] });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products" },
        () => {
          qc.invalidateQueries({ queryKey: ["storefront-catalog"] });
          qc.invalidateQueries({ queryKey: ["product-detail"] });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "categories" },
        () => {
          diag("realtime", "categories change");
          qc.invalidateQueries({ queryKey: ["storefront-catalog"] });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reusable_blocks" },
        () => {
          diag("realtime", "reusable_blocks change");
          qc.invalidateQueries({ queryKey: ["site-blocks"] });
          qc.invalidateQueries({ queryKey: ["storefront-catalog"] });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "discount_codes" },
        () => {
          diag("realtime", "discount_codes change");
          qc.invalidateQueries({ queryKey: ["published-setting"] });
          qc.invalidateQueries({ queryKey: ["checkout-savings"] });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "vouchers" },
        () => {
          diag("realtime", "vouchers change");
          qc.invalidateQueries({ queryKey: ["account-overview"] });
          qc.invalidateQueries({ queryKey: ["rewards-store-config"] });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_vouchers" },
        () => {
          diag("realtime", "user_vouchers change");
          qc.invalidateQueries({ queryKey: ["account-overview"] });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "loyalty_points" },
        () => {
          diag("realtime", "loyalty_points change");
          qc.invalidateQueries({ queryKey: ["loyalty-progress"] });
          qc.invalidateQueries({ queryKey: ["account-overview"] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);
}
