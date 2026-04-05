import { useState, useRef, useCallback, useEffect } from "react";
import { Link } from "react-router-dom";
import { User, Package, Gift, Settings, LogOut, Star, Bell } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { classifyVoucher } from "@/components/account/types";
import { useIsMobile } from "@/hooks/use-mobile";

interface AccountDropdownProps {
  hasNotifications: boolean;
}

const AccountDropdown = ({ hasNotifications }: AccountDropdownProps) => {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [pointsBalance, setPointsBalance] = useState(0);
  const [activeVouchers, setActiveVouchers] = useState(0);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleEnter = useCallback(() => {
    if (isMobile) return;
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  }, [isMobile]);

  const handleLeave = useCallback(() => {
    if (isMobile) return;
    closeTimer.current = setTimeout(() => setOpen(false), 250);
  }, [isMobile]);

  const handleToggle = useCallback(() => {
    if (isMobile) setOpen((v) => !v);
  }, [isMobile]);

  // Close on outside tap (mobile)
  useEffect(() => {
    if (!isMobile || !open) return;
    const handler = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [isMobile, open]);

  useEffect(() => {
    if (!user || !open) return;
    Promise.all([
      supabase.rpc("get_user_points_balance", { _user_id: user.id }),
      supabase.from("user_vouchers").select("id, is_used, balance, used_at, gift_status, recipient_email, gifted_at, claimed_at").eq("user_id", user.id),
    ]).then(([pointsRes, vouchersRes]) => {
      setPointsBalance(Number(pointsRes.data ?? 0));
      const vouchers = (vouchersRes.data ?? []) as any[];
      setActiveVouchers(vouchers.filter((v) => classifyVoucher(v) === "active").length);
    });
  }, [user, open]);

  if (!user) {
    return (
      <Link to="/auth">
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary" aria-label={t("nav.login", "Login / Register")}>
          <User className="h-5 w-5" />
        </Button>
      </Link>
    );
  }

  const menuItems = [
    { to: "/account", icon: User, label: t("nav.account", "My Account") },
    { to: "/account?tab=orders", icon: Package, label: t("account.tabs.orders", "Orders") },
    { to: "/account?tab=rewards", icon: Gift, label: t("account.tabs.rewards", "Rewards Store") },
    { to: "/account?tab=settings", icon: Settings, label: t("account.tabs.settings", "Settings") },
  ];

  return (
    <div ref={containerRef} className="relative" onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
      <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-primary" aria-label={t("nav.account", "My Account")} onClick={handleToggle}>
        <User className="h-5 w-5" />
        {hasNotifications && <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-primary animate-pulse" />}
      </Button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border border-border/20 bg-card/95 shadow-2xl backdrop-blur-2xl"
          >
            {/* User info */}
            <div className="px-4 py-3 border-b border-border/10">
              <p className="text-sm font-medium text-foreground truncate">{user.email}</p>
              <div className="flex items-center gap-3 mt-1.5">
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Star className="h-3 w-3 text-primary" /> {pointsBalance} {t("account.points", "points")}
                </span>
                {activeVouchers > 0 && (
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Gift className="h-3 w-3 text-primary" /> {activeVouchers} {t("account.activeVouchers", "vouchers")}
                  </span>
                )}
              </div>
            </div>

            {/* Notification banner */}
            {hasNotifications && (
              <Link to="/account?tab=orders" className="flex items-center gap-2 px-4 py-2 bg-primary/5 border-b border-border/10 hover:bg-primary/10 transition-colors">
                <Bell className="h-3.5 w-3.5 text-primary" />
                <span className="text-[11px] text-primary font-medium">{t("account.newActivity", "You have new activity")}</span>
              </Link>
            )}

            {/* Menu items */}
            <div className="py-1">
              {menuItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-colors"
                  onClick={() => setOpen(false)}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              ))}
            </div>

            {/* Sign out */}
            <div className="border-t border-border/10 py-1">
              <button
                onClick={() => { setOpen(false); signOut(); }}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-muted-foreground hover:text-destructive hover:bg-muted/20 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                {t("nav.signOut", "Sign Out")}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AccountDropdown;
