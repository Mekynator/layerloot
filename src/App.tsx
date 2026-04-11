import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { EditorPreviewProvider } from "@/contexts/EditorPreviewContext";
import EditorPreviewGuard from "@/components/editor/EditorPreviewGuard";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useLocation, useSearchParams } from "react-router-dom";
import { CartProvider } from "@/contexts/CartContext";
import { AuthProvider } from "@/contexts/AuthContext";
import Layout from "@/components/layout/Layout";
import Index from "./pages/Index";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import Contact from "./pages/Contact";
import Cart from "./pages/Cart";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Unsubscribe from "./pages/Unsubscribe";
import Account from "./pages/Account";
import OrderTracking from "./pages/OrderTracking";
import Dashboard from "./pages/admin/Dashboard";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminVariants from "./pages/admin/AdminVariants";
import AdminCategories from "./pages/admin/AdminCategories";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminClients from "./pages/admin/AdminClients";
import AdminShipping from "./pages/admin/AdminShipping";
import AdminReviews from "./pages/admin/AdminReviews";
import AdminCustomOrders from "./pages/admin/AdminCustomOrders";
import AdminDiscounts from "./pages/admin/AdminDiscounts";
import AdminShowcases from "./pages/admin/AdminShowcases";
import AdminPricing from "./pages/admin/AdminPricing";
import AdminProductPreview from "./pages/admin/AdminProductPreview";
import AdminCampaigns from "./pages/admin/AdminCampaigns";
import VisualEditor from "./pages/admin/VisualEditor";
import AdminBackgrounds from "./pages/admin/AdminBackgrounds";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminActivity from "./pages/admin/AdminActivity";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import AdminOrderDetail from "./pages/admin/AdminOrderDetail";
import AdminCustomOrderDetail from "./pages/admin/AdminCustomOrderDetail";
import AdminMedia from "./pages/admin/AdminMedia";
import AdminReusableBlocks from "./pages/admin/AdminReusableBlocks";
import AdminComponents from "./pages/admin/AdminComponents";
import AdminTranslations from "./pages/admin/AdminTranslations";
import AdminRoute from "./components/admin/AdminRoute";
import AdminChat from "./pages/admin/AdminChat";
import AdminAutomations from "./pages/admin/AdminAutomations";
import AdminInstagram from "./pages/admin/AdminInstagram";
import AdminEmailLogs from "./pages/admin/AdminEmailLogs";
import FinancialWorkspace from "./pages/admin/FinancialWorkspace";
import EditorWorkspace from "./pages/admin/EditorWorkspace";
import UsersWorkspace from "./pages/admin/UsersWorkspace";
import AdminDesignSystem from "./pages/admin/AdminDesignSystem";
import AdminPersonalization from "./pages/admin/AdminPersonalization";
import ABTestingDashboard from "./pages/admin/ABTestingDashboard";
import AIInsightsDashboard from "./pages/admin/AIInsightsDashboard";
import DynamicPage from "./pages/DynamicPage";
import CreateYourOwn from "./pages/CreateYourOwn";
import Policies from "./pages/Policies";
import Gallery from "./pages/Gallery";
import About from "./pages/About";
import SubmitDesign from "./pages/SubmitDesign";
import NotFound from "./pages/NotFound";
import Creations from "./pages/Creations";
import CreationDetail from "./pages/CreationDetail";
import { lazy, Suspense } from "react";
import AdminShell from "./components/admin/AdminShell";

