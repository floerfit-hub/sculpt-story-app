export type MuscleGroup = "Chest" | "Back" | "Shoulders" | "Arms" | "Legs & Glutes" | "Core";

export interface Exercise {
  name: string;
  muscleGroup: MuscleGroup;
  equipment?: string;
  difficulty?: string;
  exerciseType?: string;
  subGroup?: string;
  isDeprecated?: boolean;
}

export const MUSCLE_GROUPS: MuscleGroup[] = [
  "Legs & Glutes", "Back", "Chest", "Shoulders", "Arms", "Core"
];

export const EXERCISES: Exercise[] = [
  // Legs & Glutes
  { name: "Barbell Squat", muscleGroup: "Legs & Glutes" },
  { name: "Goblet Squat", muscleGroup: "Legs & Glutes" },
  { name: "Leg Press", muscleGroup: "Legs & Glutes" },
  { name: "Forward Lunges", muscleGroup: "Legs & Glutes" },
  { name: "Bulgarian Split Squat", muscleGroup: "Legs & Glutes" },
  { name: "Romanian Deadlift", muscleGroup: "Legs & Glutes" },
  { name: "Hip Thrust", muscleGroup: "Legs & Glutes" },
  { name: "Cable Glute Kickback", muscleGroup: "Legs & Glutes" },
  { name: "Lying Leg Curl", muscleGroup: "Legs & Glutes" },
  { name: "Leg Extension", muscleGroup: "Legs & Glutes" },
  { name: "Standing Calf Raises", muscleGroup: "Legs & Glutes" },
  { name: "Deadlift", muscleGroup: "Legs & Glutes" },
  // Back
  { name: "Lat Pulldown", muscleGroup: "Back" },
  { name: "Seated Cable Row", muscleGroup: "Back" },
  { name: "Dumbbell Row", muscleGroup: "Back" },
  { name: "Pull-ups", muscleGroup: "Back" },
  { name: "Barbell Row", muscleGroup: "Back" },
  { name: "Hyperextensions", muscleGroup: "Back" },
  { name: "Face Pull", muscleGroup: "Back" },
  // Chest
  { name: "Barbell Bench Press", muscleGroup: "Chest" },
  { name: "Incline Barbell Bench Press", muscleGroup: "Chest" },
  { name: "Hammer Strength Chest Press", muscleGroup: "Chest" },
  { name: "Cable Chest Fly", muscleGroup: "Chest" },
  { name: "Incline Dumbbell Press", muscleGroup: "Chest" },
  { name: "Machine Chest Fly", muscleGroup: "Chest" },
  { name: "Push-ups", muscleGroup: "Chest" },
  { name: "Dips", muscleGroup: "Chest" },
  // Shoulders
  { name: "Seated Dumbbell Press", muscleGroup: "Shoulders" },
  { name: "Standing Barbell Press", muscleGroup: "Shoulders" },
  { name: "Dumbbell Lateral Raise", muscleGroup: "Shoulders" },
  { name: "Dumbbell Front Raise", muscleGroup: "Shoulders" },
  { name: "Reverse Dumbbell Fly", muscleGroup: "Shoulders" },
  { name: "Rear Delt Machine Fly", muscleGroup: "Shoulders" },
  // Arms
  { name: "Barbell Biceps Curl", muscleGroup: "Arms" },
  { name: "Dumbbell Biceps Curl", muscleGroup: "Arms" },
  { name: "Incline Dumbbell Curl", muscleGroup: "Arms" },
  { name: "Cable Lying Curl", muscleGroup: "Arms" },
  { name: "Hammer Curl", muscleGroup: "Arms" },
  { name: "Triceps Pushdown", muscleGroup: "Arms" },
  { name: "Single-arm Triceps Extension", muscleGroup: "Arms" },
  { name: "Dumbbell French Press", muscleGroup: "Arms" },
  { name: "Bench Dips", muscleGroup: "Arms" },
  // Core
  { name: "Plank", muscleGroup: "Core" },
  { name: "Crunches", muscleGroup: "Core" },
  { name: "Leg Raises", muscleGroup: "Core" },
  { name: "Dead Bug", muscleGroup: "Core" },
  { name: "Bicycle Crunch", muscleGroup: "Core" },
];

export function getExercisesByGroup(group: MuscleGroup): Exercise[] {
  return EXERCISES.filter(e => e.muscleGroup === group);
}
