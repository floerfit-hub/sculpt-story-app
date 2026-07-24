import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauth, err, ok } from "./_supabase";

export default defineTool({
  name: "get_workout",
  title: "Get workout details",
  description: "Returns a single workout of the signed-in user, including all sets (exercise, weight, reps, rest_time).",
  inputSchema: {
    workout_id: z.string().uuid().describe("Workout UUID."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ workout_id }, ctx) => {
    if (!ctx.isAuthenticated()) return unauth();
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("workouts")
      .select("id, name, started_at, finished_at, notes, workout_sets(id, exercise_id, set_number, weight, reps, rest_time, created_at, exercises(name, muscle_group))")
      .eq("id", workout_id)
      .maybeSingle();
    if (error) return err(error.message);
    if (!data) return err("Workout not found");
    return ok(data);
  },
});