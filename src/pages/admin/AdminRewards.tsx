import AdminPageShell from "@/components/admin/AdminPageShell";
import { Gift } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate, useSearchParams } from "react-router-dom";
import AdminDiscounts from "./AdminDiscounts";

/**
 * Rewards & Vouchers hub — combines discounts, rewards store, and voucher management.
 * Currently delegates to existing AdminDiscounts (which has Discounts + Rewards Store tabs).
 */
const AdminRewards = () => {
  return (
    <AdminPageShell title="Rewards & Vouchers" description="Manage discount codes, loyalty rewards, and voucher programs." icon={Gift}>
      <AdminDiscounts />
    </AdminPageShell>
  );
};

export default AdminRewards;
