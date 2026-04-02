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
import AdminGrowth from "./pages/admin/AdminGrowth";
import AdminCampaigns from "./pages/admin/AdminCampaigns";
import AdminReports from "./pages/admin/AdminReports";
import AdminRevenue from "./pages/admin/AdminRevenue";
import VisualEditor from "./pages/admin/VisualEditor";
import AdminBackgrounds from "./pages/admin/AdminBackgrounds";
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
    <>
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
          <Route path="/admin" element={<Dashboard />} />
          <Route path="/admin/products" element={<AdminProducts />} />
          <Route path="/admin/products/:productId/variants" element={<AdminVariants />} />
          <Route path="/admin/categories" element={<AdminCategories />} />
          <Route path="/admin/orders" element={<AdminOrders />} />
          <Route path="/admin/clients" element={<AdminClients />} />
          <Route path="/admin/shipping" element={<AdminShipping />} />
          <Route path="/admin/custom-orders" element={<AdminCustomOrders />} />
          <Route path="/admin/discounts" element={<AdminDiscounts />} />
          <Route path="/admin/reviews" element={<AdminReviews />} />
          <Route path="/admin/showcases" element={<AdminShowcases />} />
          <Route path="/admin/pricing" element={<AdminPricing />} />
          <Route path="/admin/growth" element={<AdminGrowth />} />
          <Route path="/admin/campaigns" element={<AdminCampaigns />} />
          <Route path="/admin/reports" element={<AdminReports />} />
          <Route path="/admin/revenue" element={<AdminRevenue />} />
          <Route path="/admin/content" element={<AdminContent />} />
          <Route path="/admin/settings" element={<AdminSettings />} />
          <Route path="/admin/editor" element={<VisualEditor />} />
          <Route path="/admin/backgrounds" element={<AdminBackgrounds />} />
          <Route path="/policies/:slug" element={<Policies />} />
          <Route path="/pages/:slug" element={<DynamicPage />} />
          <Route path="/:slug" element={<DynamicPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Layout>

      {!isEditorPreview && !isAdminRoute && <ChatWidget />}
      {!isEditorPreview && !isAdminRoute && <PromotionPopup />}
      {!isEditorPreview && !isAdminRoute && <GiftClaimPopup />}
    </>
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
