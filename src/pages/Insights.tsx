import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingDown, TrendingUp, Minus, Target, Flame, Award, AlertTriangle } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import type { Tables } from "@/integrations/supabase/types";

type ProgressEntry = Tables<"progress_entries">;

const Insights = () => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<ProgressEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data } = await supabase
        .from("progress_entries")
        .select("*")
        .eq("user_id", user.id)
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
        <h1 className="text-2xl font-display font-bold">Insights</h1>
        <div className="py-12 text-center text-muted-foreground">
          <Target className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
          <p>Log at least 2 entries to see insights.</p>
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
    insights.push({
      icon: TrendingDown,
      title: "Weight Loss Progress",
      text: `You've lost ${Math.abs(weightDiff)} kg over ${totalDays} days. That's ${weeklyRate != null ? Math.abs(weeklyRate) : "—"} kg/week on average.`,
      type: "success",
    });
  } else if (weightDiff != null && weightDiff > 0) {
    insights.push({
      icon: TrendingUp,
      title: "Weight Gain Progress",
      text: `You've gained ${weightDiff} kg over ${totalDays} days (${weeklyRate != null ? weeklyRate : "—"} kg/week average).`,
      type: "info",
    });
  }

  if (waistDiff != null && waistDiff < 0) {
    insights.push({
      icon: Award,
      title: "Waist Reduction",
      text: `Your waist is down ${Math.abs(waistDiff)} cm — great indicator of fat loss!`,
      type: "success",
    });
  }

  if (streakEntries >= 4) {
    insights.push({
      icon: Flame,
      title: "Consistency Streak",
      text: `${streakEntries} check-ins logged! Consistency is the #1 predictor of success.`,
      type: "success",
    });
  }

  if (weeklyRate != null && Math.abs(weeklyRate) > 1) {
    insights.push({
      icon: AlertTriangle,
      title: "Pace Warning",
      text: `You're changing ${Math.abs(weeklyRate)} kg/week. A sustainable pace is 0.3–0.7 kg/week.`,
      type: "warning",
    });
  }

  if (entries.length >= 3) {
    const recent3 = entries.slice(-3);
    const allSameWeight = recent3.every((e) => e.weight === recent3[0].weight);
    if (allSameWeight && recent3[0].weight != null) {
      insights.push({
        icon: Minus,
        title: "Possible Plateau",
        text: "Your weight has been the same for 3 check-ins. Consider adjusting calories or training.",
        type: "warning",
      });
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-display font-bold">Insights</h1>

      {/* Overview cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Total Entries</p>
            <p className="text-2xl font-display font-bold">{entries.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Tracking Since</p>
            <p className="text-sm font-display font-semibold mt-1">{format(new Date(first.entry_date), "MMM d, yyyy")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Weight Change</p>
            <p className={`text-2xl font-display font-bold ${weightDiff != null && weightDiff < 0 ? "text-primary" : weightDiff != null && weightDiff > 0 ? "text-destructive" : ""}`}>
              {weightDiff != null ? `${weightDiff > 0 ? "+" : ""}${weightDiff}` : "—"}<span className="text-sm">kg</span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Weekly Rate</p>
            <p className="text-2xl font-display font-bold">
              {weeklyRate != null ? `${weeklyRate > 0 ? "+" : ""}${weeklyRate}` : "—"}<span className="text-sm">kg</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Insights */}
      {insights.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-display font-semibold text-lg">AI Analysis</h2>
          {insights.map((insight, i) => (
            <Card
              key={i}
              className={`border-l-4 ${
                insight.type === "success"
                  ? "border-l-primary"
                  : insight.type === "warning"
                  ? "border-l-destructive"
                  : "border-l-muted-foreground"
              }`}
            >
              <CardContent className="flex items-start gap-3 p-4">
                <insight.icon className={`h-5 w-5 shrink-0 mt-0.5 ${
                  insight.type === "success" ? "text-primary" : insight.type === "warning" ? "text-destructive" : "text-muted-foreground"
                }`} />
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
