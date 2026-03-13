/**
 * Muscle Science Engine
 * 17-segment muscle tracking with synergist system, recovery timing, and intensity calibration.
 */

// ─── 17 MUSCLE SEGMENTS ───
export const MUSCLE_SEGMENTS = [
  "Chest",
  "Upper back",
  "Lats",
  "Lower back",
  "Anterior delt",
  "Lateral delt",
  "Posterior delt",
  "Biceps",
  "Triceps",
  "Quadriceps",
  "Glutes",
  "Hamstrings",
  "Calves",
  "Core",
] as const;

export type MuscleSegment = (typeof MUSCLE_SEGMENTS)[number];

// ─── MUSCLE SIZE CATEGORIES ───
export type MuscleSize = "large" | "medium" | "small";

export const MUSCLE_SIZE: Record<MuscleSegment, MuscleSize> = {
  Chest: "large",
  "Upper back": "large",
  Lats: "large",
  "Lower back": "medium",
  "Anterior delt": "medium",
  "Lateral delt": "medium",
  "Posterior delt": "medium",
  Biceps: "small",
  Triceps: "small",
  Quadriceps: "large",
  Glutes: "large",
  Hamstrings: "large",
  Calves: "small",
  Core: "medium",
};

// Base recovery hours by muscle size
export const BASE_RECOVERY_HOURS: Record<MuscleSize, { min: number; max: number }> = {
  large: { min: 48, max: 72 },
  medium: { min: 36, max: 56 },
  small: { min: 24, max: 48 },
};

// ─── SYNERGIST MAP ───
export interface SynergistPattern {
  primary: MuscleSegment[];
  synergists: Partial<Record<MuscleSegment, number>>;
}

export const SYNERGIST_MAP: Record<string, SynergistPattern> = {
  Chest: {
    primary: ["Chest"],
    synergists: { Triceps: 0.4, "Anterior delt": 0.35 },
  },
  "Back (Lats + Upper)": {
    primary: ["Lats", "Upper back"],
    synergists: { Biceps: 0.45, "Posterior delt": 0.4, "Lower back": 0.25 },
  },
  "Shoulders (Overhead press)": {
    primary: ["Lateral delt", "Anterior delt"],
    synergists: { Triceps: 0.35, "Upper back": 0.2 },
  },
  "Lateral raises": {
    primary: ["Lateral delt"],
    synergists: { "Anterior delt": 0.15, "Posterior delt": 0.15 },
  },
  "Rear delt / Face pulls": {
    primary: ["Posterior delt"],
    synergists: { "Upper back": 0.3, Biceps: 0.2 },
  },
  "Biceps curl": {
    primary: ["Biceps"],
    synergists: { "Anterior delt": 0.1, "Lower back": 0.05 },
  },
  "Triceps isolation": {
    primary: ["Triceps"],
    synergists: { "Lateral delt": 0.1 },
  },
  "Squats / Leg press": {
    primary: ["Quadriceps", "Glutes"],
    synergists: { Hamstrings: 0.3, Calves: 0.2, "Lower back": 0.25, Core: 0.2 },
  },
  "Romanian deadlift / Hip hinge": {
    primary: ["Hamstrings", "Glutes"],
    synergists: { "Lower back": 0.4, Calves: 0.15 },
  },
  "Glute bridge / Hip thrust": {
    primary: ["Glutes"],
    synergists: { Hamstrings: 0.5, "Lower back": 0.2, Core: 0.15 },
  },
  Deadlift: {
    primary: ["Lower back", "Lats", "Hamstrings", "Glutes"],
    synergists: {
      Biceps: 0.3, "Upper back": 0.3, Quadriceps: 0.2,
      "Posterior delt": 0.2, Core: 0.3, Calves: 0.1,
    },
  },
  "Calf raises": {
    primary: ["Calves"],
    synergists: {},
  },
  "Core / Abs": {
    primary: ["Core"],
    synergists: { "Lower back": 0.2 },
  },
};

// Map old DB muscle_group names to new segments
export const OLD_GROUP_TO_SEGMENTS: Record<string, MuscleSegment[]> = {
  Chest: ["Chest"],
  Back: ["Upper back", "Lats", "Lower back"],
  Shoulders: ["Anterior delt", "Lateral delt", "Posterior delt"],
  Arms: ["Biceps", "Triceps"],
  "Legs & Glutes": ["Quadriceps", "Glutes", "Hamstrings", "Calves"],
  Core: ["Core"],
};

// Map exercise names to synergist pattern keys for auto-detection
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
  "Lat Pulldown": "Back (Lats + Upper)",
  "Seated Cable Row": "Back (Lats + Upper)",
  "Dumbbell Row": "Back (Lats + Upper)",
  "Pull-ups": "Back (Lats + Upper)",
  "Barbell Row": "Back (Lats + Upper)",
  Hyperextensions: "Back (Lats + Upper)",
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
  // Legs
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
  avgIntensity: number; // 0-1 relative to 1RM
}

/**
 * Calculate synergist loads from a set of exercises with their set counts.
 */
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
      // Primary muscles get direct load
      for (const primary of pattern.primary) {
        ensure(primary);
        loads[primary].directSets += ex.sets;
        loads[primary].avgIntensity = Math.max(loads[primary].avgIntensity, ex.avgIntensityRatio);
      }
      // Synergist muscles get partial load
      for (const [synMuscle, coefficient] of Object.entries(pattern.synergists)) {
        ensure(synMuscle);
        loads[synMuscle].synergistSets += ex.sets * (coefficient ?? 0);
      }
    } else {
      // Fallback: use old group mapping
      ensure(ex.exerciseName);
    }
  }

  // Compute totals
  for (const m of Object.keys(loads)) {
    loads[m].totalSets = loads[m].directSets + loads[m].synergistSets;
  }

  return loads;
}

