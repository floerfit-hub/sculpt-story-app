import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "@/i18n";
import { Trash2, History, ChevronDown } from "lucide-react";
import { format, parseISO } from "date-fns";
import { uk } from "date-fns/locale";

interface FoodLogEntry {
  id: string;
  food_name: string;
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
  meal_type: string;
  created_at: string;
}

const MEAL_TYPE_LABELS: Record<string, { uk: string; en: string; color: string }> = {
  breakfast: { uk: "Сніданок", en: "Breakfast", color: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400" },
  lunch: { uk: "Обід", en: "Lunch", color: "bg-green-500/15 text-green-700 dark:text-green-400" },
  dinner: { uk: "Вечеря", en: "Dinner", color: "bg-blue-500/15 text-blue-700 dark:text-blue-400" },
  snack: { uk: "Перекус", en: "Snack", color: "bg-orange-500/15 text-orange-700 dark:text-orange-400" },
};

const NutritionHistory = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const lang = ((t as any)?.nav?.home === "Головна") ? "uk" : "en";

  const [logs, setLogs] = useState<FoodLogEntry[]>([]);
  const [limit, setLimit] = useState(20);
  const [hasMore, setHasMore] = useState(false);

  const fetchHistory = useCallback(async () => {
    if (!user) return;
    const { data } = await (supabase as any)
      .from("food_logs")
      .select("id, food_name, kcal, protein, fat, carbs, meal_type, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit + 1);

    if (data) {
      setHasMore(data.length > limit);
      setLogs(data.slice(0, limit));
    }
  }, [user, limit]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const handleDelete = async (id: string) => {
    const { error } = await (supabase as any).from("food_logs").delete().eq("id", id);
    if (!error) setLogs(prev => prev.filter(l => l.id !== id));
  };

  // Group by date
  const grouped: Record<string, FoodLogEntry[]> = {};
  logs.forEach(log => {
    const day = format(parseISO(log.created_at), "yyyy-MM-dd");
    if (!grouped[day]) grouped[day] = [];
    grouped[day].push(log);
  });

  const sortedDays = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  if (logs.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <History className="h-4 w-4 text-primary" />
          {lang === "uk" ? "Історія харчування" : "Meal History"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {sortedDays.map(day => {
          const dayDate = parseISO(day);
          const today = format(new Date(), "yyyy-MM-dd");
          const label = day === today
            ? (lang === "uk" ? "Сьогодні" : "Today")
            : format(dayDate, "d MMMM", { locale: lang === "uk" ? uk : undefined });

          const dayTotal = grouped[day].reduce((a, l) => a + Number(l.kcal), 0);

          return (
            <div key={day} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground">{label}</p>
                <p className="text-[10px] text-muted-foreground">{dayTotal} kcal</p>
              </div>
              {grouped[day].map(log => (
                <div
                  key={log.id}
                  className="flex items-center justify-between rounded-lg border border-border/40 px-3 py-2 text-xs"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold truncate">{log.food_name}</p>
                      {log.meal_type && MEAL_TYPE_LABELS[log.meal_type] && (
                        <Badge variant="secondary" className={`text-[9px] px-1.5 py-0 shrink-0 ${MEAL_TYPE_LABELS[log.meal_type].color}`}>
                          {lang === "uk" ? MEAL_TYPE_LABELS[log.meal_type].uk : MEAL_TYPE_LABELS[log.meal_type].en}
                        </Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground">
                      {log.kcal} kcal · {log.protein}g · {log.fat}g · {log.carbs}g
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(log.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          );
        })}

        {hasMore && (
          <Button variant="ghost" size="sm" className="w-full gap-1.5 text-xs" onClick={() => setLimit(prev => prev + 20)}>
            <ChevronDown className="h-3.5 w-3.5" />
            {lang === "uk" ? "Показати більше" : "Show more"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default NutritionHistory;
