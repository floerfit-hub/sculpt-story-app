import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format } from "date-fns";

interface SetData { weight: number; reps: number }

const WorkoutProgressCharts = ({ onBack }: { onBack: () => void }) => {
  const { user } = useAuth();
  const [exerciseData, setExerciseData] = useState<Record<string, { date: string; maxWeight: number; maxReps: number }[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: workouts } = await supabase
        .from("workouts")
        .select("id, started_at")
        .eq("user_id", user.id)
        .order("started_at", { ascending: true });
      if (!workouts?.length) { setLoading(false); return; }

      const { data: exercises } = await supabase
        .from("workout_exercises")
        .select("*")
        .in("workout_id", workouts.map((w) => w.id));
      if (!exercises?.length) { setLoading(false); return; }

      const workoutDates = Object.fromEntries(workouts.map((w) => [w.id, w.started_at]));
      const grouped: Record<string, { date: string; maxWeight: number; maxReps: number }[]> = {};

      for (const ex of exercises) {
        const sets = (Array.isArray(ex.sets) ? ex.sets : []) as unknown as SetData[];
        if (!sets.length) continue;
        const maxWeight = Math.max(...sets.map((s) => s.weight || 0));
        const maxReps = Math.max(...sets.map((s) => s.reps || 0));
        const date = workoutDates[ex.workout_id];
        if (!date) continue;

        if (!grouped[ex.exercise_name]) grouped[ex.exercise_name] = [];
        grouped[ex.exercise_name].push({
          date: format(new Date(date), "MMM d"),
          maxWeight,
          maxReps,
        });
      }

      // Only keep exercises with 2+ data points
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

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-xl font-display font-bold">Progress Charts</h2>
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      )}

      {!loading && exerciseNames.length === 0 && (
        <p className="py-12 text-center text-muted-foreground">
          Log the same exercise across 2+ workouts to see progress charts.
        </p>
      )}

      {exerciseNames.length > 0 && (
        <>
          <div className="flex flex-wrap gap-2">
            {exerciseNames.map((name) => (
              <Button
                key={name}
                variant={selectedExercise === name ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedExercise(name)}
              >
                {name}
              </Button>
            ))}
          </div>

          {selectedExercise && chartData && (
            <div className="space-y-4">
              <Card>
                <CardHeader><CardTitle className="font-display text-base">Weight Progression (kg)</CardTitle></CardHeader>
                <CardContent>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" fontSize={11} />
                        <YAxis fontSize={11} />
                        <Tooltip />
                        <Line type="monotone" dataKey="maxWeight" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: "hsl(var(--primary))", r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="font-display text-base">Reps Progression</CardTitle></CardHeader>
                <CardContent>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" fontSize={11} />
                        <YAxis fontSize={11} />
                        <Tooltip />
                        <Line type="monotone" dataKey="maxReps" stroke="hsl(var(--accent-foreground))" strokeWidth={2} dot={{ fill: "hsl(var(--accent-foreground))", r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default WorkoutProgressCharts;
