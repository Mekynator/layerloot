import { ReactNode, Suspense, lazy, useEffect } from "react";
import { useEditorPreview } from "@/contexts/EditorPreviewContext";
import Header from "./Header";
import Footer from "./Footer";
import GlobalSectionRenderer from "./GlobalSectionRenderer";
import PageBackgroundSlideshow from "./PageBackgroundSlideshow";
import AchievementToast, { useAchievements } from "@/components/smart/AchievementToast";
import ScrollProgress from "@/components/ui/scroll-progress";

const ChatWidget = lazy(() => import("@/components/ChatWidget"));
const Layout = ({ children }: { children: ReactNode }) => {
  const { isEditorPreview } = useEditorPreview();
  const { currentAchievement, dismiss } = useAchievements();

  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <div
      className="relative isolate flex min-h-screen flex-col overflow-x-clip"
      data-editor-preview={isEditorPreview ? "true" : "false"}
    >
      <div className="ambient-bg layer-decorative" aria-hidden="true">
        <div className="ambient-blob ambient-blob--1" />
        <div className="ambient-blob ambient-blob--2" />
        <div className="ambient-blob ambient-blob--3" />
      </div>

      <PageBackgroundSlideshow />

      <div className="bg-grid-overlay layer-decorative" aria-hidden="true" />
      <div className="noise-overlay layer-decorative" aria-hidden="true" />

      <div className="relative z-10 flex min-h-screen flex-col">
        <Header />
        <GlobalSectionRenderer page="global_before_main" />
        <main className="flex-1 page-enter">{children}</main>
        <GlobalSectionRenderer page="global_after_main" />
        <Footer />
      </div>
      <AchievementToast achievement={currentAchievement} onDismiss={dismiss} />
      {!isEditorPreview && <ScrollProgress />}
    </div>
  );
};

export default Layout;
