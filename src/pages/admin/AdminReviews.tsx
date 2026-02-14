import { useEffect, useState } from "react";
import { CheckCircle, XCircle, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";

interface Review {
  id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  is_approved: boolean;
  created_at: string;
  product_id: string;
  user_id: string;
  products?: { name: string } | null;
}

const AdminReviews = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "approved">("pending");
  const { toast } = useToast();

  const fetchReviews = async () => {
    const query = supabase
      .from("product_reviews")
      .select("*, products(name)")
      .order("created_at", { ascending: false });
    const { data } = await query;
    setReviews((data as any[]) ?? []);
  };

  useEffect(() => { fetchReviews(); }, []);

  const toggleApproval = async (id: string, approved: boolean) => {
    const { error } = await supabase.from("product_reviews").update({ is_approved: approved }).eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: approved ? "Review approved" : "Review hidden" });
    fetchReviews();
  };

  const deleteReview = async (id: string) => {
    await supabase.from("product_reviews").delete().eq("id", id);
    toast({ title: "Review deleted" });
    fetchReviews();
  };

  const filtered = reviews.filter((r) => {
    if (filter === "pending") return !r.is_approved;
    if (filter === "approved") return r.is_approved;
    return true;
  });

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold uppercase text-foreground">Reviews</h1>
        <div className="flex gap-2">
          {(["pending", "approved", "all"] as const).map((f) => (
            <Button key={f} variant={filter === f ? "default" : "outline"} size="sm"
              onClick={() => setFilter(f)} className="font-display uppercase tracking-wider text-xs">
              {f} {f === "pending" && `(${reviews.filter((r) => !r.is_approved).length})`}
            </Button>
          ))}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
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
                  <TableCell className="font-display text-sm font-semibold uppercase">{r.products?.name ?? "—"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} className={`h-3 w-3 ${s <= r.rating ? "fill-primary text-primary" : "text-muted-foreground"}`} />
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-xs">
                      {r.title && <p className="text-sm font-semibold">{r.title}</p>}
                      {r.comment && <p className="text-xs text-muted-foreground line-clamp-2">{r.comment}</p>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={r.is_approved ? "default" : "secondary"}>
                      {r.is_approved ? "Approved" : "Pending"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon"
                      onClick={() => toggleApproval(r.id, !r.is_approved)}
                      title={r.is_approved ? "Hide review" : "Approve review"}>
                      {r.is_approved
                        ? <XCircle className="h-4 w-4 text-muted-foreground" />
                        : <CheckCircle className="h-4 w-4 text-green-500" />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteReview(r.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">No reviews found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AdminLayout>
  );
};

export default AdminReviews;
