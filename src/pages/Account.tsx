import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Star, Package, Gift, LogOut, Shield, Eye, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import ToolReviewForm from "@/components/reviews/ToolReviewForm";

interface Order {
  id: string;
  status: string;
  total: number;
  created_at: string;
  tool_type?: "custom-print" | "lithophane" | null;
}

interface Voucher {
  id: string;
  name: string;
  description: string | null;
  points_cost: number;
  discount_type: string;
  discount_value: number;
}

interface UserVoucher {
  id: string;
  code: string;
  is_used: boolean;
  balance: number | null;
  redeemed_at: string;
  recipient_email: string | null;
  vouchers: { name: string; discount_value: number; discount_type: string } | null;
}

const statusColors: Record<string, string> = {
  completed: "text-green-500",
  shipped: "text-blue-500",
  processing: "text-purple-500",
  cancelled: "text-destructive",
  pending: "text-muted-foreground",
};

const Account = () => {
  const { user, isAdmin, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [pointsBalance, setPointsBalance] = useState(0);
  const [orders, setOrders] = useState<Order[]>([]);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [userVouchers, setUserVouchers] = useState<UserVoucher[]>([]);
  const [tab, setTab] = useState<"orders" | "rewards" | "vouchers">("orders");
  const [giftEmail, setGiftEmail] = useState("");
  const [giftName, setGiftName] = useState("");
  const [giftingVoucherId, setGiftingVoucherId] = useState<string | null>(null);
  const [reviewingOrderId, setReviewingOrderId] = useState<string | null>(null);
  
  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase.rpc("get_user_points_balance", { _user_id: user.id }).then(({ data }) => setPointsBalance(data ?? 0));
   supabase
  .from("orders")
  .select("id, status, total, created_at, tool_type")
  .eq("user_id", user.id)
  .order("created_at", { ascending: false })
  .then(({ data }) => setOrders((data as Order[]) ?? []));
    supabase.from("vouchers").select("*").eq("is_active", true).then(({ data }) => setVouchers((data as Voucher[]) ?? []));
    supabase.from("user_vouchers").select("id, code, is_used, balance, redeemed_at, recipient_email, vouchers(name, discount_value, discount_type)").eq("user_id", user.id).order("redeemed_at", { ascending: false }).then(({ data }) => setUserVouchers((data as any[]) ?? []));
  }, [user]);

  const redeemVoucher = async (voucher: Voucher) => {
    if (pointsBalance < voucher.points_cost) {
      toast({ title: "Not enough points", variant: "destructive" });
      return;
    }
    const { error: pointsError } = await supabase.from("loyalty_points").insert({
      user_id: user!.id, points: -voucher.points_cost, reason: `Redeemed: ${voucher.name}`,
    });
    if (pointsError) { toast({ title: "Error", description: pointsError.message, variant: "destructive" }); return; }
    const code = `LL-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const isGiftCard = voucher.discount_type === "gift_card";
    await supabase.from("user_vouchers").insert({
      user_id: user!.id, voucher_id: voucher.id, code,
      balance: isGiftCard ? voucher.discount_value : null,
    });
    setPointsBalance((p) => p - voucher.points_cost);
    toast({ title: "Voucher redeemed!", description: `Your code: ${code}` });
    const { data } = await supabase.from("user_vouchers").select("id, code, is_used, balance, redeemed_at, recipient_email, vouchers(name, discount_value, discount_type)").eq("user_id", user!.id).order("redeemed_at", { ascending: false });
    setUserVouchers((data as any[]) ?? []);
  };

  const sendGiftCard = async (uvId: string) => {
    if (!giftEmail) { toast({ title: "Enter recipient email", variant: "destructive" }); return; }
    await supabase.from("user_vouchers").update({ recipient_email: giftEmail, recipient_name: giftName || null }).eq("id", uvId);
    toast({ title: "Gift card details saved!", description: `Gift card will be sent to ${giftEmail}` });
    setGiftingVoucherId(null);
    setGiftEmail("");
    setGiftName("");
    const { data } = await supabase.from("user_vouchers").select("id, code, is_used, balance, redeemed_at, recipient_email, vouchers(name, discount_value, discount_type)").eq("user_id", user!.id).order("redeemed_at", { ascending: false });
    setUserVouchers((data as any[]) ?? []);
  };

  if (loading || !user) return null;

  return (
    <div className="py-8">
      <div className="container max-w-4xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold uppercase text-foreground">My Account</h1>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
          <div className="flex gap-2">
            {isAdmin && (
              <Link to="/admin"><Button variant="outline" size="sm" className="font-display uppercase tracking-wider"><Shield className="mr-1 h-4 w-4" /> Admin</Button></Link>
            )}
            <Button variant="outline" size="sm" onClick={signOut} className="font-display uppercase tracking-wider"><LogOut className="mr-1 h-4 w-4" /> Sign Out</Button>
          </div>
        </div>

        {/* Points Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="mb-8 border-primary/30 bg-primary/5">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <Star className="h-7 w-7 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Loyalty Points Balance</p>
                <p className="font-display text-3xl font-bold text-primary">{pointsBalance}</p>
                <p className="text-xs text-muted-foreground">Earn 1 point per 1 kr spent</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Tabs */}
        <div className="mb-6 flex gap-2">
          {[
            { key: "orders" as const, label: "Orders", icon: Package },
            { key: "rewards" as const, label: "Rewards Store", icon: Gift },
            { key: "vouchers" as const, label: "My Vouchers", icon: Star },
          ].map(({ key, label, icon: Icon }) => (
            <Button key={key} variant={tab === key ? "default" : "outline"} size="sm" onClick={() => setTab(key)} className="font-display uppercase tracking-wider">
              <Icon className="mr-1 h-4 w-4" /> {label}
            </Button>
          ))}
        </div>

        {/* Orders Tab */}
        {tab === "orders" && (
          <div className="space-y-3">
            {orders.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground">No orders yet. <Link to="/products" className="text-primary hover:underline">Start shopping!</Link></CardContent></Card>
            ) : orders.map((order) => (
              <Link key={order.id} to={`/orders/${order.id}`}>
                <Card className="transition-all hover:border-primary hover:shadow-sm cursor-pointer">
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="font-display text-sm font-semibold uppercase text-card-foreground">Order #{order.id.slice(0, 8)}</p>
                        <p className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-display text-lg font-bold text-primary">{Number(order.total).toFixed(2)} kr</p>
                        <p className={`font-display text-xs uppercase ${statusColors[order.status] || "text-muted-foreground"}`}>{order.status}</p>
                      </div>
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {/* Rewards Store Tab */}
        {tab === "rewards" && (
          <div className="grid gap-4 sm:grid-cols-2">
            {vouchers.length === 0 ? (
              <Card className="col-span-full"><CardContent className="p-8 text-center text-muted-foreground">No rewards available.</CardContent></Card>
            ) : vouchers.map((v) => (
              <motion.div key={v.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }}>
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <CardTitle className="font-display text-lg uppercase">{v.name}</CardTitle>
                      {v.discount_type === "gift_card" && <Badge variant="outline" className="font-display text-xs">Gift Card</Badge>}
                    </div>
                    {v.description && <p className="text-sm text-muted-foreground">{v.description}</p>}
                  </CardHeader>
                  <CardContent className="flex items-center justify-between">
                    <div>
                      <span className="font-display text-2xl font-bold text-primary">
                        {Number(v.discount_value).toFixed(0)} kr
                      </span>
                      <span className="ml-1 text-sm text-muted-foreground">{v.discount_type === "gift_card" ? "gift card" : "off"}</span>
                    </div>
                    <Button size="sm" onClick={() => redeemVoucher(v)} disabled={pointsBalance < v.points_cost} className="font-display uppercase tracking-wider">
                      <Star className="mr-1 h-3 w-3" /> {v.points_cost} pts
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {/* My Vouchers Tab */}
        {tab === "vouchers" && (
          <div className="space-y-3">
            {userVouchers.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground">No vouchers redeemed yet.</CardContent></Card>
            ) : userVouchers.map((uv) => (
              <Card key={uv.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-display text-sm font-semibold uppercase text-card-foreground">{uv.vouchers?.name ?? "Voucher"}</p>
                        {uv.vouchers?.discount_type === "gift_card" && <Badge variant="outline" className="text-xs">Gift Card</Badge>}
                      </div>
                      <p className="font-mono text-lg font-bold text-primary">{uv.code}</p>
                      {uv.balance !== null && (
                        <p className="text-sm text-muted-foreground">Balance: <span className="font-bold text-foreground">{Number(uv.balance).toFixed(2)} kr</span></p>
                      )}
                      {uv.recipient_email && (
                        <p className="text-xs text-muted-foreground">Sent to: {uv.recipient_email}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {uv.vouchers?.discount_type === "gift_card" && !uv.recipient_email && !uv.is_used && (
                        <Button variant="outline" size="sm" onClick={() => setGiftingVoucherId(giftingVoucherId === uv.id ? null : uv.id)}
                          className="font-display text-xs uppercase tracking-wider">
                          <Send className="mr-1 h-3 w-3" /> Gift
                        </Button>
                      )}
                      <Badge variant={uv.is_used && uv.balance === null ? "secondary" : uv.balance !== null && Number(uv.balance) > 0 ? "default" : uv.is_used ? "secondary" : "default"}>
                        {uv.balance !== null && Number(uv.balance) > 0 ? "Active" : uv.is_used ? "Used" : "Active"}
                      </Badge>
                    </div>
                  </div>

                  {/* Gift Card Send Form */}
                  {giftingVoucherId === uv.id && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-4 space-y-3 border-t border-border pt-4">
                      <p className="text-sm text-muted-foreground">Send this gift card to someone:</p>
                      <Input placeholder="Recipient email" value={giftEmail} onChange={(e) => setGiftEmail(e.target.value)} />
                      <Input placeholder="Recipient name (optional)" value={giftName} onChange={(e) => setGiftName(e.target.value)} />
                      <Button size="sm" onClick={() => sendGiftCard(uv.id)} className="font-display uppercase tracking-wider">
                        <Send className="mr-1 h-3 w-3" /> Send Gift Card
                      </Button>
                    </motion.div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Account;
