import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import i18n, { resolveLanguage, LANGUAGE_STORAGE_KEY } from "@/lib/i18n";
import { ADMIN_ROLE_SET } from "@/lib/admin-permissions-map";

type AdminRole = string | null;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  adminRole: AdminRole;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminRole, setAdminRole] = useState<AdminRole>(null);
  const [loading, setLoading] = useState(true);

  const syncLanguage = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("language")
      .eq("user_id", userId)
      .maybeSingle();

    const profileLang = (data as any)?.language ?? null;
    const localLang = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    const resolved = resolveLanguage(profileLang, localLang, navigator.language);
    if (i18n.language !== resolved) {
      await i18n.changeLanguage(resolved);
    }
    localStorage.setItem(LANGUAGE_STORAGE_KEY, resolved);
  };

  const checkAdminRole = async (authUser: User) => {
    const roleFromMetadata = authUser.app_metadata?.role;
    const rolesFromMetadata = authUser.app_metadata?.roles;
    const isMetadataAdmin =
      roleFromMetadata === "admin" ||
      (Array.isArray(rolesFromMetadata) && rolesFromMetadata.some((role) => role === "admin"));

    if (isMetadataAdmin) {
      setIsAdmin(true);
      setAdminRole("admin");
      return;
    }

    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", authUser.id);

    if (error || !data) {
      setIsAdmin(false);
      setAdminRole(null);
      return;
    }

    const adminRoleRow = data.find((r: any) => ADMIN_ROLE_SET.has(r.role));
    if (adminRoleRow) {
      setIsAdmin(true);
      setAdminRole(adminRoleRow.role as string);
    } else {
      setIsAdmin(false);
      setAdminRole(null);
    }
  };

  useEffect(() => {
    let initialised = false;

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        checkAdminRole(session.user);
        syncLanguage(session.user.id);
      }
      initialised = true;
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!initialised && _event === "INITIAL_SESSION") return;

      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setTimeout(() => checkAdminRole(session.user), 0);
        syncLanguage(session.user.id);

        if (_event === "SIGNED_IN") {
          const refCode = sessionStorage.getItem("ll_ref_code");
          if (refCode) {
            sessionStorage.removeItem("ll_ref_code");
            supabase.functions.invoke("process-referral-rewards", {
              body: { ref_code: refCode, user_id: session.user.id },
            }).catch(() => {});
          } else {
            supabase.functions.invoke("process-referral-rewards", {
              body: { ref_code: "__email_match__", user_id: session.user.id },
            }).catch(() => {});
          }
        }
      } else {
        setIsAdmin(false);
        setAdminRole(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: window.location.origin,
      },
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setIsAdmin(false);
    setAdminRole(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, isAdmin, adminRole, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
