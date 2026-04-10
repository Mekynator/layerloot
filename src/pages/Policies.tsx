import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";
import { PageSkeleton } from "@/components/shared/loading-states";
import { motion, AnimatePresence } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";
import { Search, ChevronRight, Calendar, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { renderBlock } from "@/components/admin/BlockRenderer";
import { usePageBlocks } from "@/hooks/use-page-blocks";
import { useSearchParams } from "react-router-dom";

interface PolicyData {
  id: string;
  title: string;
  slug: string;
  body: string;
  meta_title: string;
  meta_description: string;
  is_visible: boolean;
  updated_at: string;
  sort_order: number;
}

const Policies = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  // Page-level blocks for policies
  const [searchParams] = useSearchParams();
  const isEditorQuery = searchParams.get("editorPreview") === "1";
  const sessionFlag = typeof window !== "undefined" && sessionStorage.getItem("layerloot.editorPreview") === "1";
  const isEditorPreview = isEditorQuery || sessionFlag || window.location.pathname.startsWith("/admin/visual-editor") || window.location.pathname.startsWith("/admin/editor");
  const blocksQuery = usePageBlocks("policies", true, isEditorPreview);
  const pageBlocks: any[] = blocksQuery.data ?? [];
  const [policies, setPolicies] = useState<PolicyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("policies")
        .select("id, title, slug, body, meta_title, meta_description, is_visible, updated_at, sort_order")
        .eq("is_visible", true)
        .order("sort_order", { ascending: true });

      if (data) setPolicies(data as PolicyData[]);
      setLoading(false);
    };
    load();
  }, []);

  const activePolicy = useMemo(
    () => (slug ? policies.find((p) => p.slug === slug) : policies[0]) ?? null,
    [slug, policies],
  );

  // Redirect to first policy if no slug and policies loaded
  useEffect(() => {
    if (!loading && !slug && policies.length > 0) {
      navigate(`/policies/${policies[0].slug}`, { replace: true });
    }
  }, [loading, slug, policies, navigate]);

  // SEO
  useEffect(() => {
    if (!activePolicy) return;
    const metaTitle = activePolicy.meta_title || activePolicy.title;
    if (metaTitle) document.title = `${metaTitle} | LayerLoot`;
    if (activePolicy.meta_description) {
      let metaTag = document.querySelector('meta[name="description"]');
      if (!metaTag) {
        metaTag = document.createElement("meta");
        metaTag.setAttribute("name", "description");
        document.head.appendChild(metaTag);
      }
      metaTag.setAttribute("content", activePolicy.meta_description);
    }
  }, [activePolicy]);

  const filtered = useMemo(() => {
    if (!search.trim()) return policies;
    const q = search.toLowerCase();
    return policies.filter((p) => p.title.toLowerCase().includes(q));
  }, [policies, search]);

  if (loading) return <PageSkeleton />;

  if (policies.length === 0) {
    return (
      <div className="container py-20 text-center">
        <h1 className="font-display text-3xl font-bold uppercase text-foreground">Policies</h1>
        <p className="mt-3 text-muted-foreground">No policies are available at this time.</p>
      </div>
    );
  }

  /* ─── Mobile: Accordion ─── */
  if (isMobile) {
    return (
      <div className="container py-8">
        <h1 className="mb-6 font-display text-2xl font-bold uppercase text-foreground">Policies</h1>

        {pageBlocks.length > 0 && pageBlocks.map((b) => (
          <div key={b.id}>{renderBlock(b)}</div>
        ))}

        {policies.length > 5 && (
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/50" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search policies..."
              className="h-9 pl-9 text-xs bg-card/30 border-border/15"
            />
          </div>
        )}

        <div className="space-y-2">
          {filtered.map((policy) => {
            const isOpen = expandedSlug === policy.slug;
            return (
              <div key={policy.id} className="rounded-lg border border-border/15 bg-card/20 overflow-hidden">
                <button
                  className="flex w-full items-center justify-between px-4 py-3 text-left"
                  onClick={() => setExpandedSlug(isOpen ? null : policy.slug)}
                >
                  <span className="font-display text-sm font-medium text-foreground">{policy.title}</span>
                  <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform duration-200", isOpen && "rotate-180")} />
                </button>
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4">
                        <p className="mb-3 flex items-center gap-1 text-[10px] text-muted-foreground/50">
                          <Calendar className="h-3 w-3" />
                          Updated {new Date(policy.updated_at).toLocaleDateString()}
                        </p>
                        <div className="prose prose-invert prose-sm max-w-none text-muted-foreground prose-headings:font-display prose-headings:text-foreground prose-strong:text-foreground prose-li:marker:text-primary">
                          <ReactMarkdown>{policy.body || "This policy has not been configured yet."}</ReactMarkdown>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  /* ─── Desktop: Sidebar + Content ─── */
  return (
    <div className="container py-10">
      <h1 className="mb-6 font-display text-2xl font-bold uppercase text-foreground">Policies</h1>

      {pageBlocks.length > 0 && pageBlocks.map((b) => (
        <div key={b.id}>{renderBlock(b)}</div>
      ))}

      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        {/* Sidebar */}
        <div className="space-y-3">
          {policies.length > 5 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/50" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search policies..."
                className="h-9 pl-9 text-xs bg-card/30 border-border/15"
              />
            </div>
          )}

          <nav className="space-y-0.5">
            {filtered.map((policy) => {
              const isActive = activePolicy?.slug === policy.slug;
              return (
                <Link
                  key={policy.id}
                  to={`/policies/${policy.slug}`}
                  className={cn(
                    "group flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm transition-all duration-200",
                    isActive
                      ? "bg-primary/10 text-primary border border-primary/20"
                      : "text-muted-foreground hover:bg-card/30 hover:text-foreground border border-transparent",
                  )}
                >
                  <ChevronRight className={cn(
                    "h-3 w-3 shrink-0 transition-transform duration-200",
                    isActive ? "text-primary" : "text-muted-foreground/40 group-hover:translate-x-0.5",
                  )} />
                  <span className="font-medium">{policy.title}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {activePolicy ? (
            <motion.div
              key={activePolicy.slug}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
              className="min-w-0"
            >
              <div className="rounded-xl border border-border/10 bg-card/10 px-8 py-6">
                <h2 className="font-display text-2xl font-bold uppercase text-foreground">{activePolicy.title}</h2>
                <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground/50">
                  <Calendar className="h-3 w-3" />
                  Last updated {new Date(activePolicy.updated_at).toLocaleDateString()}
                </p>

                <div className="mt-6 prose prose-invert max-w-none text-muted-foreground leading-relaxed prose-headings:font-display prose-headings:text-foreground prose-strong:text-foreground prose-li:marker:text-primary prose-p:leading-7">
                  <ReactMarkdown>{activePolicy.body || "This policy has not been configured yet. Please check back later."}</ReactMarkdown>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="flex items-center justify-center py-20">
              <p className="text-sm text-muted-foreground">Select a policy to view its content.</p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Policies;
