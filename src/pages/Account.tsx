import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Star, Package, Gift, LogOut, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Order {
  id: string;
  status: string;
  total: number;
  created_at: string;
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
  redeemed_at: string;
  vouchers: { name: string; discount_value: number; discount_type: string } | null;
}

const Account = () => {
  const { user, isAdmin, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [pointsBalance, setPointsBalance] = useState(0);
  const [orders, setOrders] = useState<Order[]>([]);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [userVouchers, setUserVouchers] = useState<UserVoucher[]>([]);
  const [tab, setTab] = useState<"orders" | "rewards" | "vouchers">("orders");

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    // Fetch points
    supabase.rpc("get_user_points_balance", { _user_id: user.id }).then(({ data }) => {
      setPointsBalance(data ?? 0);
    });
    // Fetch orders
    supabase.from("orders").select("id, status, total, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).then(({ data }) => {
      setOrders((data as Order[]) ?? []);
    });
    // Fetch available vouchers
    supabase.from("vouchers").select("*").eq("is_active", true).then(({ data }) => {
      setVouchers((data as Voucher[]) ?? []);
    });
    // Fetch user's redeemed vouchers
    supabase.from("user_vouchers").select("id, code, is_used, redeemed_at, vouchers(name, discount_value, discount_type)").eq("user_id", user.id).order("redeemed_at", { ascending: false }).then(({ data }) => {
      setUserVouchers((data as any[]) ?? []);
    });
  }, [user]);

  const redeemVoucher = async (voucher: Voucher) => {
    if (pointsBalance < voucher.points_cost) {
      toast({ title: "Not enough points", variant: "destructive" });
      return;
    }
    // Deduct points
    const { error: pointsError } = await supabase.from("loyalty_points").insert({
      user_id: user!.id,
      points: -voucher.points_cost,
      reason: `Redeemed: ${voucher.name}`,
    });
    if (pointsError) {
      toast({ title: "Error redeeming", description: pointsError.message, variant: "destructive" });
      return;
    }
    // Create user voucher
    const code = `LL-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    await supabase.from("user_vouchers").insert({
      user_id: user!.id,
      voucher_id: voucher.id,
      code,
    });
    setPointsBalance((p) => p - voucher.points_cost);
    toast({ title: "Voucher redeemed!", description: `Your code: ${code}` });
    // Refresh
    const { data } = await supabase.from("user_vouchers").select("id, code, is_used, redeemed_at, vouchers(name, discount_value, discount_type)").eq("user_id", user!.id).order("redeemed_at", { ascending: false });
    setUserVouchers((data as any[]) ?? []);
  };

  if (loading || !user) return null;

  const statusColor = (s: string) => {
    if (s === "completed") return "text-green-500";
    if (s === "shipped") return "text-blue-500";
    if (s === "cancelled") return "text-destructive";
    return "text-muted-foreground";
  };

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
              <Link to="/admin">
                <Button variant="outline" size="sm" className="font-display uppercase tracking-wider">
                  <Shield className="mr-1 h-4 w-4" /> Admin
                </Button>
              </Link>
            )}
            <Button variant="outline" size="sm" onClick={signOut} className="font-display uppercase tracking-wider">
              <LogOut className="mr-1 h-4 w-4" /> Sign Out
            </Button>
          </div>
        </div>

        {/* Points Card */}
        <Card className="mb-8 border-primary/30 bg-primary/5">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Star className="h-7 w-7 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Loyalty Points Balance</p>
              <p className="font-display text-3xl font-bold text-primary">{pointsBalance}</p>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <div className="mb-6 flex gap-2">
          {[
            { key: "orders" as const, label: "Orders", icon: Package },
            { key: "rewards" as const, label: "Rewards Store", icon: Gift },
            { key: "vouchers" as const, label: "My Vouchers", icon: Star },
          ].map(({ key, label, icon: Icon }) => (
            <Button
              key={key}
              variant={tab === key ? "default" : "outline"}
              size="sm"
              onClick={() => setTab(key)}
              className="font-display uppercase tracking-wider"
            >
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
              <Card key={order.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-display text-sm font-semibold uppercase text-card-foreground">
                      Order #{order.id.slice(0, 8)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-lg font-bold text-primary">${Number(order.total).toFixed(2)}</p>
                    <p className={`font-display text-xs uppercase ${statusColor(order.status)}`}>{order.status}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Rewards Store Tab */}
        {tab === "rewards" && (
          <div className="grid gap-4 sm:grid-cols-2">
            {vouchers.length === 0 ? (
              <Card className="col-span-full"><CardContent className="p-8 text-center text-muted-foreground">No rewards available yet.</CardContent></Card>
            ) : vouchers.map((v) => (
              <Card key={v.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="font-display text-lg uppercase">{v.name}</CardTitle>
                  {v.description && <p className="text-sm text-muted-foreground">{v.description}</p>}
                </CardHeader>
                <CardContent className="flex items-center justify-between">
                  <div>
                    <span className="font-display text-2xl font-bold text-primary">
                      {v.discount_type === "percentage" ? `${v.discount_value}%` : `$${Number(v.discount_value).toFixed(2)}`}
                    </span>
                    <span className="ml-1 text-sm text-muted-foreground">off</span>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => redeemVoucher(v)}
                    disabled={pointsBalance < v.points_cost}
                    className="font-display uppercase tracking-wider"
                  >
                    <Star className="mr-1 h-3 w-3" /> {v.points_cost} pts
                  </Button>
                </CardContent>
              </Card>
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
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-display text-sm font-semibold uppercase text-card-foreground">
                      {uv.vouchers?.name ?? "Voucher"}
                    </p>
                    <p className="font-mono text-lg font-bold text-primary">{uv.code}</p>
                  </div>
                  <span className={`font-display text-xs uppercase ${uv.is_used ? "text-muted-foreground" : "text-green-500"}`}>
                    {uv.is_used ? "Used" : "Active"}
                  </span>
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
