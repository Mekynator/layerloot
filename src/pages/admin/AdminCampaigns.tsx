import { useState } from "react";
import {
  Megaphone, Plus, Calendar, Users, Tag, Zap, ToggleLeft, ToggleRight,
  Trash2, Edit, Gift, TicketPercent, Star, ShoppingCart, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import AdminLayout from "@/components/admin/AdminLayout";
import ChartCard from "@/components/admin/dashboard/ChartCard";

interface Campaign {
  id: string;
  name: string;
  description: string;
  type: "discount" | "featured" | "banner" | "loyalty_bonus" | "seasonal";
  status: "active" | "inactive" | "scheduled" | "ended";
  targetAudience: "all" | "new_users" | "returning" | "high_spenders" | "inactive" | "custom_order_users";
  startDate: string;
  endDate: string;
  message: string;
  discountValue?: number;
  discountType?: "percentage" | "fixed";
  createdAt: string;
}

const CAMPAIGN_TYPES = [
  { value: "discount", label: "Discount Campaign", icon: TicketPercent },
  { value: "featured", label: "Featured Product", icon: Star },
  { value: "banner", label: "Banner Promotion", icon: Megaphone },
  { value: "loyalty_bonus", label: "Loyalty Bonus", icon: Gift },
  { value: "seasonal", label: "Seasonal Offer", icon: Calendar },
] as const;

const AUDIENCES = [
  { value: "all", label: "All Users" },
  { value: "new_users", label: "New Users" },
  { value: "returning", label: "Returning Customers" },
  { value: "high_spenders", label: "High Spenders" },
  { value: "inactive", label: "Inactive Users" },
  { value: "custom_order_users", label: "Custom Order Users" },
] as const;

const TRIGGER_CONDITIONS = [
  { label: "User inactivity (30+ days)", icon: Clock },
  { label: "Abandoned cart", icon: ShoppingCart },
  { label: "New user signup", icon: Users },
  { label: "Custom order submitted", icon: Tag },
  { label: "Repeat purchase", icon: Zap },
];

const defaultForm: Omit<Campaign, "id" | "createdAt"> = {
  name: "",
  description: "",
  type: "discount",
  status: "inactive",
  targetAudience: "all",
  startDate: new Date().toISOString().split("T")[0],
  endDate: "",
  message: "",
  discountValue: 10,
  discountType: "percentage",
};

const AdminCampaigns = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("ll_campaigns") || "[]");
    } catch { return []; }
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);
  const { toast } = useToast();

  const persist = (updated: Campaign[]) => {
    setCampaigns(updated);
    localStorage.setItem("ll_campaigns", JSON.stringify(updated));
  };

  const openCreate = () => {
    setForm(defaultForm);
    setEditingId(null);
    setDialogOpen(true);
  };

  const openEdit = (c: Campaign) => {
    setForm(c);
    setEditingId(c.id);
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) {
      toast({ title: "Campaign name is required", variant: "destructive" });
      return;
    }
    if (editingId) {
      persist(campaigns.map((c) => c.id === editingId ? { ...c, ...form } : c));
      toast({ title: "Campaign updated" });
    } else {
      const newCampaign: Campaign = {
        ...form,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      };
      persist([newCampaign, ...campaigns]);
      toast({ title: "Campaign created" });
    }
    setDialogOpen(false);
  };

  const toggleStatus = (id: string) => {
    persist(campaigns.map((c) =>
      c.id === id ? { ...c, status: c.status === "active" ? "inactive" : "active" } : c
    ));
  };

  const deleteCampaign = (id: string) => {
    persist(campaigns.filter((c) => c.id !== id));
    toast({ title: "Campaign deleted" });
  };

  const getTypeIcon = (type: string) => {
    const found = CAMPAIGN_TYPES.find((t) => t.value === type);
    return found ? found.icon : Megaphone;
  };

  const activeCampaigns = campaigns.filter((c) => c.status === "active").length;

  return (
    <AdminLayout>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold uppercase tracking-tight text-foreground">
            Campaigns
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create and manage marketing campaigns · {activeCampaigns} active
          </p>
        </div>
        <Button onClick={openCreate} className="font-display uppercase tracking-wider">
          <Plus className="mr-2 h-4 w-4" /> New Campaign
        </Button>
      </div>

      {/* Trigger Conditions Info */}
      <div className="mb-6">
        <ChartCard title="Trigger Conditions (UI-Ready)" icon={Zap}>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {TRIGGER_CONDITIONS.map((t) => (
              <div key={t.label} className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
                <t.icon className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">{t.label}</span>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* Campaign Cards */}
      {campaigns.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Megaphone className="mb-3 h-12 w-12 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No campaigns yet. Create your first campaign to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((c) => {
            const TypeIcon = getTypeIcon(c.type);
            return (
              <Card key={c.id} className="group relative overflow-hidden transition-all hover:border-primary/20 hover:shadow-[0_0_20px_-5px_hsl(var(--primary)/0.1)]">
                <CardContent className="p-5">
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="rounded-lg bg-primary/10 p-2">
                        <TypeIcon className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-display text-sm font-semibold text-foreground">{c.name}</p>
                        <p className="text-[10px] uppercase text-muted-foreground">{c.type.replace(/_/g, " ")}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className={`text-[10px] ${
                      c.status === "active" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" :
                      c.status === "scheduled" ? "border-blue-500/30 bg-blue-500/10 text-blue-400" :
                      "border-white/10 bg-white/[0.02] text-muted-foreground"
                    }`}>
                      {c.status}
                    </Badge>
                  </div>

                  <p className="mb-3 text-xs text-muted-foreground line-clamp-2">{c.description || c.message || "No description"}</p>

                  <div className="mb-3 flex flex-wrap gap-1.5">
                    <Badge variant="outline" className="border-0 bg-primary/5 text-[10px] text-primary">
                      <Users className="mr-1 h-3 w-3" />
                      {AUDIENCES.find((a) => a.value === c.targetAudience)?.label}
                    </Badge>
                    {c.discountValue && c.type === "discount" && (
                      <Badge variant="outline" className="border-0 bg-amber-500/10 text-[10px] text-amber-400">
                        {c.discountType === "percentage" ? `${c.discountValue}% off` : `${c.discountValue} kr off`}
                      </Badge>
                    )}
                  </div>

                  {(c.startDate || c.endDate) && (
                    <p className="mb-3 text-[10px] text-muted-foreground">
                      <Calendar className="mr-1 inline h-3 w-3" />
                      {c.startDate || "—"} → {c.endDate || "Ongoing"}
                    </p>
                  )}

                  <div className="flex items-center justify-between border-t border-white/[0.06] pt-3">
                    <div className="flex items-center gap-2">
                      <Switch checked={c.status === "active"} onCheckedChange={() => toggleStatus(c.id)} />
                      <span className="text-[10px] text-muted-foreground">{c.status === "active" ? "Active" : "Inactive"}</span>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(c)}>
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-300" onClick={() => deleteCampaign(c.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display uppercase">
              {editingId ? "Edit Campaign" : "Create Campaign"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Campaign Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Summer Sale 2026" />
            </div>
            <div>
              <Label className="text-xs">Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Internal description of this campaign..." rows={2} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="text-xs">Campaign Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as Campaign["type"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CAMPAIGN_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Target Audience</Label>
                <Select value={form.targetAudience} onValueChange={(v) => setForm({ ...form, targetAudience: v as Campaign["targetAudience"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {AUDIENCES.map((a) => (
                      <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {form.type === "discount" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-xs">Discount Value</Label>
                  <Input type="number" value={form.discountValue} onChange={(e) => setForm({ ...form, discountValue: parseFloat(e.target.value) || 0 })} />
                </div>
                <div>
                  <Label className="text-xs">Discount Type</Label>
                  <Select value={form.discountType} onValueChange={(v) => setForm({ ...form, discountType: v as "percentage" | "fixed" })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage (%)</SelectItem>
                      <SelectItem value="fixed">Fixed Amount (DKK)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="text-xs">Start Date</Label>
                <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">End Date</Label>
                <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
              </div>
            </div>
            <div>
              <Label className="text-xs">Campaign Message</Label>
              <Textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })}
                placeholder="Message shown to users..." rows={2} />
            </div>
            <Button onClick={handleSave} className="w-full font-display uppercase tracking-wider">
              {editingId ? "Update Campaign" : "Create Campaign"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminCampaigns;
