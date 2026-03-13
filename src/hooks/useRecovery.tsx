import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { RecoveryData, getRealtimeRecoveryPercent, getRestMultiplier } from "@/lib/recovery";

const CACHE_KEY_PREFIX = "muscle-recovery-cache-v2";
const CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours

type CachedRecovery = {
  data: RecoveryData[];
  timestamp: number;
  latestWorkoutFinishedAt: string | null;
};

export function useRecovery() {
  const { user } = useAuth();
  const [recoveryData, setRecoveryData] = useState<RecoveryData[]>([]);
  const [debugLastChestTrainedAt, setDebugLastChestTrainedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRecovery = useCallback(async () => {
    if (!user) {
      setRecoveryData([]);
      setDebugLastChestTrainedAt(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const cacheKey = `${CACHE_KEY_PREFIX}-${user.id}`;

      // Pull latest completed workout timestamp first to avoid stale cache after new workout
      const { data: latestWorkoutRows } = await supabase
        .from("workouts")
        .select("finished_at")
        .eq("user_id", user.id)
        .not("finished_at", "is", null)
        .order("finished_at", { ascending: false })
        .limit(1);

      const latestWorkoutFinishedAt = latestWorkoutRows?.[0]?.finished_at ?? null;

      // Cache with invalidation by latest finished workout
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached) as CachedRecovery;
          const isFresh = Date.now() - parsed.timestamp < CACHE_DURATION;
          const sameWorkoutHead = parsed.latestWorkoutFinishedAt === latestWorkoutFinishedAt;
          if (isFresh && sameWorkoutHead) {
            setRecoveryData(parsed.data);
            const chestRow = parsed.data.find((r) => r.muscle_group === "Chest");
            setDebugLastChestTrainedAt(chestRow?.last_trained_at ?? null);
            console.debug("[Recovery Debug] Last chest workout (cache):", chestRow?.last_trained_at ?? "not found");
            setLoading(false);
            return;
          }
        }
      } catch {
        // ignore cache parse failures
      }

      // 1) Base muscle recovery rows
      const { data: recoveryRows } = await (supabase as any)
        .from("muscle_recovery")
        .select("muscle_group, fatigue_score, recovery_percent, last_trained_at")
        .eq("user_id", user.id);

      const mergedMap = new Map<string, RecoveryData>();

      (recoveryRows as RecoveryData[] | null | undefined)?.forEach((row) => {
        mergedMap.set(row.muscle_group, {
          ...row,
          recovery_percent: getRealtimeRecoveryPercent(row),
        });
      });

      // 2) Hard-check the last 72h training source data (workout_sets + performance)
      const sinceIso = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();

      const { data: recentWorkouts } = await supabase
        .from("workouts")
        .select("id, finished_at")
        .eq("user_id", user.id)
        .not("finished_at", "is", null)
        .gte("finished_at", sinceIso);

      const workoutIds = (recentWorkouts ?? []).map((w) => w.id);
      const workoutFinishedAt = new Map((recentWorkouts ?? []).map((w) => [w.id, w.finished_at]));

      if (workoutIds.length > 0) {
        const [{ data: setsRows }, { data: perfRows }] = await Promise.all([
          (supabase as any)
            .from("workout_sets")
            .select("workout_id, exercise_id, weight, reps, rest_time, created_at")
            .in("workout_id", workoutIds),
          (supabase as any)
            .from("exercise_performance")
            .select("workout_id, exercise_id, estimated_1rm")
            .eq("user_id", user.id)
            .in("workout_id", workoutIds),
        ]);

        const sets = (setsRows ?? []) as Array<{
          workout_id: string;
          exercise_id: string;
          weight: number;
          reps: number;
          rest_time: number | null;
          created_at: string;
        }>;

        const perf = (perfRows ?? []) as Array<{
          workout_id: string;
          exercise_id: string;
          estimated_1rm: number;
        }>;

        const exerciseIds = [...new Set(sets.map((s) => s.exercise_id))];
        let exerciseToGroup = new Map<string, string>();

        if (exerciseIds.length > 0) {
          const { data: exercisesRows } = await (supabase as any)
            .from("exercises")
            .select("id, muscle_group")
            .in("id", exerciseIds);
          exerciseToGroup = new Map((exercisesRows ?? []).map((e: any) => [e.id, e.muscle_group]));
        }

        const perfMap = new Map<string, number>();
        perf.forEach((p) => {
          perfMap.set(`${p.workout_id}:${p.exercise_id}`, Number(p.estimated_1rm) || 0);
        });

        const muscleAgg: Record<string, { sets: number; intensitySum: number; lastTrainedAtMs: number }> = {};

        sets.forEach((setRow) => {
          const muscleGroup = exerciseToGroup.get(setRow.exercise_id);
          if (!muscleGroup) return;

          const key = `${setRow.workout_id}:${setRow.exercise_id}`;
          const estimated1RM = perfMap.get(key) ?? 0;

          const baseIntensity = estimated1RM > 0
            ? Math.min(1.2, Number(setRow.weight) / estimated1RM)
            : 0.7;
          const intensity = baseIntensity * getRestMultiplier(setRow.rest_time);

          const setMs = new Date(setRow.created_at).getTime();
          const finishedAt = workoutFinishedAt.get(setRow.workout_id);
          const workoutMs = finishedAt ? new Date(finishedAt).getTime() : 0;
          const lastMs = Math.max(Number.isNaN(setMs) ? 0 : setMs, Number.isNaN(workoutMs) ? 0 : workoutMs);

          if (!muscleAgg[muscleGroup]) {
            muscleAgg[muscleGroup] = { sets: 0, intensitySum: 0, lastTrainedAtMs: 0 };
          }

          muscleAgg[muscleGroup].sets += 1;
          muscleAgg[muscleGroup].intensitySum += intensity;
          muscleAgg[muscleGroup].lastTrainedAtMs = Math.max(muscleAgg[muscleGroup].lastTrainedAtMs, lastMs);
        });

        Object.entries(muscleAgg).forEach(([muscleGroup, agg]) => {
          const avgIntensity = agg.sets > 0 ? agg.intensitySum / agg.sets : 0.7;
          const fatigueScore = Math.min(100, Math.max(20, agg.sets * avgIntensity * 12));
          const lastTrainedAt = new Date(agg.lastTrainedAtMs || Date.now()).toISOString();

          const row: RecoveryData = {
            muscle_group: muscleGroup,
            fatigue_score: fatigueScore,
            recovery_percent: 0,
            last_trained_at: lastTrainedAt,
          };

          mergedMap.set(muscleGroup, {
            ...row,
            recovery_percent: getRealtimeRecoveryPercent(row),
          });
        });
      }

      const merged = Array.from(mergedMap.values());
      setRecoveryData(merged);

      const chestRow = merged.find((r) => r.muscle_group === "Chest");
      setDebugLastChestTrainedAt(chestRow?.last_trained_at ?? null);
      console.debug("[Recovery Debug] Last chest workout:", chestRow?.last_trained_at ?? "not found");

      localStorage.setItem(
        cacheKey,
        JSON.stringify({
          data: merged,
          timestamp: Date.now(),
          latestWorkoutFinishedAt,
        } satisfies CachedRecovery)
      );
    } catch (error) {
      console.error("Recovery fetch error:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchRecovery();
  }, [fetchRecovery]);

  return {
    recoveryData,
    debugLastChestTrainedAt,
    loading,
    refetch: fetchRecovery,
  };
}
