import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Dumbbell, Clock } from "lucide-react";
import { format } from "date-fns";
import { uk as ukLocale } from "date-fns/locale";

interface GroupedExercise {
  name: string;
  muscle_group: string;
  sets: { weight: number; reps: number }[];
}

const LastWorkoutPanel = () => {
  const { user } = useAuth();
  const { t, lang } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [lastWorkout, setLastWorkout] = useState<any>(null);
  const [exercises, setExercises] = useState<GroupedExercise[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
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

      // Use workout_sets + exercises (same as WorkoutHistory)
      const { data: setsData } = await (supabase as any)
        .from("workout_sets")
        .select("exercise_id, set_number, weight, reps, sort_order")
        .eq("workout_id", w.id)
        .order("sort_order", { ascending: true })
        .order("set_number", { ascending: true });

      if (!setsData?.length) {
        // Fallback to workout_exercises table
        const { data: exs } = await supabase
          .from("workout_exercises")
          .select("exercise_name, muscle_group, sets")
          .eq("workout_id", w.id)
          .order("sort_order", { ascending: true });

        const fallback: GroupedExercise[] = (exs || []).map((ex: any) => {
          const sets = Array.isArray(ex.sets) ? ex.sets : [];
          return {
            name: ex.exercise_name,
            muscle_group: ex.muscle_group,
            sets: sets.map((s: any) => ({ weight: Number(s.weight) || 0, reps: Number(s.reps) || 0 })),
          };
        });
        setExercises(fallback);
        setLoading(false);
        return;
      }

      const exerciseIds = [...new Set(setsData.map((s: any) => s.exercise_id))];
      const { data: exData } = await (supabase as any)
        .from("exercises")
        .select("id, name, muscle_group")
        .in("id", exerciseIds);

      const exMap = new Map((exData || []).map((e: any) => [e.id, e]));

      // Group by exercise_id preserving sort_order
      const groups = new Map<string, { info: any; sets: { weight: number; reps: number }[]; sortOrder: number }>();
      for (const s of setsData) {
        if (!groups.has(s.exercise_id)) {
          groups.set(s.exercise_id, { info: exMap.get(s.exercise_id), sets: [], sortOrder: s.sort_order });
        }
        groups.get(s.exercise_id)!.sets.push({ weight: Number(s.weight), reps: Number(s.reps) });
      }

      const result: GroupedExercise[] = [...groups.values()]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map(g => ({
          name: g.info?.name || "",
          muscle_group: g.info?.muscle_group || "",
          sets: g.sets,
        }));

      setExercises(result);
      setLoading(false);
    };
    load();
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

  const totalSets = exercises.reduce((sum, ex) => sum + ex.sets.length, 0);

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
          {exercises.map((ex, i) => (
            <div key={i} className="rounded-lg border border-border/50 p-2.5">
              <p className="text-sm font-medium">{t.exerciseNames[ex.name] || ex.name}</p>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {ex.sets.map((s, j) => (
                  <span key={j} className="text-[10px] rounded-md bg-accent px-1.5 py-0.5 text-accent-foreground">
                    {s.weight}{lang === "uk" ? "кг" : "kg"} × {s.reps}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      )}
    </Card>
  );
};

export default LastWorkoutPanel;
