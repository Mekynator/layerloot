import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  useShowcase,
  useShowcaseReviews,
  useSubmitShowcaseReview,
  useShowcaseFavorites,
  useToggleFavorite,
  useCommunityShowcases,
} from "@/hooks/use-showcases";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Heart,
  RotateCcw,
  Star,
  ArrowLeft,
  Pencil,
  Info,
  Image as ImageIcon,
  LogIn,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Share2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/currency";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useMemo, useEffect, useRef } from "react";
import ShowcaseCard from "@/components/creations/ShowcaseCard";

function StarSelector({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <button key={s} type="button" onClick={() => onChange(s)} className="p-0.5 transition-transform hover:scale-110">
          <Star className={cn("h-5 w-5", s <= value ? "fill-primary text-primary" : "text-muted-foreground/40")} />
        </button>
      ))}
    </div>
  );
}

function TrustBadge({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-muted/50 px-3 py-2 text-xs font-medium text-muted-foreground">
      {icon}
      <span>{text}</span>
    </div>
  );
}

function HowItWasMade() {
  const steps = [
    { emoji: "💡", label: "Idea", desc: "Concept & design" },
    { emoji: "🖥️", label: "3D Model", desc: "Digital modeling" },
    { emoji: "🖨️", label: "3D Print", desc: "Layer by layer" },
    { emoji: "✨", label: "Finished", desc: "Quality checked" },
  ];

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5">
      <h3 className="mb-4 font-display text-sm font-semibold uppercase tracking-wider text-foreground">
        How This Was Made
      </h3>
      <div className="flex items-center justify-between gap-2">
        {steps.map((step, i) => (
          <div key={step.label} className="flex flex-1 flex-col items-center text-center gap-1.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-lg">
              {step.emoji}
            </div>
            <span className="text-xs font-semibold text-foreground">{step.label}</span>
            <span className="text-[10px] text-muted-foreground hidden sm:block">{step.desc}</span>
            {i < steps.length - 1 && (
              <div className="absolute" />
            )}
          </div>
        ))}
      </div>
      {/* Connector line */}
      <div className="mt-2 mx-auto h-0.5 w-3/4 bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20 rounded-full" />
    </div>
  );
}

