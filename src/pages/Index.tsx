import DynamicPage from "./DynamicPage";
import HomeSocialProof from "@/components/social/HomeSocialProof";
import { useTranslation } from "react-i18next";

const Index = () => {
  const { t } = useTranslation("common");

  return (
    <>
      <DynamicPage
        slug="home"
        emptyTitle={t("pages.home.emptyTitle", "Home")}
        emptyDescription={t("pages.home.emptyDescription", "New arrivals and featured pieces are on the way.")}
      />
      <HomeSocialProof />
    </>
  );
};

export default Index;
