import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";
import { PageSkeleton } from "@/components/shared/loading-states";

interface PolicyData {
  title: string;
  body: string;
  meta_title: string;
  meta_description: string;
  is_visible: boolean;
}

const Policies = () => {
  const { slug } = useParams<{ slug: string }>();
  const [policy, setPolicy] = useState<PolicyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) {
      setLoading(false);
      setNotFound(true);
      return;
    }

    const load = async () => {
      setLoading(true);
      setNotFound(false);

      const { data, error } = await supabase
        .from("policies")
        .select("title, body, meta_title, meta_description, is_visible")
        .eq("slug", slug)
        .eq("is_visible", true)
        .maybeSingle();

      if (error || !data) {
        setNotFound(true);
      } else {
        setPolicy(data as PolicyData);

        // Set document title for SEO
        const metaTitle = data.meta_title || data.title;
        if (metaTitle) document.title = `${metaTitle} | LayerLoot`;

        // Set meta description
        if (data.meta_description) {
          let metaTag = document.querySelector('meta[name="description"]');
          if (!metaTag) {
            metaTag = document.createElement("meta");
            metaTag.setAttribute("name", "description");
            document.head.appendChild(metaTag);
          }
          metaTag.setAttribute("content", data.meta_description);
        }
      }
      setLoading(false);
    };

    load();
  }, [slug]);

  if (loading) return <PageSkeleton />;

  if (notFound || !policy) {
    return (
      <div className="container py-20 text-center">
        <h1 className="font-display text-3xl font-bold uppercase text-foreground">Policy Not Found</h1>
        <p className="mt-3 text-muted-foreground">The requested policy page does not exist.</p>
      </div>
    );
  }

  if (!policy.body) {
    return (
      <div className="container max-w-3xl py-16">
        <h1 className="mb-8 font-display text-3xl font-bold uppercase text-foreground">{policy.title}</h1>
        <p className="text-muted-foreground">This policy has not been configured yet. Please check back later.</p>
      </div>
    );
  }

  return (
    <div className="container max-w-3xl py-16">
      <h1 className="mb-8 font-display text-3xl font-bold uppercase text-foreground">{policy.title}</h1>
      <div className="prose prose-invert max-w-none text-muted-foreground prose-headings:font-display prose-headings:text-foreground prose-strong:text-foreground prose-li:marker:text-primary">
        <ReactMarkdown>{policy.body}</ReactMarkdown>
      </div>
    </div>
  );
};

export default Policies;
