import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { RecoveryData, getRealtimeRecoveryPercent, getRestMultiplier } from "@/lib/recovery";
import {
  EXERCISE_TO_PATTERN,
  SYNERGIST_MAP,
  OLD_GROUP_TO_SEGMENTS,
  CNS_EXERCISES,
  type MuscleSegment,
} from "@/lib/muscleScience";

const CACHE_KEY_PREFIX = "muscle-recovery-cache-v3";
const CACHE_DURATION = 6 * 60 * 60 * 1000;

type CachedRecovery = {
  data: RecoveryData[];
  timestamp: number;
  latestWorkoutFinishedAt: string | null;
  lastHeavyCompoundAt: string | null;
};

export function useRecovery() {
  const { user } = useAuth();
  const [recoveryData, setRecoveryData] = useState<RecoveryData[]>([]);
  const [lastHeavyCompoundAt, setLastHeavyCompoundAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRecovery = useCallback(async () => {
    if (!user) {
      setRecoveryData([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const cacheKey = `${CACHE_KEY_PREFIX}-${user.id}`;

      const { data: latestWorkoutRows } = await supabase
        .from("workouts")
        .select("finished_at")
        .eq("user_id", user.id)
        .not("finished_at", "is", null)
        .order("finished_at", { ascending: false })
        .limit(1);

      const latestWorkoutFinishedAt = latestWorkoutRows?.[0]?.finished_at ?? null;

      // Cache check
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached) as CachedRecovery;
          if (Date.now() - parsed.timestamp < CACHE_DURATION && parsed.latestWorkoutFinishedAt === latestWorkoutFinishedAt) {
            setRecoveryData(parsed.data);
            setLastHeavyCompoundAt(parsed.lastHeavyCompoundAt);
            setLoading(false);
            return;
          }
        }
      } catch { /* ignore */ }

      // 1) Get existing muscle_recovery rows
      const { data: recoveryRows } = await (supabase as any)
        .from("muscle_recovery")
        .select("muscle_group, fatigue_score, recovery_percent, last_trained_at")
        .eq("user_id", user.id);

      const mergedMap = new Map<string, RecoveryData>();

      // Expand old grouped muscle_recovery into 17 segments
      (recoveryRows as RecoveryData[] | null | undefined)?.forEach((row) => {
        const segments = OLD_GROUP_TO_SEGMENTS[row.muscle_group];
        if (segments) {
          // Distribute to each segment
          segments.forEach((seg) => {
            if (!mergedMap.has(seg)) {
              mergedMap.set(seg, {
                ...row,
                muscle_group: seg,
                recovery_percent: getRealtimeRecoveryPercent({ ...row, muscle_group: seg }),
              });
            }
          });
        } else {
          // Already a segment name
          mergedMap.set(row.muscle_group, {
            ...row,
            recovery_percent: getRealtimeRecoveryPercent(row),
          });
        }
      });

      // 2) Compute from recent workouts (72h) with synergist system
      const sinceIso = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();

      const { data: recentWorkouts } = await supabase
        .from("workouts")
        .select("id, finished_at")
        .eq("user_id", user.id)
        .not("finished_at", "is", null)
        .gte("finished_at", sinceIso);

      const workoutIds = (recentWorkouts ?? []).map((w) => w.id);
      const workoutFinishedAt = new Map((recentWorkouts ?? []).map((w) => [w.id, w.finished_at]));

      let heavyCompoundAt: string | null = null;

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
          workout_id: string; exercise_id: string; weight: number; reps: number;
          rest_time: number | null; created_at: string;
        }>;
        const perf = (perfRows ?? []) as Array<{ workout_id: string; exercise_id: string; estimated_1rm: number }>;

        const exerciseIds = [...new Set(sets.map((s) => s.exercise_id))];
        let exerciseInfo = new Map<string, { name: string; muscle_group: string }>();

        if (exerciseIds.length > 0) {
          const { data: exRows } = await (supabase as any)
            .from("exercises")
            .select("id, name, muscle_group")
            .in("id", exerciseIds);
          exerciseInfo = new Map((exRows ?? []).map((e: any) => [e.id, { name: e.name, muscle_group: e.muscle_group }]));
        }

        const perfMap = new Map<string, number>();
        perf.forEach((p) => perfMap.set(`${p.workout_id}:${p.exercise_id}`, Number(p.estimated_1rm) || 0));

        // Aggregate sets per exercise per workout
        const exerciseAgg: Record<string, { sets: number; intensitySum: number; lastMs: number; exerciseName: string }> = {};

        sets.forEach((s) => {
          const ex = exerciseInfo.get(s.exercise_id);
          if (!ex) return;

          const key = `${s.workout_id}:${s.exercise_id}`;
          const e1rm = perfMap.get(key) ?? 0;
          const baseIntensity = e1rm > 0 ? Math.min(1.2, Number(s.weight) / e1rm) : 0.7;
          const intensity = baseIntensity * getRestMultiplier(s.rest_time);

          const finishedAt = workoutFinishedAt.get(s.workout_id);
          const setMs = new Date(s.created_at).getTime();
          const wMs = finishedAt ? new Date(finishedAt).getTime() : 0;
          const lastMs = Math.max(Number.isNaN(setMs) ? 0 : setMs, Number.isNaN(wMs) ? 0 : wMs);

          if (!exerciseAgg[key]) {
            exerciseAgg[key] = { sets: 0, intensitySum: 0, lastMs: 0, exerciseName: ex.name };
          }
          exerciseAgg[key].sets += 1;
          exerciseAgg[key].intensitySum += intensity;
          exerciseAgg[key].lastMs = Math.max(exerciseAgg[key].lastMs, lastMs);

          // CNS tracking
          if (CNS_EXERCISES.has(ex.name) && baseIntensity > 0.85) {
            const timestamp = new Date(lastMs).toISOString();
            if (!heavyCompoundAt || timestamp > heavyCompoundAt) {
              heavyCompoundAt = timestamp;
            }
          }
        });

        // Now apply synergist map
        const muscleLoads: Record<string, {
          directSets: number; synergistSets: number; intensityMax: number; lastMs: number;
        }> = {};

        const ensureMuscle = (m: string) => {
          if (!muscleLoads[m]) muscleLoads[m] = { directSets: 0, synergistSets: 0, intensityMax: 0, lastMs: 0 };
        };

        Object.values(exerciseAgg).forEach((agg) => {
          const patternKey = EXERCISE_TO_PATTERN[agg.exerciseName];
          const pattern = patternKey ? SYNERGIST_MAP[patternKey] : null;
          const avgIntensity = agg.sets > 0 ? agg.intensitySum / agg.sets : 0.7;

          if (pattern) {
            for (const primary of pattern.primary) {
              ensureMuscle(primary);
              muscleLoads[primary].directSets += agg.sets;
              muscleLoads[primary].intensityMax = Math.max(muscleLoads[primary].intensityMax, avgIntensity);
              muscleLoads[primary].lastMs = Math.max(muscleLoads[primary].lastMs, agg.lastMs);
            }
            for (const [synMuscle, coeff] of Object.entries(pattern.synergists)) {
              ensureMuscle(synMuscle);
              muscleLoads[synMuscle].synergistSets += agg.sets * (coeff ?? 0);
              muscleLoads[synMuscle].lastMs = Math.max(muscleLoads[synMuscle].lastMs, agg.lastMs);
            }
          }
        });

        // Convert to RecoveryData
        Object.entries(muscleLoads).forEach(([muscle, load]) => {
          const totalSets = load.directSets + load.synergistSets;
          const fatigueScore = Math.min(100, Math.max(20, totalSets * load.intensityMax * 12));
          const lastTrainedAt = new Date(load.lastMs || Date.now()).toISOString();

          const row: RecoveryData = {
            muscle_group: muscle,
            fatigue_score: fatigueScore,
            recovery_percent: 0,
            last_trained_at: lastTrainedAt,
            direct_sets: load.directSets,
            synergist_sets: Math.round(load.synergistSets * 10) / 10,
            total_sets: Math.round(totalSets * 10) / 10,
            avg_intensity: Math.round(load.intensityMax * 100),
          };

          mergedMap.set(muscle, {
            ...row,
            recovery_percent: getRealtimeRecoveryPercent(row),
          });
        });
      }

      const merged = Array.from(mergedMap.values());
      setRecoveryData(merged);
      setLastHeavyCompoundAt(heavyCompoundAt);

      localStorage.setItem(cacheKey, JSON.stringify({
        data: merged,
        timestamp: Date.now(),
        latestWorkoutFinishedAt,
        lastHeavyCompoundAt: heavyCompoundAt,
      } satisfies CachedRecovery));
    } catch (error) {
      console.error("Recovery fetch error:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchRecovery(); }, [fetchRecovery]);

  return { recoveryData, lastHeavyCompoundAt, loading, refetch: fetchRecovery };
}
