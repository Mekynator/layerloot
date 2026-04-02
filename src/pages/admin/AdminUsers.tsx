import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { RefreshCw, Shield, Search, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { logAdminActivity } from "@/lib/activity-log";
import { format } from "date-fns";

const ADMIN_ROLES = ["super_admin", "admin", "editor", "support"] as const;

interface AdminUser {
  user_id: string;
  role: string;
  email?: string;
  full_name?: string;
  created_at?: string;
}

const ROLE_COLORS: Record<string, string> = {
  super_admin: "destructive",
  admin: "default",
  editor: "secondary",
  support: "outline",
};

export default function AdminUsers() {
  const { user } = useAuth();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<string>("editor");
  const [adding, setAdding] = useState(false);

  const loadAdmins = async () => {
    setLoading(true);
    // Get all admin-level roles
    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id, role")
      .in("role", ADMIN_ROLES as any);

    if (!roles || roles.length === 0) {
      setAdmins([]);
      setLoading(false);
      return;
    }

    // Get profiles for these users
    const userIds = roles.map((r: any) => r.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", userIds);

    const profileMap = new Map((profiles ?? []).map((p: any) => [p.user_id, p]));

    const adminList: AdminUser[] = roles.map((r: any) => ({
      user_id: r.user_id,
      role: r.role,
      full_name: profileMap.get(r.user_id)?.full_name ?? "",
    }));

    setAdmins(adminList);
    setLoading(false);
  };

  useEffect(() => { loadAdmins(); }, []);

  const handleRoleChange = async (userId: string, oldRole: string, newRole: string) => {
    // Delete old admin role, insert new one
    await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", oldRole as any);
    const { error } = await supabase.from("user_roles").insert({
      user_id: userId,
      role: newRole as any,
    } as any);

    if (error) {
      toast.error(`Failed to update role: ${error.message}`);
      return;
    }

    if (user) {
      logAdminActivity({
        userId: user.id,
        userEmail: user.email,
        action: "role_change",
        entityType: "user_role",
        entityId: userId,
        summary: `Changed role from ${oldRole} to ${newRole}`,
        metadata: { old_role: oldRole, new_role: newRole, target_user: userId },
      });
    }

    toast.success("Role updated");
    loadAdmins();
  };

  const handleRemoveAdmin = async (userId: string, role: string) => {
    if (userId === user?.id) {
      toast.error("You cannot remove your own admin access");
      return;
    }
    await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role as any);

    if (user) {
      logAdminActivity({
        userId: user.id,
        userEmail: user.email,
        action: "role_change",
        entityType: "user_role",
        entityId: userId,
        summary: `Removed ${role} role`,
      });
    }

    toast.success("Admin access removed");
    loadAdmins();
  };

  const handleAddAdmin = async () => {
    if (!newEmail.trim()) return;
    setAdding(true);

    // Look up user by email via edge function
    const { data, error } = await supabase.functions.invoke("admin-users", {
      body: { action: "lookup_by_email", email: newEmail.trim() },
    });

    if (error || !data?.user_id) {
      toast.error("User not found. They must have an account first.");
      setAdding(false);
      return;
    }

    // Check if already has admin role
    const { data: existing } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user_id)
      .in("role", ADMIN_ROLES as any);

    if (existing && existing.length > 0) {
      toast.error("User already has an admin role");
      setAdding(false);
      return;
    }

    const { error: insertErr } = await supabase.from("user_roles").insert({
      user_id: data.user_id,
      role: newRole as any,
    } as any);

    if (insertErr) {
      toast.error(`Failed: ${insertErr.message}`);
      setAdding(false);
      return;
    }

    if (user) {
      logAdminActivity({
        userId: user.id,
        userEmail: user.email,
        action: "role_change",
        entityType: "user_role",
        entityId: data.user_id,
        summary: `Added ${newRole} role to ${newEmail}`,
      });
    }

    toast.success("Admin user added");
    setAddOpen(false);
    setNewEmail("");
    setAdding(false);
    loadAdmins();
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-primary" />
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
              Admin Users
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={loadAdmins} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              Add Admin
            </Button>
          </div>
        </div>

        <div className="rounded-lg border border-border/50 bg-card/50">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>User ID</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {admins.map((admin) => (
                <TableRow key={`${admin.user_id}-${admin.role}`}>
                  <TableCell className="font-medium">
                    {admin.full_name || "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground font-mono">
                    {admin.user_id.slice(0, 12)}...
                  </TableCell>
                  <TableCell>
                    <Select
                      value={admin.role}
                      onValueChange={(v) => handleRoleChange(admin.user_id, admin.role, v)}
                      disabled={admin.user_id === user?.id}
                    >
                      <SelectTrigger className="w-[140px]">
                        <Badge variant={(ROLE_COLORS[admin.role] as any) ?? "secondary"} className="text-[10px]">
                          {admin.role}
                        </Badge>
                      </SelectTrigger>
                      <SelectContent>
                        {ADMIN_ROLES.map((r) => (
                          <SelectItem key={r} value={r}>{r}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleRemoveAdmin(admin.user_id, admin.role)}
                      disabled={admin.user_id === user?.id}
                    >
                      Remove
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {admins.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    No admin users found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Admin User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-foreground">Email</label>
              <Input
                placeholder="user@example.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Role</label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ADMIN_ROLES.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAddAdmin} disabled={adding || !newEmail.trim()}>
              {adding ? "Adding..." : "Add User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
