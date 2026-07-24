import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauth, err, ok } from "./_supabase";

export default defineTool({
  name: "list_measurements",
  title: "List body measurements",
  description: "Returns the signed-in user's recent progress entries (body weight and body measurements).",
  inputSchema: {
    limit: z.number().int().min(1).max(100).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) return unauth();
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("progress_entries")
      .select("*")
      .eq("user_id", ctx.getUserId())
      .order("date", { ascending: false })
      .limit(limit ?? 20);
    if (error) return err(error.message);
    return ok(data);
  },
});