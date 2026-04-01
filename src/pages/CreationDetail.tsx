import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useShowcase, useShowcaseReviews, useSubmitShowcaseReview, useShowcaseFavorites, useToggleFavorite } from "@/hooks/use-showcases";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Heart, RotateCcw, Star, ArrowLeft, Pencil, Package, Info, Image as ImageIcon, MessageSquare, LogIn } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/currency";
import { motion } from "framer-motion";
import { useState } from "react";

function StarSelector({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <button key={s} type="button" onClick={() => onChange(s)} className="p-0.5">
          <Star className={cn("h-5 w-5", s <= value ? "fill-primary text-primary" : "text-muted-foreground/40")} />
        </button>
      ))}
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

  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [mainImage, setMainImage] = useState(0);

  if (authLoading) return null;

  if (!user) {
    return (
      <div className="container mx-auto flex flex-col items-center py-24 gap-4 text-center">
        <LogIn className="h-10 w-10 text-muted-foreground" />
        <h2 className="text-xl font-bold">Sign in to view this creation</h2>
        <Button asChild><Link to="/auth">Sign In</Link></Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid md:grid-cols-2 gap-8">
          <Skeleton className="aspect-square rounded-xl" />
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
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

  const handleReorder = () => {
    navigate(`/create?reorderShowcase=${showcase.id}`);
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <Link to="/creations" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to creations
      </Link>

      <div className="grid gap-8 md:grid-cols-2">
        {/* images */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          <div className="aspect-square rounded-xl overflow-hidden bg-muted border">
            {allImages[mainImage] ? (
              <img src={allImages[mainImage]} alt={showcase.title} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">No images</div>
            )}
          </div>
          {allImages.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {allImages.map((url, i) => (
                <button key={i} onClick={() => setMainImage(i)} className={cn("h-16 w-16 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-colors", i === mainImage ? "border-primary" : "border-transparent")}>
                  <img src={url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </motion.div>

        {/* details */}
        <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{showcase.title}</h1>
            {showcase.rating_count > 0 && (
              <div className="flex items-center gap-1.5 mt-1">
                <Star className="h-4 w-4 fill-primary text-primary" />
                <span className="text-sm font-medium">{showcase.rating_avg?.toFixed(1)}</span>
                <span className="text-sm text-muted-foreground">({showcase.rating_count} reviews)</span>
              </div>
            )}
          </div>

          {price != null && <p className="text-2xl font-bold">{formatPrice(price)}</p>}

          <div className="flex flex-wrap gap-2">
            {showcase.category && <Badge variant="outline">{showcase.category}</Badge>}
            {showcase.tags?.map((t) => <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>)}
            {showcase.reorder_count > 0 && (
              <Badge variant="outline" className="gap-1 text-xs"><RotateCcw className="h-3 w-3" /> Reordered {showcase.reorder_count}×</Badge>
            )}
          </div>

          {showcase.description && <p className="text-sm text-muted-foreground leading-relaxed">{showcase.description}</p>}

          {/* action buttons */}
          <div className="flex flex-wrap gap-3 pt-2">
            <Button onClick={() => toggleFav.mutate({ showcaseId: showcase.id, isFav })} variant="outline" className="gap-2">
              <Heart className={cn("h-4 w-4", isFav && "fill-destructive text-destructive")} />
              {isFav ? "Saved" : "Save"}
            </Button>

            {showcase.reorder_enabled && showcase.approved_by_admin && (
              <Button onClick={handleReorder} className="gap-2">
                <RotateCcw className="h-4 w-4" /> Order This Item
              </Button>
            )}

            {showcase.reorder_enabled && showcase.approved_by_admin && (
              <Button onClick={() => navigate(`/create?modifyShowcase=${showcase.id}`)} variant="secondary" className="gap-2">
                <Pencil className="h-4 w-4" /> Request Modification
              </Button>
            )}
          </div>
        </motion.div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="specs">
        <TabsList>
          <TabsTrigger value="specs" className="gap-1.5"><Info className="h-3.5 w-3.5" /> Specifications</TabsTrigger>
          {allImages.length > 0 && <TabsTrigger value="gallery" className="gap-1.5"><ImageIcon className="h-3.5 w-3.5" /> Gallery</TabsTrigger>}
          <TabsTrigger value="reviews" className="gap-1.5"><Star className="h-3.5 w-3.5" /> Reviews ({reviews.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="specs" className="mt-4">
          <div className="grid gap-3 sm:grid-cols-2 max-w-lg">
            {showcase.materials && <div className="flex justify-between border-b pb-2 text-sm"><span className="text-muted-foreground">Materials</span><span className="font-medium">{showcase.materials}</span></div>}
            {showcase.colors && <div className="flex justify-between border-b pb-2 text-sm"><span className="text-muted-foreground">Colors</span><span className="font-medium">{showcase.colors}</span></div>}
            {showcase.dimensions && <div className="flex justify-between border-b pb-2 text-sm"><span className="text-muted-foreground">Dimensions</span><span className="font-medium">{showcase.dimensions}</span></div>}
            {showcase.size_notes && <div className="flex justify-between border-b pb-2 text-sm"><span className="text-muted-foreground">Size Notes</span><span className="font-medium">{showcase.size_notes}</span></div>}
            {showcase.currency && <div className="flex justify-between border-b pb-2 text-sm"><span className="text-muted-foreground">Currency</span><span className="font-medium">{showcase.currency}</span></div>}
          </div>
        </TabsContent>

        {allImages.length > 0 && (
          <TabsContent value="gallery" className="mt-4">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
              {allImages.map((url, i) => (
                <img key={i} src={url} alt="" className="rounded-lg aspect-square object-cover border" loading="lazy" />
              ))}
            </div>
          </TabsContent>
        )}

        <TabsContent value="reviews" className="mt-4 space-y-6">
          {/* submit review */}
          {!isOwner && !hasReviewed && (
            <form
              className="space-y-3 rounded-lg border p-4 max-w-md"
              onSubmit={(e) => {
                e.preventDefault();
                submitReview.mutate({ showcaseId: showcase.id, rating: reviewRating, comment: reviewComment });
                setReviewComment("");
              }}
            >
              <p className="text-sm font-medium">Leave a review</p>
              <StarSelector value={reviewRating} onChange={setReviewRating} />
              <Textarea value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} placeholder="Your thoughts..." rows={3} />
              <Button type="submit" size="sm" disabled={submitReview.isPending}>Submit</Button>
            </form>
          )}

          {reviews.length === 0 ? (
            <p className="text-sm text-muted-foreground">No reviews yet.</p>
          ) : (
            <div className="space-y-4 max-w-lg">
              {reviews.map((r) => (
                <div key={r.id} className="rounded-lg border p-3 space-y-1">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className={cn("h-3.5 w-3.5", s <= r.rating ? "fill-primary text-primary" : "text-muted-foreground/30")} />
                    ))}
                  </div>
                  {r.comment && <p className="text-sm">{r.comment}</p>}
                  <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
