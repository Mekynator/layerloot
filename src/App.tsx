import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, useSearchParams } from "react-router-dom";
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
import AdminContent from "./pages/admin/AdminContent";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminCustomOrders from "./pages/admin/AdminCustomOrders";
import AdminDiscounts from "./pages/admin/AdminDiscounts";
import AdminShowcases from "./pages/admin/AdminShowcases";
import AdminPricing from "./pages/admin/AdminPricing";
import AdminProductPreview from "./pages/admin/AdminProductPreview";
import AdminGrowth from "./pages/admin/AdminGrowth";
import AdminCampaigns from "./pages/admin/AdminCampaigns";
import AdminReports from "./pages/admin/AdminReports";
import AdminRevenue from "./pages/admin/AdminRevenue";
import VisualEditor from "./pages/admin/VisualEditor";
import AdminBackgrounds from "./pages/admin/AdminBackgrounds";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminActivity from "./pages/admin/AdminActivity";
import AdminOrderDetail from "./pages/admin/AdminOrderDetail";
import AdminCustomOrderDetail from "./pages/admin/AdminCustomOrderDetail";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminMedia from "./pages/admin/AdminMedia";
import AdminReusableBlocks from "./pages/admin/AdminReusableBlocks";
import AdminTranslations from "./pages/admin/AdminTranslations";
import AdminRoute from "./components/admin/AdminRoute";
import AdminChatSettings from "./pages/admin/AdminChatSettings";
import AdminChatAnalytics from "./pages/admin/AdminChatAnalytics";
import AdminChat from "./pages/admin/AdminChat";
import AdminAutomations from "./pages/admin/AdminAutomations";
import AdminInstagram from "./pages/admin/AdminInstagram";
import DynamicPage from "./pages/DynamicPage";
import CreateYourOwn from "./pages/CreateYourOwn";
import Policies from "./pages/Policies";
import Gallery from "./pages/Gallery";
import About from "./pages/About";
import SubmitDesign from "./pages/SubmitDesign";
import NotFound from "./pages/NotFound";
import Creations from "./pages/Creations";
import CreationDetail from "./pages/CreationDetail";
import ChatWidget from "./components/ChatWidget";
import PromotionPopup from "./components/PromotionPopup";
import GiftClaimPopup from "./components/GiftClaimPopup";
import { CampaignThemeProvider } from "./components/campaign/CampaignThemeProvider";

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
    <CampaignThemeProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/products" element={<Products />} />
          <Route path="/products/:slug" element={<ProductDetail />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/account" element={<Account />} />
          <Route path="/orders/:orderId" element={<OrderTracking />} />
          <Route path="/create" element={<CreateYourOwn />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route path="/about" element={<About />} />
          <Route path="/submit-design" element={<SubmitDesign />} />
          <Route path="/creations" element={<Creations />} />
          <Route path="/creations/:slug" element={<CreationDetail />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminRoute><Dashboard /></AdminRoute>} />
          <Route path="/admin/products" element={<AdminRoute requiredPermission="products.manage"><AdminProducts /></AdminRoute>} />
          <Route path="/admin/products/:productId/variants" element={<AdminRoute requiredPermission="products.manage"><AdminVariants /></AdminRoute>} />
          <Route path="/admin/products/:productId/preview" element={<AdminRoute requiredPermission="products.manage"><AdminProductPreview /></AdminRoute>} />
          <Route path="/admin/categories" element={<AdminRoute requiredPermission="categories.manage"><AdminCategories /></AdminRoute>} />
          <Route path="/admin/orders" element={<AdminRoute requiredPermission="orders.manage"><AdminOrders /></AdminRoute>} />
          <Route path="/admin/orders/:orderId" element={<AdminRoute requiredPermission="orders.manage"><AdminOrderDetail /></AdminRoute>} />
          <Route path="/admin/clients" element={<AdminRoute requiredPermission="customers.view"><AdminClients /></AdminRoute>} />
          <Route path="/admin/custom-orders" element={<AdminRoute requiredPermission="custom_orders.manage"><AdminCustomOrders /></AdminRoute>} />
          <Route path="/admin/custom-orders/:orderId" element={<AdminRoute requiredPermission="custom_orders.manage"><AdminCustomOrderDetail /></AdminRoute>} />
          <Route path="/admin/shipping" element={<AdminRoute requiredPermission="shipping.manage"><AdminShipping /></AdminRoute>} />
          <Route path="/admin/discounts" element={<AdminRoute requiredPermission="discounts.manage"><AdminDiscounts /></AdminRoute>} />
          <Route path="/admin/reviews" element={<AdminRoute requiredPermission="reviews.manage"><AdminReviews /></AdminRoute>} />
          <Route path="/admin/showcases" element={<AdminRoute requiredPermission="showcases.manage"><AdminShowcases /></AdminRoute>} />
          <Route path="/admin/pricing" element={<AdminRoute requiredPermission="pricing.manage"><AdminPricing /></AdminRoute>} />
          <Route path="/admin/growth" element={<AdminRoute requiredPermission="campaigns.manage"><AdminGrowth /></AdminRoute>} />
          <Route path="/admin/campaigns" element={<AdminRoute requiredPermission="campaigns.manage"><AdminCampaigns /></AdminRoute>} />
          <Route path="/admin/reports" element={<AdminRoute requiredPermission="reports.view"><AdminReports /></AdminRoute>} />
          <Route path="/admin/revenue" element={<AdminRoute requiredPermission="revenue.view"><AdminRevenue /></AdminRoute>} />
          <Route path="/admin/content" element={<AdminRoute requiredPermission="content.edit"><AdminContent /></AdminRoute>} />
          <Route path="/admin/settings" element={<AdminRoute requiredPermission="settings.view"><AdminSettings /></AdminRoute>} />
          <Route path="/admin/chat" element={<AdminRoute requiredPermission="settings.view"><AdminChat /></AdminRoute>} />
          <Route path="/admin/chat-settings" element={<AdminRoute requiredPermission="settings.view"><AdminChat /></AdminRoute>} />
          <Route path="/admin/chat-analytics" element={<AdminRoute requiredPermission="settings.view"><AdminChat /></AdminRoute>} />
          <Route path="/admin/editor" element={<AdminRoute requiredPermission="content.edit"><VisualEditor /></AdminRoute>} />
          <Route path="/admin/backgrounds" element={<AdminRoute requiredPermission="backgrounds.manage"><AdminBackgrounds /></AdminRoute>} />
          <Route path="/admin/media" element={<AdminRoute requiredPermission="media.manage"><AdminMedia /></AdminRoute>} />
          <Route path="/admin/reusable-blocks" element={<AdminRoute requiredPermission="content.edit"><AdminReusableBlocks /></AdminRoute>} />
          <Route path="/admin/translations" element={<AdminRoute requiredPermission="translations.manage"><AdminTranslations /></AdminRoute>} />
          <Route path="/admin/activity" element={<AdminRoute requiredPermission="reports.view"><AdminActivity /></AdminRoute>} />
          <Route path="/admin/automations" element={<AdminRoute requiredPermission="campaigns.manage"><AdminAutomations /></AdminRoute>} />
          <Route path="/admin/instagram" element={<AdminRoute requiredPermission="settings.view"><AdminInstagram /></AdminRoute>} />
          <Route path="/admin/users" element={<AdminRoute requiredPermission="*"><AdminUsers /></AdminRoute>} />
          <Route path="/policies/:slug" element={<Policies />} />
          <Route path="/pages/:slug" element={<DynamicPage />} />
          <Route path="/:slug" element={<DynamicPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Layout>

      {!isEditorPreview && !isAdminRoute && <ChatWidget />}
      {!isEditorPreview && !isAdminRoute && <PromotionPopup />}
      {!isEditorPreview && !isAdminRoute && <GiftClaimPopup />}
    </CampaignThemeProvider>
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
            <AppShell />
          </BrowserRouter>
        </CartProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
