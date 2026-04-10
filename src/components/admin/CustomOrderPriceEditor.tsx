import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

type Props = {
  orderId: string;
  initialPrice?: number | null;
};

export default function CustomOrderPriceEditor({ orderId, initialPrice }: Props) {
  const [price, setPrice] = useState(
    initialPrice !== null && initialPrice !== undefined ? String(initialPrice) : ""
  );
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    const parsed = Number(price);

    if (!parsed || parsed <= 0) {
      toast({
        title: "Invalid price",
        description: "Enter a valid amount above 0",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);

      const { error } = await supabase
        .from("custom_orders")
        .update({
          quoted_price: parsed,
          status: "quoted",
          payment_status: "unpaid",
        })
        .eq("id", orderId);

      if (error) throw error;

      toast({
        title: "Price saved",
        description: "Custom order is now ready for payment",
      });
    } catch (err) {
      toast({
        title: "Save failed",
        description: err instanceof Error ? err.message : "Could not save price",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <Input
        type="number"
        min="0"
        step="0.01"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        placeholder="Price in DKK"
      />
      <Button onClick={handleSave} disabled={saving}>
        {saving ? "Saving..." : "Save price"}
      </Button>
    </div>
  );
}
