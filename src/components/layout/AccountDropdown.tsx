import { useRef, useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { User, Package, Gift, Settings, LogOut, Star, Bell, ChevronDown } from "lucide-react";
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

/** Safely resolve a translation value – never return a raw object. */
function safeT(t: (key: string, fallback?: string) => unknown, key: string, fallback: string): string {
  const v = t(key, fallback);
  return typeof v === "string" ? v : fallback;
}

const AccountDropdown = ({ hasNotifications }: AccountDropdownProps) => {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [pointsBalance, setPointsBalance] = useState(0);
  const [activeVouchers, setActiveVouchers] = useState(0);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const clearClose = useCallback(() => {
    if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; }
  }, []);

  const handleEnter = useCallback(() => {
    if (isMobile) return;
    clearClose();
    setOpen(true);
  }, [isMobile, clearClose]);

  const handleLeave = useCallback(() => {
    if (isMobile) return;
    closeTimer.current = setTimeout(() => setOpen(false), 280);
  }, [isMobile]);

  /** Icon click: navigate to account on desktop, toggle dropdown on mobile */
  const handleIconClick = useCallback(() => {
    if (isMobile) {
      setOpen(prev => !prev);
    } else {
      navigate("/account");
    }
  }, [isMobile, navigate]);

  // Close on outside tap (mobile)
  useEffect(() => {
    if (!isMobile || !open) return;
    const handler = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [isMobile, open]);

  // Fetch points & vouchers when dropdown opens
  useEffect(() => {
    if (!user || !open) return;
    Promise.all([
      supabase.rpc("get_user_points_balance", { _user_id: user.id }),
      supabase.from("user_vouchers").select("id, is_used, balance, used_at, gift_status, recipient_email, gifted_at, claimed_at").eq("user_id", user.id),
    ]).then(([pointsRes, vouchersRes]) => {
      setPointsBalance(Number(pointsRes.data ?? 0));
      const vouchers = (vouchersRes.data ?? []) as Record<string, unknown>[];
      setActiveVouchers(vouchers.filter((v) => classifyVoucher(v as never) === "active").length);
    });
  }, [user, open]);

  if (!user) {
    return (
      <Link to="/auth">
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary" aria-label={safeT(t, "nav.login", "Login / Register")}>
          <User className="h-5 w-5" />
        </Button>
      </Link>
    );
  }

  const menuItems = [
    { to: "/account", icon: User, label: safeT(t, "nav.account", "My Account") },
    { to: "/account?tab=orders", icon: Package, label: safeT(t, "account.tabs.orders", "Orders") },
    { to: "/account?tab=rewards", icon: Gift, label: safeT(t, "account.tabs.rewards", "Rewards Store") },
    { to: "/account?tab=settings", icon: Settings, label: safeT(t, "account.tabs.settings", "Settings") },
  ];

  const pointsLabel = safeT(t, "footer.points", "points");
  const vouchersLabel = safeT(t, "account.tabs.vouchers", "vouchers");

  return (
    <div ref={containerRef} className="relative" onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
      {/* Main icon – click navigates (desktop) or toggles (mobile) */}
      <Button
        variant="ghost"
        size="icon"
        className="relative text-muted-foreground hover:text-primary"
        aria-label={safeT(t, "nav.account", "My Account")}
        onClick={handleIconClick}
      >
        <User className="h-5 w-5" />
        {hasNotifications && <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-primary animate-pulse" />}
      </Button>

      {/* Desktop-only chevron to open dropdown without navigating */}
      {!isMobile && (
        <button
          type="button"
          onClick={() => setOpen(prev => !prev)}
          className="absolute -right-2 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground/60 hover:text-primary transition-colors"
          aria-label="Open account menu"
        >
          <ChevronDown className="h-3 w-3" />
        </button>
      )}

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            className="absolute right-0 top-full z-50 mt-2 w-60 rounded-xl border border-border/20 bg-card/95 shadow-2xl backdrop-blur-2xl overflow-hidden"
          >
            {/* User info header */}
            <Link
              to="/account"
              onClick={() => setOpen(false)}
              className="block px-4 py-3 border-b border-border/10 hover:bg-muted/10 transition-colors"
            >
              <p className="text-sm font-medium text-foreground truncate">{user.email}</p>
              <div className="flex items-center gap-3 mt-1">
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Star className="h-3 w-3 text-primary" />
                  {pointsBalance} {pointsLabel}
                </span>
                {activeVouchers > 0 && (
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Gift className="h-3 w-3 text-primary" />
                    {activeVouchers} {vouchersLabel}
                  </span>
                )}
              </div>
            </Link>

            {/* Notification banner */}
            {hasNotifications && (
              <Link
                to="/account?tab=orders"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 px-4 py-2 bg-primary/5 border-b border-border/10 hover:bg-primary/10 transition-colors"
              >
                <Bell className="h-3.5 w-3.5 text-primary" />
                <span className="text-[11px] text-primary font-medium">{safeT(t, "account.newActivity", "You have new activity")}</span>
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
                {safeT(t, "nav.signOut", "Sign Out")}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AccountDropdown;
