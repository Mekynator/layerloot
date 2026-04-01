import { ReactNode } from "react";
import { useSearchParams, useLocation } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";
import GlobalSectionRenderer from "./GlobalSectionRenderer";
import PageBackgroundSlideshow from "@/components/layout/PageBackgroundSlideshow";
import ThemeRuntime from "@/components/theme/ThemeRuntime";
import FloatingCartSummary from "@/components/cart/FloatingCartSummary";

const Layout = ({ children }: { children: ReactNode }) => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const isEditorPreview = searchParams.get("editorPreview") === "1";
  const isCartPage = location.pathname === "/cart";

  return (
    <div
      className="relative isolate flex min-h-screen flex-col overflow-x-hidden"
      data-editor-preview={isEditorPreview ? "true" : "false"}
    >
      <ThemeRuntime />
      <PageBackgroundSlideshow />
      <div className="relative z-10 flex min-h-screen flex-col">
        <Header />
        <GlobalSectionRenderer page="global_before_main" />
        <main className="flex-1">{children}</main>
        <GlobalSectionRenderer page="global_after_main" />
        <Footer />
      </div>
      {!isCartPage && !isEditorPreview && <FloatingCartSummary />}
    </div>
  );
};

export default Layout;
