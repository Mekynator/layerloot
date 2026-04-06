import DynamicPage from "./DynamicPage";
import HomeSocialProof from "@/components/social/HomeSocialProof";
import SmartHomeSections from "@/components/smart/SmartHomeSections";
import { useStorefrontCatalog } from "@/hooks/use-storefront";
import { useStaticSectionSettings } from "@/hooks/use-static-section-settings";
import { usePageBlocks } from "@/hooks/use-page-blocks";
import { useTranslation } from "react-i18next";

const Index = () => {
  const { t } = useTranslation("common");
  const { data: catalog } = useStorefrontCatalog("home");
  const { isVisible } = useStaticSectionSettings("home");
  const { data: homeBlocks = [] } = usePageBlocks("home");

  // Deduplication: skip static section if a DB block with matching block_type exists
  const blockTypes = new Set(homeBlocks.map((b) => b.block_type));
  const hasSmartBlockInDb = blockTypes.has("home_smart_sections") || blockTypes.has("smart_recommendations");
  const hasSocialBlockInDb = blockTypes.has("home_social_proof") || blockTypes.has("social_proof");

  return (
    <>
      <DynamicPage
        slug="home"
        emptyTitle={t("pages.home.emptyTitle", "Home")}
        emptyDescription={t("pages.home.emptyDescription", "New arrivals and featured pieces are on the way.")}
      />

      {/* Smart personalized sections — respects visibility toggle + dedup */}
      {isVisible("static_home_smart_sections") && !hasSmartBlockInDb && catalog && (
        <div className="container space-y-4 pb-4">
          <SmartHomeSections
            products={catalog.products}
            socialProofMap={catalog.socialProofMap}
            categories={catalog.categories}
          />
        </div>
      )}

      {isVisible("static_home_social_proof") && !hasSocialBlockInDb && <HomeSocialProof />}
    </>
  );
};

export default Index;
