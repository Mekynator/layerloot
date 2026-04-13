import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { EditorPreviewProvider } from "@/contexts/EditorPreviewContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import AdminRoute from "./components/admin/AdminRoute";
import AdminStudioShell from "./components/admin/AdminStudioShell";
import AdminLogin from "./pages/admin/AdminLogin";

// Admin pages
import Dashboard from "./pages/admin/Dashboard";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminVariants from "./pages/admin/AdminVariants";
import AdminCategories from "./pages/admin/AdminCategories";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminOrderDetail from "./pages/admin/AdminOrderDetail";
import AdminCustomOrders from "./pages/admin/AdminCustomOrders";
import AdminCustomOrderDetail from "./pages/admin/AdminCustomOrderDetail";
import AdminClients from "./pages/admin/AdminClients";
import AdminShipping from "./pages/admin/AdminShipping";
import AdminReviews from "./pages/admin/AdminReviews";
import AdminDiscounts from "./pages/admin/AdminDiscounts";
import AdminShowcases from "./pages/admin/AdminShowcases";
import AdminPricing from "./pages/admin/AdminPricing";
import AdminProductPreview from "./pages/admin/AdminProductPreview";
import AdminCampaigns from "./pages/admin/AdminCampaigns";
import VisualEditor from "./pages/admin/VisualEditor";
import AdminBackgrounds from "./pages/admin/AdminBackgrounds";
import AdminActivity from "./pages/admin/AdminActivity";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import AdminMedia from "./pages/admin/AdminMedia";
import AdminComponents from "./pages/admin/AdminComponents";
import AdminTranslations from "./pages/admin/AdminTranslations";
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
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <EditorPreviewProvider>
            <Routes>
              {/* Public: login only */}
              <Route path="/login" element={<AdminLogin />} />

              {/* All admin routes behind guard + shell */}
              <Route path="/" element={<AdminRoute><AdminStudioShell /></AdminRoute>}>
                <Route index element={<Dashboard />} />
                <Route path="analytics" element={<AdminRoute requiredPermission="reports.view"><AdminAnalytics /></AdminRoute>} />
                <Route path="orders" element={<AdminRoute requiredPermission="orders.manage"><AdminOrders /></AdminRoute>} />
                <Route path="orders/:orderId" element={<AdminRoute requiredPermission="orders.manage"><AdminOrderDetail /></AdminRoute>} />
                <Route path="custom-orders" element={<AdminRoute requiredPermission="custom_orders.manage"><AdminCustomOrders /></AdminRoute>} />
                <Route path="custom-orders/:orderId" element={<AdminRoute requiredPermission="custom_orders.manage"><AdminCustomOrderDetail /></AdminRoute>} />
                <Route path="products" element={<AdminRoute requiredPermission="products.manage"><AdminProducts /></AdminRoute>} />
                <Route path="products/:productId/variants" element={<AdminRoute requiredPermission="products.manage"><AdminVariants /></AdminRoute>} />
                <Route path="products/:productId/preview" element={<AdminRoute requiredPermission="products.manage"><AdminProductPreview /></AdminRoute>} />
                <Route path="categories" element={<AdminRoute requiredPermission="categories.manage"><AdminCategories /></AdminRoute>} />
                <Route path="users" element={<AdminRoute requiredPermission="*"><UsersWorkspace /></AdminRoute>} />
                <Route path="clients" element={<AdminRoute requiredPermission="customers.view"><Navigate to="/users?section=customers" replace /></AdminRoute>} />
                <Route path="referrals" element={<AdminRoute requiredPermission="campaigns.manage"><Navigate to="/users?section=referrals" replace /></AdminRoute>} />
                <Route path="reviews" element={<AdminRoute requiredPermission="reviews.manage"><AdminReviews /></AdminRoute>} />
                <Route path="campaigns" element={<AdminRoute requiredPermission="campaigns.manage"><AdminCampaigns /></AdminRoute>} />
                <Route path="discounts" element={<AdminRoute requiredPermission="discounts.manage"><AdminDiscounts /></AdminRoute>} />
                <Route path="showcases" element={<AdminRoute requiredPermission="showcases.manage"><AdminShowcases /></AdminRoute>} />
                <Route path="pricing" element={<AdminRoute requiredPermission="pricing.manage"><AdminPricing /></AdminRoute>} />
                <Route path="shipping" element={<AdminRoute requiredPermission="shipping.manage"><AdminShipping /></AdminRoute>} />
                <Route path="chat" element={<AdminRoute requiredPermission="settings.view"><AdminChat /></AdminRoute>} />
                <Route path="personalization" element={<AdminRoute requiredPermission="settings.view"><AdminPersonalization /></AdminRoute>} />
                <Route path="ab-testing" element={<AdminRoute requiredPermission="settings.view"><ABTestingDashboard /></AdminRoute>} />
                <Route path="ai-insights" element={<AdminRoute requiredPermission="settings.view"><AIInsightsDashboard /></AdminRoute>} />
                <Route path="editor" element={<AdminRoute requiredPermission="content.edit"><EditorWorkspace /></AdminRoute>} />
                <Route path="visual-editor" element={<AdminRoute requiredPermission="content.edit"><VisualEditor /></AdminRoute>} />
                <Route path="design-system" element={<AdminRoute requiredPermission="content.edit"><AdminDesignSystem /></AdminRoute>} />
                <Route path="media" element={<AdminRoute requiredPermission="media.manage"><AdminMedia /></AdminRoute>} />
                <Route path="components" element={<AdminRoute requiredPermission="content.edit"><AdminComponents /></AdminRoute>} />
                <Route path="translations" element={<AdminRoute requiredPermission="translations.manage"><AdminTranslations /></AdminRoute>} />
                <Route path="backgrounds" element={<AdminRoute requiredPermission="backgrounds.manage"><AdminBackgrounds /></AdminRoute>} />
                <Route path="automations" element={<AdminRoute requiredPermission="campaigns.manage"><AdminAutomations /></AdminRoute>} />
                <Route path="instagram" element={<AdminRoute requiredPermission="settings.view"><AdminInstagram /></AdminRoute>} />
                <Route path="email-logs" element={<AdminRoute requiredPermission="reports.view"><AdminEmailLogs /></AdminRoute>} />
                <Route path="financial" element={<AdminRoute requiredPermission="settings.view"><FinancialWorkspace /></AdminRoute>} />
                <Route path="activity" element={<AdminRoute requiredPermission="reports.view"><AdminActivity /></AdminRoute>} />
              </Route>

              {/* Legacy /admin routes redirect */}
              <Route path="/admin/login" element={<Navigate to="/login" replace />} />
              <Route path="/admin/*" element={<Navigate to="/" replace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </EditorPreviewProvider>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
