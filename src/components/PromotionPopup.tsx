import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAnalyticsSafe } from "@/contexts/AnalyticsContext";
import { useUserSignals } from "@/hooks/use-user-signals";
import { evaluateAudienceRules, type AudienceRules } from "@/lib/personalization";
import { useABTesting } from "@/hooks/use-ab-testing";
import { applyABVariantContent } from "@/lib/ab-testing";
import {
  normalizePromotionPopupConfig,
  persistPromotionPopupDismissal,
  readPromotionPopupDismissal,
  shouldBlockPopupByDismissal,
  shouldRenderPromotionPopup,
} from "@/lib/promotion-popup";
import type { PromotionPopupConfig } from "@/types/promotion-popup";
import PromotionPopupCanvas from "@/components/promo/PromotionPopupCanvas";
import {
  buildEntranceAnimation,
  buildHoverAnimation,
  buildPressAnimation,
  isMotionEnabledForViewport,
} from "@/lib/animation-system";

const PromotionPopup = () => {
  const location = useLocation();
  const { track, trackAttribution } = useAnalyticsSafe();
  const { signals } = useUserSignals();
  const { getPopupExperiment } = useABTesting();
  const [promo, setPromo] = useState<PromotionPopupConfig | null>(null);
  const [visible, setVisible] = useState(false);
  const [doNotShowAgain, setDoNotShowAgain] = useState(false);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setDoNotShowAgain(false);
  }, [promo?.dismiss_key]);

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;

    const loadPromotionPopup = async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "promotion_popup")
        .maybeSingle();

      if (cancelled) return;

      const config = normalizePromotionPopupConfig(data?.value);
      if (!config.enabled) {
        setPromo(null);
        setVisible(false);
        return;
      }

      if (!shouldRenderPromotionPopup(config, location.pathname, new Date())) {
        setPromo(config);
        setVisible(false);
        return;
      }

      const dismissal = readPromotionPopupDismissal(config);
      if (shouldBlockPopupByDismissal(config, dismissal, Date.now())) {
        setPromo(config);
        setVisible(false);
        return;
      }

      // Audience-based targeting
      const audienceRules = (config as any)._audienceRules as AudienceRules | undefined;
      if (audienceRules && audienceRules.length > 0 && !evaluateAudienceRules(audienceRules, signals)) {
        setPromo(config);
        setVisible(false);
        return;
      }

      // A/B test variant overrides for popup
      const popupId = config.metadata?.analyticsId || config.dismiss_key;
      const abResult = popupId ? getPopupExperiment(popupId) : null;
      const finalConfig = abResult
        ? normalizePromotionPopupConfig(applyABVariantContent(config as any, abResult.variant, abResult.experiment.id))
        : config;

      setPromo(finalConfig);
      setVisible(false);
      timer = window.setTimeout(() => {
        if (!cancelled) setVisible(true);
      }, Math.max(0, Number(config.schedule.showDelayMs) || 0));
    };

    loadPromotionPopup();

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [location.pathname]);

  const dismiss = (persistForever = false, reason: "dismiss" | "close" | "overlay" | "escape" | "action" = "dismiss") => {
    if (!promo) return;
    track({
      eventName: "popup_close",
      entityType: "popup",
      entityId: promo.metadata.analyticsId || promo.dismiss_key,
      popupId: promo.metadata.analyticsId || promo.dismiss_key,
      source: reason,
      context: {
        popupName: promo.metadata.name || promo.title,
        dismissKey: promo.dismiss_key,
        doNotShowAgain,
      },
    });
    setVisible(false);
    persistPromotionPopupDismissal(promo, {
      permanent: promo.schedule.allowDoNotShowAgain && doNotShowAgain ? persistForever : false,
    });
  };

  useEffect(() => {
    if (visible && promo?.schedule.behavior === "first-visit") {
      persistPromotionPopupDismissal(promo, { permanent: false });
    }
  }, [promo, visible]);

  useEffect(() => {
    if (!visible || !promo) return;
    const popupId = promo.metadata.analyticsId || promo.dismiss_key;

    track({
      eventName: "popup_view",
      entityType: "popup",
      entityId: popupId,
      popupId,
      source: "promotion_popup",
      context: {
        popupName: promo.metadata.name || promo.title,
        dismissKey: promo.dismiss_key,
        path: location.pathname,
      },
    });

    trackAttribution({
      sourceType: "popup",
      sourceId: popupId,
      label: promo.metadata.name || promo.title,
      pagePath: location.pathname,
      metadata: { dismissKey: promo.dismiss_key },
    });
  }, [location.pathname, promo, track, trackAttribution, visible]);

  useEffect(() => {
    if (!visible || !promo || !promo.overlay.modal) return;

    const dialog = dialogRef.current;
    if (!dialog) return;

    const focusable = () => Array.from(dialog.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex='-1'])"));
    focusable()[0]?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && promo.overlay.closeOnEscape) {
        event.preventDefault();
        dismiss(true, "escape");
        return;
      }

      if (event.key !== "Tab") return;

      const items = focusable();
      if (items.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [doNotShowAgain, promo, visible]);

  if (!promo) return null;

  return <PromotionPopupMotion promo={promo} visible={visible} dialogRef={dialogRef} doNotShowAgain={doNotShowAgain} setDoNotShowAgain={setDoNotShowAgain} dismiss={dismiss} />;
};

