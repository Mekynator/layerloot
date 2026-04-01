import DynamicPage from "./DynamicPage";
import HomeSocialProof from "@/components/social/HomeSocialProof";
import SmartHomeSections from "@/components/smart/SmartHomeSections";
import { useStorefrontCatalog } from "@/hooks/use-storefront";
import { useTranslation } from "react-i18next";

const Index = () => {
  const { t } = useTranslation("common");
  const { data: catalog } = useStorefrontCatalog("home");

  return (
    <>
      <DynamicPage
        slug="home"
        emptyTitle={t("pages.home.emptyTitle", "Home")}
        emptyDescription={t("pages.home.emptyDescription", "New arrivals and featured pieces are on the way.")}
      />

      {/* Smart personalized sections */}
      {catalog && (
        <div className="container space-y-4 pb-4">
          <SmartHomeSections
            products={catalog.products}
            socialProofMap={catalog.socialProofMap}
          />
        </div>
      )}

      <HomeSocialProof />
    </>
  );
};

export default Index;
