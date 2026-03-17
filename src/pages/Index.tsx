import DynamicPage from "./DynamicPage";

const Index = () => {
  return (
    <DynamicPage
      slug="home"
      emptyTitle="Home page is empty"
      emptyDescription="Add hero banners, categories, featured products, and other sections from the page editor."
    />
  );
};

export default Index;
