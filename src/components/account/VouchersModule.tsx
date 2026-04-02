import { useMemo, useState } from "react";
import { Send, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { SectionCardSkeleton } from "@/components/shared/loading-states";
import type { AccountModuleProps, UserVoucher } from "./types";
import { isVoucherUsedOrArchived, groupVouchersByDefinition } from "./types";

interface Props extends AccountModuleProps {
  userVouchers: UserVoucher[];
  overviewLoading: boolean;
}

const VouchersModule = ({ user, tt, userVouchers, overviewLoading, overview, refetchOverview }: Props) => {
  const { toast } = useToast();
  const [voucherView, setVoucherView] = useState<"active" | "used">("active");
  const [giftEmail, setGiftEmail] = useState("");
  const [giftName, setGiftName] = useState("");
  const [giftingVoucherId, setGiftingVoucherId] = useState<string | null>(null);
  const [expandedVoucherGroupKey, setExpandedVoucherGroupKey] = useState<string | null>(null);

  const activeVouchers = useMemo(() => userVouchers.filter(v => !isVoucherUsedOrArchived(v)), [userVouchers]);
  const usedVouchers = useMemo(() => userVouchers.filter(v => isVoucherUsedOrArchived(v)), [userVouchers]);
  const activeVoucherGroups = useMemo(() => groupVouchersByDefinition(activeVouchers), [activeVouchers]);
  const usedVoucherGroups = useMemo(() => groupVouchersByDefinition(usedVouchers), [usedVouchers]);

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
    setGiftingVoucherId(null); setGiftEmail(""); setGiftName(""); setVoucherView("used");
    await refetchOverview();
  };

  const currentGroups = voucherView === "active" ? activeVoucherGroups : usedVoucherGroups;

  return (
    <div className="space-y-4">
      {overviewLoading && !overview ? <SectionCardSkeleton lines={4} /> : null}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant={voucherView === "active" ? "default" : "outline"} onClick={() => setVoucherView("active")} className="font-display uppercase tracking-wider">
          {tt("account.vouchers.active", "Active")} ({activeVouchers.length})
        </Button>
        <Button size="sm" variant={voucherView === "used" ? "default" : "outline"} onClick={() => setVoucherView("used")} className="font-display uppercase tracking-wider">
          {tt("account.vouchers.used", "Used")} ({usedVouchers.length})
        </Button>
      </div>

      {currentGroups.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">
          {voucherView === "active" ? tt("account.vouchers.noneActive", "No active vouchers available.") : tt("account.vouchers.noneUsed", "No used vouchers yet.")}
        </CardContent></Card>
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
                  {isGiftCard && <p className="mt-1 text-sm text-muted-foreground">{tt("account.vouchers.balance", "Balance")}: <span className="font-bold text-foreground">{giftCardBalance.toFixed(2)} kr</span></p>}
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={voucherView === "active" ? "default" : "secondary"}>{voucherView === "active" ? tt("account.vouchers.active", "Active") : tt("account.vouchers.used", "Used")}</Badge>
                  {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </div>
              </button>

              {isExpanded && (
                <CardContent className="space-y-3 border-t border-border bg-background/40 p-4">
                  {group.items.map(uv => {
                    const giftStatus = uv.gift_status || "";
                    const isPendingGift = giftStatus === "pending_claim";
                    const isReceived = !!uv.sender_user_id && uv.user_id === user?.id && (giftStatus === "claimed" || (uv.recipient_email || "").trim().toLowerCase() === (user?.email || "").trim().toLowerCase());
                    const isGifted = isPendingGift || (!!uv.recipient_email && !isReceived);
                    const isUsed = uv.is_used || !!uv.used_at || (uv.balance !== null && Number(uv.balance) <= 0);

                    return (
                      <div key={uv.id} className="rounded-2xl border border-border/70 bg-card/80 p-4">
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div className="space-y-1">
                            <p className="font-mono text-lg font-bold text-primary">{uv.code}</p>
                            {uv.balance !== null && <p className="text-sm text-muted-foreground">{tt("account.vouchers.balance", "Balance")}: <span className="font-bold text-foreground">{Number(uv.balance).toFixed(2)} kr</span></p>}
                            {isGifted && uv.recipient_email && <p className="text-xs text-muted-foreground">{isPendingGift ? `Pending claim for: ${uv.recipient_name ? `${uv.recipient_name} ` : ""}(${uv.recipient_email})` : `${tt("account.vouchers.sentTo", "Sent to")}: ${uv.recipient_name ? `${uv.recipient_name} ` : ""}(${uv.recipient_email})`}</p>}
                            {isReceived && uv.sender_name && <p className="text-xs text-muted-foreground">Received gift card from {uv.sender_name}</p>}
                            {isReceived && !uv.sender_name && <p className="text-xs text-muted-foreground">{tt("account.vouchers.receivedGiftCard", "Received gift card")}</p>}
                            {(isReceived || isGifted) && uv.gift_message && <p className="text-xs italic text-muted-foreground">"{uv.gift_message}"</p>}
                            <p className="text-xs text-muted-foreground">{tt("account.vouchers.redeemedAt", "Redeemed")}: {new Date(uv.redeemed_at).toLocaleString()}</p>
                            {uv.used_at && <p className="text-xs text-muted-foreground">{tt("account.vouchers.usedAt", "Used")}: {new Date(uv.used_at).toLocaleString()}</p>}
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            {voucherView === "active" && uv.vouchers?.discount_type === "gift_card" && !uv.recipient_email && uv.user_id === user?.id && !uv.is_used && (
                              <Button variant="outline" size="sm" onClick={() => setGiftingVoucherId(giftingVoucherId === uv.id ? null : uv.id)} className="font-display text-xs uppercase tracking-wider">
                                <Send className="mr-1 h-3 w-3" /> {tt("account.vouchers.gift", "Gift")}
                              </Button>
                            )}
                            {isUsed ? <Badge variant="secondary">{tt("account.vouchers.used", "Used")}</Badge>
                              : isPendingGift ? <Badge variant="secondary">Pending Claim</Badge>
                              : isReceived ? <Badge variant="secondary">{tt("account.vouchers.received", "Received")}</Badge>
                              : isGifted ? <Badge variant="secondary">{tt("account.vouchers.gifted", "Gifted")}</Badge>
                              : <Badge variant="default">{tt("account.vouchers.active", "Active")}</Badge>}
                          </div>
                        </div>
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
