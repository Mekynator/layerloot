import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Loader2 } from "lucide-react";

export default function AdminLogin() {
  const { user, isAdmin, loading, signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // If already logged in as admin, redirect to dashboard
  useEffect(() => {
    if (!loading && user && isAdmin) {
      navigate("/admin", { replace: true });
    }
  }, [loading, user, isAdmin, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const { error: signInError } = await signIn(email, password);
    if (signInError) {
      setError(signInError.message);
      setSubmitting(false);
      return;
    }

    // Auth state change will trigger the useEffect above to redirect if admin
    // But we need a small delay for the role check to complete
    setTimeout(() => {
      setSubmitting(false);
    }, 2000);
  };

  // Show nothing while checking auth state
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  // User is logged in but not admin
  if (user && !isAdmin && !loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm space-y-6 text-center">
          <Shield className="mx-auto h-12 w-12 text-destructive/60" />
          <h1 className="font-display text-xl font-bold uppercase tracking-wider text-foreground">Access Denied</h1>
          <p className="text-sm text-muted-foreground">Your account does not have admin privileges.</p>
          <Button variant="outline" onClick={() => navigate("/")} className="w-full">
            Back to Website
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/5">
            <Shield className="h-7 w-7 text-primary" />
          </div>
          <h1 className="font-display text-xl font-bold uppercase tracking-wider text-foreground">Admin Login</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign in with your admin credentials</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="admin-email" className="text-xs">Email</Label>
            <Input
              id="admin-email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@example.com"
              required
              autoComplete="email"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-password" className="text-xs">Password</Label>
            <Input
              id="admin-password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
          )}

          <Button type="submit" disabled={submitting} className="w-full font-display uppercase tracking-wider">
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {submitting ? "Signing in..." : "Sign In"}
          </Button>
        </form>

        <div className="text-center">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back to website
          </button>
        </div>
      </div>
    </div>
  );
}
