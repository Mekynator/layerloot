import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";
import { PageSkeleton } from "@/components/shared/loading-states";

const POLICY_KEYS = [
  { slug: "returns-policy", settingKey: "policy_returns", title: "Returns Policy" },
  { slug: "cancellation-policy", settingKey: "policy_cancellation", title: "Cancellation Policy" },
  { slug: "refund-policy", settingKey: "policy_refund", title: "Refund Policy" },
  { slug: "privacy-policy", settingKey: "policy_privacy", title: "Privacy Policy" },
  { slug: "terms-of-service", settingKey: "policy_terms", title: "Terms of Service" },
  { slug: "safety-regulations", settingKey: "policy_safety", title: "Safety Regulations" },
  { slug: "intellectual-property", settingKey: "policy_ip", title: "Intellectual Property & Rights" },
  { slug: "shipping-policy", settingKey: "policy_shipping", title: "Shipping Policy" },
];

export { POLICY_KEYS };

interface PolicyContent {
  title: string;
  body: string;
}

const Policies = () => {
  const { slug } = useParams<{ slug: string }>();
  const [content, setContent] = useState<PolicyContent | null>(null);
  const [loading, setLoading] = useState(true);

  const policyMeta = POLICY_KEYS.find((p) => p.slug === slug);

  useEffect(() => {
    if (!policyMeta) {
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", policyMeta.settingKey)
        .maybeSingle();

      if (data?.value && typeof data.value === "object") {
        const val = data.value as Record<string, string>;
        setContent({
          title: val.title || policyMeta.title,
          body: val.body || "",
        });
      } else {
        // No saved content — show empty state instead of hardcoded defaults
        setContent({ title: policyMeta.title, body: "" });
      }
      setLoading(false);
    };

    load();
  }, [slug, policyMeta]);

  if (loading) return <PageSkeleton />;

  if (!policyMeta || !content) {
    return (
      <div className="container py-20 text-center">
        <h1 className="font-display text-3xl font-bold uppercase text-foreground">Policy Not Found</h1>
        <p className="mt-3 text-muted-foreground">The requested policy page does not exist.</p>
      </div>
    );
  }

  if (!content.body) {
    return (
      <div className="container max-w-3xl py-16">
        <h1 className="mb-8 font-display text-3xl font-bold uppercase text-foreground">{content.title}</h1>
        <p className="text-muted-foreground">This policy has not been configured yet. Please check back later.</p>
      </div>
    );
  }

  return (
    <div className="container max-w-3xl py-16">
      <h1 className="mb-8 font-display text-3xl font-bold uppercase text-foreground">{content.title}</h1>
      <div className="prose prose-invert max-w-none text-muted-foreground prose-headings:font-display prose-headings:text-foreground prose-strong:text-foreground prose-li:marker:text-primary">
        <ReactMarkdown>{content.body}</ReactMarkdown>
      </div>
    </div>
  );
};

export default Policies;
