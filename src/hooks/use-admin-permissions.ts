import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ADMIN_ROLE_SET, type AdminRoleKey, isOwnerEmail } from "@/lib/admin-permissions-map";

export type AdminRole = AdminRoleKey | null;

interface AdminPermissionsState {
  adminRole: AdminRole;
  permissions: string[];
  loading: boolean;
  hasPermission: (permission: string) => boolean;
  isOwner: boolean;
}

export function useAdminPermissions(): AdminPermissionsState {
  const { user } = useAuth();
  const [adminRole, setAdminRole] = useState<AdminRole>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const ownerFlag = isOwnerEmail(user?.email);

  useEffect(() => {
    if (!user) {
      setAdminRole(null);
      setPermissions([]);
      setLoading(false);
      return;
    }

    const load = async () => {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      const adminRoleRow = (roles ?? []).find((r: any) => ADMIN_ROLE_SET.has(r.role));
      const role = (adminRoleRow?.role as AdminRole) ?? null;

      // If owner email but no owner role, treat as owner anyway
      const effectiveRole = ownerFlag && role !== "owner" ? "owner" : role;
      setAdminRole(effectiveRole);

      if (!effectiveRole) {
        setPermissions([]);
        setLoading(false);
        return;
      }

      // Owner always has wildcard
      if (effectiveRole === "owner") {
        setPermissions(["*"]);
        setLoading(false);
        return;
      }

      const { data: perms } = await supabase
        .from("admin_permissions")
        .select("permission")
        .eq("role", effectiveRole as any);

      setPermissions((perms ?? []).map((p: any) => p.permission));
      setLoading(false);
    };

    load();
  }, [user?.id, ownerFlag]);

  const hasPermission = useCallback(
    (permission: string) => {
      if (!adminRole) return false;
      if (adminRole === "owner") return true;
      if (permissions.includes("*")) return true;
      return permissions.includes(permission);
    },
    [adminRole, permissions]
  );

  return { adminRole, permissions, loading, hasPermission, isOwner: ownerFlag };
}
