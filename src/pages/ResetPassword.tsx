import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import logoImg from "@/assets/logo.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setIsRecovery(true);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovery(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: "Error", description: "Passwords do not match.", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "Error", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setSuccess(true);
      toast({ title: "Password updated", description: "Your password has been changed successfully." });
    }
    setSubmitting(false);
  };

  if (!isRecovery && !success) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center py-16">
        <div className="w-full max-w-md rounded-2xl bg-card/60 p-8 shadow-[0_8px_40px_-8px_hsl(225_44%_4%/0.5)] backdrop-blur-md text-center">
          <img src={logoImg} alt="LayerLoot" className="mx-auto mb-4 h-16 w-auto object-contain" />
          <h1 className="font-display text-xl font-bold uppercase text-card-foreground mb-2">Invalid Link</h1>
          <p className="text-sm text-muted-foreground mb-4">This password reset link is invalid or has expired.</p>
          <Button onClick={() => navigate("/auth")} className="font-display uppercase tracking-wider">Go to sign in</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center py-16">
      <div className="w-full max-w-md rounded-2xl bg-card/60 p-8 shadow-[0_8px_40px_-8px_hsl(225_44%_4%/0.5)] backdrop-blur-md">
        <div className="mb-6 flex flex-col items-center">
          <img src={logoImg} alt="LayerLoot" className="mb-2 h-16 w-auto object-contain" />
          <h1 className="font-display text-2xl font-bold uppercase text-card-foreground">
            {success ? "Password Updated" : "Set New Password"}
          </h1>
        </div>

        {success ? (
          <div className="space-y-4 text-center">
            <div className="rounded-xl bg-primary/10 p-4">
              <p className="text-sm text-primary">✓ Your password has been successfully updated.</p>
            </div>
            <Button onClick={() => navigate("/account")} className="w-full font-display uppercase tracking-wider">
              Go to my account
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="new-password">New password</Label>
              <Input id="new-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} />
            </div>
            <div>
              <Label htmlFor="confirm-password">Confirm password</Label>
              <Input id="confirm-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" required minLength={6} />
            </div>
            <Button type="submit" className="w-full font-display uppercase tracking-wider" disabled={submitting}>
              {submitting ? "Updating..." : "Update password"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
