import { lazy, Suspense } from "react";
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
import PageSkeleton from "@/components/shared/PageSkeleton";

const Index = lazy(() => import("./pages/Index"));
const Products = lazy(() => import("./pages/Products"));
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const Cart = lazy(() => import("./pages/Cart"));
const Auth = lazy(() => import("./pages/Auth"));
const Account = lazy(() => import("./pages/Account"));
const Contact = lazy(() => import("./pages/Contact"));
const About = lazy(() => import("./pages/About"));

const CreateYourOwn = lazy(() => import("./pages/CreateYourOwn"));
const Creations = lazy(() => import("./pages/Creations"));
const CreationDetail = lazy(() => import("./pages/CreationDetail"));
const OrderTracking = lazy(() => import("./pages/OrderTracking"));
const Policies = lazy(() => import("./pages/Policies"));
const DynamicPage = lazy(() => import("./pages/DynamicPage"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const SubmitDesign = lazy(() => import("./pages/SubmitDesign"));
const Unsubscribe = lazy(() => import("./pages/Unsubscribe"));
const NotFound = lazy(() => import("./pages/NotFound"));

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
                  <Suspense fallback={<PageSkeleton />}>
                    <Routes>
                      <Route path="/" element={<Index />} />
                      <Route path="/products" element={<Products />} />
                      <Route path="/products/:slug" element={<ProductDetail />} />
                      <Route path="/cart" element={<Cart />} />
                      <Route path="/auth" element={<Auth />} />
                      <Route path="/account" element={<Account />} />
                      <Route path="/contact" element={<Contact />} />
                      <Route path="/about" element={<About />} />
                      
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
                  </Suspense>
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
