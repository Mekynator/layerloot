

# Fix Gift Card Status Logic in Account Page

## Problem
The `isVoucherUsedOrArchived()` function in `src/components/account/types.ts` only treats vouchers as inactive when `gift_status` is `"pending_claim"` or `"cancelled"`. It does not account for gift cards that have been successfully gifted (`gift_status === "gifted"` or `"claimed"`), so they remain in the sender's Active section.

## Solution
Update `isVoucherUsedOrArchived()` to also return `true` when `gift_status` is `"gifted"` or `"claimed"` — these states mean the card has left the sender's possession.

### File: `src/components/account/types.ts`

Change the function from:
```ts
gs === "pending_claim" ||
gs === "cancelled" ||
```
To:
```ts
gs === "pending_claim" ||
gs === "gifted" ||
gs === "claimed" ||
gs === "cancelled" ||
```

Additionally, add a check for vouchers that have a `recipient_email` set (meaning they were sent away), as a safety net regardless of `gift_status` value:
```ts
!!voucher.recipient_email ||
```

This is a single-line addition in one file. The existing `VouchersModule.tsx` already uses this function for both the Active and Used filters, so the gifted cards will automatically move to the Used/History tab.

