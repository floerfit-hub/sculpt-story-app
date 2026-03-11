import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format } from "date-fns";
import type { Tables } from "@/integrations/supabase/types";

type ProgressEntry = Tables<"progress_entries">;

const Charts = () => {
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

  const chartData = entries.map((e) => ({
    date: format(new Date(e.entry_date), "MMM d"),
    weight: e.weight, waist: e.waist, bodyFat: e.body_fat,
  }));

  const hasBodyFat = entries.some((e) => e.body_fat != null);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (entries.length < 2) {
    return (
      <div className="py-20 text-center text-muted-foreground animate-fade-in">
        <p>{t.charts.addAtLeast2}</p>
      </div>
    );
  }

  const charts = [
    { title: t.charts.weightProgress, dataKey: "weight", color: "hsl(142, 60%, 45%)" },
    { title: t.charts.waistMeasurement, dataKey: "waist", color: "hsl(0, 0%, 20%)" },
    ...(hasBodyFat ? [{ title: t.charts.bodyFatPercent, dataKey: "bodyFat", color: "hsl(142, 40%, 55%)" }] : []),
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-display font-bold">{t.charts.title}</h1>
      {charts.map((chart) => (
        <Card key={chart.dataKey}>
          <CardHeader><CardTitle className="font-display text-lg">{chart.title}</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(0, 0%, 90%)" />
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Line type="monotone" dataKey={chart.dataKey} stroke={chart.color} strokeWidth={2} dot={{ fill: chart.color, r: 4 }} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default Charts;
