import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser, unauth, err, ok } from "./_supabase";

export default defineTool({
  name: "get_fitness_stats",
  title: "Get fitness stats",
  description: "Returns the signed-in user's current Fit Score, XP, level, and streaks.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) return unauth();
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("fitness_stats")
      .select("*")
      .eq("user_id", ctx.getUserId())
      .maybeSingle();
    if (error) return err(error.message);
    return ok(data);
  },
});