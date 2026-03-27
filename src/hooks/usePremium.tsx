import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type Plan = "free" | "monthly" | "yearly";
type SubStatus = "active" | "trialing" | "canceled" | "expired";

interface Subscription {
  plan: Plan;
  status: SubStatus;
  trial_start: string | null;
  trial_end: string | null;
  current_period_end: string | null;
}

interface PremiumContextType {
  isPremium: boolean;
  isTrialing: boolean;
  subscription: Subscription | null;
  loading: boolean;
  trialDaysLeft: number | null;
  refresh: () => Promise<void>;
}

const PremiumContext = createContext<PremiumContextType>({
  isPremium: false,
  isTrialing: false,
  subscription: null,
  loading: true,
  trialDaysLeft: null,
  refresh: async () => {},
});

export const PremiumProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSubscription = useCallback(async () => {
    if (!user) {
      setSubscription(null);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("subscriptions")
      .select("plan, status, trial_start, trial_end, current_period_end")
      .eq("user_id", user.id)
      .single();

    if (data) {
      setSubscription(data as Subscription);
    } else {
      setSubscription({ plan: "free", status: "active", trial_start: null, trial_end: null, current_period_end: null });
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const isPremium = subscription != null && subscription.plan !== "free" && (subscription.status === "active" || subscription.status === "trialing");
  const isTrialing = subscription?.status === "trialing";

  const trialDaysLeft = isTrialing && subscription?.trial_end
    ? Math.max(0, Math.ceil((new Date(subscription.trial_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  return (
    <PremiumContext.Provider value={{ isPremium, isTrialing, subscription, loading, trialDaysLeft, refresh: fetchSubscription }}>
      {children}
    </PremiumContext.Provider>
  );
};

export const usePremium = () => useContext(PremiumContext);

// Premium feature list
export const PREMIUM_FEATURES = [
  "fitnessScore",
  "muscleHeatmap",
  "smartInsights",
  "bodyComposition",
  "advancedCharts",
  "aiInsights",
] as const;

export type PremiumFeature = typeof PREMIUM_FEATURES[number];
