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
  last_streak_check: string | null;
}

interface ProfileGoals {
  primary_goal: string | null;
  training_frequency: number | null;
  experience_level: string | null;
}

// Level thresholds (cumulative XP)
const LEVEL_THRESHOLDS = [0, 100, 300, 500, 800, 1500, 2500, 3500, 5000, 7500];

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
export function getWeights(goal: string | null) {
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

/**
 * Calculate the full Fit Score from raw data.
 * Returns sub-scores and final weighted score.
 */
export function calculateFitScore(params: {
  workoutsLast30Days: number;
  trainingFrequency: number | null;
  prCount: number;
  experienceLevel: string | null;
  uniqueMuscleGroups: number;
  daysSinceLastMeasurement: number | null;
  primaryGoal: string | null;
}): { consistency: number; strength: number; balance: number; measurements: number; overall: number } {
  const { workoutsLast30Days, trainingFrequency, prCount, experienceLevel, uniqueMuscleGroups, daysSinceLastMeasurement, primaryGoal } = params;

  // A. Consistency
  const planned = (trainingFrequency || 4) * 4;
  const consistency = planned > 0 ? Math.min(100, Math.round((workoutsLast30Days / planned) * 100)) : 0;

  // B. Strength Progress (PR-based)
  const prThreshold = experienceLevel === "advanced" ? 1 : experienceLevel === "intermediate" ? 3 : 5;
  const strength = prCount > 0 ? Math.min(100, Math.round((prCount / prThreshold) * 100)) : 0;

  // C. Muscle Balance
  const muscleBalance = Math.min(100, Math.round((uniqueMuscleGroups / 8) * 100));

  // D. Measurement recency
  let measurementScore = 0;
  if (daysSinceLastMeasurement !== null) {
    if (daysSinceLastMeasurement < 7) measurementScore = 100;
    else if (daysSinceLastMeasurement < 14) measurementScore = 70;
    else if (daysSinceLastMeasurement < 30) measurementScore = 40;
    else measurementScore = 0;
  }

  // Combined balance+measurements
  const balanceAndBody = Math.round((muscleBalance + measurementScore) / 2);

  // E. Goal-based weighting
  const w = getWeights(primaryGoal);
  const overall = Math.round(
    consistency * w.consistency +
    strength * w.strength +
    muscleBalance * w.balance +
    measurementScore * w.measurements
  );
  const clamped = Math.max(0, Math.min(100, overall));

  console.log("[FitScore] Sub-scores:", { consistency, strength, muscleBalance, measurementScore, weights: w, overall: clamped });

  return { consistency, strength, balance: muscleBalance, measurements: measurementScore, overall: clamped };
}

/**
 * Detect PR count from workout_sets in the last 30 days.
 * Only uses sets with 1-12 reps. Compares each exercise's best 1RM against historical best before 30-day window.
 */
export async function detectPRsLast30Days(userId: string): Promise<number> {
  const thirtyDaysAgo = subDays(new Date(), 30).toISOString();

  // Get all workout_sets with workout dates, exercise info
  const { data: allSets, error } = await supabase
    .from("workout_sets")
    .select("exercise_id, weight, reps, workout_id, workouts!inner(started_at, user_id)")
    .eq("workouts.user_id", userId) as any;

  if (error || !allSets) {
    console.error("[FitScore] Error fetching sets for PR detection:", error);
    return 0;
  }

  // Group by exercise_id, split into "before" and "recent" windows
  const exerciseData: Record<string, { before: number; recent: number }> = {};

  for (const s of allSets) {
    const reps = Number(s.reps);
    const weight = Number(s.weight);
    if (reps < 1 || reps > 12 || weight <= 0) continue;

    const e1rm = weight * (1 + reps / 30);
    const startedAt = s.workouts?.started_at;
    if (!startedAt) continue;

    const exId = s.exercise_id;
    if (!exerciseData[exId]) exerciseData[exId] = { before: 0, recent: 0 };

    if (startedAt < thirtyDaysAgo) {
      exerciseData[exId].before = Math.max(exerciseData[exId].before, e1rm);
    } else {
      exerciseData[exId].recent = Math.max(exerciseData[exId].recent, e1rm);
    }
  }

  let prCount = 0;
  for (const exId of Object.keys(exerciseData)) {
    const { before, recent } = exerciseData[exId];
    if (recent > before && recent > 0) prCount++;
  }

  console.log("[FitScore] PR count last 30 days:", prCount);
  return prCount;
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
      supabase.from("fitness_stats").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("profiles").select("primary_goal, training_frequency, experience_level").eq("user_id", user.id).maybeSingle(),
    ]);

    if (statsRes.error) console.error("[FitScore] Error fetching fitness_stats:", statsRes.error);
    if (profileRes.error) console.error("[FitScore] Error fetching profile goals:", profileRes.error);

    if (statsRes.data) setStats(statsRes.data as any);
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
      const isCold = differenceInDays(new Date(), firstWorkout) < 7;
      setColdStart(isCold);
      console.log("[FitScore] Cold start:", isCold, "First workout:", workouts[0].started_at);
    }
    
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const addXP = useCallback(async (amount: number, reason?: string) => {
    if (!user || !stats) return;
    const newXP = stats.total_xp + amount;
    const newLevel = getLevelFromXP(newXP);
    console.log(`[XP] +${amount} XP (${reason || 'unknown'}). Total: ${newXP}, Level: ${newLevel}`);
    
    const { error } = await supabase.from("fitness_stats").update({
      total_xp: newXP,
      level: newLevel,
      updated_at: new Date().toISOString(),
    } as any).eq("user_id", user.id);
    
    if (error) {
      console.error("[XP] Write error:", error);
      return;
    }
    setStats(prev => prev ? { ...prev, total_xp: newXP, level: newLevel } : prev);
    return { newXP, newLevel, xpGained: amount };
  }, [user, stats]);

  const updateFitScore = useCallback(async (score: number) => {
    if (!user || !stats) return;
    console.log("[FitScore] Saving score:", score, "Previous:", stats.fit_score);
    
    const { error } = await supabase.from("fitness_stats").update({
      fit_score: score,
      fit_score_previous: stats.fit_score,
      updated_at: new Date().toISOString(),
    } as any).eq("user_id", user.id);
    
    if (error) console.error("[FitScore] Write error:", error);
    setStats(prev => prev ? { ...prev, fit_score: score, fit_score_previous: prev.fit_score } : prev);
  }, [user, stats]);

  const updateLastWorkout = useCallback(async () => {
    if (!user) return;
    const now = new Date();
    const { error } = await supabase.from("fitness_stats").update({
      last_workout_at: now.toISOString(),
      updated_at: now.toISOString(),
    } as any).eq("user_id", user.id);
    
    if (error) console.error("[FitScore] updateLastWorkout error:", error);
    setStats(prev => prev ? { ...prev, last_workout_at: now.toISOString() } : prev);
  }, [user]);

  /**
   * Check and award streak XP (+30 for 7-day streak).
   * Call after saving a workout.
   */
  const checkAndAwardStreak = useCallback(async (): Promise<number> => {
    if (!user || !stats) return 0;

    const today = format(new Date(), "yyyy-MM-dd");
    // Don't check streak twice on same day
    if (stats.last_streak_check === today) return 0;

    // Count consecutive days with workouts ending today
    const { data: workouts } = await supabase
      .from("workouts")
      .select("started_at")
      .eq("user_id", user.id)
      .order("started_at", { ascending: false })
      .limit(30);

    if (!workouts || workouts.length === 0) return 0;

    const workoutDays = new Set(workouts.map(w => format(new Date(w.started_at), "yyyy-MM-dd")));
    let streak = 0;
    let day = new Date();
    for (let i = 0; i < 30; i++) {
      if (workoutDays.has(format(day, "yyyy-MM-dd"))) {
        streak++;
        day = subDays(day, 1);
      } else {
        break;
      }
    }

    console.log("[Streak] Current streak:", streak, "days");

    // Update streak in DB
    await supabase.from("fitness_stats").update({
      streak_days: streak,
      last_streak_check: today,
      updated_at: new Date().toISOString(),
    } as any).eq("user_id", user.id);

    setStats(prev => prev ? { ...prev, streak_days: streak, last_streak_check: today } : prev);

    // Award 30 XP on hitting exactly 7
    if (streak >= 7 && (stats.streak_days || 0) < 7) {
      console.log("[Streak] 🎉 7-day streak bonus! +30 XP");
      return 30;
    }

    return 0;
  }, [user, stats]);

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
    checkAndAwardStreak,
    fetchStats,
    getWeights: () => getWeights(profileGoals?.primary_goal || null),
  };
}
