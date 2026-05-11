import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Play, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface DayMeta { id: string; name: string; sort_order: number }
interface TemplateExercise {
  exercise_name: string;
  muscle_group: string;
  sort_order: number;
  default_sets: number;
  default_reps: number;
  default_weight: number;
  day_id: string | null;
  template_id: string;
}
interface Template {
  id: string;
  name: string;
  days: DayMeta[];
  created_at: string;
  exercises: TemplateExercise[];
}
interface SessionTarget {
  template: Template;
  dayId: string | null;
  dayName: string | null;
  sessionName: string;
  lastWorkoutId: string | null;
  lastDoneAt: string | null;
}
interface PreviousSet { weight: number; reps: number }
interface PreviousMap { [key: string]: PreviousSet[] }

const exKey = (name: string, mg: string) => `${name}::${mg}`;

const NextWorkoutCard = () => {
  const { user } = useAuth();
  const { t, lang } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [target, setTarget] = useState<SessionTarget | null>(null);
  const [previousSets, setPreviousSets] = useState<PreviousMap>({});

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);

      // 1) Load templates accessible to user (own + assigned, exclude global library)
      const { data: tmpl } = await (supabase as any)
        .from("workout_templates")
        .select("id, name, days, created_at, user_id, is_global")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      const templates: Template[] = (tmpl || []).map((tm: any) => ({
        id: tm.id,
        name: tm.name,
        days: Array.isArray(tm.days) ? tm.days : [],
        created_at: tm.created_at,
        exercises: [],
      }));

      if (templates.length === 0) {
        if (!cancelled) { setTarget(null); setLoading(false); }
        return;
      }

      const ids = templates.map((tt) => tt.id);
      const { data: tex } = await (supabase as any)
        .from("workout_template_exercises")
        .select("template_id, exercise_name, muscle_group, sort_order, default_sets, default_reps, default_weight, day_id")
        .in("template_id", ids)
        .order("sort_order", { ascending: true });

      const byTpl = new Map<string, TemplateExercise[]>();
      (tex || []).forEach((row: any) => {
        const arr = byTpl.get(row.template_id) || [];
        arr.push(row);
        byTpl.set(row.template_id, arr);
      });
      templates.forEach((tt) => { tt.exercises = byTpl.get(tt.id) || []; });

      // Build all candidate sessions: template + (day or null)
      const candidates: { template: Template; dayId: string | null; dayName: string | null; sessionName: string }[] = [];
      templates.forEach((tt) => {
        if (tt.days.length > 0) {
          tt.days
            .slice()
            .sort((a, b) => a.sort_order - b.sort_order)
            .forEach((d) => {
              const exCount = tt.exercises.filter((e) => e.day_id === d.id).length;
              if (exCount === 0) return;
              candidates.push({ template: tt, dayId: d.id, dayName: d.name, sessionName: `${tt.name} — ${d.name}` });
            });
        } else if (tt.exercises.length > 0) {
          candidates.push({ template: tt, dayId: null, dayName: null, sessionName: tt.name });
        }
      });

      if (candidates.length === 0) {
        if (!cancelled) { setTarget(null); setLoading(false); }
        return;
      }

      // 2) Fetch finished workouts (recent history)
      const { data: ws } = await supabase
        .from("workouts")
        .select("id, name, finished_at, started_at")
        .eq("user_id", user.id)
        .not("finished_at", "is", null)
        .order("finished_at", { ascending: false })
        .limit(50);

      const finishedWorkouts = ws || [];

      // Map session_name -> [workouts] (most recent first)
      const lastBySession = new Map<string, { id: string; finished_at: string }[]>();
      finishedWorkouts.forEach((w: any) => {
        if (!w.name) return;
        const arr = lastBySession.get(w.name) || [];
        arr.push({ id: w.id, finished_at: w.finished_at });
        lastBySession.set(w.name, arr);
      });

      // 3) Cycle detection: pick candidate with oldest lastDoneAt (or never done = priority)
      let chosen: SessionTarget | null = null;
      let oldest = Infinity;
      // Prefer never-done first, in template creation order
      const neverDone = candidates.find((c) => !lastBySession.get(c.sessionName)?.length);
      if (neverDone) {
        chosen = {
          template: neverDone.template,
          dayId: neverDone.dayId,
          dayName: neverDone.dayName,
          sessionName: neverDone.sessionName,
          lastWorkoutId: null,
          lastDoneAt: null,
        };
      } else {
        candidates.forEach((c) => {
          const last = lastBySession.get(c.sessionName)?.[0];
          const t = last ? new Date(last.finished_at).getTime() : 0;
          if (t < oldest) {
            oldest = t;
            chosen = {
              template: c.template,
              dayId: c.dayId,
              dayName: c.dayName,
              sessionName: c.sessionName,
              lastWorkoutId: last?.id || null,
              lastDoneAt: last?.finished_at || null,
            };
          }
        });
      }

      // 4) Fetch last performance for the chosen session (if exists)
      const prev: PreviousMap = {};
      const lastId = chosen?.lastWorkoutId;
      if (chosen && lastId) {
        const { data: setsData } = await (supabase as any)
          .from("workout_sets")
          .select("exercise_id, set_number, weight, reps, sort_order")
          .eq("workout_id", lastId)
          .order("sort_order", { ascending: true })
          .order("set_number", { ascending: true });

        if (setsData?.length) {
          const exerciseIds = [...new Set(setsData.map((s: any) => s.exercise_id))];
          const { data: exData } = await (supabase as any)
            .from("exercises")
            .select("id, name, muscle_group")
            .in("id", exerciseIds);
          const exMap = new Map((exData || []).map((e: any) => [e.id, e]));
          setsData.forEach((s: any) => {
            const info: any = exMap.get(s.exercise_id);
            if (!info) return;
            const k = exKey(info.name, info.muscle_group);
            const arr = prev[k] || [];
            arr.push({ weight: Number(s.weight) || 0, reps: Number(s.reps) || 0 });
            prev[k] = arr;
          });
        } else {
          // fallback to workout_exercises jsonb
          const { data: wex } = await supabase
            .from("workout_exercises")
            .select("exercise_name, muscle_group, sets")
            .eq("workout_id", lastId)
            .order("sort_order", { ascending: true });
          (wex || []).forEach((row: any) => {
            const sets = Array.isArray(row.sets) ? row.sets : [];
            prev[exKey(row.exercise_name, row.muscle_group)] = sets.map((s: any) => ({
              weight: Number(s.weight) || 0,
              reps: Number(s.reps) || 0,
            }));
          });
        }
      }

      if (!cancelled) {
        setTarget(chosen);
        setPreviousSets(prev);
        setLoading(false);
      }
    };

    load();
  }, [user]);

  if (loading || !target) return null;

  const sessionExercises = target.template.exercises
    .filter((e) => e.day_id === target.dayId)
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order);

  const start = () => {
    const exercises = sessionExercises.map((ex) => {
      const prev = previousSets[exKey(ex.exercise_name, ex.muscle_group)] || [];
      const setCount = Math.max(1, ex.default_sets, prev.length);
      const sets = Array.from({ length: setCount }, (_, i) => {
        const p = prev[i] ?? prev[prev.length - 1];
        const weight = p?.weight && p.weight > 0 ? p.weight : (ex.default_weight > 0 ? ex.default_weight : ("" as number | ""));
        const reps = p?.reps && p.reps > 0 ? p.reps : (ex.default_reps > 0 ? ex.default_reps : ("" as number | ""));
        return { weight, reps, rest_time: null };
      });
      return { name: ex.exercise_name, muscleGroup: ex.muscle_group, sets };
    });
    sessionStorage.setItem("workout-program-start", JSON.stringify({
      exercises,
      name: target.sessionName,
    }));
    navigate("/workouts");
  };

  const preview = sessionExercises.slice(0, 4);
  const todayLabel = lang === "uk" ? "Сьогодні" : "Today";
  const nextSessionLabel = lang === "uk" ? "Наступна сесія" : "Next session";
  const aimLabel = lang === "uk" ? "Цільова" : "Aim";
  const startLabel = lang === "uk" ? "Почати тренування" : "Start training";
  const noHistoryLabel = lang === "uk" ? "Перше тренування" : "First time";
  const kg = lang === "uk" ? "кг" : "kg";

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
              {todayLabel} · {nextSessionLabel}
            </p>
            <p className="font-display font-bold text-base truncate">
              {t.exerciseNames?.[target.sessionName] || target.sessionName}
            </p>
            {target.lastDoneAt ? (
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {lang === "uk" ? "Останній раз: " : "Last time: "}
                {new Date(target.lastDoneAt).toLocaleDateString(lang === "uk" ? "uk-UA" : "en-US", { day: "numeric", month: "short" })}
              </p>
            ) : (
              <p className="text-[11px] text-primary/80 mt-0.5">{noHistoryLabel}</p>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          {preview.map((ex, i) => {
            const prev = previousSets[exKey(ex.exercise_name, ex.muscle_group)] || [];
            const lastWeight = prev.reduce((m, s) => Math.max(m, s.weight), 0);
            const lastReps = prev[0]?.reps ?? ex.default_reps;
            const aim = lastWeight > 0 ? Math.round((lastWeight + 2.5) * 10) / 10 : null;
            const displayName = t.exerciseNames?.[ex.exercise_name] || ex.exercise_name;
            return (
              <div key={i} className="flex items-center justify-between rounded-lg bg-card/60 border border-border/40 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{displayName}</p>
                  {lastWeight > 0 ? (
                    <p className="text-[11px] text-muted-foreground">
                      {lastWeight}{kg} × {lastReps}
                      {aim !== null && (
                        <span className="text-primary font-semibold ml-1.5 inline-flex items-center gap-0.5">
                          <TrendingUp className="h-3 w-3" /> {aimLabel} {aim}{kg}
                        </span>
                      )}
                    </p>
                  ) : (
                    <p className="text-[11px] text-muted-foreground">
                      {ex.default_sets}×{ex.default_reps}
                      {ex.default_weight > 0 ? ` @ ${ex.default_weight}${kg}` : ""}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
          {sessionExercises.length > preview.length && (
            <p className="text-[10px] text-muted-foreground text-center pt-0.5">
              +{sessionExercises.length - preview.length} {lang === "uk" ? "ще" : "more"}
            </p>
          )}
        </div>

        <Button onClick={start} className="w-full">
          <Play className="h-4 w-4 mr-1.5" /> {startLabel}
        </Button>
      </CardContent>
    </Card>
  );
};

export default NextWorkoutCard;