import DynamicPage from "./DynamicPage";

const About = () => {
  return (
    <DynamicPage
      slug="about"
      emptyTitle="About page is empty"
      emptyDescription="Build the About page from the page editor and the public page will mirror it."
    />
  );
};

export default About;
