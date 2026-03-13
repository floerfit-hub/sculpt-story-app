/**
 * Muscle Science Engine
 * 8 unified muscle groups with synergist system, recovery timing, and intensity calibration.
 */

// ─── 8 UNIFIED MUSCLE GROUPS ───
export const MUSCLE_GROUPS_8 = [
  "Chest",
  "Back",
  "Shoulders",
  "Arms",
  "Legs & Glutes",
  "Abs",
  "Lower Back",
  "Calves",
] as const;

export type MuscleGroup8 = (typeof MUSCLE_GROUPS_8)[number];

// ─── MUSCLE SIZE CATEGORIES ───
export type MuscleSize = "large" | "medium" | "small";

export const MUSCLE_SIZE: Record<MuscleGroup8, MuscleSize> = {
  Chest: "large",
  Back: "large",
  Shoulders: "medium",
  Arms: "small",
  "Legs & Glutes": "large",
  Abs: "medium",
  "Lower Back": "medium",
  Calves: "small",
};

// Base recovery hours by muscle size
export const BASE_RECOVERY_HOURS: Record<MuscleSize, { min: number; max: number }> = {
  large: { min: 48, max: 72 },
  medium: { min: 36, max: 56 },
  small: { min: 24, max: 48 },
};

// ─── SYNERGIST MAP ───
export interface SynergistPattern {
  primary: MuscleGroup8[];
  synergists: Partial<Record<MuscleGroup8, number>>;
}

export const SYNERGIST_MAP: Record<string, SynergistPattern> = {
  Chest: {
    primary: ["Chest"],
    synergists: { Arms: 0.4, Shoulders: 0.35 },
  },
  Back: {
    primary: ["Back"],
    synergists: { Arms: 0.45, Shoulders: 0.2, "Lower Back": 0.25 },
  },
  "Shoulders (Overhead press)": {
    primary: ["Shoulders"],
    synergists: { Arms: 0.35, Back: 0.15 },
  },
  "Lateral raises": {
    primary: ["Shoulders"],
    synergists: {},
  },
  "Rear delt / Face pulls": {
    primary: ["Shoulders"],
    synergists: { Back: 0.2, Arms: 0.15 },
  },
  "Biceps curl": {
    primary: ["Arms"],
    synergists: { Shoulders: 0.1 },
  },
  "Triceps isolation": {
    primary: ["Arms"],
    synergists: { Shoulders: 0.1 },
  },
  "Squats / Leg press": {
    primary: ["Legs & Glutes"],
    synergists: { Calves: 0.2, "Lower Back": 0.25, Abs: 0.2 },
  },
  "Romanian deadlift / Hip hinge": {
    primary: ["Legs & Glutes"],
    synergists: { "Lower Back": 0.4, Calves: 0.15 },
  },
  "Glute bridge / Hip thrust": {
    primary: ["Legs & Glutes"],
    synergists: { "Lower Back": 0.2, Abs: 0.15 },
  },
  Deadlift: {
    primary: ["Legs & Glutes", "Back", "Lower Back"],
    synergists: { Arms: 0.3, Shoulders: 0.2, Abs: 0.3, Calves: 0.1 },
  },
  "Calf raises": {
    primary: ["Calves"],
    synergists: {},
  },
  "Core / Abs": {
    primary: ["Abs"],
    synergists: { "Lower Back": 0.2 },
  },
};