// ─── RECOVERY TIMING ───
export function getRecoveryHours(
  muscle: MuscleSegment,
  totalSets: number,
  avgIntensity: number, // 0-1
  synergistSets: number,
  directSets: number
): number {
  const size = MUSCLE_SIZE[muscle];
  const base = BASE_RECOVERY_HOURS[size];

  // Interpolate between min and max based on volume
  const volumeRatio = Math.min(1, totalSets / 20); // 20 sets = max
  let hours = base.min + (base.max - base.min) * volumeRatio;

  // High volume modifier (>12 sets): +15%
  if (totalSets > 12) hours *= 1.15;

  // Strength training modifier (>80% 1RM): +20%
  if (avgIntensity > 0.8) hours *= 1.20;

  // Synergist load ≥ 50% of direct → +30% recovery for that synergist
  if (directSets > 0 && synergistSets >= directSets * 0.5) {
    hours *= 1.30;
  }

  return Math.round(hours * 10) / 10;
}

// ─── RECOVERY PERCENT (4-tier) ───
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
  if (percent >= 100) return "hsl(82 85% 55%)"; // lime green - peak
  if (percent >= 76) return "hsl(var(--success))"; // green
  if (percent >= 41) return "hsl(var(--warning))"; // yellow
  return "hsl(var(--destructive))"; // red
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
  sorenessScore: number; // 1-5
  energyScore: number; // 1-5
  nutritionScore: number; // 1-10
}

export function getIntensityCap(
  muscleRecoveryPercent: number,
  checkin?: MorningCheckin | null,
  cnsFatigueHigh = false
): number {
  // Base intensity from recovery
  let cap: number;
  if (muscleRecoveryPercent <= 40) cap = 50;
  else if (muscleRecoveryPercent <= 65) cap = 70;
  else if (muscleRecoveryPercent <= 85) cap = 85;
  else cap = 100;

  // Morning check-in modifiers
  if (checkin) {
    // Sleep modifier
    if (checkin.sleepHours < 6) cap -= 15;
    else if (checkin.sleepHours < 7) cap -= 8;
    else if (checkin.sleepHours > 9) cap += 5;

    // Nutrition modifier
    if (checkin.nutritionScore < 7) {
      cap -= (7 - checkin.nutritionScore) * 3;
    }
  }

  // CNS override
  if (cnsFatigueHigh) cap = Math.min(cap, 70);

  return clamp(Math.round(cap), 20, 100);
}

// ─── DAILY READINESS SCORE ───
export function calculateReadinessScore(
  avgRecoveryPercent: number,
  checkin?: MorningCheckin | null,
  cnsFatigueHigh = false
): number {
  let score = avgRecoveryPercent * 0.5; // 50% weight from recovery

  if (checkin) {
    // Sleep: 20% weight
    const sleepScore = checkin.sleepHours >= 7 ? 100 : checkin.sleepHours >= 6 ? 70 : 40;
    score += sleepScore * 0.2;

    // Energy: 15% weight
    score += (checkin.energyScore / 5) * 100 * 0.15;

    // Soreness inverse: 15% weight (1=max sore, 5=no sore)
    score += (checkin.sorenessScore / 5) * 100 * 0.15;
  } else {
    // Without checkin, use recovery only
    score = avgRecoveryPercent;
  }

  if (cnsFatigueHigh) score *= 0.7;

  return clamp(Math.round(score), 0, 100);
}

// ─── CNS FATIGUE ───
// Compound exercises that generate CNS fatigue
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

// ─── DISPLAY LAYOUT ───
export type BodyRegion = "chest" | "back" | "shoulders" | "arms" | "legs" | "core";

export interface MuscleCardConfig {
  id: MuscleSegment;
  i18nKey: string;
  region: BodyRegion;
}

export const MUSCLE_CARD_LAYOUT: MuscleCardConfig[] = [
  { id: "Chest", i18nKey: "chest", region: "chest" },

  { id: "Upper back", i18nKey: "upperBack", region: "back" },
  { id: "Lats", i18nKey: "lats", region: "back" },
  { id: "Lower back", i18nKey: "lowerBack", region: "back" },

  { id: "Anterior delt", i18nKey: "anteriorDelt", region: "shoulders" },
  { id: "Lateral delt", i18nKey: "lateralDelt", region: "shoulders" },
  { id: "Posterior delt", i18nKey: "posteriorDelt", region: "shoulders" },

  { id: "Biceps", i18nKey: "biceps", region: "arms" },
  { id: "Triceps", i18nKey: "triceps", region: "arms" },

  { id: "Quadriceps", i18nKey: "quads", region: "legs" },
  { id: "Glutes", i18nKey: "glutes", region: "legs" },
  { id: "Hamstrings", i18nKey: "hamstrings", region: "legs" },
  { id: "Calves", i18nKey: "calves", region: "legs" },

  { id: "Core", i18nKey: "core", region: "core" },
];

export const REGION_ORDER: BodyRegion[] = ["chest", "back", "shoulders", "arms", "legs", "core"];

export const REGION_I18N_KEY: Record<BodyRegion, string> = {
  chest: "regionChest",
  back: "regionBack",
  shoulders: "regionShoulders",
  arms: "regionArms",
  legs: "regionLegs",
  core: "regionCore",
};
