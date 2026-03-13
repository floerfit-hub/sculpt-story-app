import { MUSCLE_SIZE, BASE_RECOVERY_HOURS, type MuscleSegment } from "./muscleScience";

export interface RecoveryData {
  muscle_group: string;
  fatigue_score: number;
  recovery_percent: number;
  last_trained_at: string;
  direct_sets?: number;
  synergist_sets?: number;
  total_sets?: number;
  avg_intensity?: number;
}

export type RecoveryCard = {
  id: string;
  i18nKey: string;
  sourceGroup: string;
  category: "upper" | "lower";
};

// Keep for backward compat with existing components
export const DETAILED_MUSCLE_LAYOUT: RecoveryCard[] = [
  { id: "chest", i18nKey: "chest", sourceGroup: "Chest", category: "upper" },
  { id: "upperBack", i18nKey: "upperBack", sourceGroup: "Upper back", category: "upper" },
  { id: "lats", i18nKey: "lats", sourceGroup: "Lats", category: "upper" },
  { id: "lowerBack", i18nKey: "lowerBack", sourceGroup: "Lower back", category: "upper" },
  { id: "anteriorDelt", i18nKey: "anteriorDelt", sourceGroup: "Anterior delt", category: "upper" },
  { id: "lateralDelt", i18nKey: "lateralDelt", sourceGroup: "Lateral delt", category: "upper" },
  { id: "posteriorDelt", i18nKey: "posteriorDelt", sourceGroup: "Posterior delt", category: "upper" },
  { id: "biceps", i18nKey: "biceps", sourceGroup: "Biceps", category: "upper" },
  { id: "triceps", i18nKey: "triceps", sourceGroup: "Triceps", category: "upper" },
  { id: "core", i18nKey: "core", sourceGroup: "Core", category: "upper" },

  { id: "quads", i18nKey: "quads", sourceGroup: "Quadriceps", category: "lower" },
  { id: "glutes", i18nKey: "glutes", sourceGroup: "Glutes", category: "lower" },
  { id: "hamstrings", i18nKey: "hamstrings", sourceGroup: "Hamstrings", category: "lower" },
  { id: "calves", i18nKey: "calves", sourceGroup: "Calves", category: "lower" },
];

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const getRestMultiplier = (restSeconds: number | null | undefined): number => {
  if (restSeconds == null || restSeconds > 480) return 1.0;
  if (restSeconds < 90) return 1.2;
  if (restSeconds <= 150) return 1.0;
  if (restSeconds <= 240) return 0.9;
  return 0.8;
};

export const getTargetRecoveryHours = (fatigueScore: number, muscleGroup?: string): number => {
  // Use muscle-specific recovery if we can identify it
  const segment = muscleGroup as MuscleSegment | undefined;
  const size = segment ? MUSCLE_SIZE[segment] : undefined;

  if (size) {
    const base = BASE_RECOVERY_HOURS[size];
    // Interpolate based on fatigue
    const ratio = clamp(fatigueScore / 100, 0, 1);
    return base.min + (base.max - base.min) * ratio;
  }

  // Fallback
  if (fatigueScore >= 70) return 72;
  if (fatigueScore >= 45) return 60;
  return 48;
};

export const getRealtimeRecoveryPercent = (data: RecoveryData | undefined, nowMs = Date.now()): number => {
  if (!data) return 100;

  const trainedAtMs = new Date(data.last_trained_at).getTime();
  if (Number.isNaN(trainedAtMs)) return clamp(data.recovery_percent ?? 100, 0, 100);

  const hoursSinceTraining = (nowMs - trainedAtMs) / (1000 * 60 * 60);
  const safeHours = Math.max(0, hoursSinceTraining);

  const targetHours = getTargetRecoveryHours(data.fatigue_score, data.muscle_group);

  if (safeHours >= targetHours) return 100;

  // Exponential recovery curve: faster initial recovery, slows near 100%
  const ratio = safeHours / targetHours;
  const expRecovery = 1 - Math.exp(-3 * ratio); // ~95% at ratio=1
  return clamp(Math.round(expRecovery * 100), 0, 100);
};

export const getHoursUntilFullRecovery = (data: RecoveryData | undefined, nowMs = Date.now()): number => {
  if (!data) return 0;
  const trainedAtMs = new Date(data.last_trained_at).getTime();
  if (Number.isNaN(trainedAtMs)) return 0;

  const elapsedHours = Math.max(0, (nowMs - trainedAtMs) / (1000 * 60 * 60));
  const targetHours = getTargetRecoveryHours(data.fatigue_score, data.muscle_group);
  return Math.max(0, targetHours - elapsedHours);
};

// 4-tier color system
export const getRecoveryColor = (recoveryPercent: number): string => {
  if (recoveryPercent >= 100) return "hsl(82 85% 55%)"; // lime - peak
  if (recoveryPercent >= 76) return "hsl(var(--success))";
  if (recoveryPercent >= 41) return "hsl(var(--warning))";
  return "hsl(var(--destructive))";
};

export const getRecoveryLabelKey = (recoveryPercent: number): "peak" | "ready" | "almostReady" | "recovering" => {
  if (recoveryPercent >= 100) return "peak";
  if (recoveryPercent >= 76) return "ready";
  if (recoveryPercent >= 41) return "almostReady";
  return "recovering";
};
