import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { payCustomOrder } from "@/lib/payCustomOrder";

type PayCustomOrderButtonProps = {
  customOrderId: string;
  disabled?: boolean;
};

export default function PayCustomOrderButton({
  customOrderId,
  disabled = false,
}: PayCustomOrderButtonProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handlePay = async () => {
    try {
      setLoading(true);
      await payCustomOrder(customOrderId);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to open payment page";

      toast({
        title: "Payment error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={handlePay} disabled={disabled || loading}>
      {loading ? "Redirecting..." : "Pay custom order"}
    </Button>
  );
}
