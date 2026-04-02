import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { SiteBlock } from "@/components/admin/BlockRenderer";
import { buildProductSocialProofMap, type ProductSocialProof } from "@/lib/social-proof";

export type CatalogProduct = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  compare_at_price: number | null;
  images: string[] | null;
  is_featured: boolean;
  category_id: string | null;
  model_url: string | null;
  created_at: string;
  stock?: number;
};

export type CatalogCategory = {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
};

export type ProductReview = {
  id: string;
  product_id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  created_at: string;
  user_id: string;
  is_approved: boolean;
};

export type GalleryShowcaseItem = {
  id: string;
  image_url: string;
  product_id: string | null;
  product_name: string;
  comment: string | null;
  created_at: string;
};

export type StorefrontCatalogData = {
  products: CatalogProduct[];
  categories: CatalogCategory[];
  pageBlocks: SiteBlock[];
  reviews: ProductReview[];
  socialProofMap: Map<string, ProductSocialProof>;
  recentPrints: GalleryShowcaseItem[];
  popularProducts: CatalogProduct[];
};

async function fetchStorefrontCatalog(page?: string): Promise<StorefrontCatalogData> {
  const productsReq = supabase
    .from("products")
    .select(
      "id, name, slug, description, price, compare_at_price, images, is_featured, category_id, model_url, created_at, stock",
    )
    .eq("is_active", true)
    .eq("status", "published")
    .order("created_at", { ascending: false });

  const categoriesReq = supabase
    .from("categories")
    .select("id, name, slug, parent_id")
    .order("sort_order", { ascending: true });

  const reviewsReq = supabase
    .from("product_reviews")
    .select("id, product_id, rating, title, comment, created_at, user_id, is_approved")
    .eq("is_approved", true)
    .order("created_at", { ascending: false });

  const galleryReq = supabase
    .from("gallery_posts")
    .select("id, image_url, product_id, product_name, comment, created_at")
    .eq("is_approved", true)
    .order("created_at", { ascending: false })
    .limit(8);

  const requests: PromiseLike<any>[] = [productsReq, categoriesReq, reviewsReq, galleryReq];

  if (page) {
    requests.push(supabase.from("site_blocks").select("*").eq("page", page).eq("is_active", true).order("sort_order"));
  }

  const [productsRes, categoriesRes, reviewsRes, galleryRes, pageBlocksRes] = await Promise.all(requests);

  if (productsRes.error) throw productsRes.error;
  if (categoriesRes.error) throw categoriesRes.error;
  if (reviewsRes.error) throw reviewsRes.error;
  if (galleryRes.error) throw galleryRes.error;
  if (page && pageBlocksRes?.error) throw pageBlocksRes.error;

  const products = (productsRes.data as CatalogProduct[]) ?? [];
  const reviews = (reviewsRes.data as ProductReview[]) ?? [];
  const socialProofMap = buildProductSocialProofMap(
    reviews.map((review) => ({ product_id: review.product_id, rating: review.rating, created_at: review.created_at })),
  );

  const popularProducts = [...products]
    .sort((a, b) => {
      const proofA = socialProofMap.get(a.id);
      const proofB = socialProofMap.get(b.id);
      const scoreA = (proofA?.weeklyReviewCount ?? 0) * 5 + (proofA?.reviewCount ?? 0) + (a.is_featured ? 2 : 0);
      const scoreB = (proofB?.weeklyReviewCount ?? 0) * 5 + (proofB?.reviewCount ?? 0) + (b.is_featured ? 2 : 0);
      return scoreB - scoreA;
    })
    .slice(0, 4);

  return {
    products,
    categories: (categoriesRes.data as CatalogCategory[]) ?? [],
    pageBlocks: (pageBlocksRes?.data as SiteBlock[]) ?? [],
    reviews,
    socialProofMap,
    recentPrints: (galleryRes.data as GalleryShowcaseItem[]) ?? [],
    popularProducts,
  };
}

export function useStorefrontCatalog(page?: string) {
  return useQuery({
    queryKey: ["storefront-catalog", page ?? "none"],
    queryFn: () => fetchStorefrontCatalog(page),
    staleTime: 1000 * 60 * 5,
  });
}

export function useFeaturedProducts(limit = 8) {
  const query = useStorefrontCatalog();

  const data = useMemo(() => {
    const products = query.data?.products ?? [];
    const socialProofMap = query.data?.socialProofMap ?? new Map<string, ProductSocialProof>();
    return products
      .filter((product) => product.is_featured)
      .slice(0, limit)
      .map((product) => ({ product, socialProof: socialProofMap.get(product.id) }));
  }, [query.data, limit]);

  return { ...query, data };
}

export function useHomeSocialProof() {
  const query = useStorefrontCatalog("home");

  const data = useMemo(() => {
    if (!query.data) return null;
    return {
      recentPrints: query.data.recentPrints,
      popularProducts: query.data.popularProducts.map((product) => ({
        product,
        socialProof: query.data?.socialProofMap.get(product.id),
      })),
    };
  }, [query.data]);

  return { ...query, data };
}

export type ProductVariant = {
  id: string;
  name: string;
  price: number;
  stock: number;
  attributes: Record<string, string>;
  is_active: boolean;
};

export type ProductDetailData = {
  product: CatalogProduct & {
    stock: number;
    print_time_hours: number | null;
    dimensions_cm: { length?: number; width?: number; height?: number } | null;
    weight_grams: number | null;
    finish_type: string | null;
    material_type: string | null;
    is_active: boolean;
  };
  variants: ProductVariant[];
  reviews: ProductReview[];
  relatedProducts: CatalogProduct[];
  socialProof: ProductSocialProof | undefined;
};

async function fetchProductDetail(slug: string): Promise<ProductDetailData | null> {
  const { data: product, error: productError } = await supabase
    .from("products")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (productError) throw productError;
  if (!product) return null;

  const [variantsRes, reviewsRes, relatedRes] = await Promise.all([
    supabase
      .from("product_variants")
      .select("*")
      .eq("product_id", product.id)
      .eq("is_active", true)
      .order("sort_order"),
    supabase
      .from("product_reviews")
      .select("id, product_id, rating, title, comment, created_at, user_id, is_approved")
      .eq("product_id", product.id)
      .eq("is_approved", true)
      .order("created_at", { ascending: false }),
    supabase
      .from("products")
      .select(
        "id, name, slug, description, price, compare_at_price, images, is_featured, category_id, model_url, created_at, stock",
      )
      .eq("is_active", true)
      .eq("status", "published")
      .neq("id", product.id)
      .limit(4),
  ]);

  if (variantsRes.error) throw variantsRes.error;
  if (reviewsRes.error) throw reviewsRes.error;
  if (relatedRes.error) throw relatedRes.error;

  const reviews = (reviewsRes.data as ProductReview[]) ?? [];
  const socialProof = buildProductSocialProofMap(
    reviews.map((review) => ({ product_id: review.product_id, rating: review.rating, created_at: review.created_at })),
  ).get(product.id);

  return {
    product: product as ProductDetailData["product"],
    variants: (variantsRes.data as ProductVariant[]) ?? [],
    reviews,
    relatedProducts: (relatedRes.data as CatalogProduct[]) ?? [],
    socialProof,
  };
}

export function useProductDetailQuery(slug?: string) {
  return useQuery({
    queryKey: ["product-detail", slug],
    queryFn: () => fetchProductDetail(slug as string),
    enabled: Boolean(slug),
    staleTime: 1000 * 60 * 5,
  });
}
