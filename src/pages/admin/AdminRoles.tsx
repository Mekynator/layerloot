import AdminPageShell from "@/components/admin/AdminPageShell";
import { Shield, UserCog } from "lucide-react";
import { AdminModulePlaceholder } from "@/components/admin/shared/AdminWidgets";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ROLE_LABELS, ALL_ADMIN_ROLES, type AdminRoleKey } from "@/lib/admin-permissions-map";

interface AdminUser {
  user_id: string;
  role: string;
  email?: string;
  full_name?: string;
}

const AdminRoles = () => {
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("role", ALL_ADMIN_ROLES);

      if (!roles?.length) { setLoading(false); return; }

      const userIds = [...new Set(roles.map(r => r.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);

      const profileMap = new Map((profiles ?? []).map((p: { user_id: string; full_name: string | null }) => [p.user_id, p.full_name]));

      setAdminUsers(roles.map(r => ({
        user_id: r.user_id,
        role: r.role,
        full_name: profileMap.get(r.user_id) ?? undefined,
      })));
      setLoading(false);
    };
    load();
  }, []);

  return (
    <AdminPageShell title="Admin Roles" description="View and manage admin role assignments." icon={Shield}>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>User ID</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={3} className="py-8 text-center text-muted-foreground">Loading...</TableCell></TableRow>
              ) : adminUsers.length === 0 ? (
                <TableRow><TableCell colSpan={3} className="py-8 text-center text-muted-foreground">No admin users found.</TableCell></TableRow>
              ) : adminUsers.map((u) => (
                <TableRow key={`${u.user_id}-${u.role}`}>
                  <TableCell className="text-sm font-medium">{u.full_name || "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {ROLE_LABELS[u.role as AdminRoleKey] ?? u.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{u.user_id.slice(0, 12)}…</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AdminPageShell>
  );
};

export default AdminRoles;
