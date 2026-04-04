import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import ProductCard from "@/components/ProductCard";
import type { RecommendationSection } from "@/hooks/use-smart-recommendations";
import { staggerContainer, fadeUp } from "@/lib/motion";
import type { ProductSocialProof } from "@/lib/social-proof";

interface Props {
  section: RecommendationSection;
  socialProofMap?: Map<string, ProductSocialProof>;
}

export default function SmartRecommendationSection({ section, socialProofMap }: Props) {
  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.15 }}
      variants={staggerContainer}
      className="space-y-5"
    >
      <div className="space-y-1.5">
        <Badge
          variant="outline"
          className="rounded-full border-primary/20 bg-primary/5 uppercase tracking-[0.2em] text-primary"
        >
          {section.key === "because-viewed" ? "For you" : section.key === "trending" ? "Hot" : "Curated"}
        </Badge>
        <h2 className="font-display text-2xl font-bold uppercase text-foreground">{section.title}</h2>
        <p className="max-w-2xl text-sm text-muted-foreground">{section.subtitle}</p>
      </div>
      <div className="grid gap-4 grid-cols-2 md:gap-6 xl:grid-cols-4">
        {section.products.map((product, index) => (
          <motion.div key={product.id} variants={fadeUp}>
            <ProductCard
              product={product}
              socialProof={socialProofMap?.get(product.id)}
              index={index}
            />
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}