// Map exercise names to synergist pattern keys
export const EXERCISE_TO_PATTERN: Record<string, string> = {
  // Chest
  "Barbell Bench Press": "Chest",
  "Incline Barbell Bench Press": "Chest",
  "Hammer Strength Chest Press": "Chest",
  "Cable Chest Fly": "Chest",
  "Incline Dumbbell Press": "Chest",
  "Machine Chest Fly": "Chest",
  "Push-ups": "Chest",
  "Dips": "Chest",
  // Back
  "Lat Pulldown": "Back",
  "Seated Cable Row": "Back",
  "Dumbbell Row": "Back",
  "Pull-ups": "Back",
  "Barbell Row": "Back",
  Hyperextensions: "Back",
  // Shoulders
  "Seated Dumbbell Press": "Shoulders (Overhead press)",
  "Standing Barbell Press": "Shoulders (Overhead press)",
  "Dumbbell Lateral Raise": "Lateral raises",
  "Dumbbell Front Raise": "Shoulders (Overhead press)",
  "Reverse Dumbbell Fly": "Rear delt / Face pulls",
  "Rear Delt Machine Fly": "Rear delt / Face pulls",
  "Face Pull": "Rear delt / Face pulls",
  // Arms
  "Barbell Biceps Curl": "Biceps curl",
  "Dumbbell Biceps Curl": "Biceps curl",
  "Incline Dumbbell Curl": "Biceps curl",
  "Cable Lying Curl": "Biceps curl",
  "Hammer Curl": "Biceps curl",
  "Triceps Pushdown": "Triceps isolation",
  "Single-arm Triceps Extension": "Triceps isolation",
  "Dumbbell French Press": "Triceps isolation",
  "Bench Dips": "Triceps isolation",
  // Legs & Glutes
  "Barbell Squat": "Squats / Leg press",
  "Goblet Squat": "Squats / Leg press",
  "Leg Press": "Squats / Leg press",
  "Forward Lunges": "Squats / Leg press",
  "Bulgarian Split Squat": "Squats / Leg press",
  "Leg Extension": "Squats / Leg press",
  "Romanian Deadlift": "Romanian deadlift / Hip hinge",
  "Lying Leg Curl": "Romanian deadlift / Hip hinge",
  "Glute Bridge": "Glute bridge / Hip thrust",
  "Hip Thrust": "Glute bridge / Hip thrust",
  "Cable Glute Kickback": "Glute bridge / Hip thrust",
  "Standing Calf Raises": "Calf raises",
  Deadlift: "Deadlift",
  // Core
  Plank: "Core / Abs",
  Crunches: "Core / Abs",
  "Leg Raises": "Core / Abs",
  "Dead Bug": "Core / Abs",
  "Bicycle Crunch": "Core / Abs",
};

// ─── SYNERGIST LOAD CALCULATION ───
export interface MuscleLoad {
  directSets: number;
  synergistSets: number;
  totalSets: number;
  avgIntensity: number;
}

export function calculateSynergistLoads(
  exerciseSets: Array<{ exerciseName: string; sets: number; avgIntensityRatio: number }>
): Record<string, MuscleLoad> {
  const loads: Record<string, MuscleLoad> = {};

  const ensure = (m: string) => {
    if (!loads[m]) loads[m] = { directSets: 0, synergistSets: 0, totalSets: 0, avgIntensity: 0 };
  };

  for (const ex of exerciseSets) {
    const patternKey = EXERCISE_TO_PATTERN[ex.exerciseName];
    const pattern = patternKey ? SYNERGIST_MAP[patternKey] : null;

    if (pattern) {
      for (const primary of pattern.primary) {
        ensure(primary);
        loads[primary].directSets += ex.sets;
        loads[primary].avgIntensity = Math.max(loads[primary].avgIntensity, ex.avgIntensityRatio);
      }
      for (const [synMuscle, coefficient] of Object.entries(pattern.synergists)) {
        ensure(synMuscle);
        loads[synMuscle].synergistSets += ex.sets * (coefficient ?? 0);
      }
    }
  }

  for (const m of Object.keys(loads)) {
    loads[m].totalSets = loads[m].directSets + loads[m].synergistSets;
  }

  return loads;
}

// ─── RECOVERY TIMING ───
export function getRecoveryHours(
  muscle: MuscleGroup8,
  totalSets: number,
  avgIntensity: number,
  synergistSets: number,
  directSets: number
): number {
  const size = MUSCLE_SIZE[muscle];
  const base = BASE_RECOVERY_HOURS[size];

  const volumeRatio = Math.min(1, totalSets / 20);
  let hours = base.min + (base.max - base.min) * volumeRatio;

  if (totalSets > 12) hours *= 1.15;
  if (avgIntensity > 0.8) hours *= 1.20;
  if (directSets > 0 && synergistSets >= directSets * 0.5) hours *= 1.30;

  return Math.round(hours * 10) / 10;
}

// ─── RECOVERY PERCENT ───
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export function getSegmentRecoveryPercent(
  hoursSinceTraining: number,
  recoveryHoursTarget: number
): number {
  if (hoursSinceTraining <= 0) return 0;
  if (hoursSinceTraining >= recoveryHoursTarget) return 100;
  return clamp((hoursSinceTraining / recoveryHoursTarget) * 100, 0, 100);
}

// ─── RECOVERY COLOR (4-tier) ───
export function getRecoveryColor4(percent: number): string {
  if (percent >= 100) return "hsl(82 85% 55%)";
  if (percent >= 76) return "hsl(var(--success))";
  if (percent >= 41) return "hsl(var(--warning))";
  return "hsl(var(--destructive))";
}

export function getRecoveryLabel4(percent: number): "peak" | "ready" | "almostReady" | "recovering" {
  if (percent >= 100) return "peak";
  if (percent >= 76) return "ready";
  if (percent >= 41) return "almostReady";
  return "recovering";
}

