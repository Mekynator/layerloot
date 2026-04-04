import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Star, ShoppingCart, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { useTranslation } from "react-i18next";
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
import { ProductDetailSkeleton } from "@/components/shared/loading-states";
import RatingStars from "@/components/social/RatingStars";
import { formatPrice } from "@/lib/currency";

import ReviewCard from "@/components/social/ReviewCard";
import ProductCard from "@/components/ProductCard";

import ProductQA from "@/components/product/ProductQA";
import StickyAddToCart from "@/components/product/StickyAddToCart";
import RecentlyViewedSection from "@/components/product/RecentlyViewedSection";
import { useRecentlyViewedProducts } from "@/hooks/use-recently-viewed";
import { useProductDetailQuery } from "@/hooks/use-storefront";
import ProductFOMOBar from "@/components/smart/ProductFOMOBar";
import FrequentlyBoughtTogether from "@/components/smart/FrequentlyBoughtTogether";
import ProductColorPicker, { type SelectedColor } from "@/components/product/ProductColorPicker";
import ProductDetailSections from "@/components/product/ProductDetailSections";
import ProductColorSummary from "@/components/product/ProductColorSummary";

const AUTO_GALLERY_MS = 6500;

const ProductDetail = () => {
  const { t } = useTranslation("common");
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
  const [submitting, setSubmitting] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const [selectedColors, setSelectedColors] = useState<SelectedColor[]>([]);

  const heroImageRef = useRef<HTMLImageElement | null>(null);
  const addToCartSectionRef = useRef<HTMLDivElement | null>(null);
  const { recentProducts, trackProduct } = useRecentlyViewedProducts();

  const product = data?.product ?? null;
  const variants = data?.variants ?? [];
  const reviews = data?.reviews ?? [];
  const relatedProducts = data?.relatedProducts ?? [];
  const socialProof = data?.socialProof;
  const selectedVariant = variants.find((variant) => variant.id === selectedVariantId) ?? null;

  const activePrice = selectedVariant ? Number(selectedVariant.price) : product ? Number(product.price) : 0;
  const activeStock = selectedVariant ? selectedVariant.stock : (product?.stock ?? 0);
  const images = useMemo(() => (product?.images?.length ? product.images : ["/placeholder.svg"]), [product?.images]);
  const hasConfiguratorAttrs = variants.length > 0 && variants.some((v) => Object.keys(v.attributes || {}).length > 0);
  const hasSimpleVariants = variants.length > 0 && !hasConfiguratorAttrs;

  useEffect(() => {
    if (show3D || images.length <= 1) return;
    const timer = window.setInterval(() => {
      setCurrentImage((p) => (p + 1) % images.length);
    }, AUTO_GALLERY_MS);
    return () => window.clearInterval(timer);
  }, [images.length, show3D]);

  useEffect(() => {
    if (!justAdded) return;
    const timer = window.setTimeout(() => setJustAdded(false), 1500);
    return () => window.clearTimeout(timer);
  }, [justAdded]);

  // Track recently viewed product
  useEffect(() => {
    if (!product) return;
    trackProduct({
      id: product.id,
      name: product.name,
      slug: product.slug,
      image: product.images?.[0] || "/placeholder.svg",
      price: Number(product.price),
    });
  }, [product?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAddToCart = () => {
    if (!product) return;

    // Validate color requirement
    if ((product as any).enable_color_picker && (product as any).color_required && selectedColors.length === 0) {
      toast({ title: "Please select a color", description: "Color selection is required for this product.", variant: "destructive" });
      return;
    }

    const variant = selectedVariant;
    const price = variant ? Number(variant.price) : Number(product.price);
    const colorSuffix = selectedColors.length > 0 ? ` (${selectedColors.map(c => c.name).join(", ")})` : "";
    const name = variant ? `${product.name} - ${variant.name}${colorSuffix}` : `${product.name}${colorSuffix}`;
    const id = variant ? `${product.id}-${variant.id}` : product.id;

    const rect = heroImageRef.current?.getBoundingClientRect();

    addItem(
      { id, name, price, image: images[currentImage] || "/placeholder.svg", slug: product.slug },
      rect
        ? {
            sourceRect: {
              left: rect.left,
              top: rect.top,
              width: rect.width,
              height: rect.height,
            },
            sourceImage: images[currentImage] || "/placeholder.svg",
          }
        : undefined,
    );

    setJustAdded(true);
    toast({ title: t("common.addedToCart"), description: name });
  };

  const handleSubmitReview = async () => {
    if (!user || !product) return;
    setSubmitting(true);

    const { error } = await supabase.from("product_reviews").insert({
      product_id: product.id,
      user_id: user.id,
      rating: reviewForm.rating,
      title: reviewForm.title || null,
      comment: reviewForm.comment || null,
    });

    setSubmitting(false);
    if (error) {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    } else {
      toast({ title: t("products.reviewSubmitted"), description: t("products.reviewApproval") });
      setReviewForm({ rating: 5, title: "", comment: "" });
      queryClient.invalidateQueries({ queryKey: ["product-detail", slug] });
      queryClient.invalidateQueries({ queryKey: ["storefront-catalog"] });
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
        <h1 className="mb-4 font-display text-2xl font-bold uppercase text-foreground">{t("products.productNotFound")}</h1>
        <Link to="/products">
          <Button>{t("products.backToProducts")}</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="py-6 pb-24 md:py-10 md:pb-10">
      <div className="container space-y-8 md:space-y-12 px-4 md:px-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Link
            to="/products"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" /> {t("products.backToProducts")}
          </Link>
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            {show3D && product.model_url ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <ModelViewer url={product.model_url} className="aspect-square" />
              </motion.div>
            ) : (
              <div className="glass-card relative aspect-square overflow-hidden rounded-[1.75rem]">
                <AnimatePresence mode="wait">
                  <motion.img
                    ref={heroImageRef}
                    key={currentImage}
                    src={images[currentImage]}
                    alt={product.name}
                    className="h-full w-full object-cover"
                    initial={{ opacity: 0, scale: 1.02 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  />
                </AnimatePresence>

                {images.length > 1 && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute left-3 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background"
                      onClick={() => setCurrentImage((p) => (p - 1 + images.length) % images.length)}
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-3 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background"
                      onClick={() => setCurrentImage((p) => (p + 1) % images.length)}
                    >
                      <ChevronRight className="h-5 w-5" />
                    </Button>
                  </>
                )}

                {product.compare_at_price && (
                  <Badge className="absolute left-4 top-4 bg-primary font-display uppercase">{t("products.sale")}</Badge>
                )}

                {images.length > 1 && (
                  <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2 rounded-full bg-background/65 px-3 py-1.5 backdrop-blur-sm">
                    {images.map((_, idx) => (
                      <button
                        key={`detail-dot-${idx}`}
                        onClick={() => setCurrentImage(idx)}
                        className={`h-1.5 rounded-full transition-all ${idx === currentImage ? "w-5 bg-white" : "w-1.5 bg-white/45"}`}
                        aria-label={`Show image ${idx + 1}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2 overflow-x-auto pb-1">
              {images.map((img, i) => (
                <motion.button
                  whileHover={{ y: -2 }}
                  key={i}
                  onClick={() => {
                    setCurrentImage(i);
                    setShow3D(false);
                  }}
                  className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl transition-all duration-200 ${
                    !show3D && i === currentImage
                      ? "ring-2 ring-primary shadow-lg shadow-primary/20"
                      : "opacity-70 hover:opacity-100"
                  }`}
                >
                  <img src={img} alt="" className="h-full w-full object-cover" />
                </motion.button>
              ))}
              {product.model_url && (
                <motion.button
                  whileHover={{ y: -2 }}
                  onClick={() => setShow3D(true)}
                  className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-xl transition-all duration-200 ${
                    show3D
                      ? "bg-primary/10 ring-2 ring-primary shadow-lg shadow-primary/20"
                      : "bg-muted/30 opacity-70 hover:opacity-100 hover:bg-primary/5"
                  }`}
                  title={t("products.view3D")}
                >
                  <span className="font-display text-xs font-bold uppercase text-primary">3D</span>
                </motion.button>
              )}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            <div className="space-y-3">
              <Badge
                variant="outline"
                className="rounded-full border-primary/20 bg-primary/5 uppercase tracking-[0.2em] text-primary"
              >
                {t("products.premiumPrint")}
              </Badge>
              <h1 className="font-display text-3xl font-bold uppercase text-foreground lg:text-4xl">{product.name}</h1>
              <RatingStars rating={socialProof?.averageRating} count={socialProof?.reviewCount} />
              
              <ProductFOMOBar productId={product.id} stock={activeStock} />
            </div>

            <motion.div
              key={activePrice}
              initial={{ opacity: 0.6, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-baseline gap-3"
            >
              <span className="font-display text-3xl font-bold text-primary">{formatPrice(activePrice)}</span>
              {product.compare_at_price && !selectedVariant && (
                <span className="text-lg text-muted-foreground line-through">
                  {formatPrice(Number(product.compare_at_price))}
                </span>
              )}
            </motion.div>

            {product.description && (
              <div className="max-w-2xl leading-relaxed text-muted-foreground whitespace-pre-line">{product.description}</div>
            )}

            {/* Color summary tile under description */}
            <ProductColorSummary productId={product.id} />

            <motion.div whileHover={{ y: -2 }} className="section-surface p-4">

              {hasConfiguratorAttrs && (
                <ProductConfigurator
                  variants={variants}
                  selectedVariant={selectedVariant}
                  onSelectVariant={(variant) => setSelectedVariantId(variant?.id ?? null)}
                />
              )}

              {hasSimpleVariants && (
                <div className="space-y-3">
                  <p className="font-display text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    {t("products.options")}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {variants.map((variant) => (
                      <motion.button
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        key={variant.id}
                        onClick={() => setSelectedVariantId(selectedVariant?.id === variant.id ? null : variant.id)}
                        className={`rounded-xl px-4 py-2 font-display text-sm uppercase transition-all duration-200 ${
                          selectedVariant?.id === variant.id
                            ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                            : "bg-muted/30 text-foreground hover:bg-primary/10"
                        }`}
                      >
                        {variant.name}
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>

            <motion.div whileHover={{ y: -2 }}>
              <PrintInfo
                printTimeHours={product.print_time_hours}
                dimensionsCm={product.dimensions_cm}
                weightGrams={product.weight_grams}
                finishType={product.finish_type}
                materialType={product.material_type}
              />
            </motion.div>

            {/* Color Picker */}
            {(product as any).enable_color_picker && (
              <motion.div whileHover={{ y: -2 }} className="section-surface p-4">
                <ProductColorPicker
                  productId={product.id}
                  selectionMode={(product as any).color_selection_mode ?? "single"}
                  required={(product as any).color_required ?? false}
                  selectedColors={selectedColors}
                  onColorsChange={setSelectedColors}
                />
              </motion.div>
            )}

            <div className="flex items-center gap-3 text-sm">
              <span className="font-medium text-green-500">
                {activeStock > 0 ? t("products.inStock", { count: activeStock }) : t("products.madeToOrder", "Made to order")}
              </span>
            </div>

            <div className="relative" ref={addToCartSectionRef}>
              <Button
                size="lg"
                className={`w-full font-display uppercase tracking-wider transition-all duration-300 shadow-[0_0_20px_hsl(var(--primary)/0.2)] hover:shadow-[0_0_32px_hsl(var(--primary)/0.35)] ${justAdded ? "shadow-[0_0_28px_hsl(var(--primary)/0.45)]" : ""}`}
                onClick={handleAddToCart}
                disabled={(variants.length > 0 && !selectedVariant && !hasConfiguratorAttrs)}
              >
                {justAdded ? (
                  <>
                    <Check className="mr-2 h-5 w-5" />
                    {t("products.addedToCart")}
                  </>
                ) : (
                  <>
                    <ShoppingCart className="mr-2 h-5 w-5" />
                    {variants.length > 0 && !selectedVariant && !hasConfiguratorAttrs
                      ? t("products.selectOption")
                      : t("products.addToCart")}
                  </>
                )}
              </Button>

              <AnimatePresence>
                {justAdded && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.96 }}
                    className="pointer-events-none absolute left-1/2 top-full mt-3 -translate-x-1/2 whitespace-nowrap rounded-full border border-primary/20 bg-background/95 px-3 py-1.5 text-xs font-medium text-primary shadow-sm"
                  >
                    {t("products.readyInCart")}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>

        {/* Product Detail Sections (Video / Carousel) */}
        <ProductDetailSections productId={product.id} />

        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 pt-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-2">
              <Badge
                variant="outline"
                className="rounded-full border-primary/20 bg-primary/5 uppercase tracking-[0.2em] text-primary"
              >
                {t("products.customerReviews")}
              </Badge>
              <h2 className="font-display text-2xl font-bold uppercase text-foreground">
                {reviews.length > 0 ? t("products.reviewsCount", { count: reviews.length }) : t("products.customerReviews")}
              </h2>
            </div>
          </div>

          {user ? (
            <Card className="w-full max-w-3xl border-border/70 shadow-sm lg:ml-2">
              <CardContent className="grid gap-4 p-6 md:grid-cols-[1fr_auto] md:items-end">
                <div className="space-y-4">
                  <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-foreground">
                    {t("products.writeReview")}
                  </h3>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <motion.button
                        whileHover={{ y: -1, scale: 1.05 }}
                        key={s}
                        onClick={() => setReviewForm({ ...reviewForm, rating: s })}
                      >
                        <Star
                          className={`h-6 w-6 transition-colors ${s <= reviewForm.rating ? "fill-primary text-primary" : "text-muted-foreground hover:text-primary"}`}
                        />
                      </motion.button>
                    ))}
                  </div>
                  <Input
                    placeholder={t("products.reviewTitle")}
                    value={reviewForm.title}
                    onChange={(e) => setReviewForm({ ...reviewForm, title: e.target.value })}
                  />
                  <Textarea
                    placeholder={t("products.yourReview")}
                    value={reviewForm.comment}
                    onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="flex items-end justify-end">
                  <Button
                    onClick={handleSubmitReview}
                    disabled={submitting}
                    className="font-display uppercase tracking-wider"
                  >
                    {submitting ? t("products.submitting") : t("products.submitReview")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border/70 shadow-sm">
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">
                  <Link to="/auth" className="text-primary hover:underline">
                    {t("auth.signIn")}
                  </Link>{" "}
                  {t("auth.signInToReview")}
                </p>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            {reviews.length === 0 ? (
              <div className="section-surface px-6 py-12 text-center text-muted-foreground">
                {t("products.noReviews")}
              </div>
            ) : (
              reviews.map((review, index) => (
                <motion.div
                  key={review.id}
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.04 }}
                >
                  <ReviewCard review={review} />
                </motion.div>
              ))
            )}
          </div>
        </motion.section>

        {/* Product Q&A */}
        <ProductQA productId={product.id} />

        {/* Frequently bought together */}
        {relatedProducts.length >= 2 && (
          <FrequentlyBoughtTogether
            products={[product, ...relatedProducts.slice(0, 2)].map((p) => ({
              ...p,
              images: p.images || [],
              is_featured: (p as any).is_featured ?? false,
              category_id: (p as any).category_id ?? null,
              model_url: (p as any).model_url ?? null,
              compare_at_price: (p as any).compare_at_price ?? null,
            }))}
            onAddAll={() => {
              [product, ...relatedProducts.slice(0, 2)].forEach((p) => {
                addItem({
                  id: p.id,
                  name: p.name,
                  price: Number(p.price),
                  image: p.images?.[0] || "/placeholder.svg",
                  slug: p.slug,
                });
              });
              toast({ title: "Bundle added to cart!", description: `${3} items added` });
            }}
          />
        )}

        {relatedProducts.length > 0 ? (
          <section className="space-y-6">
            <div className="space-y-2">
              <Badge
                variant="outline"
                className="rounded-full border-primary/20 bg-primary/5 uppercase tracking-[0.2em] text-primary"
              >
                {t("products.youMayAlsoLike")}
              </Badge>
              <h2 className="font-display text-2xl font-bold uppercase text-foreground">{t("products.keepBuilding")}</h2>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
              {relatedProducts.map((related, index) => (
                <ProductCard key={related.id} product={related} index={index} />
              ))}
            </div>
          </section>
        ) : null}

        {/* Recently Viewed */}
        <RecentlyViewedSection
          products={recentProducts.filter((p) => p.id !== product.id)}
          maxItems={6}
        />
      </div>

      {/* Sticky Add-to-Cart bar */}
      <StickyAddToCart
        product={product}
        price={activePrice}
        stock={activeStock}
        disabled={(variants.length > 0 && !selectedVariant && !hasConfiguratorAttrs)}
        onAddToCart={handleAddToCart}
        justAdded={justAdded}
        observeRef={addToCartSectionRef}
        variantLabel={selectedVariant?.name}
      />
    </div>
  );
};

export default ProductDetail;
