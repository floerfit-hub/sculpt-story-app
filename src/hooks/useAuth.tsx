import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  isCoach: boolean;
  isAdmin: boolean;
  profile: { full_name: string | null } | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  isCoach: false,
  isAdmin: false,
  profile: null,
  loading: true,
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isCoach, setIsCoach] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [profile, setProfile] = useState<{ full_name: string | null } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          setTimeout(async () => {
            const { data: roles } = await supabase
              .from("user_roles")
              .select("role")
              .eq("user_id", session.user.id);
            setIsCoach(roles?.some((r) => r.role === "coach") ?? false);
            setIsAdmin(roles?.some((r) => r.role === "admin") ?? false);

            const { data: prof } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("user_id", session.user.id)
              .single();
            setProfile(prof);
            setLoading(false);
          }, 0);
        } else {
          setIsCoach(false);
          setIsAdmin(false);
          setProfile(null);
          setLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user, isCoach, isAdmin, profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
