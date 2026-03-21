-- Add social-proof fields for product reviews.

alter table public.product_reviews
  add column if not exists reviewer_name text,
  add column if not exists image_url text;

create index if not exists product_reviews_product_id_created_at_idx
  on public.product_reviews (product_id, created_at desc);

create index if not exists gallery_posts_created_at_idx
  on public.gallery_posts (created_at desc);