function PromotionPopupMotion({ promo, visible, dialogRef, doNotShowAgain, setDoNotShowAgain, dismiss }: {
  promo: PromotionPopupConfig;
  visible: boolean;
  dialogRef: React.RefObject<HTMLDivElement | null>;
  doNotShowAgain: boolean;
  setDoNotShowAgain: (v: boolean) => void;
  dismiss: (persistForever?: boolean, reason?: "dismiss" | "close" | "overlay" | "escape" | "action") => void;
}) {
  const { track, trackAttribution } = useAnalyticsSafe();
  const location = useLocation();
  const prefersReduced = useReducedMotion() ?? false;

  const motionContent = useMemo(() => (promo as any).motion || {}, [promo]);
  const viewport = typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches ? "mobile" : "desktop";
  const motionEnabled = isMotionEnabledForViewport(motionContent, viewport as "mobile" | "desktop", prefersReduced);

  const entrance = useMemo(() => motionEnabled ? buildEntranceAnimation({ animation: "popIn", animationDuration: 0.4, ...motionContent }) : null, [motionContent, motionEnabled]);
  const hoverProps = useMemo(() => motionEnabled ? buildHoverAnimation(motionContent) : undefined, [motionContent, motionEnabled]);
  const pressProps = useMemo(() => motionEnabled ? buildPressAnimation(motionContent) : undefined, [motionContent, motionEnabled]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90]"
        >
          <div
            className="absolute inset-0"
            style={{
              background: promo.overlay.color,
              opacity: promo.overlay.opacity,
              backdropFilter: `blur(${promo.overlay.blur}px)`,
            }}
            onClick={promo.overlay.clickOutsideToClose ? () => dismiss(true, "overlay") : undefined}
            aria-hidden="true"
          />

          <div className="relative z-[91] flex min-h-screen items-center justify-center p-4">
            <motion.div
              ref={dialogRef}
              role="dialog"
              aria-modal={promo.overlay.modal}
              aria-labelledby="promotion-popup-title"
              className="w-full max-w-[min(100vw-2rem,640px)] outline-none"
              tabIndex={-1}
              onClick={(event) => event.stopPropagation()}
              initial={entrance?.initial}
              animate={entrance?.animate}
              transition={entrance?.transition}
              whileHover={hoverProps && Object.keys(hoverProps).length > 0 ? hoverProps : undefined}
              whileTap={pressProps && Object.keys(pressProps).length > 0 ? pressProps : undefined}
            >
              <PromotionPopupCanvas
                config={promo}
                mode="runtime"
                onAction={() => {
                  const popupId = promo.metadata.analyticsId || promo.dismiss_key;
                  track({
                    eventName: "popup_click",
                    entityType: "popup",
                    entityId: popupId,
                    popupId,
                    source: "promotion_popup",
                    context: {
                      popupName: promo.metadata.name || promo.title,
                      buttonText: promo.button_text || null,
                      target: promo.button_link || null,
                    },
                  });
                  trackAttribution({
                    sourceType: "popup",
                    sourceId: popupId,
                    label: promo.button_text || promo.metadata.name || promo.title,
                    pagePath: location.pathname,
                    metadata: { target: promo.button_link || null },
                  });
                  dismiss(true, "action");
                }}
                onClose={promo.container.showCloseButton ? () => dismiss(true, "close") : undefined}
              />

              {promo.schedule.allowDoNotShowAgain && (
                <label className="mt-3 inline-flex items-center gap-2 rounded-full bg-background/80 px-3 py-2 text-xs text-foreground shadow-sm backdrop-blur">
                  <input
                    type="checkbox"
                    checked={doNotShowAgain}
                    onChange={(event) => setDoNotShowAgain(event.target.checked)}
                    className="h-4 w-4 rounded border-border"
                  />
                  Do not show again on this browser
                </label>
              )}
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default PromotionPopup;
