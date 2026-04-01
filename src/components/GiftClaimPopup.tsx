import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Gift, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface GiftNotification {
  id: string;
  user_voucher_id: string;
  title: string;
  message: string | null;
  sender_name: string | null;
  gift_message: string | null;
}

const GiftClaimPopup = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<GiftNotification[]>([]);
  const [claiming, setClaiming] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!user?.id) {
      setNotifications([]);
      return;
    }

    const fetchNotifications = async () => {
      const { data, error } = await supabase
        .from("user_gift_notifications")
        .select("id, user_voucher_id, title, message, sender_name, gift_message")
        .eq("user_id", user.id)
        .eq("gift_status", "pending")
        .eq("is_read", false)
        .order("created_at", { ascending: false });

      if (!error && data && data.length > 0) {
        setNotifications(data);
        setDismissed(false);
      }
    };

    fetchNotifications();
  }, [user?.id]);

  const current = notifications[0];

  if (!current || dismissed) return null;

  const handleClaim = async () => {
    setClaiming(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      const { data, error } = await supabase.functions.invoke("claim-gift-card", {
        body: {
          notificationId: current.id,
          userVoucherId: current.user_voucher_id,
        },
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setNotifications((prev) => prev.filter((n) => n.id !== current.id));
      toast({ title: "Gift card claimed!", description: "Check your vouchers in your account." });
      window.dispatchEvent(new CustomEvent("layerloot-gift-claimed"));
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Could not claim gift card",
        variant: "destructive",
      });
    } finally {
      setClaiming(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
        >
          <Card className="relative w-full max-w-md border-primary/30 shadow-2xl">
            <button
              onClick={() => setDismissed(true)}
              className="absolute right-3 top-3 rounded-full p-1 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
            <CardContent className="space-y-4 p-6 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Gift className="h-8 w-8 text-primary" />
              </div>
              <h2 className="font-display text-xl font-bold uppercase text-foreground">
                {current.title}
              </h2>
              {current.sender_name && (
                <p className="text-sm text-muted-foreground">
                  From: <span className="font-semibold text-foreground">{current.sender_name}</span>
                </p>
              )}
              {current.message && (
                <p className="text-sm text-muted-foreground">{current.message}</p>
              )}
              {current.gift_message && (
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground italic">"{current.gift_message}"</p>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1 font-display uppercase tracking-wider"
                  onClick={() => setDismissed(true)}
                >
                  Later
                </Button>
                <Button
                  className="flex-1 font-display uppercase tracking-wider"
                  onClick={handleClaim}
                  disabled={claiming}
                >
                  <Gift className="mr-1 h-4 w-4" />
                  {claiming ? "Claiming..." : "Claim Gift"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default GiftClaimPopup;
