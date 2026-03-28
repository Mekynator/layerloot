import { ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";
import GlobalSectionRenderer from "./GlobalSectionRenderer";
import PageBackgroundSlideshow from "@/components/layout/PageBackgroundSlideshow";

const Layout = ({ children }: { children: ReactNode }) => {
  const [searchParams] = useSearchParams();
  const isEditorPreview = searchParams.get("editorPreview") === "1";

  return (
    <div
      className="relative isolate flex min-h-screen flex-col"
      data-editor-preview={isEditorPreview ? "true" : "false"}
    >
      <PageBackgroundSlideshow />
      <div className="relative z-10 flex min-h-screen flex-col">
        <Header />
        <GlobalSectionRenderer page="global_before_main" />
        <main className="flex-1">{children}</main>
        <GlobalSectionRenderer page="global_after_main" />
        <Footer />
      </div>
    </div>
  );
};

export default Layout;
