import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { EditorPreviewProvider } from "@/contexts/EditorPreviewContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { CampaignThemeProvider } from "@/components/campaign/CampaignThemeProvider";
import Layout from "@/components/layout/Layout";

// Public storefront pages
import Index from "./pages/Index";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import Auth from "./pages/Auth";
import Account from "./pages/Account";
import Contact from "./pages/Contact";
import About from "./pages/About";
import Gallery from "./pages/Gallery";
import CreateYourOwn from "./pages/CreateYourOwn";
import Creations from "./pages/Creations";
import CreationDetail from "./pages/CreationDetail";
import OrderTracking from "./pages/OrderTracking";
import Policies from "./pages/Policies";
import DynamicPage from "./pages/DynamicPage";
import ResetPassword from "./pages/ResetPassword";
import SubmitDesign from "./pages/SubmitDesign";
import Unsubscribe from "./pages/Unsubscribe";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 3,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <CartProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <EditorPreviewProvider>
              <CampaignThemeProvider>
                <Layout>
                  <Routes>
                    {/* Storefront routes */}
                    <Route path="/" element={<Index />} />
                    <Route path="/products" element={<Products />} />
                    <Route path="/products/:slug" element={<ProductDetail />} />
                    <Route path="/cart" element={<Cart />} />
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/account" element={<Account />} />
                    <Route path="/contact" element={<Contact />} />
                    <Route path="/about" element={<About />} />
                    <Route path="/gallery" element={<Gallery />} />
                    <Route path="/create-your-own" element={<CreateYourOwn />} />
                    <Route path="/creations" element={<Creations />} />
                    <Route path="/creations/:slug" element={<CreationDetail />} />
                    <Route path="/order-tracking" element={<OrderTracking />} />
                    <Route path="/policies" element={<Policies />} />
                    <Route path="/policies/:slug" element={<Policies />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="/submit-design" element={<SubmitDesign />} />
                    <Route path="/unsubscribe" element={<Unsubscribe />} />
                    <Route path="/page/:slug" element={<DynamicPage />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Layout>
              </CampaignThemeProvider>
            </EditorPreviewProvider>
          </BrowserRouter>
        </CartProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
