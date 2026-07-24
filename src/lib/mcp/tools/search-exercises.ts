import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauth, err, ok } from "./_supabase";

export default defineTool({
  name: "search_exercises",
  title: "Search exercise library",
  description: "Search the global exercise library by name substring, optionally filtered by muscle group.",
  inputSchema: {
    query: z.string().min(1).describe("Substring to match against exercise name."),
    muscle_group: z.string().optional().describe("Optional muscle group filter (e.g. Chest, Legs)."),
    limit: z.number().int().min(1).max(50).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, muscle_group, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return unauth();
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("exercises")
      .select("id, name, muscle_group, equipment, image_url")
      .ilike("name", `%${query}%`)
      .limit(limit ?? 20);
    if (muscle_group) q = q.eq("muscle_group", muscle_group);
    const { data, error } = await q;
    if (error) return err(error.message);
    return ok(data);
  },
});