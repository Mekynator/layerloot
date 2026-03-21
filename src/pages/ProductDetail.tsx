import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Star, ShoppingCart, ChevronLeft, ChevronRight, ShieldCheck, Upload } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import ModelViewer from "@/components/ModelViewer";
import ProductConfigurator from "@/components/ProductConfigurator";
import PrintInfo from "@/components/PrintInfo";
import SizePreview from "@/components/SizePreview";
import { ProductDetailSkeleton } from "@/components/shared/loading-states";
import RatingStars from "@/components/social/RatingStars";
import ProductTrustBadges from "@/components/social/ProductTrustBadges";
import ReviewCard from "@/components/social/ReviewCard";
import ProductCard from "@/components/ProductCard";
import { useProductDetailQuery } from "@/hooks/use-storefront";
import { uploadReviewImage } from "@/lib/review-images";

const REVIEW_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

function prettifyVariantKey(key: string) {
  return key.replace(/_/g, " ");
}

function parseVariantSize(value?: string) {
  if (!value) return null;
  const normalized = value.toLowerCase().replace(/,/g, ".");
  const cubeMatch = normalized.match(/(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)/);
  if (cubeMatch) {
    return {
      length: Number(cubeMatch[1]),
      width: Number(cubeMatch[2]),
      height: Number(cubeMatch[3]),
    };
  }

  const singleMatch = normalized.match(/(\d+(?:\.\d+)?)/);
  if (!singleMatch) return null;
  const size = Number(singleMatch[1]);
  return { length: size, width: size, height: size };
}

const ProductDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const { addItem } = useCart();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data, isLoading } = useProductDetailQuery(slug);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [currentImage, setCurrentImage] = useState(0);
  const [show3D, setShow3D] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 5, title: "", comment: "" });
  const [reviewImageFile, setReviewImageFile] = useState<File | null>(null);
  const [reviewImagePreview, setReviewImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const product = data?.product ?? null;
  const variants = data?.variants ?? [];
  const reviews = data?.reviews ?? [];
  const relatedProducts = data?.relatedProducts ?? [];
  const socialProof = data?.socialProof;
  const selectedVariant = variants.find((variant) => variant.id === selectedVariantId) ?? null;

  useEffect(() => {
    if (variants.length === 0) {
      setSelectedVariantId(null);
      return;
    }

    const stillExists = variants.some((variant) => variant.id === selectedVariantId);
    if (stillExists) return;

    const firstAvailable = variants.find((variant) => variant.stock > 0) ?? variants[0] ?? null;
    setSelectedVariantId(firstAvailable?.id ?? null);
  }, [variants, selectedVariantId]);

  useEffect(() => {
    return () => {
      if (reviewImagePreview) URL.revokeObjectURL(reviewImagePreview);
    };
  }, [reviewImagePreview]);

  const activeAttributes = selectedVariant?.attributes || {};
  const activePrice = selectedVariant ? Number(selectedVariant.price) : product ? Number(product.price) : 0;
  const activeStock = selectedVariant ? selectedVariant.stock : product?.stock ?? 0;
  const activeCompareAtPrice = selectedVariant ? null : product?.compare_at_price ?? null;
  const activeName = selectedVariant ? `${product?.name ?? "Product"} - ${selectedVariant.name}` : product?.name ?? "Product";
  const activeMaterialType = typeof activeAttributes.material === "string" && activeAttributes.material.length > 0
    ? activeAttributes.material
    : product?.material_type ?? null;
  const activeDimensions = useMemo(() => {
    const variantSize = parseVariantSize(typeof activeAttributes.size === "string" ? activeAttributes.size : undefined);
    return variantSize ?? product?.dimensions_cm ?? null;
  }, [activeAttributes.size, product?.dimensions_cm]);
  const activeVariantSummary = Object.entries(activeAttributes).filter(([, value]) => Boolean(value));
  const images = product?.images?.length ? product.images : ["/placeholder.svg"];
  const hasConfiguratorAttrs = variants.length > 0 && variants.some((v) => Object.keys(v.attributes || {}).length > 0);
  const hasSimpleVariants = variants.length > 0 && !hasConfiguratorAttrs;
  const trustBadges = [
    ...(product?.is_featured ? ["best seller"] : []),
    ...(socialProof?.badges ?? []),
    ...(socialProof?.reviewCount ? [`${socialProof.reviewCount} sold signals`] : []),
  ].slice(0, 3);

  const handleAddToCart = () => {
    if (!product) return;
    const variant = selectedVariant;
    const price = variant ? Number(variant.price) : Number(product.price);
    const name = variant ? `${product.name} - ${variant.name}` : product.name;
    const id = variant ? `${product.id}-${variant.id}` : product.id;
    addItem({ id, name, price, image: images[currentImage] || images[0] || "/placeholder.svg", slug: product.slug });
    toast({ title: "Added to cart!", description: name });
  };

  const handleReviewImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (!file) return;

    if (!REVIEW_IMAGE_TYPES.includes(file.type)) {
      toast({ title: "Unsupported image", description: "Use JPG, PNG, or WEBP.", variant: "destructive" });
      return;
    }

    if (reviewImagePreview) URL.revokeObjectURL(reviewImagePreview);
    setReviewImageFile(file);
    setReviewImagePreview(URL.createObjectURL(file));
  };

  const clearReviewImage = () => {
    if (reviewImagePreview) URL.revokeObjectURL(reviewImagePreview);
    setReviewImageFile(null);
    setReviewImagePreview(null);
  };

  const handleSubmitReview = async () => {
    if (!user || !product) return;
    setSubmitting(true);
    const reviewerName =
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email ||
      "LayerLoot Customer";

    try {
      let imageUrl: string | null = null;
      if (reviewImageFile) {
        imageUrl = await uploadReviewImage({
          file: reviewImageFile,
          userId: user.id,
          productId: product.id,
        });
      }

      const { error } = await supabase.from("product_reviews").insert({
        product_id: product.id,
        user_id: user.id,
        rating: reviewForm.rating,
        title: reviewForm.title || null,
        comment: reviewForm.comment || null,
        reviewer_name: reviewerName,
        image_url: imageUrl,
      });

      if (error) throw error;

      toast({ title: "Review submitted!", description: "It will appear after admin approval." });
      setReviewForm({ rating: 5, title: "", comment: "" });
      clearReviewImage();
      queryClient.invalidateQueries({ queryKey: ["product-detail", slug] });
      queryClient.invalidateQueries({ queryKey: ["storefront-catalog"] });
    } catch (error: any) {
      toast({ title: "Error", description: error?.message || "Could not submit review.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container py-10">
        <ProductDetailSkeleton />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <h1 className="mb-4 font-display text-2xl font-bold uppercase text-foreground">Product Not Found</h1>
        <Link to="/products"><Button>Back to Products</Button></Link>
      </div>
    );
  }

  return (
    <div className="py-8 md:py-10">
      <div className="container space-y-12">
        <Link to="/products" className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-primary">
          <ArrowLeft className="h-4 w-4" /> Back to Products
        </Link>

        <div className="grid gap-8 lg:grid-cols-2">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            {show3D && product.model_url ? (
              <ModelViewer url={product.model_url} className="aspect-square" />
            ) : (
              <div className="relative aspect-square overflow-hidden rounded-[1.75rem] border border-border/80 bg-muted shadow-sm">
                <AnimatePresence mode="wait">
                  <motion.img
                    key={currentImage}
                    src={images[currentImage]}
                    alt={activeName}
                    className="h-full w-full object-cover"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                  />
                </AnimatePresence>
                {images.length > 1 && (
                  <>
                    <Button variant="ghost" size="icon" className="absolute left-3 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background"
                      onClick={() => setCurrentImage((p) => (p - 1 + images.length) % images.length)}>
                      <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="absolute right-3 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background"
                      onClick={() => setCurrentImage((p) => (p + 1) % images.length)}>
                      <ChevronRight className="h-5 w-5" />
                    </Button>
                  </>
                )}
                {activeCompareAtPrice && (
                  <Badge className="absolute left-4 top-4 bg-primary font-display uppercase">Sale</Badge>
                )}
              </div>
            )}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {images.map((img, i) => (
                <button key={i} onClick={() => { setCurrentImage(i); setShow3D(false); }}
                  className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition-all duration-200 ${!show3D && i === currentImage ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-muted-foreground"}`}>
                  <img src={img} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
              {product.model_url && (
                <button
                  onClick={() => setShow3D(true)}
                  className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border-2 transition-all duration-200 ${show3D ? "border-primary bg-primary/10 ring-2 ring-primary/20" : "border-border hover:border-primary"}`}
                  title="View 3D Model"
                >
                  <span className="font-display text-xs font-bold uppercase text-primary">3D</span>
                </button>
              )}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            <div className="space-y-3">
              <Badge variant="outline" className="rounded-full border-primary/20 bg-primary/5 uppercase tracking-[0.2em] text-primary">Premium print</Badge>
              <h1 className="font-display text-3xl font-bold uppercase text-foreground lg:text-4xl">{product.name}</h1>
              {selectedVariant ? <p className="font-display text-sm uppercase tracking-[0.18em] text-muted-foreground">{selectedVariant.name}</p> : null}
              <RatingStars rating={socialProof?.averageRating} count={socialProof?.reviewCount} />
              <ProductTrustBadges badges={trustBadges} />
            </div>

            <div className="flex items-baseline gap-3">
              <span className="font-display text-3xl font-bold text-primary">{activePrice.toFixed(2)} kr</span>
              {activeCompareAtPrice && (
                <span className="text-lg text-muted-foreground line-through">{Number(activeCompareAtPrice).toFixed(2)} kr</span>
              )}
            </div>

            {product.description && <p className="max-w-2xl leading-relaxed text-muted-foreground">{product.description}</p>}

            {activeVariantSummary.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {activeVariantSummary.map(([key, value]) => (
                  <Badge key={key} variant="outline" className="font-display text-xs uppercase tracking-wider">
                    {prettifyVariantKey(key)}: {value}
                  </Badge>
                ))}
              </div>
            ) : null}

            <div className="section-surface p-4">
              <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Verified social proof, trusted checkout, and print-ready finishing.
              </div>
              {hasConfiguratorAttrs && (
                <ProductConfigurator variants={variants} selectedVariant={selectedVariant} onSelectVariant={(variant) => setSelectedVariantId(variant?.id ?? null)} />
              )}
              {hasSimpleVariants && (
                <div className="space-y-3">
                  <p className="font-display text-xs font-semibold uppercase tracking-widest text-muted-foreground">Options</p>
                  <div className="flex flex-wrap gap-2">
                    {variants.map((variant) => (
                      <button
                        key={variant.id}
                        onClick={() => setSelectedVariantId(variant.id)}
                        className={`rounded-xl border px-4 py-2 font-display text-sm uppercase transition-all duration-200 ${
                          selectedVariant?.id === variant.id
                            ? "border-primary bg-primary text-primary-foreground shadow-md"
                            : "border-border text-foreground hover:border-primary/50"
                        } ${variant.stock <= 0 ? "cursor-not-allowed opacity-40" : ""}`}
                        disabled={variant.stock <= 0}
                      >
                        {variant.name}
                        {variant.stock <= 0 && " (Out of stock)"}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <PrintInfo
                printTimeHours={product.print_time_hours}
                dimensionsCm={activeDimensions}
                weightGrams={product.weight_grams}
                finishType={product.finish_type}
                materialType={activeMaterialType}
              />
              <SizePreview dimensionsCm={activeDimensions} />
            </div>

            <div className="flex items-center gap-3 text-sm">
              <span className={`font-medium ${activeStock > 0 ? "text-green-600" : "text-destructive"}`}>
                {activeStock > 0 ? `${activeStock} in stock` : "Out of stock"}
              </span>
              {socialProof?.reviewCount ? <span className="text-muted-foreground">Loved by recent buyers</span> : null}
            </div>

            <Button
              size="lg"
              className="w-full font-display uppercase tracking-wider"
              onClick={handleAddToCart}
              disabled={activeStock <= 0 || (variants.length > 0 && !selectedVariant)}
            >
              <ShoppingCart className="mr-2 h-5 w-5" />
              {variants.length > 0 && !selectedVariant ? "Select an option" : "Add to Cart"}
            </Button>
          </motion.div>
        </div>

        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 pt-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-2">
              <Badge variant="outline" className="rounded-full border-primary/20 bg-primary/5 uppercase tracking-[0.2em] text-primary">Customer reviews</Badge>
              <h2 className="font-display text-2xl font-bold uppercase text-foreground">
                Customer Reviews {reviews.length > 0 && `(${reviews.length})`}
              </h2>
            </div>
          </div>

          {user ? (
            <Card className="border-border/70 shadow-sm">
              <CardContent className="grid gap-4 p-6 md:grid-cols-2">
                <div className="space-y-4">
                  <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-foreground">Write a Review</h3>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button key={s} type="button" onClick={() => setReviewForm({ ...reviewForm, rating: s })}>
                        <Star className={`h-6 w-6 transition-colors ${s <= reviewForm.rating ? "fill-primary text-primary" : "text-muted-foreground hover:text-primary"}`} />
                      </button>
                    ))}
                  </div>
                  <Input placeholder="Review title (optional)" value={reviewForm.title} onChange={(e) => setReviewForm({ ...reviewForm, title: e.target.value })} />
                  <Textarea placeholder="Your review..." value={reviewForm.comment} onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })} rows={4} />
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="font-display text-sm font-semibold uppercase tracking-wider text-foreground">Photo (optional)</label>
                    <Input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleReviewImageChange} />
                    <p className="text-sm text-muted-foreground">Images are compressed before upload to keep storage usage small.</p>
                  </div>
                  {reviewImagePreview ? (
                    <div className="space-y-3 rounded-2xl border border-border/70 bg-muted/30 p-4">
                      <img src={reviewImagePreview} alt="Review preview" className="h-40 w-full rounded-xl object-cover" />
                      <Button type="button" variant="outline" onClick={clearReviewImage}>Remove Photo</Button>
                    </div>
                  ) : (
                    <div className="flex h-40 items-center justify-center rounded-2xl border border-dashed border-border/70 bg-muted/20 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Upload className="h-4 w-4" />
                        Upload a photo of your print
                      </div>
                    </div>
                  )}
                  <Button onClick={handleSubmitReview} disabled={submitting} className="font-display uppercase tracking-wider">
                    {submitting ? "Submitting..." : "Submit Review"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border/70 shadow-sm">
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground"><Link to="/auth" className="text-primary hover:underline">Sign in</Link> to leave a review.</p>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            {reviews.length === 0 ? (
              <div className="section-surface px-6 py-12 text-center text-muted-foreground">No reviews yet. Be the first to leave feedback.</div>
            ) : reviews.map((review) => <ReviewCard key={review.id} review={review} />)}
          </div>
        </motion.section>

        {relatedProducts.length > 0 ? (
          <section className="space-y-6">
            <div className="space-y-2">
              <Badge variant="outline" className="rounded-full border-primary/20 bg-primary/5 uppercase tracking-[0.2em] text-primary">You may also like</Badge>
              <h2 className="font-display text-2xl font-bold uppercase text-foreground">Keep the build going</h2>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
              {relatedProducts.map((related, index) => (
                <ProductCard key={related.id} product={related} index={index} />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
};

export default ProductDetail;
