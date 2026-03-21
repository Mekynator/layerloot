export type ProductReviewRecord = {
  product_id: string;
  rating: number;
  created_at: string;
};

export type ProductSocialProof = {
  averageRating: number | null;
  reviewCount: number;
  weeklyReviewCount: number;
  badges: string[];
};

const RECENT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export function buildProductSocialProofMap(reviews: ProductReviewRecord[]) {
  const now = Date.now();
  const grouped = new Map<string, ProductReviewRecord[]>();

  reviews.forEach((review) => {
    const existing = grouped.get(review.product_id) ?? [];
    existing.push(review);
    grouped.set(review.product_id, existing);
  });

  const summary = new Map<string, ProductSocialProof>();
  grouped.forEach((rows, productId) => {
    const reviewCount = rows.length;
    const averageRating =
      reviewCount > 0 ? Number((rows.reduce((sum, row) => sum + Number(row.rating || 0), 0) / reviewCount).toFixed(1)) : null;
    const weeklyReviewCount = rows.filter((row) => now - new Date(row.created_at).getTime() <= RECENT_WINDOW_MS).length;
    const badges: string[] = [];

    if (averageRating !== null && averageRating >= 4.8 && reviewCount >= 3) badges.push('top rated');
    if (weeklyReviewCount >= 2) badges.push('trending');
    if (reviewCount >= 1) badges.push('reviewed');

    summary.set(productId, {
      averageRating,
      reviewCount,
      weeklyReviewCount,
      badges,
    });
  });

  return summary;
}

export function formatReviewCount(count: number) {
  if (count === 1) return '1 review';
  return `${count} reviews`;
}
