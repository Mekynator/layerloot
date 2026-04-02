import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminPermissions } from "@/hooks/use-admin-permissions";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useRef } from "react";

interface AdminRouteProps {
  children: React.ReactNode;
  requiredPermission?: string;
}

export default function AdminRoute({ children, requiredPermission }: AdminRouteProps) {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const { hasPermission, loading: permLoading } = useAdminPermissions();
  const toastShown = useRef(false);

  const loading = authLoading || permLoading;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <Navigate to="/admin/login" replace />;
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    if (!toastShown.current) {
      toastShown.current = true;
      toast.error("You don't have permission to access this page");
    }
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
}
