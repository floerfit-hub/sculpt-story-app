import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauth, err, ok } from "./_supabase";

export default defineTool({
  name: "list_recent_workouts",
  title: "List recent workouts",
  description: "Returns the signed-in user's most recent workouts (id, name, started_at, finished_at, total sets).",
  inputSchema: {
    limit: z.number().int().min(1).max(50).optional().describe("Max workouts to return (default 10)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) return unauth();
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("workouts")
      .select("id, name, started_at, finished_at, workout_sets(count)")
      .eq("user_id", ctx.getUserId())
      .order("started_at", { ascending: false })
      .limit(limit ?? 10);
    if (error) return err(error.message);
    return ok(data);
  },
});