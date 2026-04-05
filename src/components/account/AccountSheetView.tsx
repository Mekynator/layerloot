import { lazy, Suspense } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import type { AccountModuleProps, Order, CustomOrder, CustomOrderMessage, Voucher, UserVoucher, SeenState } from "./types";

const OrdersModule = lazy(() => import("./OrdersModule"));
const CustomOrdersModule = lazy(() => import("./CustomOrdersModule"));
const InvoicesModule = lazy(() => import("./InvoicesModule"));
const RewardsModule = lazy(() => import("./RewardsModule"));
const VouchersModule = lazy(() => import("./VouchersModule"));
const ReferralModule = lazy(() => import("./ReferralModule"));
const SavedPreferencesModule = lazy(() => import("./SavedPreferencesModule"));
const SettingsModule = lazy(() => import("./SettingsModule"));

export type AccountSection =
  | "orders"
  | "custom-requests"
  | "invoices"
  | "rewards"
  | "vouchers"
  | "referrals"
  | "preferences"
  | "settings";

const SECTION_TITLES: Record<AccountSection, string> = {
  orders: "Orders",
  "custom-requests": "Custom Requests",
  invoices: "Invoices",
  rewards: "Rewards Store",
  vouchers: "My Vouchers",
  referrals: "Invite Friends",
  preferences: "Preferences",
  settings: "Settings",
};

interface Props {
  section: AccountSection | null;
  onClose: () => void;
  moduleProps: AccountModuleProps;
  orders: Order[];
  customOrders: CustomOrder[];
  customOrderMessages: Record<string, CustomOrderMessage[]>;
  vouchers: Voucher[];
  userVouchers: UserVoucher[];
  invoices: Array<{ id: string; invoice_number: string; invoice_date: string; pdf_path: string | null; order_id: string }>;
  seenState: SeenState;
  overviewLoading: boolean;
}

export default function AccountSheetView({
  section,
  onClose,
  moduleProps,
  orders,
  customOrders,
  customOrderMessages,
  vouchers,
  userVouchers,
  invoices,
  seenState,
  overviewLoading,
}: Props) {
  const renderContent = () => {
    if (!section) return null;

    const fallback = (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );

    return (
      <Suspense fallback={fallback}>
        {section === "orders" && <OrdersModule {...moduleProps} orders={orders} seenState={seenState} />}
        {section === "custom-requests" && <CustomOrdersModule {...moduleProps} customOrders={customOrders} customOrderMessages={customOrderMessages} seenState={seenState} />}
        {section === "invoices" && <InvoicesModule {...moduleProps} invoices={invoices} />}
        {section === "rewards" && <RewardsModule {...moduleProps} vouchers={vouchers} overviewLoading={overviewLoading} />}
        {section === "vouchers" && <VouchersModule {...moduleProps} userVouchers={userVouchers} overviewLoading={overviewLoading} />}
        {section === "referrals" && <ReferralModule {...moduleProps} />}
        {section === "preferences" && <SavedPreferencesModule tt={moduleProps.tt} />}
        {section === "settings" && <SettingsModule {...moduleProps} />}
      </Suspense>
    );
  };

  return (
    <Sheet open={!!section} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent side="right" className="w-full sm:max-w-xl md:max-w-2xl lg:max-w-3xl overflow-y-auto p-0">
        <div className="sticky top-0 z-10 border-b border-border/20 bg-card/95 backdrop-blur-xl px-6 py-4">
          <SheetHeader className="flex-row items-center gap-3 space-y-0">
            <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0 shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <SheetTitle className="font-display text-lg uppercase tracking-wider">
              {section ? SECTION_TITLES[section] : ""}
            </SheetTitle>
          </SheetHeader>
        </div>
        <div className="p-6">
          {renderContent()}
        </div>
      </SheetContent>
    </Sheet>
  );
}
