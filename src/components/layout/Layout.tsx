import { ReactNode } from "react";
import Header from "./Header";
import Footer from "./Footer";
import GlobalSectionRenderer from "./GlobalSectionRenderer";
import PageBackgroundSlideshow from "@/components/layout/PageBackgroundSlideshow";


const Layout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <GlobalSectionRenderer page="global_before_main" />
      <main className="flex-1">{children}</main>
      <GlobalSectionRenderer page="global_after_main" />
      <Footer />
    </div>
  );
};

export default Layout;
