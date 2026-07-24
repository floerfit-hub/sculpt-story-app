import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listRecentWorkouts from "./tools/list-recent-workouts";
import getWorkout from "./tools/get-workout";
import searchExercises from "./tools/search-exercises";
import logBodyWeight from "./tools/log-body-weight";
import listMeasurements from "./tools/list-measurements";
import getFitnessStats from "./tools/get-fitness-stats";
import listTodayNutrition from "./tools/list-today-nutrition";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "floer-fittrack-mcp",
  title: "Floer FitTrack",
  version: "0.1.0",
  instructions:
    "Tools to read and log the signed-in user's fitness data in Floer FitTrack: workouts, exercises, body measurements, fitness stats, and food logs. All actions run as the authenticated user under Row Level Security.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    listRecentWorkouts,
    getWorkout,
    searchExercises,
    logBodyWeight,
    listMeasurements,
    getFitnessStats,
    listTodayNutrition,
  ],
});