export default function CreationDetail() {
  const { slug } = useParams<{ slug: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { data: showcase, isLoading } = useShowcase(slug);
  const { data: reviews = [] } = useShowcaseReviews(showcase?.id);
  const submitReview = useSubmitShowcaseReview();
  const { data: favIds = [] } = useShowcaseFavorites();
  const toggleFav = useToggleFavorite();
  const { data: allShowcases = [] } = useCommunityShowcases();

  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [mainImage, setMainImage] = useState(0);
  const [stickyVisible, setStickyVisible] = useState(false);
  const ctaRef = useRef<HTMLDivElement>(null);

  // Sticky CTA observer
  useEffect(() => {
    if (!ctaRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => setStickyVisible(!entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(ctaRef.current);
    return () => observer.disconnect();
  }, [showcase]);

  if (authLoading) return null;

  if (!user) {
    return (
      <div className="container mx-auto flex flex-col items-center py-24 gap-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <LogIn className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-xl font-bold">Sign in to view this creation</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          Join the community to explore, save, and order custom creations.
        </p>
        <Button asChild size="lg"><Link to="/auth">Sign In</Link></Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-6">
        <Skeleton className="h-6 w-32 rounded-lg" />
        <div className="grid md:grid-cols-2 gap-8">
          <Skeleton className="aspect-square rounded-2xl" />
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4 rounded-lg" />
            <Skeleton className="h-4 w-full rounded-lg" />
            <Skeleton className="h-4 w-2/3 rounded-lg" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!showcase) {
    return (
      <div className="container mx-auto px-4 py-24 text-center">
        <h2 className="text-xl font-bold">Creation not found</h2>
        <Button asChild variant="outline" className="mt-4"><Link to="/creations">Back to gallery</Link></Button>
      </div>
    );
  }

  const allImages = [...(showcase.preview_image_urls || []), ...(showcase.finished_image_urls || [])];
  const price = showcase.final_price ?? showcase.quoted_price;
  const isFav = favIds.includes(showcase.id);
  const isOwner = user.id === showcase.owner_user_id;
  const hasReviewed = reviews.some((r) => r.user_id === user.id);
  const isLithophane = showcase.category?.toLowerCase().includes("lithophane") ||
    showcase.tags?.some((t) => t.toLowerCase().includes("lithophane"));

  const handleReorder = () => {
    const param = isLithophane ? "reorderLithophane" : "reorderShowcase";
    navigate(`/create?${param}=${showcase.id}`);
  };

  const handleModify = () => {
    const param = isLithophane ? "modifyLithophane" : "modifyShowcase";
    navigate(`/create?${param}=${showcase.id}`);
  };

  // Similar creations
  const similar = allShowcases
    .filter((s) => s.id !== showcase.id)
    .filter((s) => s.category === showcase.category || s.tags?.some((t) => showcase.tags?.includes(t)))
    .slice(0, 4);

  const nextImage = () => setMainImage((prev) => (prev + 1) % Math.max(1, allImages.length));
  const prevImage = () => setMainImage((prev) => (prev - 1 + allImages.length) % Math.max(1, allImages.length));

  return (
    <>
      <div className="container mx-auto px-4 py-6 space-y-10 pb-24 md:pb-10">
        {/* Breadcrumb */}
        <Link
          to="/creations"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to creations
        </Link>

        {/* Hero Section */}
        <div className="grid gap-8 lg:grid-cols-5">
          {/* Left: Image Gallery */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="lg:col-span-3 space-y-3"
          >
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-muted border border-border/40 group">
              <AnimatePresence mode="wait">
                {allImages[mainImage] ? (
                  <motion.img
                    key={mainImage}
                    src={allImages[mainImage]}
                    alt={showcase.title}
                    className="h-full w-full object-cover"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">No images</div>
                )}
              </AnimatePresence>

              {/* Navigation arrows */}
              {allImages.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-background/80 backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg border border-border/40"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-background/80 backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg border border-border/40"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>

                  {/* Dots */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {allImages.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setMainImage(i)}
                        className={cn(
                          "h-2 rounded-full transition-all",
                          i === mainImage ? "bg-primary w-6" : "bg-background/70 backdrop-blur-sm w-2"
                        )}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Thumbnails */}
            {allImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {allImages.map((url, i) => (
                  <button
                    key={i}
                    onClick={() => setMainImage(i)}
                    className={cn(
                      "h-16 w-16 flex-shrink-0 rounded-xl overflow-hidden border-2 transition-all",
                      i === mainImage ? "border-primary ring-2 ring-primary/20" : "border-transparent opacity-70 hover:opacity-100"
                    )}
                  >
                    <img src={url} alt="" className="h-full w-full object-cover" loading="lazy" />
                  </button>
                ))}
              </div>
            )}
          </motion.div>

          {/* Right: Sticky Details Panel */}
          <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-2 lg:sticky lg:top-24 lg:self-start space-y-5"
          >
            {/* Title & rating */}
            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground lg:text-3xl">{showcase.title}</h1>
              {showcase.rating_count > 0 && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={cn(
                          "h-4 w-4",
                          s <= Math.round(showcase.rating_avg ?? 0) ? "fill-primary text-primary" : "text-muted-foreground/30"
                        )}
                      />
                    ))}
                  </div>
                  <span className="text-sm font-medium">{showcase.rating_avg?.toFixed(1)}</span>
                  <span className="text-sm text-muted-foreground">({showcase.rating_count} reviews)</span>
                </div>
              )}
            </div>

            {/* Price */}
            {price != null && (
              <p className="text-3xl font-bold text-foreground">{formatPrice(price)}</p>
            )}

            {/* Trust badges */}
            <div className="flex flex-wrap gap-2">
              {showcase.reorder_count > 0 && (
                <TrustBadge
                  icon={<RotateCcw className="h-3.5 w-3.5 text-primary" />}
                  text={`Reordered ${showcase.reorder_count}× successfully`}
                />
              )}
              {showcase.rating_count >= 3 && (
                <TrustBadge
                  icon={<Star className="h-3.5 w-3.5 text-primary" />}
                  text={`Rated ${showcase.rating_avg?.toFixed(1)}/5 by ${showcase.rating_count} users`}
                />
              )}
              <TrustBadge
                icon={<ShieldCheck className="h-3.5 w-3.5 text-primary" />}
                text="Quality verified print"
              />
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-2">
              {showcase.category && <Badge variant="outline" className="rounded-lg">{showcase.category}</Badge>}
              {showcase.tags?.map((t) => <Badge key={t} variant="secondary" className="text-xs rounded-lg">{t}</Badge>)}
            </div>

            {/* Description */}
            {showcase.description && (
              <p className="text-sm text-muted-foreground leading-relaxed">{showcase.description}</p>
            )}

            {/* Quick specs */}
            <div className="rounded-xl border border-border/60 bg-muted/30 divide-y divide-border/40">
              {showcase.materials && (
                <div className="flex justify-between px-4 py-2.5 text-sm">
                  <span className="text-muted-foreground">Material</span>
                  <span className="font-medium text-foreground">{showcase.materials}</span>
                </div>
              )}
              {showcase.colors && (
                <div className="flex justify-between px-4 py-2.5 text-sm">
                  <span className="text-muted-foreground">Color</span>
                  <span className="font-medium text-foreground">{showcase.colors}</span>
                </div>
              )}
              {showcase.dimensions && (
                <div className="flex justify-between px-4 py-2.5 text-sm">
                  <span className="text-muted-foreground">Dimensions</span>
                  <span className="font-medium text-foreground">{showcase.dimensions}</span>
                </div>
              )}
              {showcase.size_notes && (
                <div className="flex justify-between px-4 py-2.5 text-sm">
                  <span className="text-muted-foreground">Size Notes</span>
                  <span className="font-medium text-foreground">{showcase.size_notes}</span>
                </div>
              )}
            </div>

            {/* Primary CTA area */}
            <div ref={ctaRef} className="space-y-3 pt-2">
              {showcase.reorder_enabled && showcase.approved_by_admin && (
                <Button onClick={handleReorder} className="w-full gap-2 h-12 text-base font-semibold rounded-xl">
                  <RotateCcw className="h-5 w-5" /> Order This Item
                </Button>
              )}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={() => toggleFav.mutate({ showcaseId: showcase.id, isFav })}
                  variant="outline"
                  className="gap-2 rounded-xl"
                >
                  <Heart className={cn("h-4 w-4", isFav && "fill-destructive text-destructive")} />
                  {isFav ? "Saved" : "Save"}
                </Button>
                {showcase.reorder_enabled && showcase.approved_by_admin && (
                  <Button onClick={handleModify} variant="secondary" className="gap-2 rounded-xl">
                    <Pencil className="h-4 w-4" /> Modify
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        </div>

        {/* How it was made */}
        <HowItWasMade />

        {/* Reviews */}
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <Star className="h-5 w-5 text-primary" />
            <h2 className="font-display text-lg font-bold uppercase tracking-wider text-foreground">
              Reviews ({reviews.length})
            </h2>
          </div>

          {/* Submit review */}
          {!isOwner && !hasReviewed && (
            <form
              className="space-y-3 rounded-2xl border border-border/60 p-5 max-w-md bg-card"
              onSubmit={(e) => {
                e.preventDefault();
                submitReview.mutate({ showcaseId: showcase.id, rating: reviewRating, comment: reviewComment });
                setReviewComment("");
              }}
            >
              <p className="text-sm font-semibold text-foreground">Leave a review</p>
              <StarSelector value={reviewRating} onChange={setReviewRating} />
              <Textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Share your experience..."
                rows={3}
                className="rounded-xl"
              />
              <Button type="submit" size="sm" disabled={submitReview.isPending} className="rounded-xl">
                Submit Review
              </Button>
            </form>
          )}

          {reviews.length === 0 ? (
            <p className="text-sm text-muted-foreground">No reviews yet. Be the first to leave one!</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 max-w-2xl">
              {reviews.map((r) => (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border border-border/60 p-4 space-y-2 bg-card"
                >
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className={cn("h-3.5 w-3.5", s <= r.rating ? "fill-primary text-primary" : "text-muted-foreground/30")} />
                    ))}
                  </div>
                  {r.comment && <p className="text-sm text-foreground">{r.comment}</p>}
                  <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</p>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Similar Creations */}
        {similar.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h2 className="font-display text-lg font-bold uppercase tracking-wider text-foreground">
                You Might Also Like
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {similar.map((s) => (
                <ShowcaseCard key={s.id} item={s} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Mobile Sticky CTA */}
      <AnimatePresence>
        {stickyVisible && showcase.reorder_enabled && showcase.approved_by_admin && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-x-0 bottom-0 z-50 border-t border-border/60 bg-background/95 backdrop-blur-xl p-4 md:hidden"
          >
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-bold text-foreground truncate">{showcase.title}</p>
                {price != null && <p className="text-sm font-semibold text-primary">{formatPrice(price)}</p>}
              </div>
              <Button onClick={handleReorder} className="gap-2 rounded-xl shrink-0">
                <RotateCcw className="h-4 w-4" /> Order
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop sticky bar */}
      <AnimatePresence>
        {stickyVisible && showcase.reorder_enabled && showcase.approved_by_admin && (
          <motion.div
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -60, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed top-0 inset-x-0 z-50 border-b border-border/60 bg-background/95 backdrop-blur-xl hidden md:block"
          >
            <div className="container mx-auto flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-4 min-w-0">
                <h3 className="font-bold text-foreground truncate">{showcase.title}</h3>
                {price != null && <span className="font-semibold text-primary">{formatPrice(price)}</span>}
                {showcase.rating_count > 0 && (
                  <div className="flex items-center gap-1 text-sm">
                    <Star className="h-3.5 w-3.5 fill-primary text-primary" />
                    <span>{showcase.rating_avg?.toFixed(1)}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleFav.mutate({ showcaseId: showcase.id, isFav })}
                  className="rounded-xl gap-1.5"
                >
                  <Heart className={cn("h-3.5 w-3.5", isFav && "fill-destructive text-destructive")} />
                  {isFav ? "Saved" : "Save"}
                </Button>
                <Button onClick={handleReorder} size="sm" className="rounded-xl gap-1.5">
                  <RotateCcw className="h-3.5 w-3.5" /> Order This Item
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
