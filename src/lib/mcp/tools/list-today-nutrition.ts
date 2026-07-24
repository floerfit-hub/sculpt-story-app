import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, unauth, err, ok } from "./_supabase";

export default defineTool({
  name: "list_today_nutrition",
  title: "List today's food log",
  description: "Returns the signed-in user's food-log entries for a given day (defaults to today) and their macro totals.",
  inputSchema: {
    date: z.string().optional().describe("ISO date (YYYY-MM-DD). Defaults to today (UTC)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ date }, ctx) => {
    if (!ctx.isAuthenticated()) return unauth();
    const day = date ?? new Date().toISOString().slice(0, 10);
    const supabase = supabaseForUser(ctx);
    const start = `${day}T00:00:00.000Z`;
    const end = `${day}T23:59:59.999Z`;
    const { data, error } = await supabase
      .from("food_logs")
      .select("*")
      .eq("user_id", ctx.getUserId())
      .gte("created_at", start)
      .lte("created_at", end)
      .order("created_at", { ascending: false });
    if (error) return err(error.message);
    const totals = (data ?? []).reduce(
      (acc: { kcal: number; protein: number; fat: number; carbs: number }, row: Record<string, unknown>) => {
        acc.kcal += Number(row.kcal ?? 0);
        acc.protein += Number(row.protein ?? 0);
        acc.fat += Number(row.fat ?? 0);
        acc.carbs += Number(row.carbs ?? 0);
        return acc;
      },
      { kcal: 0, protein: 0, fat: 0, carbs: 0 },
    );
    return ok({ date: day, totals, entries: data });
  },
});