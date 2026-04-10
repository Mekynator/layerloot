import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, Shield, UserPlus, Crown, Ban, RotateCcw, Trash2, Edit2, Mail } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminPermissions } from "@/hooks/use-admin-permissions";
import { logAdminActivity } from "@/lib/activity-log";
import {
  ALL_ADMIN_ROLES, ROLE_LABELS, ROLE_COLORS, PERMISSION_GROUPS,
  isOwnerEmail, canManageRole, OWNER_EMAIL, type AdminRoleKey,
} from "@/lib/admin-permissions-map";

interface AdminUser {
  user_id: string;
  role: AdminRoleKey;
  email?: string;
  full_name?: string;
  last_sign_in_at?: string;
  status: "active" | "suspended";
}

interface Invitation {
  id: string;
  email: string;
  role: AdminRoleKey;
  permissions: string[];
  status: string;
  created_at: string;
}

export default function AdminUsers() {
  const { user } = useAuth();
  const { adminRole, isOwner } = useAdminPermissions();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);

  // Add/Invite
  const [addOpen, setAddOpen] = useState(false);
  const [inviteMode, setInviteMode] = useState<"add" | "invite">("add");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<AdminRoleKey>("editor");
  const [newPermissions, setNewPermissions] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);

  // Edit
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [editRole, setEditRole] = useState<AdminRoleKey>("editor");
  const [editPermissions, setEditPermissions] = useState<string[]>([]);

  // Confirm destructive
  const [confirmAction, setConfirmAction] = useState<{ type: "suspend" | "reactivate" | "delete"; target: AdminUser } | null>(null);

  const loadAdmins = async () => {
    setLoading(true);
    const { data: roles } = await supabase.from("user_roles").select("user_id, role").in("role", ALL_ADMIN_ROLES as any);
    if (!roles || roles.length === 0) { setAdmins([]); setLoading(false); return; }

    const userIds = [...new Set(roles.map((r: any) => r.user_id))];
    const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds);
    const profileMap = new Map((profiles ?? []).map((p: any) => [p.user_id, p]));

    // Get emails via edge function
    const emailMap = new Map<string, { email: string; last_sign_in_at: string | null }>();
    try {
      const { data } = await supabase.functions.invoke("admin-users", { body: { action: "list_users" } });
      if (data?.users) {
        for (const u of data.users) emailMap.set(u.id, { email: u.email, last_sign_in_at: u.last_sign_in_at });
      }
    } catch {}

    const adminList: AdminUser[] = roles.map((r: any) => ({
      user_id: r.user_id,
      role: r.role as AdminRoleKey,
      full_name: profileMap.get(r.user_id)?.full_name ?? "",
      email: emailMap.get(r.user_id)?.email ?? "",
      last_sign_in_at: emailMap.get(r.user_id)?.last_sign_in_at ?? undefined,
      status: "active" as const,
    }));

    // Sort owner first
    adminList.sort((a, b) => {
      if (isOwnerEmail(a.email)) return -1;
      if (isOwnerEmail(b.email)) return 1;
      return 0;
    });

    setAdmins(adminList);
    setLoading(false);
  };

  const loadInvitations = async () => {
    const { data } = await supabase.from("admin_invitations").select("*").order("created_at", { ascending: false });
    setInvitations((data ?? []).map((i: any) => ({ ...i, role: i.role as AdminRoleKey })));
  };

  useEffect(() => { loadAdmins(); loadInvitations(); }, []);

  const handleRoleChange = async (target: AdminUser, newRole: AdminRoleKey) => {
    if (isOwnerEmail(target.email) && !isOwner) { toast.error("Cannot modify Owner account"); return; }
    if (target.user_id === user?.id && newRole !== adminRole) {
      toast.error("Cannot change your own role"); return;
    }
    await supabase.from("user_roles").delete().eq("user_id", target.user_id).eq("role", target.role as any);
    const { error } = await supabase.from("user_roles").insert({ user_id: target.user_id, role: newRole as any } as any);
    if (error) { toast.error(`Failed: ${error.message}`); return; }
    if (user) logAdminActivity({ userId: user.id, userEmail: user.email, action: "role_change", entityType: "user_role", entityId: target.user_id, summary: `Changed role from ${target.role} to ${newRole}`, metadata: { old_role: target.role, new_role: newRole } });
    toast.success("Role updated");
    loadAdmins();
  };

  const handleRemoveAdmin = async (target: AdminUser) => {
    if (isOwnerEmail(target.email)) { toast.error("Owner cannot be removed"); return; }
    if (target.user_id === user?.id) { toast.error("Cannot remove yourself"); return; }
    await supabase.from("user_roles").delete().eq("user_id", target.user_id).eq("role", target.role as any);
    if (user) logAdminActivity({ userId: user.id, userEmail: user.email, action: "admin_deleted", entityType: "user_role", entityId: target.user_id, summary: `Removed ${target.role} role from ${target.email}` });
    toast.success("Admin removed");
    loadAdmins();
    setConfirmAction(null);
  };

  const handleAddAdmin = async () => {
    if (!newEmail.trim()) return;
    setAdding(true);

    if (inviteMode === "invite") {
      const { error } = await supabase.from("admin_invitations").insert({
        email: newEmail.trim(),
        role: newRole as any,
        permissions: newPermissions,
        invited_by: user!.id,
      } as any);
      if (error) { toast.error(`Failed: ${error.message}`); setAdding(false); return; }
      if (user) logAdminActivity({ userId: user.id, userEmail: user.email, action: "admin_invited", entityType: "admin_invitation", entityId: newEmail, summary: `Invited ${newEmail} as ${newRole}` });
      toast.success("Invitation created");
      loadInvitations();
    } else {
      const { data, error: lookupErr } = await supabase.functions.invoke("admin-users", { body: { action: "lookup_by_email", email: newEmail.trim() } });
      if (lookupErr || !data?.user_id) { toast.error("User not found. Use Invite instead."); setAdding(false); return; }
      const { data: existing } = await supabase.from("user_roles").select("role").eq("user_id", data.user_id).in("role", ALL_ADMIN_ROLES as any);
      if (existing && existing.length > 0) { toast.error("User already has an admin role"); setAdding(false); return; }
      const { error } = await supabase.from("user_roles").insert({ user_id: data.user_id, role: newRole as any } as any);
      if (error) { toast.error(`Failed: ${error.message}`); setAdding(false); return; }
      if (user) logAdminActivity({ userId: user.id, userEmail: user.email, action: "admin_created", entityType: "user_role", entityId: data.user_id, summary: `Added ${newRole} role to ${newEmail}` });
      toast.success("Admin added");
      loadAdmins();
    }
    setAddOpen(false);
    setNewEmail("");
    setAdding(false);
  };

  const openEdit = (admin: AdminUser) => {
    setEditUser(admin);
    setEditRole(admin.role);
    setEditPermissions([]);
  };

  const saveEdit = async () => {
    if (!editUser) return;
    if (editRole !== editUser.role) await handleRoleChange(editUser, editRole);
    setEditUser(null);
  };

  const rolesForCurrentAdmin = ALL_ADMIN_ROLES.filter((r) => {
    if (isOwner) return true;
    if (r === "owner") return false;
    if (adminRole === "super_admin") return r !== "super_admin" || false;
    return canManageRole(adminRole as AdminRoleKey, r);
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-primary" />
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">Admins</h1>
              <p className="text-xs text-muted-foreground">Manage admin accounts, roles, and permissions</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => { loadAdmins(); loadInvitations(); }} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button size="sm" onClick={() => { setAddOpen(true); setInviteMode("add"); }}>
              <UserPlus className="mr-2 h-4 w-4" /> Add Admin
            </Button>
          </div>
        </div>

        <Tabs defaultValue="admins">
          <TabsList>
            <TabsTrigger value="admins">Active Admins</TabsTrigger>
            <TabsTrigger value="invitations">Invitations</TabsTrigger>
          </TabsList>

          <TabsContent value="admins">
            <div className="rounded-lg border border-border/50 bg-card/50">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {admins.map((admin) => {
                    const isOwnerAcc = isOwnerEmail(admin.email);
                    const canEdit = isOwner || (!isOwnerAcc && canManageRole(adminRole as AdminRoleKey, admin.role));
                    const isSelf = admin.user_id === user?.id;
                    return (
                      <TableRow key={`${admin.user_id}-${admin.role}`}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {admin.full_name || "—"}
                            {isOwnerAcc && <Crown className="h-3.5 w-3.5 text-primary" />}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{admin.email || admin.user_id.slice(0, 12)}</TableCell>
                        <TableCell>
                          <Badge variant={(ROLE_COLORS[admin.role] as any) ?? "secondary"} className="text-[10px]">
                            {ROLE_LABELS[admin.role] || admin.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {admin.last_sign_in_at ? new Date(admin.last_sign_in_at).toLocaleDateString() : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {canEdit && !isSelf && (
                              <>
                                <Button variant="ghost" size="sm" onClick={() => openEdit(admin)}>
                                  <Edit2 className="h-3.5 w-3.5" />
                                </Button>
                                {!isOwnerAcc && (
                                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setConfirmAction({ type: "delete", target: admin })}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                              </>
                            )}
                            {isSelf && <span className="text-[10px] text-muted-foreground">You</span>}
                            {isOwnerAcc && !isOwner && <span className="text-[10px] text-muted-foreground">Protected</span>}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {admins.length === 0 && !loading && (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No admin users found</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="invitations">
            <div className="rounded-lg border border-border/50 bg-card/50">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invitations.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="text-sm">{inv.email}</TableCell>
                      <TableCell><Badge variant="secondary" className="text-[10px]">{ROLE_LABELS[inv.role] || inv.role}</Badge></TableCell>
                      <TableCell><Badge variant={inv.status === "pending" ? "outline" : "secondary"} className="text-[10px]">{inv.status}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(inv.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        {inv.status === "pending" && (
                          <Button variant="ghost" size="sm" className="text-destructive" onClick={async () => {
                            await supabase.from("admin_invitations").delete().eq("id", inv.id);
                            toast.success("Invitation cancelled");
                            loadInvitations();
                          }}>Cancel</Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {invitations.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No invitations</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Add/Invite Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Admin User</DialogTitle>
            <DialogDescription>Add an existing user or send an invitation</DialogDescription>
          </DialogHeader>
          <Tabs value={inviteMode} onValueChange={(v) => setInviteMode(v as "add" | "invite")}>
            <TabsList className="w-full">
              <TabsTrigger value="add" className="flex-1">Add Existing User</TabsTrigger>
              <TabsTrigger value="invite" className="flex-1"><Mail className="mr-1.5 h-3.5 w-3.5" /> Invite by Email</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-sm font-medium">Email</Label>
              <Input placeholder="user@example.com" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
            </div>
            <div>
              <Label className="text-sm font-medium">Role</Label>
              <Select value={newRole} onValueChange={(v) => setNewRole(v as AdminRoleKey)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {rolesForCurrentAdmin.map((r) => (
                    <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {newRole === "custom" && (
              <div>
                <Label className="text-sm font-medium mb-2 block">Custom Permissions</Label>
                <div className="space-y-3 max-h-48 overflow-y-auto">
                  {PERMISSION_GROUPS.map((group) => (
                    <div key={group.label}>
                      <p className="text-[10px] font-semibold uppercase text-muted-foreground mb-1">{group.label}</p>
                      {group.permissions.map((p) => (
                        <label key={p} className="flex items-center gap-2 text-xs py-0.5">
                          <Checkbox checked={newPermissions.includes(p)} onCheckedChange={(c) => setNewPermissions(c ? [...newPermissions, p] : newPermissions.filter((x) => x !== p))} />
                          {p}
                        </label>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAddAdmin} disabled={adding || !newEmail.trim()}>
              {adding ? "Processing..." : inviteMode === "invite" ? "Send Invitation" : "Add User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editUser} onOpenChange={() => setEditUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Admin: {editUser?.email || editUser?.full_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-sm font-medium">Role</Label>
              <Select value={editRole} onValueChange={(v) => setEditRole(v as AdminRoleKey)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {rolesForCurrentAdmin.map((r) => (
                    <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>Cancel</Button>
            <Button onClick={saveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Destructive Action */}
      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.type === "delete" ? "Remove Admin Access" : confirmAction?.type === "suspend" ? "Suspend Admin" : "Reactivate Admin"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to {confirmAction?.type} <strong>{confirmAction?.target?.email}</strong>? This action will be logged.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => {
              if (confirmAction?.type === "delete" && confirmAction.target) handleRemoveAdmin(confirmAction.target);
            }}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
