import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import ProductCard from "@/components/ProductCard";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useHomeSocialProof } from "@/hooks/use-storefront";
import { ProductGridSkeleton, SectionCardSkeleton } from "@/components/shared/loading-states";
import { fadeUp, staggerContainer } from "@/lib/motion";

export default function HomeSocialProof() {
  const { data, isLoading } = useHomeSocialProof();

  if (isLoading) {
    return (
      <div className="container space-y-12 py-16">
        <SectionCardSkeleton lines={2} />
        <ProductGridSkeleton count={4} />
      </div>
    );
  }

  if (!data || (!data.recentPrints.length && !data.popularProducts.length)) return null;

  return (
    <div className="container space-y-16 py-16 lg:py-20">
      {data.recentPrints.length > 0 ? (
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={staggerContainer}
          className="space-y-6"
        >
          <div className="space-y-2">
            <Badge
              variant="outline"
              className="rounded-full border-primary/20 bg-primary/5 uppercase tracking-[0.22em] text-primary"
            >
              Recently printed
            </Badge>
            <h2 className="font-display text-3xl font-bold uppercase text-foreground">Fresh out of the print queue</h2>
            <p className="max-w-2xl text-muted-foreground">
              Recent approved customer submissions and gallery highlights to help new visitors trust the quality they
              are about to order.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-4">
            {data.recentPrints.map((item, index) => (
              <motion.div key={item.id} variants={fadeUp}>
                <Card className="overflow-hidden rounded-2xl border-border/70 bg-card/90 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
                  <div className="aspect-[4/5] overflow-hidden bg-muted">
                    <img
                      src={item.image_url}
                      alt={item.product_name}
                      className="h-full w-full object-cover transition duration-500 hover:scale-105"
                      loading="lazy"
                    />
                  </div>
                  <CardContent className="space-y-2 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="line-clamp-1 font-medium text-foreground">{item.product_name}</p>
                      <span className="text-xs text-muted-foreground">
                        {new Date(item.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {item.comment ? <p className="line-clamp-2 text-sm text-muted-foreground">{item.comment}</p> : null}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.section>
      ) : null}

      {data.popularProducts.length > 0 ? (
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.12 }}
          transition={{ duration: 0.4 }}
          className="space-y-6"
        >
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-2">
              <Badge
                variant="outline"
                className="rounded-full border-primary/20 bg-primary/5 uppercase tracking-[0.22em] text-primary"
              >
                Popular this week
              </Badge>
              <h2 className="font-display text-3xl font-bold uppercase text-foreground">
                Trending with LayerLoot buyers
              </h2>
              <p className="max-w-2xl text-muted-foreground">
                A live mix of featured products, fresh reviews, and current customer interest.
              </p>
            </div>
            <Link
              to="/products"
              className="text-sm font-medium text-primary transition-all hover:translate-x-1 hover:text-primary/80"
            >
              Browse all products
            </Link>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {data.popularProducts.map(({ product, socialProof }, index) => (
              <ProductCard key={product.id} product={product} socialProof={socialProof} index={index} />
            ))}
          </div>
        </motion.section>
      ) : null}
    </div>
  );
}
