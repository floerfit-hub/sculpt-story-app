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
  activateMockPremium: (plan: Plan) => Promise<void>;
  activateMockTrial: () => Promise<void>;
  cancelSubscription: () => Promise<void>;
  refresh: () => Promise<void>;
}

const PremiumContext = createContext<PremiumContextType>({
  isPremium: false,
  isTrialing: false,
  subscription: null,
  loading: true,
  trialDaysLeft: null,
  activateMockPremium: async () => {},
  activateMockTrial: async () => {},
  cancelSubscription: async () => {},
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
      // Create free sub if missing (existing users)
      await supabase.from("subscriptions").insert({ user_id: user.id, plan: "free", status: "active" });
      setSubscription({ plan: "free", status: "active", trial_start: null, trial_end: null, current_period_end: null });
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  // AUTO-GRANT PREMIUM FOR TESTING (remove when Paddle is live)
  const isPremium = true;
  const isTrialing = subscription?.status === "trialing";

  const trialDaysLeft = isTrialing && subscription?.trial_end
    ? Math.max(0, Math.ceil((new Date(subscription.trial_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  const activateMockPremium = useCallback(async (plan: Plan) => {
    if (!user) return;
    const now = new Date().toISOString();
    const periodEnd = plan === "yearly"
      ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    await supabase.from("subscriptions").update({
      plan,
      status: "active",
      current_period_start: now,
      current_period_end: periodEnd,
      trial_start: null,
      trial_end: null,
    }).eq("user_id", user.id);
    await fetchSubscription();
  }, [user, fetchSubscription]);

  const activateMockTrial = useCallback(async () => {
    if (!user) return;
    const now = new Date();
    const trialEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    await supabase.from("subscriptions").update({
      plan: "monthly",
      status: "trialing",
      trial_start: now.toISOString(),
      trial_end: trialEnd.toISOString(),
    }).eq("user_id", user.id);
    await fetchSubscription();
  }, [user, fetchSubscription]);

  const cancelSubscription = useCallback(async () => {
    if (!user) return;
    await supabase.from("subscriptions").update({
      plan: "free",
      status: "active",
      trial_start: null,
      trial_end: null,
      current_period_start: null,
      current_period_end: null,
      paddle_subscription_id: null,
    }).eq("user_id", user.id);
    await fetchSubscription();
  }, [user, fetchSubscription]);

  return (
    <PremiumContext.Provider value={{ isPremium, isTrialing, subscription, loading, trialDaysLeft, activateMockPremium, activateMockTrial, cancelSubscription, refresh: fetchSubscription }}>
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
