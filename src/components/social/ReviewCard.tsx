import { Card, CardContent } from "@/components/ui/card";
import RatingStars from "@/components/social/RatingStars";

export type SocialReview = {
  id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  reviewer_name: string | null;
  image_url: string | null;
  created_at: string;
};

export default function ReviewCard({ review }: { review: SocialReview }) {
  return (
    <Card className="overflow-hidden border-border/70 bg-card/95 shadow-sm">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-medium text-foreground">{review.reviewer_name || review.title || "LayerLoot Customer"}</p>
            <RatingStars rating={review.rating} />
          </div>
          <span className="shrink-0 text-xs text-muted-foreground">
            {new Date(review.created_at).toLocaleDateString()}
          </span>
        </div>
        {review.comment ? <p className="text-sm leading-relaxed text-muted-foreground">{review.comment}</p> : null}
        {review.image_url ? (
          <div className="overflow-hidden rounded-xl border border-border/70 bg-muted">
            <img src={review.image_url} alt={review.title || "Review image"} className="h-44 w-full object-cover" loading="lazy" />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
