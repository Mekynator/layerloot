import DynamicPage from "./DynamicPage";
import HomeSocialProof from "@/components/social/HomeSocialProof";

const Index = () => {
  return (
    <>
      <DynamicPage
        slug="home"
        emptyTitle="Home page is empty"
        emptyDescription="Add hero banners, categories, featured products, and other sections from the page editor."
      />
      <HomeSocialProof />
    </>
  );
};

export default Index;
