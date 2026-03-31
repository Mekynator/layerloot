const { error: transferError } = await serviceSupabase
  .from("user_vouchers")
  .update({
    user_id: user.id,
    recipient_user_id: user.id,
    gift_status: "claimed",
    claimed_at: new Date().toISOString(),
  })
  .eq("id", voucher.id)
  .eq("gift_status", "pending_claim");
await serviceSupabase
  .from("user_gift_notifications")
  .update({
    is_read: true,
    gift_status: "claimed",
    claimed_at: new Date().toISOString(),
  })
  .eq("id", notification.id)
  .eq("user_id", user.id);
