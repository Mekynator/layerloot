import { useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { renderBlock, type SiteBlock } from "@/components/blocks/BlockRenderer";

const NotFound = () => {
  const location = useLocation();
  const { t } = useTranslation("common");
  const [blocks, setBlocks] = useState<SiteBlock[]>([]);

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  useEffect(() => {
    let mounted = true;
    supabase
      .from("site_blocks")
      .select("*")
      .eq("page", "not-found")
      .eq("is_active", true)
      .order("sort_order")
      .then(({ data }) => {
        if (mounted) setBlocks((data as SiteBlock[]) ?? []);
      });
    return () => { mounted = false; };
  }, []);

  if (blocks.length > 0) {
    return <div>{blocks.map((block) => <div key={block.id}>{renderBlock(block)}</div>)}</div>;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="mb-4 font-display text-4xl font-bold text-foreground">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">{t("notFound.title", "Oops! Page not found")}</p>
        <a href="/" className="text-primary underline hover:text-primary/90">
          {t("notFound.backHome", "Return to Home")}
        </a>
      </div>
    </div>
  );
};

export default NotFound;
