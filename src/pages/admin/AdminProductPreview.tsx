import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/currency";

const AdminProductPreview = () => {
  const { productId } = useParams<{ productId: string }>();

  const { data: product, isLoading } = useQuery({
    queryKey: ["admin-product-preview", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", productId!)
        .single();
      if (error) throw error;
      return data as any;
    },
    enabled: !!productId,
  });

  if (isLoading) {
    return (
      
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      
    );
  }

  if (!product) {
    return (
      
        <p className="py-20 text-center text-muted-foreground">Product not found.</p>
      
    );
  }

  // Merge draft_data over live fields if present
  const draft = product.draft_data as Record<string, any> | null;
  const preview = draft
    ? { ...product, ...draft }
    : product;

  const images: string[] = preview.images ?? [];
  const hasDraft = !!product.has_draft;

  return (
    
      <div className="mb-6 flex items-center gap-4">
        <Link to="/products">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="font-display text-2xl font-bold uppercase text-foreground">
          Product Preview
        </h1>
        {hasDraft && (
          <Badge variant="default" className="ml-2">
            <Eye className="mr-1 h-3 w-3" /> Showing Draft
          </Badge>
        )}
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Images */}
        <Card>
          <CardContent className="p-4">
            {images.length > 0 ? (
              <div className="space-y-3">
                <img
                  src={images[0]}
                  alt={preview.name}
                  className="w-full rounded-lg border border-border object-contain"
                  style={{ maxHeight: 400 }}
                />
                {images.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto">
                    {images.slice(1).map((url: string, i: number) => (
                      <img
                        key={i}
                        src={url}
                        alt=""
                        className="h-20 w-20 flex-shrink-0 rounded border border-border object-cover"
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-border text-muted-foreground">
                No images
              </div>
            )}
          </CardContent>
        </Card>

        {/* Details */}
        <div className="space-y-6">
          <div>
            <h2 className="font-display text-3xl font-bold uppercase text-foreground">
              {preview.name}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{preview.slug}</p>
          </div>

          <div className="flex items-baseline gap-3">
            <span className="font-display text-2xl font-bold text-primary">
              {formatPrice(Number(preview.price))}
            </span>
            {preview.compare_at_price && Number(preview.compare_at_price) > Number(preview.price) && (
              <span className="text-lg text-muted-foreground line-through">
                {formatPrice(Number(preview.compare_at_price))}
              </span>
            )}
          </div>

          {preview.description && (
            <p className="text-sm leading-relaxed text-muted-foreground">
              {preview.description}
            </p>
          )}

          <Separator />

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Stock</span>
              <p className="font-semibold">{preview.stock}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Featured</span>
              <p className="font-semibold">{preview.is_featured ? "Yes" : "No"}</p>
            </div>
            {preview.material_type && (
              <div>
                <span className="text-muted-foreground">Material</span>
                <p className="font-semibold">{preview.material_type}</p>
              </div>
            )}
            {preview.finish_type && (
              <div>
                <span className="text-muted-foreground">Finish</span>
                <p className="font-semibold">{preview.finish_type}</p>
              </div>
            )}
            {preview.weight_grams && (
              <div>
                <span className="text-muted-foreground">Weight</span>
                <p className="font-semibold">{preview.weight_grams}g</p>
              </div>
            )}
            {preview.print_time_hours && (
              <div>
                <span className="text-muted-foreground">Print Time</span>
                <p className="font-semibold">{preview.print_time_hours}h</p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Badge variant={product.status === "published" ? "success" : "secondary"}>
              {product.status ?? "published"}
            </Badge>
            {hasDraft && <Badge variant="outline">Has unpublished changes</Badge>}
          </div>
        </div>
      </div>
    
  );
};

export default AdminProductPreview;
