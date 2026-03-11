import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingDown, TrendingUp, Minus, Target, Flame, Award, AlertTriangle } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import type { Tables } from "@/integrations/supabase/types";

type ProgressEntry = Tables<"progress_entries">;

const Insights = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [entries, setEntries] = useState<ProgressEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data } = await supabase
        .from("progress_entries").select("*").eq("user_id", user.id)
        .order("entry_date", { ascending: true });
      setEntries(data ?? []);
      setLoading(false);
    };
    fetch();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (entries.length < 2) {
    return (
      <div className="space-y-6 animate-fade-in">
        <h1 className="text-2xl font-display font-bold">{t.insights.title}</h1>
        <div className="py-12 text-center text-muted-foreground">
          <Target className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
          <p>{t.insights.logAtLeast2}</p>
        </div>
      </div>
    );
  }

  const latest = entries[entries.length - 1];
  const first = entries[0];
  const totalDays = differenceInDays(new Date(latest.entry_date), new Date(first.entry_date));

  const weightDiff = latest.weight != null && first.weight != null ? Number((latest.weight - first.weight).toFixed(1)) : null;
  const waistDiff = latest.waist != null && first.waist != null ? Number((latest.waist - first.waist).toFixed(1)) : null;
  const weeklyRate = weightDiff != null && totalDays > 0 ? Number(((weightDiff / totalDays) * 7).toFixed(2)) : null;
  const streakEntries = entries.length;

  const insights: { icon: typeof Flame; title: string; text: string; type: "success" | "warning" | "info" }[] = [];

  if (weightDiff != null && weightDiff < 0) {
    insights.push({ icon: TrendingDown, title: t.insights.weightLossProgress, text: `${Math.abs(weightDiff)} ${t.common.kg} / ${totalDays}d (${weeklyRate != null ? Math.abs(weeklyRate) : "—"} ${t.common.kg}/wk)`, type: "success" });
  } else if (weightDiff != null && weightDiff > 0) {
    insights.push({ icon: TrendingUp, title: t.insights.weightGainProgress, text: `+${weightDiff} ${t.common.kg} / ${totalDays}d (${weeklyRate ?? "—"} ${t.common.kg}/wk)`, type: "info" });
  }

  if (waistDiff != null && waistDiff < 0) {
    insights.push({ icon: Award, title: t.insights.waistReduction, text: `-${Math.abs(waistDiff)} ${t.common.cm}`, type: "success" });
  }

  if (streakEntries >= 4) {
    insights.push({ icon: Flame, title: t.insights.consistencyStreak, text: `${streakEntries} check-ins`, type: "success" });
  }

  if (weeklyRate != null && Math.abs(weeklyRate) > 1) {
    insights.push({ icon: AlertTriangle, title: t.insights.paceWarning, text: `${Math.abs(weeklyRate)} ${t.common.kg}/wk`, type: "warning" });
  }

  if (entries.length >= 3) {
    const recent3 = entries.slice(-3);
    const allSameWeight = recent3.every((e) => e.weight === recent3[0].weight);
    if (allSameWeight && recent3[0].weight != null) {
      insights.push({ icon: Minus, title: t.insights.possiblePlateau, text: `3 check-ins same weight`, type: "warning" });
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-display font-bold">{t.insights.title}</h1>

      <div className="grid grid-cols-2 gap-3">
        <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">{t.insights.totalEntries}</p><p className="text-2xl font-display font-bold">{entries.length}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">{t.insights.trackingSince}</p><p className="text-sm font-display font-semibold mt-1">{format(new Date(first.entry_date), "MMM d, yyyy")}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">{t.insights.weightChange}</p><p className={`text-2xl font-display font-bold ${weightDiff != null && weightDiff < 0 ? "text-primary" : weightDiff != null && weightDiff > 0 ? "text-destructive" : ""}`}>{weightDiff != null ? `${weightDiff > 0 ? "+" : ""}${weightDiff}` : "—"}<span className="text-sm">{t.common.kg}</span></p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">{t.insights.weeklyRate}</p><p className="text-2xl font-display font-bold">{weeklyRate != null ? `${weeklyRate > 0 ? "+" : ""}${weeklyRate}` : "—"}<span className="text-sm">{t.common.kg}</span></p></CardContent></Card>
      </div>

      {insights.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-display font-semibold text-lg">{t.insights.aiAnalysis}</h2>
          {insights.map((insight, i) => (
            <Card key={i} className={`border-l-4 ${insight.type === "success" ? "border-l-primary" : insight.type === "warning" ? "border-l-destructive" : "border-l-muted-foreground"}`}>
              <CardContent className="flex items-start gap-3 p-4">
                <insight.icon className={`h-5 w-5 shrink-0 mt-0.5 ${insight.type === "success" ? "text-primary" : insight.type === "warning" ? "text-destructive" : "text-muted-foreground"}`} />
                <div>
                  <p className="font-display font-semibold text-sm">{insight.title}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{insight.text}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Insights;
