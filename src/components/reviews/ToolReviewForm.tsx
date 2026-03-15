import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const ToolReviewForm = ({
  toolType,
  orderId,
  onSubmitted,
}: {
  toolType: "custom-print" | "lithophane";
  orderId?: string;
  onSubmitted?: () => void;
}) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [rating, setRating] = useState("5");
  const [reviewText, setReviewText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reviewerName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email ||
    "Customer";

  const handleSubmitReview = async () => {
    if (!user) {
      toast({
        title: "Please sign in",
        description: "You need to sign in to submit a review.",
        variant: "destructive",
      });
      return;
    }

    if (!reviewText.trim()) {
      toast({
        title: "Missing review",
        description: "Please write your review before submitting.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    const { error } = await supabase.from("tool_reviews").insert({
      user_id: user.id,
      tool_type: toolType,
      reviewer_name: reviewerName,
      rating: Number(rating),
      review_text: reviewText.trim(),
      is_approved: false,
    });

    setSubmitting(false);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setReviewText("");
    setRating("5");

    toast({
      title: "Review submitted",
      description: "Your review has been sent for admin approval.",
    });

    onSubmitted?.();
  };

  return (
    <div className="mt-4 space-y-4 rounded-xl border border-border bg-muted/30 p-4">
      <div>
        <Label>Rating</Label>
        <select
          value={rating}
          onChange={(e) => setRating(e.target.value)}
          className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="5">5 stars</option>
          <option value="4">4 stars</option>
          <option value="3">3 stars</option>
          <option value="2">2 stars</option>
          <option value="1">1 star</option>
        </select>
      </div>

      <div>
        <Label>Your Review</Label>
        <Textarea
          value={reviewText}
          onChange={(e) => setReviewText(e.target.value)}
          rows={4}
          placeholder="Write your experience here..."
        />
      </div>

      <Button onClick={handleSubmitReview} disabled={submitting}>
        {submitting ? "Submitting..." : "Submit Review"}
      </Button>
    </div>
  );
};

export default ToolReviewForm;
