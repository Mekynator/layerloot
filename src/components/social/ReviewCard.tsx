import { Card, CardContent } from "@/components/ui/card";
import RatingStars from "@/components/social/RatingStars";

export type SocialReview = {
  id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  created_at: string;
};

export default function ReviewCard({ review }: { review: SocialReview }) {
  return (
    <Card className="overflow-hidden bg-card/60 shadow-[0_8px_40px_-8px_hsl(225_44%_4%/0.5)] backdrop-blur-md transition-all duration-500 hover:shadow-[0_16px_56px_-8px_hsl(217_91%_60%/0.12)]">
      <CardContent className="space-y-3 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="font-display text-sm font-semibold uppercase tracking-wider text-foreground">{review.title || "LayerLoot Customer"}</p>
            <RatingStars rating={review.rating} />
          </div>
          <span className="shrink-0 rounded-full bg-muted/30 px-2.5 py-0.5 text-[10px] text-muted-foreground">
            {new Date(review.created_at).toLocaleDateString()}
          </span>
        </div>
        {review.comment ? <p className="text-sm leading-relaxed text-muted-foreground">{review.comment}</p> : null}
      </CardContent>
    </Card>
  );
}
