import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Star, ShoppingCart, ChevronLeft, ChevronRight } from "lucide-react";
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

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  compare_at_price: number | null;
  images: string[];
  stock: number;
  is_active: boolean;
  category_id: string | null;
  model_url: string | null;
  print_time_hours: number | null;
  dimensions_cm: { length?: number; width?: number; height?: number } | null;
  weight_grams: number | null;
  finish_type: string | null;
  material_type: string | null;
}

interface Variant {
  id: string;
  name: string;
  price: number;
  stock: number;
  attributes: Record<string, string>;
  is_active: boolean;
}

interface Review {
  id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  created_at: string;
  user_id: string;
}

const ProductDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const { addItem } = useCart();
  const { user } = useAuth();
  const { toast } = useToast();
  const [product, setProduct] = useState<Product | null>(null);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
  const [currentImage, setCurrentImage] = useState(0);
  const [show3D, setShow3D] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 5, title: "", comment: "" });
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    const fetchProduct = async () => {
      const { data } = await supabase
        .from("products")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      if (data) {
        setProduct(data as unknown as Product);
        const { data: vars } = await supabase
          .from("product_variants")
          .select("*")
          .eq("product_id", data.id)
          .eq("is_active", true)
          .order("sort_order");
        const typedVars = (vars as unknown as Variant[]) ?? [];
        setVariants(typedVars);
        // Auto-select first variant if configurator attributes exist
        if (typedVars.length > 0 && Object.keys(typedVars[0].attributes || {}).length > 0) {
          setSelectedVariant(typedVars[0]);
        }
        const { data: revs } = await supabase
          .from("product_reviews")
          .select("id, rating, title, comment, created_at, user_id")
          .eq("product_id", data.id)
          .eq("is_approved", true)
          .order("created_at", { ascending: false });
        setReviews((revs as Review[]) ?? []);
      }
      setLoading(false);
    };
    fetchProduct();
  }, [slug]);

  const handleAddToCart = () => {
    if (!product) return;
    const v = selectedVariant;
    const price = v ? Number(v.price) : Number(product.price);
    const name = v ? `${product.name} - ${v.name}` : product.name;
    const id = v ? `${product.id}-${v.id}` : product.id;
    addItem({ id, name, price, image: product.images?.[0] || "/placeholder.svg" });
    toast({ title: "Added to cart!", description: name });
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
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Review submitted!", description: "It will appear after admin approval." });
      setReviewForm({ rating: 5, title: "", comment: "" });
    }
  };

  const avgRating = reviews.length > 0
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  const activePrice = selectedVariant ? Number(selectedVariant.price) : product ? Number(product.price) : 0;
  const activeStock = selectedVariant ? selectedVariant.stock : product?.stock ?? 0;
  const images = product?.images?.length ? product.images : ["/placeholder.svg"];

  // Check if variants use attributes (configurator) vs simple named variants
  const hasConfiguratorAttrs = variants.length > 0 && variants.some((v) => Object.keys(v.attributes || {}).length > 0);
  const hasSimpleVariants = variants.length > 0 && !hasConfiguratorAttrs;

  if (loading) return <div className="flex items-center justify-center py-24 text-muted-foreground">Loading...</div>;
  if (!product) return (
    <div className="flex flex-col items-center justify-center py-24">
      <h1 className="mb-4 font-display text-2xl font-bold uppercase text-foreground">Product Not Found</h1>
      <Link to="/products"><Button>Back to Products</Button></Link>
    </div>
  );

  return (
    <div className="py-8">
      <div className="container">
        <Link to="/products" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Products
        </Link>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Image Gallery / 3D Viewer */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            {show3D && product.model_url ? (
              <ModelViewer url={product.model_url} className="aspect-square" />
            ) : (
              <div className="relative aspect-square overflow-hidden rounded-lg border border-border bg-muted">
                <AnimatePresence mode="wait">
                  <motion.img
                    key={currentImage}
                    src={images[currentImage]}
                    alt={product.name}
                    className="h-full w-full object-cover"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  />
                </AnimatePresence>
                {images.length > 1 && (
                  <>
                    <Button variant="ghost" size="icon" className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background"
                      onClick={() => setCurrentImage((p) => (p - 1 + images.length) % images.length)}>
                      <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background"
                      onClick={() => setCurrentImage((p) => (p + 1) % images.length)}>
                      <ChevronRight className="h-5 w-5" />
                    </Button>
                  </>
                )}
                {product.compare_at_price && (
                  <Badge className="absolute left-3 top-3 bg-primary font-display uppercase">Sale</Badge>
                )}
              </div>
            )}
            <div className="flex gap-2 overflow-x-auto">
              {images.map((img, i) => (
                <button key={i} onClick={() => { setCurrentImage(i); setShow3D(false); }}
                  className={`h-16 w-16 shrink-0 overflow-hidden rounded border-2 transition-all duration-200 ${!show3D && i === currentImage ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-muted-foreground"}`}>
                  <img src={img} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
              {product.model_url && (
                <button
                  onClick={() => setShow3D(true)}
                  className={`flex h-16 w-16 shrink-0 items-center justify-center rounded border-2 transition-all duration-200 ${show3D ? "border-primary bg-primary/10 ring-2 ring-primary/20" : "border-border hover:border-primary"}`}
                  title="View 3D Model"
                >
                  <span className="font-display text-xs font-bold uppercase text-primary">3D</span>
                </button>
              )}
            </div>
          </motion.div>

          {/* Product Info */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            <div>
              <h1 className="font-display text-3xl font-bold uppercase text-foreground lg:text-4xl">{product.name}</h1>
              {avgRating && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className={`h-4 w-4 ${s <= Math.round(Number(avgRating)) ? "fill-primary text-primary" : "text-muted-foreground"}`} />
                    ))}
                  </div>
                  <span className="text-sm text-muted-foreground">{avgRating} ({reviews.length} reviews)</span>
                </div>
              )}
            </div>

            <div className="flex items-baseline gap-3">
              <span className="font-display text-3xl font-bold text-primary">{activePrice.toFixed(2)} kr</span>
              {product.compare_at_price && !selectedVariant && (
                <span className="text-lg text-muted-foreground line-through">{Number(product.compare_at_price).toFixed(2)} kr</span>
              )}
            </div>

            {product.description && (
              <p className="text-muted-foreground leading-relaxed">{product.description}</p>
            )}

            {/* Configurator (attribute-based variants) */}
            {hasConfiguratorAttrs && (
              <ProductConfigurator
                variants={variants}
                selectedVariant={selectedVariant}
                onSelectVariant={setSelectedVariant}
              />
            )}

            {/* Simple Variants (no attributes) */}
            {hasSimpleVariants && (
              <div className="space-y-3">
                <p className="font-display text-xs font-semibold uppercase tracking-widest text-muted-foreground">Options</p>
                <div className="flex flex-wrap gap-2">
                  {variants.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVariant(selectedVariant?.id === v.id ? null : v)}
                      className={`rounded-md border px-4 py-2 font-display text-sm uppercase transition-all duration-200 ${
                        selectedVariant?.id === v.id
                          ? "border-primary bg-primary text-primary-foreground shadow-md"
                          : "border-border text-foreground hover:border-primary/50"
                      } ${v.stock <= 0 ? "opacity-40 cursor-not-allowed" : ""}`}
                      disabled={v.stock <= 0}
                    >
                      {v.name}
                      {v.stock <= 0 && " (Out of stock)"}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Print Info */}
            <PrintInfo
              printTimeHours={product.print_time_hours}
              dimensionsCm={product.dimensions_cm}
              weightGrams={product.weight_grams}
              finishType={product.finish_type}
              materialType={product.material_type}
            />

            {/* Size Preview */}
            <SizePreview dimensionsCm={product.dimensions_cm} />

            <div className="flex items-center gap-3">
              <span className={`text-sm font-medium ${activeStock > 0 ? "text-green-500" : "text-destructive"}`}>
                {activeStock > 0 ? `${activeStock} in stock` : "Out of stock"}
              </span>
            </div>

            <Button
              size="lg"
              className="w-full font-display uppercase tracking-wider transition-shadow hover:shadow-lg"
              onClick={handleAddToCart}
              disabled={activeStock <= 0 || (variants.length > 0 && !selectedVariant)}
            >
              <ShoppingCart className="mr-2 h-5 w-5" />
              {variants.length > 0 && !selectedVariant ? "Select an option" : "Add to Cart"}
            </Button>
          </motion.div>
        </div>

        {/* Reviews Section */}
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mt-16">
          <h2 className="mb-6 font-display text-2xl font-bold uppercase text-foreground">
            Customer Reviews {reviews.length > 0 && `(${reviews.length})`}
          </h2>

          {user ? (
            <Card className="mb-8">
              <CardContent className="p-6">
                <h3 className="mb-4 font-display text-sm font-semibold uppercase tracking-wider text-foreground">Write a Review</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button key={s} onClick={() => setReviewForm({ ...reviewForm, rating: s })}>
                        <Star className={`h-6 w-6 transition-colors ${s <= reviewForm.rating ? "fill-primary text-primary" : "text-muted-foreground hover:text-primary"}`} />
                      </button>
                    ))}
                  </div>
                  <Input
                    placeholder="Review title (optional)"
                    value={reviewForm.title}
                    onChange={(e) => setReviewForm({ ...reviewForm, title: e.target.value })}
                  />
                  <Textarea
                    placeholder="Your review..."
                    value={reviewForm.comment}
                    onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                    rows={3}
                  />
                  <Button onClick={handleSubmitReview} disabled={submitting} className="font-display uppercase tracking-wider">
                    {submitting ? "Submitting..." : "Submit Review"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="mb-8">
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">
                  <Link to="/auth" className="text-primary hover:underline">Sign in</Link> to leave a review.
                </p>
              </CardContent>
            </Card>
          )}

          <div className="space-y-4">
            {reviews.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No reviews yet. Be the first!</p>
            ) : reviews.map((r) => (
              <Card key={r.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1 mb-1">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} className={`h-4 w-4 ${s <= r.rating ? "fill-primary text-primary" : "text-muted-foreground"}`} />
                        ))}
                      </div>
                      {r.title && <p className="font-display text-sm font-semibold uppercase text-card-foreground">{r.title}</p>}
                      {r.comment && <p className="mt-1 text-sm text-muted-foreground">{r.comment}</p>}
                    </div>
                    <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ProductDetail;
