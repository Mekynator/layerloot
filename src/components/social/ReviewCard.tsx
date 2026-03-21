import { Card, CardContent } from "@/components/ui/card";
import RatingStars from "@/components/social/RatingStars";

export type SocialReview = {
  id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  created_at: string;
  reviewer_name?: string | null;
  image_url?: string | null;
};

export default function ReviewCard({ review }: { review: SocialReview }) {
  return (
    <Card className="overflow-hidden border-border/70 bg-card/95 shadow-sm">
      {review.image_url ? (
        <div className="aspect-[4/3] overflow-hidden border-b border-border/60 bg-muted">
          <img src={review.image_url} alt={review.title || review.reviewer_name || "Review image"} className="h-full w-full object-cover" loading="lazy" />
        </div>
      ) : null}
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-medium text-foreground">{review.title || review.reviewer_name || "LayerLoot Customer"}</p>
            <RatingStars rating={review.rating} />
          </div>
          <span className="shrink-0 text-xs text-muted-foreground">
            {new Date(review.created_at).toLocaleDateString()}
          </span>
        </div>
        {review.comment ? <p className="text-sm leading-relaxed text-muted-foreground">{review.comment}</p> : null}
      </CardContent>
    </Card>
  );
}
