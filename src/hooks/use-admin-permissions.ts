import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type AdminRole = "super_admin" | "admin" | "editor" | "support" | null;

const ADMIN_ROLES = new Set(["super_admin", "admin", "editor", "support"]);

interface AdminPermissionsState {
  adminRole: AdminRole;
  permissions: string[];
  loading: boolean;
  hasPermission: (permission: string) => boolean;
}

export function useAdminPermissions(): AdminPermissionsState {
  const { user } = useAuth();
  const [adminRole, setAdminRole] = useState<AdminRole>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setAdminRole(null);
      setPermissions([]);
      setLoading(false);
      return;
    }

    const load = async () => {
      // Get user's admin role
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      const adminRoleRow = (roles ?? []).find((r: any) =>
        ADMIN_ROLES.has(r.role)
      );
      const role = (adminRoleRow?.role as AdminRole) ?? null;
      setAdminRole(role);

      if (!role) {
        setPermissions([]);
        setLoading(false);
        return;
      }

      // Get permissions for this role
      const { data: perms } = await supabase
        .from("admin_permissions")
        .select("permission")
        .eq("role", role as any);

      setPermissions((perms ?? []).map((p: any) => p.permission));
      setLoading(false);
    };

    load();
  }, [user?.id]);

  const hasPermission = useCallback(
    (permission: string) => {
      if (!adminRole) return false;
      if (permissions.includes("*")) return true;
      return permissions.includes(permission);
    },
    [adminRole, permissions]
  );

  return { adminRole, permissions, loading, hasPermission };
}
