import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format } from "date-fns";

interface ChartPoint {
  date: string;
  maxWeight: number;
  maxReps: number;
  estimated1RM: number;
}

interface PerfRow {
  workout_id: string;
  exercise_id: string;
  max_weight: number;
  total_reps: number;
  estimated_1rm: number;
}

const WorkoutProgressCharts = ({ onBack }: { onBack: () => void }) => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [exerciseData, setExerciseData] = useState<Record<string, ChartPoint[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const [visibleLines, setVisibleLines] = useState({ reps: true, weight: true, estimated1RM: true });

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      // Fetch workouts for date mapping
      const { data: workouts } = await supabase
        .from("workouts")
        .select("id, started_at")
        .eq("user_id", user.id)
        .order("started_at", { ascending: true });

      if (!workouts?.length) { setLoading(false); return; }

      // Fetch exercise_performance (pre-aggregated data)
      const { data: perfData } = await (supabase as any)
        .from("exercise_performance")
        .select("workout_id, exercise_id, max_weight, total_reps, estimated_1rm")
        .eq("user_id", user.id);

      if (!perfData?.length) { setLoading(false); return; }

      // Get exercise names
      const exerciseIds = [...new Set(perfData.map((p: PerfRow) => p.exercise_id))];
      const { data: exercisesData } = await (supabase as any)
        .from("exercises")
        .select("id, name")
        .in("id", exerciseIds);

      const exerciseNameMap = new Map<string, string>(
        (exercisesData || []).map((e: any) => [e.id, e.name])
      );

      const workoutDates = Object.fromEntries(workouts.map(w => [w.id, w.started_at]));

      // Build chart data grouped by exercise name
      const grouped: Record<string, ChartPoint[]> = {};
      for (const p of perfData as PerfRow[]) {
        const name = exerciseNameMap.get(p.exercise_id);
        const date = workoutDates[p.workout_id];
        if (!name || !date) continue;

        if (!grouped[name]) grouped[name] = [];
        grouped[name].push({
          date: format(new Date(date), "MMM d"),
          maxWeight: Number(p.max_weight),
          maxReps: Number(p.total_reps),
          estimated1RM: Number(p.estimated_1rm),
        });
      }

      // Filter exercises with at least 2 data points
      const filtered: typeof grouped = {};
      for (const [name, points] of Object.entries(grouped)) {
        if (points.length >= 2) filtered[name] = points;
      }

      setExerciseData(filtered);
      const first = Object.keys(filtered)[0];
      if (first) setSelectedExercise(first);
      setLoading(false);
    };
    load();
  }, [user]);

  const exerciseNames = Object.keys(exerciseData);
  const chartData = selectedExercise ? exerciseData[selectedExercise] : [];

  const toggleLine = (key: keyof typeof visibleLines) => {
    setVisibleLines((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const lineConfig = [
    { key: "maxReps" as const, toggle: "reps" as const, label: t.workouts.repsLabel, color: "hsl(var(--chart-1, 220 70% 50%))" },
    { key: "maxWeight" as const, toggle: "weight" as const, label: t.workouts.weightLabel, color: "hsl(var(--primary))" },
    { key: "estimated1RM" as const, toggle: "estimated1RM" as const, label: t.workouts.estimated1RM, color: "hsl(var(--chart-3, 45 93% 47%))" },
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-5 w-5" /></Button>
        <h2 className="text-xl font-display font-bold">{t.workouts.progressCharts}</h2>
      </div>

      {loading && <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>}
      {!loading && exerciseNames.length === 0 && <p className="py-12 text-center text-muted-foreground">{t.workouts.logSameExercise}</p>}

      {exerciseNames.length > 0 && (
        <>
          <div className="flex flex-wrap gap-2">
            {exerciseNames.map((name) => (
              <Button key={name} variant={selectedExercise === name ? "default" : "outline"} size="sm" onClick={() => setSelectedExercise(name)}>
                {t.exerciseNames[name] || name}
              </Button>
            ))}
          </div>

          {selectedExercise && chartData && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="font-display text-base">{t.exerciseNames[selectedExercise] || selectedExercise}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {lineConfig.map((line) => (
                    <Button
                      key={line.key}
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs"
                      style={{ borderColor: visibleLines[line.toggle] ? line.color : undefined }}
                      onClick={() => toggleLine(line.toggle)}
                    >
                      {visibleLines[line.toggle] ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                      <span style={{ color: visibleLines[line.toggle] ? line.color : undefined }}>{line.label}</span>
                    </Button>
                  ))}
                </div>

                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" fontSize={11} />
                      <YAxis fontSize={11} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--background))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                      />
                      {lineConfig.map((line) =>
                        visibleLines[line.toggle] ? (
                          <Line
                            key={line.key}
                            type="monotone"
                            dataKey={line.key}
                            name={line.label}
                            stroke={line.color}
                            strokeWidth={2}
                            dot={{ fill: line.color, r: 3 }}
                            activeDot={{ r: 5 }}
                          />
                        ) : null
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default WorkoutProgressCharts;
