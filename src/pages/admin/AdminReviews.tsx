import { useEffect, useMemo, useState } from "react";
import { CheckCircle, XCircle, Star, Trash2, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Review {
  id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  is_approved: boolean;
  created_at: string;
  product_id: string;
  user_id: string;
  products?: {
    name: string;
    categories?: { name: string } | null;
  } | null;
}

type FilterMode = "all" | "pending" | "approved";

const AdminReviews = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [filter, setFilter] = useState<FilterMode>("pending");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [productFilter, setProductFilter] = useState("all");
  const { toast } = useToast();

  const fetchReviews = async () => {
    const { data } = await supabase
      .from("product_reviews")
      .select("*, products(name, categories(name))")
      .order("created_at", { ascending: false });

    setReviews((data as any[]) ?? []);
  };

  useEffect(() => {
    void fetchReviews();
  }, []);

  const toggleApproval = async (id: string, approved: boolean) => {
    const { error } = await supabase.from("product_reviews").update({ is_approved: approved }).eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: approved ? "Review approved" : "Review hidden" });
    void fetchReviews();
  };

  const deleteReview = async (id: string) => {
    await supabase.from("product_reviews").delete().eq("id", id);
    toast({ title: "Review deleted" });
    void fetchReviews();
  };

  const categories = useMemo(() => {
    return Array.from(
      new Set(
        reviews.map((r) => r.products?.categories?.name?.trim()).filter((value): value is string => Boolean(value)),
      ),
    ).sort((a, b) => a.localeCompare(b));
  }, [reviews]);

  const products = useMemo(() => {
    return Array.from(
      new Set(reviews.map((r) => r.products?.name?.trim()).filter((value): value is string => Boolean(value))),
    ).sort((a, b) => a.localeCompare(b));
  }, [reviews]);

  const filtered = useMemo(() => {
    return reviews.filter((r) => {
      if (filter === "pending" && r.is_approved) return false;
      if (filter === "approved" && !r.is_approved) return false;

      const productName = r.products?.name || "";
      const categoryName = r.products?.categories?.name || "";
      const searchBlob = `${productName} ${categoryName} ${r.title || ""} ${r.comment || ""}`.toLowerCase();

      const searchMatch = search.trim() === "" || searchBlob.includes(search.toLowerCase());
      const categoryMatch = categoryFilter === "all" || categoryName === categoryFilter;
      const productMatch = productFilter === "all" || productName === productFilter;

      return searchMatch && categoryMatch && productMatch;
    });
  }, [reviews, filter, search, categoryFilter, productFilter]);

  const approvedGrouped = useMemo(() => {
    const grouped = new Map<string, Map<string, Review[]>>();

    filtered
      .filter((r) => r.is_approved)
      .forEach((review) => {
        const categoryName = review.products?.categories?.name || "Uncategorized";
        const productName = review.products?.name || "Unknown product";

        if (!grouped.has(categoryName)) grouped.set(categoryName, new Map());
        const productMap = grouped.get(categoryName)!;

        if (!productMap.has(productName)) productMap.set(productName, []);
        productMap.get(productName)!.push(review);
      });

    return Array.from(grouped.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([category, productMap]) => ({
        category,
        products: Array.from(productMap.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([product, productReviews]) => ({
            product,
            reviews: productReviews,
          })),
      }));
  }, [filtered]);

  const pendingCount = reviews.filter((r) => !r.is_approved).length;
  const approvedCount = reviews.filter((r) => r.is_approved).length;

  return (
    <>
      <div className="mb-6 flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-display text-3xl font-bold uppercase text-foreground">Reviews</h1>

          <div className="flex gap-2">
            {(["pending", "approved", "all"] as const).map((f) => (
              <Button
                key={f}
                variant={filter === f ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(f)}
                className="font-display text-xs uppercase tracking-wider"
              >
                {f}
                {f === "pending" && ` (${pendingCount})`}
                {f === "approved" && ` (${approvedCount})`}
              </Button>
            ))}
          </div>
        </div>

        <Card>
          <CardContent className="grid gap-3 p-4 md:grid-cols-[1.4fr_1fr_1fr]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search reviews, products, or categories..."
                className="pl-9"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <select
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setProductFilter("all");
                }}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none"
              >
                <option value="all">All categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={productFilter}
                onChange={(e) => setProductFilter(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none"
              >
                <option value="all">All products</option>
                {products
                  .filter((product) => {
                    if (categoryFilter === "all") return true;
                    return reviews.some(
                      (review) =>
                        review.products?.name === product && review.products?.categories?.name === categoryFilter,
                    );
                  })
                  .map((product) => (
                    <option key={product} value={product}>
                      {product}
                    </option>
                  ))}
              </select>
            </div>
          </CardContent>
        </Card>
      </div>

      {filter === "approved" ? (
        <div className="space-y-5">
          {approvedGrouped.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">No approved reviews found.</CardContent>
            </Card>
          ) : (
            approvedGrouped.map((categoryGroup) => (
              <Card key={categoryGroup.category}>
                <CardContent className="p-5">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-widest text-muted-foreground">Category</p>
                      <h2 className="font-display text-xl font-bold uppercase text-foreground">
                        {categoryGroup.category}
                      </h2>
                    </div>
                    <Badge variant="secondary">
                      {categoryGroup.products.reduce((sum, item) => sum + item.reviews.length, 0)} reviews
                    </Badge>
                  </div>

                  <div className="space-y-4">
                    {categoryGroup.products.map((productGroup) => (
                      <div key={productGroup.product} className="rounded-xl border border-border p-4">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <h3 className="font-display text-sm font-bold uppercase text-foreground">
                            {productGroup.product}
                          </h3>
                          <Badge variant="outline">{productGroup.reviews.length}</Badge>
                        </div>

                        <div className="grid gap-3 lg:grid-cols-2">
                          {productGroup.reviews.map((r) => (
                            <div key={r.id} className="rounded-lg border border-border bg-card p-4">
                              <div className="mb-2 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-0.5">
                                  {[1, 2, 3, 4, 5].map((s) => (
                                    <Star
                                      key={s}
                                      className={`h-3.5 w-3.5 ${
                                        s <= r.rating ? "fill-primary text-primary" : "text-muted-foreground"
                                      }`}
                                    />
                                  ))}
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(r.created_at).toLocaleDateString()}
                                </span>
                              </div>

                              {r.title && <p className="mb-1 text-sm font-semibold text-foreground">{r.title}</p>}
                              {r.comment && <p className="text-sm text-muted-foreground">{r.comment}</p>}

                              <div className="mt-3 flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => toggleApproval(r.id, false)}
                                  title="Hide review"
                                >
                                  <XCircle className="h-4 w-4 text-muted-foreground" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => deleteReview(r.id)}>
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Review</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-display text-sm font-semibold uppercase">
                      {r.products?.name ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {r.products?.categories?.name ?? "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`h-3 w-3 ${s <= r.rating ? "fill-primary text-primary" : "text-muted-foreground"}`}
                          />
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs">
                        {r.title && <p className="text-sm font-semibold">{r.title}</p>}
                        {r.comment && <p className="line-clamp-2 text-xs text-muted-foreground">{r.comment}</p>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={r.is_approved ? "default" : "secondary"}>
                        {r.is_approved ? "Approved" : "Pending"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleApproval(r.id, !r.is_approved)}
                        title={r.is_approved ? "Hide review" : "Approve review"}
                      >
                        {r.is_approved ? (
                          <XCircle className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        )}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteReview(r.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}

                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      No reviews found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </>
  );
};

export default AdminReviews;
