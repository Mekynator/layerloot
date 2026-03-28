import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

interface PromoConfig {
  enabled: boolean;
  title: string;
  message: string;
  button_text: string;
  button_link: string;
  image_url?: string;
  dismiss_key?: string;
}

const STORAGE_PREFIX = "layerloot-promo-dismissed-";

const PromotionPopup = () => {
  const [promo, setPromo] = useState<PromoConfig | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const fetchPromo = async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "promotion_popup")
        .maybeSingle();

      if (!data?.value) return;
      const config = data.value as unknown as PromoConfig;
      if (!config.enabled) return;

      const dismissKey = config.dismiss_key || "default";
      const dismissed = localStorage.getItem(STORAGE_PREFIX + dismissKey);
      if (dismissed) return;

      setPromo(config);
      setTimeout(() => setVisible(true), 2000);
    };

    fetchPromo();
  }, []);

  const dismiss = () => {
    setVisible(false);
    if (promo?.dismiss_key) {
      localStorage.setItem(STORAGE_PREFIX + (promo.dismiss_key || "default"), "1");
    }
  };

  if (!promo) return null;

  return (
    <AnimatePresence>
      {visible && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/60"
            onClick={dismiss}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed inset-x-4 top-1/2 z-[61] mx-auto max-w-md -translate-y-1/2 overflow-hidden rounded-2xl border border-border bg-card shadow-2xl sm:inset-x-auto"
          >
            <button
              onClick={dismiss}
              className="absolute right-3 top-3 z-10 rounded-full bg-background/80 p-1.5 text-muted-foreground transition hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>

            {promo.image_url && (
              <div className="h-48 w-full overflow-hidden">
                <img src={promo.image_url} alt="" className="h-full w-full object-cover" />
              </div>
            )}

            <div className="p-6 text-center">
              <h2 className="font-display text-2xl font-bold uppercase text-foreground">{promo.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{promo.message}</p>

              {promo.button_text && promo.button_link && (
                <Link to={promo.button_link} onClick={dismiss}>
                  <Button className="mt-4 font-display uppercase tracking-wider">
                    {promo.button_text}
                  </Button>
                </Link>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default PromotionPopup;
