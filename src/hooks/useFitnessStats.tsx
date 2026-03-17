import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { subDays, differenceInDays, format } from "date-fns";

interface FitnessStats {
  total_xp: number;
  level: number;
  fit_score: number;
  fit_score_previous: number;
  last_workout_at: string | null;
  streak_days: number;
}

interface ProfileGoals {
  primary_goal: string | null;
  training_frequency: number | null;
  experience_level: string | null;
}

// Level thresholds (cumulative XP)
const LEVEL_THRESHOLDS = [0, 100, 200, 500, 800, 1500, 2500, 3500, 5000, 7500];

export function getLevelFromXP(xp: number): number {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) return i + 1;
  }
  return 1;
}

export function getXPForNextLevel(level: number): number {
  if (level >= LEVEL_THRESHOLDS.length) return LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
  return LEVEL_THRESHOLDS[level]; // next level threshold
}

export function getXPForCurrentLevel(level: number): number {
  if (level <= 1) return 0;
  return LEVEL_THRESHOLDS[level - 1];
}

const LEVEL_TITLES: Record<number, { en: string; uk: string }> = {
  1: { en: "Newcomer", uk: "Новачок" },
  2: { en: "Starter", uk: "Початківець" },
  3: { en: "Regular", uk: "Постійний" },
  4: { en: "Dedicated", uk: "Відданий" },
  5: { en: "Athlete", uk: "Атлет" },
  6: { en: "Warrior", uk: "Воїн" },
  7: { en: "Champion", uk: "Чемпіон" },
  8: { en: "Elite", uk: "Еліта" },
  9: { en: "Legend", uk: "Легенда" },
  10: { en: "Master", uk: "Майстер" },
};

export function getLevelTitle(level: number, lang: string): string {
  const entry = LEVEL_TITLES[Math.min(level, 10)] || LEVEL_TITLES[1];
  return lang === "uk" ? entry.uk : entry.en;
}

// Goal-based weights
function getWeights(goal: string | null) {
  switch (goal) {
    case "muscle_gain": return { consistency: 0.35, strength: 0.40, balance: 0.15, measurements: 0.10 };
    case "fat_loss": return { consistency: 0.40, strength: 0.20, balance: 0.10, measurements: 0.30 };
    case "strength": return { consistency: 0.35, strength: 0.45, balance: 0.15, measurements: 0.05 };
    case "endurance":
    case "maintenance": return { consistency: 0.45, strength: 0.25, balance: 0.10, measurements: 0.20 };
    default: return { consistency: 0.35, strength: 0.30, balance: 0.15, measurements: 0.20 };
  }
}

// XP for PR based on experience level
export function getPRXP(level: string | null): number {
  switch (level) {
    case "advanced": return 40;
    case "intermediate": return 25;
    default: return 15;
  }
}

export function useFitnessStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState<FitnessStats | null>(null);
  const [profileGoals, setProfileGoals] = useState<ProfileGoals | null>(null);
  const [loading, setLoading] = useState(true);
  const [coldStart, setColdStart] = useState(false);

  const fetchStats = useCallback(async () => {
    if (!user) return;
    
    const [statsRes, profileRes] = await Promise.all([
      (supabase as any).from("fitness_stats").select("*").eq("user_id", user.id).single(),
      (supabase as any).from("profiles").select("primary_goal, training_frequency, experience_level").eq("user_id", user.id).single(),
    ]);

    if (statsRes.data) setStats(statsRes.data);
    if (profileRes.data) setProfileGoals(profileRes.data);

    // Check cold start: first workout < 7 days ago
    const { data: workouts } = await supabase
      .from("workouts")
      .select("started_at")
      .eq("user_id", user.id)
      .order("started_at", { ascending: true })
      .limit(1);
    
    if (!workouts || workouts.length === 0) {
      setColdStart(true);
    } else {
      const firstWorkout = new Date(workouts[0].started_at);
      setColdStart(differenceInDays(new Date(), firstWorkout) < 7);
    }
    
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const addXP = useCallback(async (amount: number) => {
    if (!user || !stats) return;
    const newXP = stats.total_xp + amount;
    const newLevel = getLevelFromXP(newXP);
    await (supabase as any).from("fitness_stats").update({
      total_xp: newXP,
      level: newLevel,
      updated_at: new Date().toISOString(),
    }).eq("user_id", user.id);
    setStats(prev => prev ? { ...prev, total_xp: newXP, level: newLevel } : prev);
    return { newXP, newLevel, xpGained: amount };
  }, [user, stats]);

  const updateFitScore = useCallback(async (score: number) => {
    if (!user || !stats) return;
    await (supabase as any).from("fitness_stats").update({
      fit_score: score,
      fit_score_previous: stats.fit_score,
      updated_at: new Date().toISOString(),
    }).eq("user_id", user.id);
    setStats(prev => prev ? { ...prev, fit_score: score, fit_score_previous: prev.fit_score } : prev);
  }, [user, stats]);

  const updateLastWorkout = useCallback(async () => {
    if (!user) return;
    const now = new Date();
    await (supabase as any).from("fitness_stats").update({
      last_workout_at: now.toISOString(),
      updated_at: now.toISOString(),
    }).eq("user_id", user.id);
    setStats(prev => prev ? { ...prev, last_workout_at: now.toISOString() } : prev);
  }, [user]);

  const isInactive = useMemo(() => {
    if (!stats?.last_workout_at) return false;
    return differenceInDays(new Date(), new Date(stats.last_workout_at)) >= 10;
  }, [stats]);

  const weeklyChange = useMemo(() => {
    if (!stats) return 0;
    return stats.fit_score - stats.fit_score_previous;
  }, [stats]);

  return {
    stats,
    profileGoals,
    loading,
    coldStart,
    isInactive,
    weeklyChange,
    addXP,
    updateFitScore,
    updateLastWorkout,
    fetchStats,
    getWeights,
  };
}
