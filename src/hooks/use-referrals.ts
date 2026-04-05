import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ReferralInvite {
  id: string;
  inviter_user_id: string;
  invite_code: string;
  invited_email: string | null;
  invited_user_id: string | null;
  status: string;
  account_created_at: string | null;
  first_order_id: string | null;
  first_order_at: string | null;
  inviter_points_granted: boolean;
  invited_points_granted: boolean;
  created_at: string;
  updated_at: string;
}

export interface ReferralStats {
  totalInvited: number;
  accountsCreated: number;
  firstOrders: number;
  pointsEarned: number;
  invites: ReferralInvite[];
  inviteCode: string;
}

function generateInviteCode(): string {
  return `LL-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
}

async function fetchReferralData(userId: string): Promise<ReferralStats> {
  const { data: invites, error } = await supabase
    .from("referral_invites")
    .select("*")
    .eq("inviter_user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const allInvites = (invites ?? []) as ReferralInvite[];
  const accountsCreated = allInvites.filter((i) => i.status === "registered" || i.status === "ordered").length;
  const firstOrders = allInvites.filter((i) => i.status === "ordered").length;
  const pointsFromInviter = allInvites
    .filter((i) => i.inviter_points_granted)
    .reduce((sum, i) => sum + ((i as unknown as { inviter_points_amount?: number }).inviter_points_amount ?? 25), 0);

  // Find or generate a reusable invite code (the latest one without an invited user)
  let reusableInvite = allInvites.find((i) => !i.invited_email && !i.invited_user_id);
  let inviteCode = reusableInvite?.invite_code ?? "";

  if (!inviteCode) {
    // Create a new reusable invite code
    const code = generateInviteCode();
    const { data: newInvite, error: insertError } = await supabase
      .from("referral_invites")
      .insert({ inviter_user_id: userId, invite_code: code })
      .select()
      .single();

    if (!insertError && newInvite) {
      inviteCode = code;
    }
  }

  return {
    totalInvited: allInvites.filter((i) => i.invited_email || i.invited_user_id).length,
    accountsCreated,
    firstOrders,
    pointsEarned: pointsFromInviter,
    invites: allInvites,
    inviteCode,
  };
}

export function useReferrals(userId?: string) {
  return useQuery({
    queryKey: ["referrals", userId],
    queryFn: () => fetchReferralData(userId!),
    enabled: Boolean(userId),
    staleTime: 1000 * 30,
  });
}

export function useSendInvite(userId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (email: string) => {
      if (!userId) throw new Error("Not authenticated");
      const code = generateInviteCode();
      const { error } = await supabase.from("referral_invites").insert({
        inviter_user_id: userId,
        invite_code: code,
        invited_email: email.toLowerCase().trim(),
      });
      if (error) throw error;
      return code;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["referrals", userId] });
    },
  });
}

export function useInviteCode(userId?: string) {
  return useQuery({
    queryKey: ["invite-code", userId],
    queryFn: async () => {
      if (!userId) return null;
      // Check for existing reusable code
      const { data } = await supabase
        .from("referral_invites")
        .select("invite_code")
        .eq("inviter_user_id", userId)
        .is("invited_email", null)
        .is("invited_user_id", null)
        .limit(1)
        .maybeSingle();

      if (data?.invite_code) return data.invite_code as string;

      // Create one
      const code = generateInviteCode();
      await supabase.from("referral_invites").insert({
        inviter_user_id: userId,
        invite_code: code,
      });
      return code;
    },
    enabled: Boolean(userId),
    staleTime: Infinity,
  });
}
