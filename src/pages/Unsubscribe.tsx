import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import logoImg from "@/assets/logo.png";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

type Status = "loading" | "valid" | "already_unsubscribed" | "invalid" | "success" | "error";

const Unsubscribe = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<Status>("loading");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) { setStatus("invalid"); return; }
    const validate = async () => {
      try {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${token}`;
        const res = await fetch(url, { headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } });
        const data = await res.json();
        if (!res.ok) { setStatus("invalid"); return; }
        if (data.valid === false && data.reason === "already_unsubscribed") { setStatus("already_unsubscribed"); return; }
        setStatus("valid");
      } catch { setStatus("error"); }
    };
    validate();
  }, [token]);

  const handleUnsubscribe = async () => {
    if (!token) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke("handle-email-unsubscribe", { body: { token } });
      if (error) throw error;
      setStatus("success");
    } catch { setStatus("error"); }
    setSubmitting(false);
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center py-16">
      <div className="w-full max-w-md rounded-2xl bg-card/60 p-8 shadow-[0_8px_40px_-8px_hsl(225_44%_4%/0.5)] backdrop-blur-md text-center">
        <img src={logoImg} alt="LayerLoot" className="mx-auto mb-4 h-16 w-auto object-contain" />

        {status === "loading" && <p className="text-muted-foreground">Validating...</p>}

        {status === "valid" && (
          <div className="space-y-4">
            <h1 className="font-display text-xl font-bold uppercase text-card-foreground">Unsubscribe</h1>
            <p className="text-sm text-muted-foreground">Click below to unsubscribe from LayerLoot emails.</p>
            <Button onClick={handleUnsubscribe} disabled={submitting} variant="destructive" className="w-full font-display uppercase tracking-wider">
              {submitting ? "Processing..." : "Confirm Unsubscribe"}
            </Button>
          </div>
        )}

        {status === "success" && (
          <div className="space-y-4">
            <h1 className="font-display text-xl font-bold uppercase text-card-foreground">Unsubscribed</h1>
            <div className="rounded-xl bg-primary/10 p-4"><p className="text-sm text-primary">✓ You have been unsubscribed from LayerLoot emails.</p></div>
          </div>
        )}

        {status === "already_unsubscribed" && (
          <div className="space-y-4">
            <h1 className="font-display text-xl font-bold uppercase text-card-foreground">Already Unsubscribed</h1>
            <p className="text-sm text-muted-foreground">You have already unsubscribed from LayerLoot emails.</p>
          </div>
        )}

        {status === "invalid" && (
          <div className="space-y-4">
            <h1 className="font-display text-xl font-bold uppercase text-card-foreground">Invalid Link</h1>
            <p className="text-sm text-muted-foreground">This unsubscribe link is invalid or has expired.</p>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-4">
            <h1 className="font-display text-xl font-bold uppercase text-destructive">Error</h1>
            <p className="text-sm text-muted-foreground">Something went wrong. Please try again later.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Unsubscribe;
