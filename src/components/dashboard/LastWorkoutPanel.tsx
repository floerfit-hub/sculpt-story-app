import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Dumbbell, Clock, Timer } from "lucide-react";
import { format } from "date-fns";
import { uk as ukLocale } from "date-fns/locale";

interface WorkoutExerciseData {
  exercise_name: string;
  muscle_group: string;
  sets: any;
}

const LastWorkoutPanel = () => {
  const { user } = useAuth();
  const { t, lang } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [lastWorkout, setLastWorkout] = useState<any>(null);
  const [exercises, setExercises] = useState<WorkoutExerciseData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data: w } = await supabase
        .from("workouts")
        .select("*")
        .eq("user_id", user.id)
        .not("finished_at", "is", null)
        .order("finished_at", { ascending: false })
        .limit(1)
        .single();

      if (!w) { setLoading(false); return; }
      setLastWorkout(w);

      const { data: exs } = await supabase
        .from("workout_exercises")
        .select("exercise_name, muscle_group, sets")
        .eq("workout_id", w.id)
        .order("sort_order", { ascending: true });

      setExercises(exs || []);
      setLoading(false);
    };
    fetch();
  }, [user]);

  if (loading || !lastWorkout) return null;

  const duration = lastWorkout.duration_seconds
    ? `${Math.floor(lastWorkout.duration_seconds / 60)} ${lang === "uk" ? "хв" : "min"}`
    : null;

  const dateStr = format(
    new Date(lastWorkout.finished_at || lastWorkout.started_at),
    "d MMM, HH:mm",
    { locale: lang === "uk" ? ukLocale : undefined }
  );

  const totalSets = exercises.reduce((sum, ex) => {
    const sets = Array.isArray(ex.sets) ? ex.sets : [];
    return sum + sets.length;
  }, 0);

  return (
    <Card>
      <CardHeader className="pb-2 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Dumbbell className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">
                {lang === "uk" ? "Останнє тренування" : "Last Workout"}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {lastWorkout.name || dateStr}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {duration && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {duration}
                </span>
              )}
              <span>{exercises.length} {lang === "uk" ? "впр" : "ex"} · {totalSets} {lang === "uk" ? "підх" : "sets"}</span>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0 space-y-2 animate-fade-in">
          {lastWorkout.name && (
            <p className="text-xs text-muted-foreground">{dateStr}</p>
          )}
          {exercises.map((ex, i) => {
            const sets = Array.isArray(ex.sets) ? ex.sets : [];
            return (
              <div key={i} className="rounded-lg border border-border/50 p-2.5">
                <p className="text-sm font-medium">{t.exerciseNames[ex.exercise_name] || ex.exercise_name}</p>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {sets.map((s: any, j: number) => (
                    <span key={j} className="text-[10px] rounded-md bg-accent px-1.5 py-0.5 text-accent-foreground">
                      {s.weight || 0}{lang === "uk" ? "кг" : "kg"} × {s.reps || 0}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </CardContent>
      )}
    </Card>
  );
};

export default LastWorkoutPanel;
