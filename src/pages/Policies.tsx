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

const defaultPolicies: Record<string, PolicyContent> = {
  policy_returns: {
    title: "Returns Policy",
    body: `## Returns Policy

We want you to be completely satisfied with your purchase. If you are not happy with your order, please review the following:

- **Custom-made items**: Due to the personalized nature of custom 3D printed items, returns are generally not accepted unless the item is defective or significantly different from the agreed specifications.
- **Standard products**: Standard products may be returned within 14 days of delivery in their original, unused condition.
- **Defective items**: If you receive a defective item, please contact us within 7 days of delivery with photos of the defect.

To initiate a return, please contact our support team with your order number and reason for return.`,
  },
  policy_cancellation: {
    title: "Cancellation Policy",
    body: `## Cancellation Policy

- **Before production**: Orders may be cancelled free of charge before production begins.
- **During production**: Once production has started, cancellation may not be possible for custom items. Standard product orders in production may be subject to a cancellation fee.
- **Custom order request fee**: The custom request fee is non-refundable if you choose not to proceed with the order.

To request a cancellation, contact our team as soon as possible with your order number.`,
  },
  policy_refund: {
    title: "Refund Policy",
    body: `## Refund Policy

- **Approved returns**: Refunds for approved returns will be processed within 14 business days after we receive the returned item.
- **Defective items**: Full refund or replacement will be offered for items confirmed as defective.
- **Custom request fees**: The custom order request fee is non-refundable.
- **Refund method**: Refunds will be issued to the original payment method.
- **Shipping costs**: Original shipping costs are non-refundable unless the return is due to our error.`,
  },
  policy_privacy: {
    title: "Privacy Policy",
    body: `## Privacy Policy

We respect your privacy and are committed to protecting your personal data. This policy explains how we collect, use, and safeguard your information.

- We collect information you provide when placing orders, creating accounts, or contacting us.
- Your data is used solely to process orders, provide customer support, and improve our services.
- We do not sell or share your personal data with third parties except as required for order fulfillment (e.g., shipping providers, payment processors).
- You may request deletion of your account and personal data at any time by contacting us.`,
  },
  policy_terms: {
    title: "Terms of Service",
    body: `## Terms of Service

By using our website and services, you agree to the following terms:

- All purchases are subject to our returns, cancellation, and refund policies.
- Prices are listed in the displayed currency and may change without notice.
- We reserve the right to refuse service or cancel orders at our discretion.
- Product images are representative; slight variations in color and finish may occur due to the nature of 3D printing.
- Users are responsible for maintaining the security of their account credentials.`,
  },
  policy_safety: {
    title: "Safety Regulations",
    body: `## Safety Regulations

- Our 3D printed products are not intended as toys for children under 3 years of age unless explicitly stated.
- Some products may contain small parts that could present a choking hazard.
- Products are made from materials that are generally considered safe for handling, but are not food-safe unless specifically labeled.
- Do not expose products to extreme heat or open flames.
- For any safety concerns, please contact our support team.`,
  },
  policy_ip: {
    title: "Intellectual Property & Rights",
    body: `## Intellectual Property & Rights

- Not all articles sold on this website are our original designs. We hold the right to manufacture and sell these items under applicable licensing agreements.
- Custom-made items are produced based on customer-provided designs. The customer retains intellectual property rights to their submitted designs.
- We do not claim ownership of customer-submitted 3D models or designs.
- By submitting a design for a custom order, you confirm that you own the rights to that design or have authorization to have it produced.
- Reproduction or redistribution of product designs, images, or content from this website is prohibited without written consent.`,
  },
  policy_shipping: {
    title: "Shipping Policy",
    body: `## Shipping Policy

- Orders are processed and shipped within the estimated timeframe shown at checkout.
- Shipping times vary by location and shipping method selected.
- Tracking information will be provided once your order has been shipped.
- We are not responsible for delays caused by customs, weather, or carrier issues.
- For any shipping inquiries, please contact our support team with your order number.`,
  },
};

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
          body: val.body || defaultPolicies[policyMeta.settingKey]?.body || "",
        });
      } else {
        setContent(defaultPolicies[policyMeta.settingKey] || { title: policyMeta.title, body: "" });
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
