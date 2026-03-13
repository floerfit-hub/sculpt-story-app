export interface RecoveryData {
  muscle_group: string;
  fatigue_score: number;
  recovery_percent: number;
  last_trained_at: string;
}

export type RecoveryCard = {
  id: string;
  i18nKey: string;
  sourceGroup: string;
  category: "upper" | "lower";
};

export const DETAILED_MUSCLE_LAYOUT: RecoveryCard[] = [
  { id: "chest", i18nKey: "chest", sourceGroup: "Chest", category: "upper" },
  { id: "frontDelts", i18nKey: "frontDelts", sourceGroup: "Shoulders", category: "upper" },
  { id: "rearDelts", i18nKey: "rearDelts", sourceGroup: "Shoulders", category: "upper" },
  { id: "biceps", i18nKey: "biceps", sourceGroup: "Arms", category: "upper" },
  { id: "forearms", i18nKey: "forearms", sourceGroup: "Arms", category: "upper" },
  { id: "traps", i18nKey: "traps", sourceGroup: "Back", category: "upper" },
  { id: "lats", i18nKey: "lats", sourceGroup: "Back", category: "upper" },
  { id: "lowerBack", i18nKey: "lowerBack", sourceGroup: "Back", category: "upper" },
  { id: "abs", i18nKey: "abs", sourceGroup: "Core", category: "upper" },

  { id: "quads", i18nKey: "quads", sourceGroup: "Legs & Glutes", category: "lower" },
  { id: "glutes", i18nKey: "glutes", sourceGroup: "Legs & Glutes", category: "lower" },
  { id: "hamstrings", i18nKey: "hamstrings", sourceGroup: "Legs & Glutes", category: "lower" },
  { id: "calves", i18nKey: "calves", sourceGroup: "Legs & Glutes", category: "lower" },
];

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const getRestMultiplier = (restSeconds: number | null | undefined): number => {
  if (restSeconds == null || restSeconds > 480) return 1.0;
  if (restSeconds < 90) return 1.2;
  if (restSeconds <= 150) return 1.0;
  if (restSeconds <= 240) return 0.9;
  return 0.8;
};

export const getTargetRecoveryHours = (fatigueScore: number): number => {
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

  // Less than 24h is always critical fatigue (0-20%)
  if (safeHours < 24) {
    return clamp((safeHours / 24) * 20, 0, 20);
  }

  // Full recovery window depends on workload/fatigue (48-72h)
  const targetHours = getTargetRecoveryHours(data.fatigue_score);
  if (safeHours >= targetHours) return 100;

  // Transition from 20% at hour 24 to 100% at target window
  const progress = (safeHours - 24) / (targetHours - 24);
  return clamp(20 + progress * 80, 20, 100);
};

export const getHoursUntilFullRecovery = (data: RecoveryData | undefined, nowMs = Date.now()): number => {
  if (!data) return 0;
  const trainedAtMs = new Date(data.last_trained_at).getTime();
  if (Number.isNaN(trainedAtMs)) return 0;

  const elapsedHours = Math.max(0, (nowMs - trainedAtMs) / (1000 * 60 * 60));
  const targetHours = getTargetRecoveryHours(data.fatigue_score);
  return Math.max(0, targetHours - elapsedHours);
};

export const getRecoveryColor = (recoveryPercent: number): string => {
  if (recoveryPercent >= 71) return "hsl(var(--success))";
  if (recoveryPercent >= 31) return "hsl(var(--warning))";
  return "hsl(var(--destructive))";
};

export const getRecoveryLabelKey = (recoveryPercent: number): "ready" | "recovering" | "fatigued" => {
  if (recoveryPercent >= 71) return "ready";
  if (recoveryPercent >= 31) return "recovering";
  return "fatigued";
};
