import { ReactNode, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useEditorPreview } from "@/contexts/EditorPreviewContext";
import Header from "./Header";
import Footer from "./Footer";
import GlobalSectionRenderer from "./GlobalSectionRenderer";
import PageBackgroundSlideshow from "./PageBackgroundSlideshow";
import FloatingCartSummary from "@/components/cart/FloatingCartSummary";
import AchievementToast, { useAchievements } from "@/components/smart/AchievementToast";
import ScrollProgress from "@/components/ui/scroll-progress";

const Layout = ({ children }: { children: ReactNode }) => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { isEditorPreview } = useEditorPreview();
  const isAdminRoute = location.pathname.startsWith("/admin");
  const isCartPage = location.pathname === "/cart";
  const { currentAchievement, dismiss } = useAchievements();

  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  if (isAdminRoute) {
    return <div className="min-h-screen bg-background">{children}</div>;
  }

  return (
    <div
      className="relative isolate flex min-h-screen flex-col overflow-x-clip"
      data-editor-preview={isEditorPreview ? "true" : "false"}
    >
      {/* Ambient gradient blobs */}
      <div className="ambient-bg" aria-hidden="true">
        <div className="ambient-blob ambient-blob--1" />
        <div className="ambient-blob ambient-blob--2" />
        <div className="ambient-blob ambient-blob--3" />
      </div>

      {/* Page background slideshow (behind all content, not header/footer/tiles) */}
      <PageBackgroundSlideshow />

      {/* Subtle grid */}
      <div className="bg-grid-overlay" aria-hidden="true" />

      {/* Noise texture */}
      <div className="noise-overlay" aria-hidden="true" />

      <div className="relative z-10 flex min-h-screen flex-col">
        <Header />
        <GlobalSectionRenderer page="global_before_main" />
        <main className="flex-1 page-enter">{children}</main>
        <GlobalSectionRenderer page="global_after_main" />
        <Footer />
      </div>
      {!isCartPage && !isEditorPreview && <FloatingCartSummary />}
      <AchievementToast achievement={currentAchievement} onDismiss={dismiss} />
      {!isEditorPreview && <ScrollProgress />}
    </div>
  );
};

export default Layout;
