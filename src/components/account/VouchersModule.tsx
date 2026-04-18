import { useMemo, useState } from "react";
import { Send, ChevronDown, ChevronUp, Wallet, CheckCircle2, Clock, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { SectionCardSkeleton } from "@/components/shared/loading-states";
import { formatPrice } from "@/lib/currency";
import type { AccountModuleProps, UserVoucher, VoucherCategory } from "./types";
import { classifyVoucher, groupVouchersByDefinition } from "./types";

interface Props extends AccountModuleProps {
  userVouchers: UserVoucher[];
  overviewLoading: boolean;
}

const TAB_CONFIG: { id: VoucherCategory; icon: typeof Wallet; emptyMsg: string; emptyFallback: string; subtitle: string; subtitleFallback: string }[] = [
  { id: "active", icon: Wallet, emptyMsg: "account.vouchers.noneActive", emptyFallback: "No active vouchers available.", subtitle: "account.vouchers.readyToUse", subtitleFallback: "Ready to use" },
  { id: "gifted", icon: Send, emptyMsg: "account.vouchers.noneGifted", emptyFallback: "No gifted vouchers yet.", subtitle: "account.vouchers.sentToOthers", subtitleFallback: "Sent to others" },
  { id: "used", icon: CheckCircle2, emptyMsg: "account.vouchers.noneUsed", emptyFallback: "No used vouchers yet.", subtitle: "account.vouchers.alreadyUsed", subtitleFallback: "Already used" },
  { id: "expired", icon: Clock, emptyMsg: "account.vouchers.noneExpired", emptyFallback: "No expired vouchers.", subtitle: "account.vouchers.noLongerValid", subtitleFallback: "No longer valid" },
];

const TAB_LABELS: Record<VoucherCategory, { key: string; fallback: string }> = {
  active: { key: "account.vouchers.active", fallback: "Active" },
  gifted: { key: "account.vouchers.gifted", fallback: "Gifted" },
  used: { key: "account.vouchers.used", fallback: "Used" },
  expired: { key: "account.vouchers.expired", fallback: "Expired" },
};

const VouchersModule = ({ user, tt, userVouchers, overviewLoading, overview, refetchOverview }: Props) => {
  const { toast } = useToast();
  const [voucherView, setVoucherView] = useState<VoucherCategory>("active");
  const [giftEmail, setGiftEmail] = useState("");
  const [giftName, setGiftName] = useState("");
  const [giftingVoucherId, setGiftingVoucherId] = useState<string | null>(null);
  const [expandedVoucherGroupKey, setExpandedVoucherGroupKey] = useState<string | null>(null);

  const classified = useMemo(() => {
    const buckets: Record<VoucherCategory, UserVoucher[]> = { active: [], gifted: [], used: [], expired: [] };
    userVouchers.forEach(v => buckets[classifyVoucher(v)].push(v));
    return buckets;
  }, [userVouchers]);

  const groupedByTab = useMemo(() => ({
    active: groupVouchersByDefinition(classified.active),
    gifted: groupVouchersByDefinition(classified.gifted),
    used: groupVouchersByDefinition(classified.used),
    expired: groupVouchersByDefinition(classified.expired),
  }), [classified]);

  const sendGiftCard = async (uvId: string) => {
    if (!giftEmail) {
      toast({ title: tt("account.vouchers.enterRecipientEmail", "Enter recipient email"), variant: "destructive" });
      return;
    }
    const { data: { session } } = await supabase.auth.getSession();
    const { data, error } = await supabase.functions.invoke("send-gift-card", {
      body: { userVoucherId: uvId, recipientEmail: giftEmail, recipientName: giftName || null, giftMessage: "" },
      headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
    });
    if (error) { toast({ title: tt("common.error", "Error"), description: error.message, variant: "destructive" }); return; }
    if (data?.error) { toast({ title: tt("common.error", "Error"), description: data.error, variant: "destructive" }); return; }
    toast({
      title: tt("account.vouchers.giftCardSent", "Gift card sent"),
      description: data?.matchedExistingUser
        ? `${tt("account.vouchers.giftCardSentTo", "Gift card sent to")} ${giftEmail}. ${tt("account.vouchers.recipientNotified", "The recipient also has an account notification.")}`
        : `${tt("account.vouchers.giftCardSentTo", "Gift card sent to")} ${giftEmail}.`,
    });
    setGiftingVoucherId(null); setGiftEmail(""); setGiftName(""); setVoucherView("gifted");
    await refetchOverview();
  };

  const currentGroups = groupedByTab[voucherView];
  const currentTabConfig = TAB_CONFIG.find(t => t.id === voucherView)!;

  const statusBadge = (uv: UserVoucher) => {
    const cat = classifyVoucher(uv);
    const gs = uv.gift_status || "";
    if (cat === "expired") return <Badge variant="secondary">{tt("account.vouchers.expired", "Expired")}</Badge>;
    if (cat === "used") return <Badge variant="secondary">{tt("account.vouchers.used", "Used")}</Badge>;
    if (cat === "gifted") {
      if (gs === "pending_claim") return <Badge variant="secondary">Pending Claim</Badge>;
      if (gs === "claimed") return <Badge variant="secondary">{tt("account.vouchers.claimed", "Claimed")}</Badge>;
      return <Badge variant="secondary">{tt("account.vouchers.gifted", "Gifted")}</Badge>;
    }
    return <Badge variant="default">{tt("account.vouchers.active", "Active")}</Badge>;
  };

  return (
    <div className="space-y-4">
      {overviewLoading && !overview ? <SectionCardSkeleton lines={4} /> : null}

      {/* Tab bar */}
      <div className="flex flex-wrap gap-2">
        {TAB_CONFIG.map(tab => {
          const Icon = tab.icon;
          const count = classified[tab.id].length;
          const isActive = voucherView === tab.id;
          return (
            <Button
              key={tab.id}
              size="sm"
              variant={isActive ? "default" : "outline"}
              onClick={() => { setVoucherView(tab.id); setExpandedVoucherGroupKey(null); }}
              className="font-display uppercase tracking-wider gap-1.5"
            >
              <Icon className="h-3.5 w-3.5" />
              {tt(TAB_LABELS[tab.id].key, TAB_LABELS[tab.id].fallback)} ({count})
            </Button>
          );
        })}
      </div>

      {/* Subtitle */}
      <p className="text-xs text-muted-foreground">{tt(currentTabConfig.subtitle, currentTabConfig.subtitleFallback)}</p>

      {/* Content */}
      {currentGroups.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 p-10 text-center text-muted-foreground">
            <currentTabConfig.icon className="h-8 w-8 opacity-40" />
            <p>{tt(currentTabConfig.emptyMsg, currentTabConfig.emptyFallback)}</p>
          </CardContent>
        </Card>
      ) : (
        currentGroups.map(group => {
          const isGiftCard = group.type === "gift_card";
          const giftCardBalance = group.items.reduce((sum, item) => sum + Number(item.balance ?? 0), 0);
          const isExpanded = expandedVoucherGroupKey === group.key;

          return (
            <Card key={group.key} className="overflow-hidden">
              <button type="button" onClick={() => setExpandedVoucherGroupKey(isExpanded ? null : group.key)}
                className="flex w-full items-center justify-between gap-4 p-4 text-left transition-colors hover:bg-muted/20">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-display text-sm font-semibold uppercase text-card-foreground">
                      {group.label}<span className="ml-2 text-xs text-muted-foreground">(x{group.items.length})</span>
                    </p>
                    {isGiftCard && <Badge variant="outline" className="text-xs">{tt("account.rewards.giftCard", "Gift Card")}</Badge>}
                  </div>
                  {isGiftCard && voucherView === "active" && (
                    <p className="mt-1 text-sm text-muted-foreground">{tt("account.vouchers.balance", "Balance")}: <span className="font-bold text-foreground">{formatPrice(giftCardBalance)}</span></p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={voucherView === "active" ? "default" : "secondary"}>
                    {tt(TAB_LABELS[voucherView].key, TAB_LABELS[voucherView].fallback)}
                  </Badge>
                  {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </div>
              </button>

              {isExpanded && (
                <CardContent className="space-y-3 border-t border-border bg-background/40 p-4">
                  {group.items.map(uv => {
                    const isReceived = !!uv.sender_user_id && uv.user_id === user?.id;

                    return (
                      <div key={uv.id} className="rounded-2xl border border-border/70 bg-card/80 p-4">
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div className="space-y-1">
                            {/* Code — show on active */}
                            {voucherView === "active" && <p className="font-mono text-lg font-bold text-primary">{uv.code}</p>}
                            {voucherView !== "active" && <p className="font-mono text-sm text-muted-foreground">{uv.code}</p>}

                            {/* Balance — active tab */}
                            {voucherView === "active" && uv.balance !== null && (
                              <p className="text-sm text-muted-foreground">{tt("account.vouchers.balance", "Balance")}: <span className="font-bold text-foreground">{formatPrice(Number(uv.balance))}</span></p>
                            )}

                            {/* Original value — used/expired/gifted */}
                            {voucherView !== "active" && uv.vouchers?.discount_value && (
                              <p className="text-sm text-muted-foreground">{tt("account.vouchers.originalValue", "Original value")}: <span className="font-semibold text-foreground">{formatPrice(Number(uv.vouchers.discount_value))}</span></p>
                            )}

                            {/* Gifted tab: recipient info */}
                            {voucherView === "gifted" && uv.recipient_email && (
                              <p className="text-xs text-muted-foreground">
                                {tt("account.vouchers.sentTo", "Sent to")}: {uv.recipient_name ? `${uv.recipient_name} ` : ""}({uv.recipient_email})
                              </p>
                            )}
                            {voucherView === "gifted" && uv.gifted_at && (
                              <p className="text-xs text-muted-foreground">{tt("account.vouchers.sentDate", "Sent")}: {new Date(uv.gifted_at).toLocaleDateString()}</p>
                            )}

                            {/* Received info */}
                            {isReceived && uv.sender_name && <p className="text-xs text-muted-foreground">Received from {uv.sender_name}</p>}
                            {(isReceived || voucherView === "gifted") && uv.gift_message && <p className="text-xs italic text-muted-foreground">"{uv.gift_message}"</p>}

                            {/* Dates */}
                            <p className="text-xs text-muted-foreground">{tt("account.vouchers.redeemedAt", "Redeemed")}: {new Date(uv.redeemed_at).toLocaleString()}</p>
                            {voucherView === "used" && uv.used_at && (
                              <p className="text-xs text-muted-foreground">{tt("account.vouchers.usedAt", "Used")}: {new Date(uv.used_at).toLocaleString()}</p>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            {/* Gift button — only on active tab for gift cards */}
                            {voucherView === "active" && uv.vouchers?.discount_type === "gift_card" && !uv.recipient_email && uv.user_id === user?.id && !uv.is_used && (
                              <Button variant="outline" size="sm" onClick={() => setGiftingVoucherId(giftingVoucherId === uv.id ? null : uv.id)} className="font-display text-xs uppercase tracking-wider">
                                <Send className="mr-1 h-3 w-3" /> {tt("account.vouchers.gift", "Gift")}
                              </Button>
                            )}
                            {statusBadge(uv)}
                          </div>
                        </div>

                        {/* Gift form — only on active tab */}
                        {voucherView === "active" && giftingVoucherId === uv.id && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-4 space-y-3 border-t border-border pt-4">
                            <input placeholder={tt("account.vouchers.recipientEmail", "Recipient email")} value={giftEmail} onChange={e => setGiftEmail(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background" />
                            <input placeholder={tt("account.vouchers.recipientNameOptional", "Recipient name (optional)")} value={giftName} onChange={e => setGiftName(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background" />
                            <Button size="sm" onClick={() => sendGiftCard(uv.id)} className="font-display uppercase tracking-wider">
                              <Send className="mr-1 h-3 w-3" /> {tt("account.vouchers.sendGiftCard", "Send Gift Card")}
                            </Button>
                          </motion.div>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              )}
            </Card>
          );
        })
      )}
    </div>
  );
};

export default VouchersModule;
