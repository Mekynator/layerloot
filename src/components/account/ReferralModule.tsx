import { useState } from "react";
import { Copy, Mail, Users, ShoppingCart, Star, Trophy, UserPlus, Check, Link2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useReferrals, useSendInvite } from "@/hooks/use-referrals";
import { motion } from "framer-motion";
import type { AccountModuleProps } from "./types";

const ACHIEVEMENT_TARGET = 5;

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: "Invited", color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30" },
  registered: { label: "Account Created", color: "bg-blue-500/10 text-blue-600 border-blue-500/30" },
  ordered: { label: "First Order ✓", color: "bg-green-500/10 text-green-600 border-green-500/30" },
};

interface Props extends AccountModuleProps {}

const ReferralModule = ({ user, tt }: Props) => {
  const { data: referralData, isLoading } = useReferrals(user.id);
  const sendInvite = useSendInvite(user.id);
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [copied, setCopied] = useState(false);

  const stats = referralData ?? { totalInvited: 0, accountsCreated: 0, firstOrders: 0, pointsEarned: 0, invites: [], inviteCode: "" };

  const inviteUrl = stats.inviteCode
    ? `${window.location.origin}/auth?ref=${stats.inviteCode}`
    : "";

  const copyLink = () => {
    if (!inviteUrl) return;
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    toast({ title: tt("referral.copied", "Invite link copied!") });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendInvite = async () => {
    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes("@")) {
      toast({ title: tt("referral.invalidEmail", "Enter a valid email"), variant: "destructive" });
      return;
    }
    try {
      await sendInvite.mutateAsync(trimmed);
      toast({ title: tt("referral.sent", "Invite sent!") });
      setEmail("");
    } catch {
      toast({ title: tt("referral.error", "Failed to send invite"), variant: "destructive" });
    }
  };

  const achievementA = Math.min(stats.accountsCreated, ACHIEVEMENT_TARGET);
  const achievementB = Math.min(stats.firstOrders, ACHIEVEMENT_TARGET);

  const personalInvites = stats.invites.filter((i) => i.invited_email || i.invited_user_id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="font-display text-xl font-bold uppercase text-foreground">
          {tt("referral.title", "Invite Friends")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {tt("referral.subtitle", "Invite friends and earn rewards when they sign up and shop")}
        </p>
      </div>

      {/* Invite Link Card */}
      <Card className="border-primary/20 glow-border">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Link2 className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-display text-sm font-bold uppercase">{tt("referral.yourLink", "Your Invite Link")}</p>
              <p className="text-xs text-muted-foreground">{tt("referral.shareLinkDesc", "Share this link with friends to invite them")}</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Input readOnly value={inviteUrl} className="font-mono text-xs bg-background/50" />
            <Button variant="outline" size="sm" onClick={copyLink} className="shrink-0">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>

          <div className="flex gap-2">
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={tt("referral.emailPlaceholder", "Enter friend's email")}
              type="email"
              className="text-sm"
              onKeyDown={(e) => e.key === "Enter" && handleSendInvite()}
            />
            <Button size="sm" onClick={handleSendInvite} disabled={sendInvite.isPending} className="shrink-0 font-display uppercase tracking-wider">
              <Mail className="mr-1 h-4 w-4" />
              {tt("referral.send", "Send")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: UserPlus, label: tt("referral.friendsInvited", "Friends Invited"), value: stats.totalInvited },
          { icon: Users, label: tt("referral.accountsCreated", "Accounts Created"), value: stats.accountsCreated },
          { icon: ShoppingCart, label: tt("referral.firstOrders", "First Orders"), value: stats.firstOrders },
          { icon: Star, label: tt("referral.pointsEarned", "Referral Points"), value: stats.pointsEarned },
        ].map(({ icon: Icon, label, value }) => (
          <Card key={label} className="border-primary/10">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="font-display text-xl font-bold text-foreground">{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Achievement Cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className={`border-primary/20 ${achievementA >= ACHIEVEMENT_TARGET ? "glow-border" : ""}`}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-display uppercase">
                <Trophy className={`h-4 w-4 ${achievementA >= ACHIEVEMENT_TARGET ? "text-yellow-500" : "text-muted-foreground"}`} />
                {tt("referral.achievementA", "Invite & Sign Up")}
                {achievementA >= ACHIEVEMENT_TARGET && <Badge className="bg-yellow-500/20 text-yellow-600 text-[10px]">Complete!</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-xs text-muted-foreground">
                {tt("referral.achievementADesc", "Get 5 friends to create an account")}
              </p>
              <div className="flex items-center justify-between text-sm">
                <span className="font-display font-bold">{achievementA}/{ACHIEVEMENT_TARGET}</span>
                <span className="text-xs text-muted-foreground">{Math.round((achievementA / ACHIEVEMENT_TARGET) * 100)}%</span>
              </div>
              <Progress value={(achievementA / ACHIEVEMENT_TARGET) * 100} />
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className={`border-primary/20 ${achievementB >= ACHIEVEMENT_TARGET ? "glow-border" : ""}`}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-display uppercase">
                <Trophy className={`h-4 w-4 ${achievementB >= ACHIEVEMENT_TARGET ? "text-yellow-500" : "text-muted-foreground"}`} />
                {tt("referral.achievementB", "Invite & First Order")}
                {achievementB >= ACHIEVEMENT_TARGET && <Badge className="bg-yellow-500/20 text-yellow-600 text-[10px]">Complete!</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-xs text-muted-foreground">
                {tt("referral.achievementBDesc", "Get 5 friends to place their first order")}
              </p>
              <div className="flex items-center justify-between text-sm">
                <span className="font-display font-bold">{achievementB}/{ACHIEVEMENT_TARGET}</span>
                <span className="text-xs text-muted-foreground">{Math.round((achievementB / ACHIEVEMENT_TARGET) * 100)}%</span>
              </div>
              <Progress value={(achievementB / ACHIEVEMENT_TARGET) * 100} />
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Referral History */}
      {personalInvites.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-display uppercase">
              {tt("referral.history", "Referral History")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {personalInvites.map((invite) => {
              const sc = statusConfig[invite.status] ?? statusConfig.pending;
              return (
                <div key={invite.id} className="flex items-center justify-between rounded-lg border border-border/20 bg-background/50 px-3 py-2.5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted/40">
                      <UserPlus className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{invite.invited_email || "Via link"}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {new Date(invite.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className={sc.color}>{sc.label}</Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Points Info */}
      <Card className="border-border/20 bg-muted/20">
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground">
            <Star className="inline h-3 w-3 mr-1 text-primary" />
            {tt("referral.rewardInfo", "Earn 25 points for each friend who places their first order. Your friend earns 15 points too!")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReferralModule;
