import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import logoImg from "@/assets/logo.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const { toast } = useToast();
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const refCode = searchParams.get("ref") || "";

  // Store ref code in sessionStorage for use after signup
  useEffect(() => {
    if (refCode) {
      sessionStorage.setItem("ll_ref_code", refCode);
      if (isLogin) setIsLogin(false); // Switch to signup if coming from invite
    }
  }, [refCode]);

  if (user) {
    navigate("/account");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    if (isLogin) {
      const { error } = await signIn(email, password);
      if (error) {
        toast({ title: t("common.error"), description: error.message, variant: "destructive" });
      } else {
        toast({ title: t("auth.welcomeBackToast") });
        navigate("/account");
      }
    } else {
      const { error } = await signUp(email, password, fullName);
      if (error) {
        toast({ title: t("common.error"), description: error.message, variant: "destructive" });
      } else {
        toast({ title: t("auth.accountCreated"), description: t("auth.checkEmail") });
      }
    }
    setSubmitting(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({ title: t("common.error"), description: "Please enter your email address.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    } else {
      setResetSent(true);
      toast({ title: "Check your email", description: "We've sent you a password reset link." });
    }
    setSubmitting(false);
  };

  if (showForgotPassword) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center py-16">
        <div className="w-full max-w-md rounded-2xl bg-card/60 p-8 shadow-[0_8px_40px_-8px_hsl(225_44%_4%/0.5)] backdrop-blur-md">
          <div className="mb-6 flex flex-col items-center">
            <img src={logoImg} alt="LayerLoot" className="mb-2 h-16 w-auto object-contain" />
            <h1 className="font-display text-2xl font-bold uppercase text-card-foreground">
              Reset Password
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Enter your email and we'll send you a reset link.
            </p>
          </div>

          {resetSent ? (
            <div className="space-y-4 text-center">
              <div className="rounded-xl bg-primary/10 p-4">
                <p className="text-sm text-primary">
                  ✓ A password reset link has been sent to <strong>{email}</strong>. Please check your inbox and spam folder.
                </p>
              </div>
              <Button variant="outline" className="w-full font-display uppercase tracking-wider" onClick={() => { setShowForgotPassword(false); setResetSent(false); }}>
                Back to sign in
              </Button>
            </div>
          ) : (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <Label htmlFor="reset-email">{t("auth.email")}</Label>
                <Input id="reset-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
              </div>
              <Button type="submit" className="w-full font-display uppercase tracking-wider" disabled={submitting}>
                {submitting ? t("auth.pleaseWait") : "Send reset link"}
              </Button>
              <button type="button" onClick={() => setShowForgotPassword(false)} className="block w-full text-center text-sm text-muted-foreground hover:text-primary">
                ← Back to sign in
              </button>
            </form>
          )}
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
            {isLogin ? t("auth.welcomeBack") : t("auth.createAccount")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isLogin ? t("auth.signInSubtitle") : t("auth.signUpSubtitle")}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <Label htmlFor="name">{t("auth.fullName")}</Label>
              <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="John Maker" required />
            </div>
          )}
          <div>
            <Label htmlFor="email">{t("auth.email")}</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
          </div>
          <div>
            <Label htmlFor="password">{t("auth.password")}</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
          </div>

          {isLogin && (
            <div className="text-right">
              <button type="button" onClick={() => setShowForgotPassword(true)} className="text-sm text-primary hover:underline">
                Forgot your password?
              </button>
            </div>
          )}

          <Button type="submit" className="w-full font-display uppercase tracking-wider" disabled={submitting}>
            {submitting ? t("auth.pleaseWait") : isLogin ? t("auth.signIn") : t("auth.createAccount")}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {isLogin ? t("auth.noAccount") : t("auth.haveAccount")}{" "}
          <button onClick={() => setIsLogin(!isLogin)} className="font-medium text-primary hover:underline">
            {isLogin ? t("auth.signUp") : t("auth.signIn")}
          </button>
        </p>
      </div>
    </div>
  );
};

export default Auth;