const ChatWidget = lazy(() => import("./components/ChatWidget"));
const PromotionPopup = lazy(() => import("./components/PromotionPopup"));
const GiftClaimPopup = lazy(() => import("./components/GiftClaimPopup"));
import { CampaignThemeProvider } from "./components/campaign/CampaignThemeProvider";
import { DesignSystemProvider } from "./contexts/DesignSystemContext";
import { AnalyticsProvider } from "./contexts/AnalyticsContext";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 3,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const AppShell = () => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const isEditorPreview = searchParams.get("editorPreview") === "1";
  const isAdminRoute = location.pathname.startsWith("/admin");

  return (
    <DesignSystemProvider>
      <CampaignThemeProvider>
        <Layout>
        <EditorPreviewGuard />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/products" element={<Products />} />
          <Route path="/products/:slug" element={<ProductDetail />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/unsubscribe" element={<Unsubscribe />} />
          <Route path="/account" element={<Account />} />
          <Route path="/orders/:orderId" element={<OrderTracking />} />
          <Route path="/create" element={<CreateYourOwn />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route path="/about" element={<About />} />
          <Route path="/submit-design" element={<SubmitDesign />} />
          <Route path="/creations" element={<Creations />} />
          <Route path="/creations/:slug" element={<CreationDetail />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/visual-editor" element={<AdminRoute requiredPermission="content.edit"><VisualEditor /></AdminRoute>} />
          <Route path="/admin" element={<AdminRoute><AdminShell /></AdminRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="products" element={<AdminRoute requiredPermission="products.manage"><AdminProducts /></AdminRoute>} />
            <Route path="products/:productId/variants" element={<AdminRoute requiredPermission="products.manage"><AdminVariants /></AdminRoute>} />
            <Route path="products/:productId/preview" element={<AdminRoute requiredPermission="products.manage"><AdminProductPreview /></AdminRoute>} />
            <Route path="categories" element={<AdminRoute requiredPermission="categories.manage"><AdminCategories /></AdminRoute>} />
            <Route path="orders" element={<AdminRoute requiredPermission="orders.manage"><AdminOrders /></AdminRoute>} />
            <Route path="orders/:orderId" element={<AdminRoute requiredPermission="orders.manage"><AdminOrderDetail /></AdminRoute>} />
            <Route path="users" element={<AdminRoute requiredPermission="*"><UsersWorkspace /></AdminRoute>} />
            <Route path="clients" element={<AdminRoute requiredPermission="customers.view"><Navigate to="/admin/users?section=customers" replace /></AdminRoute>} />
            <Route path="referrals" element={<AdminRoute requiredPermission="campaigns.manage"><Navigate to="/admin/users?section=referrals" replace /></AdminRoute>} />
            <Route path="custom-orders" element={<AdminRoute requiredPermission="custom_orders.manage"><AdminCustomOrders /></AdminRoute>} />
            <Route path="custom-orders/:orderId" element={<AdminRoute requiredPermission="custom_orders.manage"><AdminCustomOrderDetail /></AdminRoute>} />
            <Route path="shipping" element={<AdminRoute requiredPermission="shipping.manage"><AdminShipping /></AdminRoute>} />
            <Route path="discounts" element={<AdminRoute requiredPermission="discounts.manage"><AdminDiscounts /></AdminRoute>} />
            <Route path="reviews" element={<AdminRoute requiredPermission="reviews.manage"><AdminReviews /></AdminRoute>} />
            <Route path="showcases" element={<AdminRoute requiredPermission="showcases.manage"><AdminShowcases /></AdminRoute>} />
            <Route path="pricing" element={<AdminRoute requiredPermission="pricing.manage"><AdminPricing /></AdminRoute>} />
            <Route path="campaigns" element={<AdminRoute requiredPermission="campaigns.manage"><AdminCampaigns /></AdminRoute>} />
            <Route path="design-system" element={<AdminRoute requiredPermission="content.edit"><AdminDesignSystem /></AdminRoute>} />
            <Route path="chat" element={<AdminRoute requiredPermission="settings.view"><AdminChat /></AdminRoute>} />
            <Route path="chat-settings" element={<AdminRoute requiredPermission="settings.view"><Navigate to="/admin/chat?section=appearance" replace /></AdminRoute>} />
            <Route path="chat-analytics" element={<AdminRoute requiredPermission="settings.view"><Navigate to="/admin/chat?section=analytics" replace /></AdminRoute>} />
            <Route path="personalization" element={<AdminRoute requiredPermission="settings.view"><AdminPersonalization /></AdminRoute>} />
            <Route path="ab-testing" element={<AdminRoute requiredPermission="settings.view"><ABTestingDashboard /></AdminRoute>} />
            <Route path="ai-insights" element={<AdminRoute requiredPermission="settings.view"><AIInsightsDashboard /></AdminRoute>} />
            <Route path="editor" element={<AdminRoute requiredPermission="content.edit"><EditorWorkspace /></AdminRoute>} />
            <Route path="content" element={<AdminRoute requiredPermission="content.edit"><Navigate to="/admin/editor?section=blocks" replace /></AdminRoute>} />
            <Route path="backgrounds" element={<AdminRoute requiredPermission="backgrounds.manage"><AdminBackgrounds /></AdminRoute>} />
            <Route path="media" element={<AdminRoute requiredPermission="media.manage"><AdminMedia /></AdminRoute>} />
            <Route path="components" element={<AdminRoute requiredPermission="content.edit"><AdminComponents /></AdminRoute>} />
            <Route path="reusable-blocks" element={<AdminRoute requiredPermission="content.edit"><AdminReusableBlocks /></AdminRoute>} />
            <Route path="translations" element={<AdminRoute requiredPermission="translations.manage"><AdminTranslations /></AdminRoute>} />
            <Route path="activity" element={<AdminRoute requiredPermission="reports.view"><AdminActivity /></AdminRoute>} />
            <Route path="analytics" element={<AdminRoute requiredPermission="reports.view"><AdminAnalytics /></AdminRoute>} />
            <Route path="automations" element={<AdminRoute requiredPermission="campaigns.manage"><AdminAutomations /></AdminRoute>} />
            <Route path="instagram" element={<AdminRoute requiredPermission="settings.view"><AdminInstagram /></AdminRoute>} />
            <Route path="email-logs" element={<AdminRoute requiredPermission="reports.view"><AdminEmailLogs /></AdminRoute>} />
            <Route path="financial" element={<AdminRoute requiredPermission="settings.view"><FinancialWorkspace /></AdminRoute>} />
            <Route path="growth" element={<AdminRoute requiredPermission="campaigns.manage"><Navigate to="/admin/financial?section=growth" replace /></AdminRoute>} />
            <Route path="reports" element={<AdminRoute requiredPermission="reports.view"><Navigate to="/admin/financial?section=reports" replace /></AdminRoute>} />
            <Route path="revenue" element={<AdminRoute requiredPermission="revenue.view"><Navigate to="/admin/financial?section=revenue" replace /></AdminRoute>} />
            <Route path="declaration" element={<AdminRoute requiredPermission="reports.view"><Navigate to="/admin/financial?section=declaration" replace /></AdminRoute>} />
            <Route path="policies" element={<AdminRoute requiredPermission="content.edit"><Navigate to="/admin/financial?section=policies" replace /></AdminRoute>} />
            <Route path="settings" element={<AdminRoute requiredPermission="settings.view"><Navigate to="/admin/financial?section=settings" replace /></AdminRoute>} />
          </Route>
          <Route path="/policies" element={<Policies />} />
          <Route path="/policies/:slug" element={<Policies />} />
          <Route path="/pages/:slug" element={<DynamicPage />} />
          <Route path="/:slug" element={<DynamicPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        </Layout>

        {!isEditorPreview && !isAdminRoute && (
          <Suspense fallback={null}>
            <ChatWidget />
            <PromotionPopup />
            <GiftClaimPopup />
          </Suspense>
        )}
      </CampaignThemeProvider>
    </DesignSystemProvider>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <CartProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <EditorPreviewProvider>
              <AnalyticsProvider>
                <AppShell />
              </AnalyticsProvider>
            </EditorPreviewProvider>
          </BrowserRouter>
        </CartProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
