import DynamicPage from "./DynamicPage";
import HomeSocialProof from "@/components/social/HomeSocialProof";
import RecentlyViewedSection from "@/components/product/RecentlyViewedSection";
import { useRecentlyViewedProducts } from "@/hooks/use-recently-viewed";
import { useTranslation } from "react-i18next";

const Index = () => {
  const { t } = useTranslation("common");
  const { recentProducts } = useRecentlyViewedProducts();

  return (
    <>
      <DynamicPage
        slug="home"
        emptyTitle={t("pages.home.emptyTitle", "Home")}
        emptyDescription={t("pages.home.emptyDescription", "New arrivals and featured pieces are on the way.")}
      />
      {recentProducts.length > 0 && (
        <div className="container pb-12">
          <RecentlyViewedSection
            products={recentProducts}
            title={t("products.pickUpWhereYouLeftOff", "Pick up where you left off")}
          />
        </div>
      )}
      <HomeSocialProof />
    </>
  );
};

export default Index;
