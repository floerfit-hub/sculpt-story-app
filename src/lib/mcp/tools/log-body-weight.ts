import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauth, err, ok } from "./_supabase";

export default defineTool({
  name: "log_body_weight",
  title: "Log body weight",
  description: "Record a new body-weight measurement for the signed-in user.",
  inputSchema: {
    weight_kg: z.number().positive().describe("Body weight in kilograms."),
    note: z.string().optional().describe("Optional note."),
    date: z.string().optional().describe("Optional ISO date (YYYY-MM-DD). Defaults to today."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  handler: async ({ weight_kg, note, date }, ctx) => {
    if (!ctx.isAuthenticated()) return unauth();
    const supabase = supabaseForUser(ctx);
    const row: Record<string, unknown> = {
      user_id: ctx.getUserId(),
      weight: weight_kg,
    };
    if (note) row.notes = note;
    if (date) row.date = date;
    const { data, error } = await supabase.from("progress_entries").insert(row).select().maybeSingle();
    if (error) return err(error.message);
    return ok(data);
  },
});