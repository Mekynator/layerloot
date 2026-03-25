import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  Star,
  ShoppingCart,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Upload,
  X,
  Ruler,
  PackageCheck,
  Check,
} from "lucide-react";
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

function getColorStyle(value: string) {
  const normalized = value.trim().toLowerCase();

  const colorMap: Record<string, string> = {
    gray: "#8b8b8b",
    grey: "#8b8b8b",
    black: "#262626",
    white: "#f5f5f5",
    red: "#dc2626",
    blue: "#2563eb",
    green: "#16a34a",
    yellow: "#eab308",
    orange: "#f97316",
    purple: "#9333ea",
    pink: "#ec4899",
    brown: "#8b5e3c",
    silver: "#b7bcc5",
    gold: "#d4af37",
  };

  return colorMap[normalized] ?? "#9ca3af";
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
  const activeStock = selectedVariant ? selectedVariant.stock : (product?.stock ?? 0);
  const activeCompareAtPrice = selectedVariant ? null : (product?.compare_at_price ?? null);
  const activeName = selectedVariant
    ? `${product?.name ?? "Product"} - ${selectedVariant.name}`
    : (product?.name ?? "Product");
  const activeMaterialType =
    typeof activeAttributes.material === "string" && activeAttributes.material.length > 0
      ? activeAttributes.material
      : (product?.material_type ?? null);

  const activeDimensions = useMemo(() => {
    const variantSize = parseVariantSize(typeof activeAttributes.size === "string" ? activeAttributes.size : undefined);
    return variantSize ?? product?.dimensions_cm ?? null;
  }, [activeAttributes.size, product?.dimensions_cm]);

  const images = product?.images?.length ? product.images : ["/placeholder.svg"];
  const hasConfiguratorAttrs =
    variants.length > 0 && variants.some((variant) => Object.keys(variant.attributes || {}).length > 0);
  const hasSimpleVariants = variants.length > 0 && !hasConfiguratorAttrs;

  const trustBadges = [
    ...(product?.is_featured ? ["best seller"] : []),
    ...(socialProof?.badges ?? []),
    ...(socialProof?.reviewCount ? [`${socialProof.reviewCount} sold signals`] : []),
  ].slice(0, 3);

  const attributeGroups = useMemo(() => {
    const groups = new Map<string, string[]>();

    variants.forEach((variant) => {
      Object.entries(variant.attributes || {}).forEach(([key, rawValue]) => {
        const value = String(rawValue ?? "").trim();
        if (!value) return;

        const existing = groups.get(key) ?? [];
        if (!existing.includes(value)) existing.push(value);
        groups.set(key, existing);
      });
    });

    return Array.from(groups.entries()).map(([key, values]) => ({ key, values }));
  }, [variants]);

  const handleAttributeSelect = (attributeKey: string, value: string) => {
    const currentAttrs = selectedVariant?.attributes || {};
    const nextAttrs = {
      ...currentAttrs,
      [attributeKey]: value,
    };

    const exactMatch = variants.find((variant) =>
      Object.entries(nextAttrs).every(
        ([key, attrValue]) => String(variant.attributes?.[key] ?? "") === String(attrValue),
      ),
    );

    if (exactMatch) {
      setSelectedVariantId(exactMatch.id);
      return;
    }

    const partialMatch = variants.find((variant) => String(variant.attributes?.[attributeKey] ?? "") === String(value));

    if (partialMatch) {
      setSelectedVariantId(partialMatch.id);
    }
  };

  const handleAddToCart = () => {
    if (!product) return;

    const variant = selectedVariant;
    const price = variant ? Number(variant.price) : Number(product.price);
    const name = variant ? `${product.name} - ${variant.name}` : product.name;
    const id = variant ? `${product.id}-${variant.id}` : product.id;

    addItem({
      id,
      name,
      price,
      image: images[currentImage] || images[0] || "/placeholder.svg",
      slug: product.slug,
    });

    toast({ title: "Added to cart!", description: name });
  };

  const handleReviewImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (!file) return;

    if (!REVIEW_IMAGE_TYPES.includes(file.type)) {
      toast({
        title: "Unsupported image",
        description: "Use JPG, PNG, or WEBP.",
        variant: "destructive",
      });
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
      user.user_metadata?.full_name || user.user_metadata?.name || user.email || "LayerLoot Customer";

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

      toast({
        title: "Review submitted!",
        description: "It will appear after admin approval.",
      });

      setReviewForm({ rating: 5, title: "", comment: "" });
      clearReviewImage();

      queryClient.invalidateQueries({ queryKey: ["product-detail", slug] });
      queryClient.invalidateQueries({ queryKey: ["storefront-catalog"] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Could not submit review.",
        variant: "destructive",
      });
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
        <Link to="/products">
          <Button>Back to Products</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="py-8 md:py-10">
      <div className="container space-y-12">
        <Link
          to="/products"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Products
        </Link>

        <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
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
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute left-3 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background"
                      onClick={() => setCurrentImage((prev) => (prev - 1 + images.length) % images.length)}
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-3 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background"
                      onClick={() => setCurrentImage((prev) => (prev + 1) % images.length)}
                    >
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
                <button
                  key={i}
                  onClick={() => {
                    setCurrentImage(i);
                    setShow3D(false);
                  }}
                  className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition-all duration-200 ${
                    !show3D && i === currentImage
                      ? "border-primary ring-2 ring-primary/20"
                      : "border-border hover:border-muted-foreground"
                  }`}
                >
                  <img src={img} alt="" className="h-full w-full object-cover" />
                </button>
              ))}

              {product.model_url && (
                <button
                  onClick={() => setShow3D(true)}
                  className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border-2 transition-all duration-200 ${
                    show3D
                      ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                      : "border-border hover:border-primary"
                  }`}
                  title="View 3D Model"
                >
                  <span className="font-display text-xs font-bold uppercase text-primary">3D</span>
                </button>
              )}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            <div className="space-y-3">
              <h1 className="font-display text-3xl font-bold uppercase text-foreground lg:text-4xl">{product.name}</h1>

              {selectedVariant ? (
                <p className="font-display text-sm uppercase tracking-[0.18em] text-muted-foreground">
                  {selectedVariant.name}
                </p>
              ) : null}

              <RatingStars rating={socialProof?.averageRating} count={socialProof?.reviewCount} />
              <ProductTrustBadges badges={trustBadges} />
            </div>

            <div className="flex items-baseline gap-3">
              <span className="font-display text-3xl font-bold text-primary">{activePrice.toFixed(2)} kr</span>
              {activeCompareAtPrice && (
                <span className="text-lg text-muted-foreground line-through">
                  {Number(activeCompareAtPrice).toFixed(2)} kr
                </span>
              )}
            </div>

            {product.description && (
              <p className="max-w-2xl leading-relaxed text-muted-foreground">{product.description}</p>
            )}

            <div className="w-full max-w-[260px] rounded-[1.5rem] border border-border/80 bg-card p-4 shadow-sm">
              <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Verified social proof, trusted checkout, and print-ready finishing.
              </div>

              {hasConfiguratorAttrs && (
                <div className="space-y-4">
                  {attributeGroups.map(({ key, values }) => {
                    const selectedValue = String(activeAttributes[key] ?? "");
                    const isColor = key.toLowerCase() === "color";

                    return (
                      <div key={key} className="space-y-2">
                        <div className="font-display text-xs font-semibold uppercase tracking-[0.18em] text-foreground">
                          {prettifyVariantKey(key)}:{" "}
                          <span className="text-muted-foreground">{selectedValue || values[0]}</span>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {values.map((value) => {
                            const selected = value === selectedValue;

                            if (isColor) {
                              return (
                                <button
                                  key={value}
                                  type="button"
                                  onClick={() => handleAttributeSelect(key, value)}
                                  className={`relative flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all ${
                                    selected
                                      ? "border-primary ring-2 ring-primary/20"
                                      : "border-border hover:border-primary/50"
                                  }`}
                                  title={value}
                                >
                                  <span
                                    className="h-6 w-6 rounded-full"
                                    style={{ backgroundColor: getColorStyle(value) }}
                                  />
                                  {selected ? <Check className="absolute h-3.5 w-3.5 text-white drop-shadow" /> : null}
                                </button>
                              );
                            }

                            return (
                              <button
                                key={value}
                                type="button"
                                onClick={() => handleAttributeSelect(key, value)}
                                className={`rounded-lg border px-3 py-2 font-display text-sm uppercase transition-all ${
                                  selected
                                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                                    : "border-border bg-background text-foreground hover:border-primary/50"
                                }`}
                              >
                                {value}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {hasSimpleVariants && (
                <div className="space-y-3">
                  <p className="font-display text-xs font-semibold uppercase tracking-[0.18em] text-foreground">
                    Options
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {variants.map((variant) => (
                      <button
                        key={variant.id}
                        type="button"
                        onClick={() => setSelectedVariantId(variant.id)}
                        className={`rounded-lg border px-3 py-2 font-display text-sm uppercase transition-all ${
                          selectedVariant?.id === variant.id
                            ? "border-primary bg-primary text-primary-foreground shadow-sm"
                            : "border-border bg-background text-foreground hover:border-primary/50"
                        } ${variant.stock <= 0 ? "cursor-not-allowed opacity-40" : ""}`}
                        disabled={variant.stock <= 0}
                      >
                        {variant.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-start gap-4">
              <Card className="w-fit max-w-full border-border/70 shadow-sm">
                <CardContent className="p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <PackageCheck className="h-4 w-4 text-primary" />
                    <h3 className="font-display text-sm font-bold uppercase tracking-[0.18em] text-foreground">
                      Details
                    </h3>
                  </div>

                  <div className="flex flex-wrap gap-4 text-sm">
                    {activeMaterialType ? (
                      <div className="min-w-[110px] rounded-xl bg-muted/30 px-3 py-2">
                        <div className="font-display text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                          Material
                        </div>
                        <div className="mt-1 font-semibold uppercase text-foreground">{activeMaterialType}</div>
                      </div>
                    ) : null}

                    {activeDimensions ? (
                      <div className="min-w-[150px] rounded-xl bg-muted/30 px-3 py-2">
                        <div className="flex items-center gap-2 font-display text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                          <Ruler className="h-3.5 w-3.5 text-primary" />
                          Dimensions
                        </div>
                        <div className="mt-1 font-semibold text-foreground">
                          {activeDimensions.length} × {activeDimensions.width} × {activeDimensions.height} cm
                        </div>
                      </div>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
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
              <Badge
                variant="outline"
                className="rounded-full border-primary/20 bg-primary/5 uppercase tracking-[0.2em] text-primary"
              >
                Customer reviews
              </Badge>
              <h2 className="font-display text-2xl font-bold uppercase text-foreground">
                Customer Reviews {reviews.length > 0 && `(${reviews.length})`}
              </h2>
            </div>
          </div>

          {user ? (
            <Card className="border-border/70 shadow-sm">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-foreground">
                    Write a Review
                  </h3>

                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((score) => (
                      <button key={score} type="button" onClick={() => setReviewForm({ ...reviewForm, rating: score })}>
                        <Star
                          className={`h-6 w-6 transition-colors ${
                            score <= reviewForm.rating
                              ? "fill-primary text-primary"
                              : "text-muted-foreground hover:text-primary"
                          }`}
                        />
                      </button>
                    ))}
                  </div>

                  <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_150px] lg:items-start">
                    <div className="space-y-3">
                      <Input
                        className="w-full"
                        placeholder="Review title (optional)"
                        value={reviewForm.title}
                        onChange={(e) => setReviewForm({ ...reviewForm, title: e.target.value })}
                      />

                      <Textarea
                        className="w-full"
                        placeholder="Your review..."
                        value={reviewForm.comment}
                        onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                        rows={5}
                      />
                    </div>

                    <div className="flex flex-col gap-3">
                      <div className="overflow-hidden rounded-2xl border border-border/70 bg-muted/20">
                        {reviewImagePreview ? (
                          <img src={reviewImagePreview} alt="Review preview" className="h-24 w-full object-cover" />
                        ) : (
                          <div className="flex h-24 items-center justify-center px-3 text-center text-xs text-muted-foreground">
                            Optional photo preview
                          </div>
                        )}
                      </div>

                      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border/70 px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary">
                        <Upload className="h-4 w-4" />
                        <span>{reviewImageFile ? "Change photo" : "Add photo"}</span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={handleReviewImageChange}
                          className="hidden"
                        />
                      </label>

                      {reviewImageFile ? (
                        <button
                          type="button"
                          onClick={clearReviewImage}
                          className="inline-flex items-center justify-center gap-1 text-sm text-muted-foreground transition-colors hover:text-destructive"
                        >
                          <X className="h-4 w-4" />
                          Remove
                        </button>
                      ) : null}

                      <Button
                        onClick={handleSubmitReview}
                        disabled={submitting}
                        className="w-full font-display uppercase tracking-wider"
                      >
                        {submitting ? "Submitting..." : "Submit Review"}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border/70 shadow-sm">
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">
                  <Link to="/auth" className="text-primary hover:underline">
                    Sign in
                  </Link>{" "}
                  to leave a review.
                </p>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            {reviews.length === 0 ? (
              <div className="section-surface px-6 py-12 text-center text-muted-foreground">
                No reviews yet. Be the first to leave feedback.
              </div>
            ) : (
              reviews.map((review) => <ReviewCard key={review.id} review={review} />)
            )}
          </div>
        </motion.section>

        {relatedProducts.length > 0 ? (
          <section className="space-y-6">
            <div className="space-y-2">
              <Badge
                variant="outline"
                className="rounded-full border-primary/20 bg-primary/5 uppercase tracking-[0.2em] text-primary"
              >
                You may also like
              </Badge>
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
