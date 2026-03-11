import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { uk as ukLocale } from "date-fns/locale";

const MUSCLE_GROUP_UK: Record<string, string> = {
  "Legs & Glutes": "Ноги та сідниці",
  "Back": "Спина",
  "Chest": "Груди",
  "Shoulders": "Плечі",
  "Arms": "Руки",
  "Core": "Кор",
};

interface SetData { weight: number; reps: number }
interface WorkoutExerciseRow { id: string; exercise_name: string; muscle_group: string; sets: SetData[]; notes: string | null; sort_order: number }
interface WorkoutRow { id: string; started_at: string; finished_at: string | null; notes: string | null }

const WorkoutHistory = ({ onBack }: { onBack: () => void }) => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [workouts, setWorkouts] = useState<(WorkoutRow & { exercises: WorkoutExerciseRow[] })[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: wData } = await supabase.from("workouts").select("*").eq("user_id", user.id).order("started_at", { ascending: false });
      if (!wData?.length) { setLoading(false); return; }
      const { data: exData } = await supabase.from("workout_exercises").select("*").in("workout_id", wData.map((w) => w.id)).order("sort_order", { ascending: true });
      const mapped = wData.map((w) => ({ ...w, exercises: ((exData ?? []).filter((e) => e.workout_id === w.id) as unknown as WorkoutExerciseRow[]) }));
      setWorkouts(mapped);
      setLoading(false);
    };
    load();
  }, [user]);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-5 w-5" /></Button>
        <h2 className="text-xl font-display font-bold">{t.workouts.workoutHistory}</h2>
      </div>

      {loading && <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>}
      {!loading && workouts.length === 0 && <p className="py-12 text-center text-muted-foreground">{t.workouts.noWorkoutsYet}</p>}

      {workouts.map((w) => {
        const expanded = expandedId === w.id;
        return (
          <Card key={w.id} className="cursor-pointer" onClick={() => setExpandedId(expanded ? null : w.id)}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-display font-semibold">{format(new Date(w.started_at), "EEEE, MMM d yyyy")}</p>
                  <p className="text-sm text-muted-foreground">{w.exercises.length} {t.workouts.exercises}</p>
                </div>
                <ChevronRight className={`h-5 w-5 text-muted-foreground transition-transform ${expanded ? "rotate-90" : ""}`} />
              </div>
              {expanded && (
                <div className="space-y-3 pt-2 border-t">
                  {w.exercises.map((ex) => {
                    const sets = (Array.isArray(ex.sets) ? ex.sets : []) as SetData[];
                    return (
                      <div key={ex.id} className="space-y-1">
                        <p className="font-medium text-sm">{ex.exercise_name} <span className="text-muted-foreground text-xs">({ex.muscle_group})</span></p>
                        <div className="flex flex-wrap gap-2">
                          {sets.map((s, i) => (
                            <span key={i} className="rounded-md bg-accent px-2 py-1 text-xs text-accent-foreground">{s.weight}{t.common.kg} × {s.reps}</span>
                          ))}
                        </div>
                        {ex.notes && <p className="text-xs text-muted-foreground italic">"{ex.notes}"</p>}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default WorkoutHistory;
