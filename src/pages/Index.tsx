import DynamicPage from "./DynamicPage";
import HomeSocialProof from "@/components/social/HomeSocialProof";

const Index = () => {
  return (
    <>
      <DynamicPage slug="home" emptyTitle="Home" emptyDescription="New arrivals and featured pieces are on the way." />
      <HomeSocialProof />
    </>
  );
};