// ─── INTENSITY CALIBRATION ───
export interface MorningCheckin {
  sleepHours: number;
  sorenessScore: number;
  energyScore: number;
  nutritionScore: number;
}

export function getIntensityCap(
  muscleRecoveryPercent: number,
  checkin?: MorningCheckin | null,
  cnsFatigueHigh = false
): number {
  let cap: number;
  if (muscleRecoveryPercent <= 40) cap = 50;
  else if (muscleRecoveryPercent <= 65) cap = 70;
  else if (muscleRecoveryPercent <= 85) cap = 85;
  else cap = 100;

  if (checkin) {
    if (checkin.sleepHours < 6) cap -= 15;
    else if (checkin.sleepHours < 7) cap -= 8;
    else if (checkin.sleepHours > 9) cap += 5;

    if (checkin.nutritionScore < 7) {
      cap -= (7 - checkin.nutritionScore) * 3;
    }
  }

  if (cnsFatigueHigh) cap = Math.min(cap, 70);

  return clamp(Math.round(cap), 20, 100);
}

// ─── DAILY READINESS SCORE ───
export function calculateReadinessScore(
  avgRecoveryPercent: number,
  checkin?: MorningCheckin | null,
  cnsFatigueHigh = false
): number {
  let score = avgRecoveryPercent * 0.5;

  if (checkin) {
    const sleepScore = checkin.sleepHours >= 7 ? 100 : checkin.sleepHours >= 6 ? 70 : 40;
    score += sleepScore * 0.2;
    score += (checkin.energyScore / 5) * 100 * 0.15;
    score += (checkin.sorenessScore / 5) * 100 * 0.15;
  } else {
    score = avgRecoveryPercent;
  }

  if (cnsFatigueHigh) score *= 0.7;

  return clamp(Math.round(score), 0, 100);
}

// ─── CNS FATIGUE ───
export const CNS_EXERCISES = new Set([
  "Barbell Squat", "Romanian Deadlift", "Deadlift",
  "Barbell Bench Press", "Incline Barbell Bench Press",
  "Standing Barbell Press", "Barbell Row",
]);

export function isCNSFatiguing(exerciseName: string, intensityRatio: number): boolean {
  return CNS_EXERCISES.has(exerciseName) && intensityRatio > 0.85;
}

// ─── FATIGUE LAYERS ───
export type FatigueLevel = "LOW" | "MEDIUM" | "HIGH";

export function getAcuteFatigueLevel(todayTotalSets: number): FatigueLevel {
  if (todayTotalSets >= 25) return "HIGH";
  if (todayTotalSets >= 15) return "MEDIUM";
  return "LOW";
}

export function shouldTriggerDeload(consecutiveHardDays: number): boolean {
  return consecutiveHardDays >= 5;
}

// ─── DISPLAY LAYOUT (8 cards) ───
export interface MuscleCardConfig {
  id: MuscleGroup8;
  i18nKey: string;
  emoji: string;
}

export const MUSCLE_CARD_LAYOUT: MuscleCardConfig[] = [
  { id: "Chest", i18nKey: "chest", emoji: "💪" },
  { id: "Back", i18nKey: "back", emoji: "🔙" },
  { id: "Shoulders", i18nKey: "shoulders", emoji: "🏋️" },
  { id: "Arms", i18nKey: "arms", emoji: "💪" },
  { id: "Legs & Glutes", i18nKey: "legsGlutes", emoji: "🦵" },
  { id: "Abs", i18nKey: "abs", emoji: "🧱" },
  { id: "Lower Back", i18nKey: "lowerBack", emoji: "🔗" },
  { id: "Calves", i18nKey: "calves", emoji: "🦶" },
];

// Legacy compat — map old DB muscle_group names to unified groups
export const OLD_GROUP_TO_UNIFIED: Record<string, MuscleGroup8> = {
  // Old 17-segment names
  Chest: "Chest",
  "Upper back": "Back",
  Lats: "Back",
  "Lower back": "Lower Back",
  "Anterior delt": "Shoulders",
  "Lateral delt": "Shoulders",
  "Posterior delt": "Shoulders",
  Biceps: "Arms",
  Triceps: "Arms",
  Quadriceps: "Legs & Glutes",
  Glutes: "Legs & Glutes",
  Hamstrings: "Legs & Glutes",
  Calves: "Calves",
  Core: "Abs",
  // Old 6-group names
  Back: "Back",
  Shoulders: "Shoulders",
  Arms: "Arms",
  "Legs & Glutes": "Legs & Glutes",
};
