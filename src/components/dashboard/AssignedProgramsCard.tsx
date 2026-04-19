import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarDays, Play, ChevronDown, ChevronUp } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface DayMeta { id: string; name: string; sort_order: number }
interface ProgramExercise {
  exercise_name: string;
  muscle_group: string;
  sort_order: number;
  default_sets: number;
  default_reps: number;
  default_weight: number;
  day_id: string | null;
}
interface Program {
  id: string;
  name: string;
  days: DayMeta[];
  exercises: ProgramExercise[];
}

const AssignedProgramsCard = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: tmpl } = await (supabase as any)
        .from("workout_templates")
        .select("id, name, days")
        .eq("is_global", true)
        .order("created_at", { ascending: false });

      if (!tmpl || tmpl.length === 0) { setPrograms([]); return; }

      const ids = tmpl.map((t: any) => t.id);
      const { data: ex } = await (supabase as any)
        .from("workout_template_exercises")
        .select("template_id, exercise_name, muscle_group, sort_order, default_sets, default_reps, default_weight, day_id")
        .in("template_id", ids)
        .order("sort_order", { ascending: true });

      const result: Program[] = tmpl.map((t: any) => ({
        id: t.id,
        name: t.name,
        days: Array.isArray(t.days) ? t.days : [],
        exercises: (ex || []).filter((e: any) => e.template_id === t.id),
      }));
      // Only show programs that have days (multi-day plans)
      setPrograms(result.filter((p) => p.days.length > 0));
      if (result.length > 0 && !expanded) setExpanded(result[0].id);
    };
    load();
  }, [user]);

  if (programs.length === 0) return null;

  const startDay = (program: Program, dayId: string) => {
    const list = program.exercises.filter((e) => e.day_id === dayId);
    const day = program.days.find((d) => d.id === dayId);
    const exercises = list.map((ex) => ({
      name: ex.exercise_name,
      muscleGroup: ex.muscle_group,
      sets: Array.from({ length: Math.max(1, ex.default_sets) }, () => ({
        weight: ex.default_weight > 0 ? ex.default_weight : ("" as number | ""),
        reps: ex.default_reps > 0 ? ex.default_reps : ("" as number | ""),
        rest_time: null,
      })),
    }));
    sessionStorage.setItem("workout-program-start", JSON.stringify({
      exercises,
      name: `${program.name} — ${day?.name || ""}`,
    }));
    navigate("/workouts");
  };

  return (
    <Card className="border-primary/20">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <CalendarDays className="h-4 w-4 text-primary" />
          </div>
          <p className="font-display font-semibold text-sm flex-1">
            {t.templates.startTrainingByProgram}
          </p>
        </div>

        {programs.map((p) => {
          const isOpen = expanded === p.id;
          return (
            <div key={p.id} className="rounded-xl border border-border/50">
              <button
                className="w-full flex items-center justify-between p-3"
                onClick={() => setExpanded(isOpen ? null : p.id)}
              >
                <div className="text-left">
                  <p className="text-sm font-semibold">{p.name}</p>
                  <p className="text-[10px] text-muted-foreground">{p.days.length} {t.templates.daysCount}</p>
                </div>
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              {isOpen && (
                <div className="px-3 pb-3 space-y-1.5">
                  {p.days
                    .slice()
                    .sort((a, b) => a.sort_order - b.sort_order)
                    .map((d) => {
                      const count = p.exercises.filter((e) => e.day_id === d.id).length;
                      return (
                        <div key={d.id} className="flex items-center gap-2 rounded-lg bg-accent/30 p-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm truncate">{d.name}</p>
                            <p className="text-[10px] text-muted-foreground">{count} {t.workouts.exercises}</p>
                          </div>
                          <Button size="sm" className="h-8" disabled={count === 0} onClick={() => startDay(p, d.id)}>
                            <Play className="h-3 w-3 mr-1" /> {t.templates.startWorkout}
                          </Button>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default AssignedProgramsCard;
