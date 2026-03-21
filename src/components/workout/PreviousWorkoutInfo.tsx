import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Info, X } from "lucide-react";

interface PrevSet {
  set_number: number;
  weight: number;
  reps: number;
}

interface PrevData {
  sets: PrevSet[];
  date: string;
}

interface Props {
  exerciseName: string;
  muscleGroup: string;
}

const PreviousWorkoutInfo = ({ exerciseName, muscleGroup }: Props) => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [data, setData] = useState<PrevData | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = async () => {
    if (!user || loaded) return;
    setLoading(true);
    try {
      const { data: exercises } = await (supabase as any)
        .from("exercises")
        .select("id")
        .eq("name", exerciseName)
        .limit(1);

      if (!exercises?.length) { setLoaded(true); setLoading(false); return; }
      const exerciseId = exercises[0].id;

      const { data: sets } = await supabase
        .from("workout_sets")
        .select("weight, reps, set_number, workout_id, created_at")
        .eq("exercise_id", exerciseId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (!sets?.length) { setLoaded(true); setLoading(false); return; }

      const firstWorkoutId = sets[0].workout_id;
      const workoutSets = sets
        .filter(s => s.workout_id === firstWorkoutId)
        .sort((a, b) => a.set_number - b.set_number);

      const { data: workout } = await supabase
        .from("workouts")
        .select("started_at")
        .eq("id", firstWorkoutId)
        .maybeSingle();

      setData({
        sets: workoutSets.map(s => ({ set_number: s.set_number, weight: s.weight, reps: s.reps })),
        date: workout?.started_at || sets[0].created_at,
      });
      setLoaded(true);
    } catch {
      // ignore
    }
    setLoading(false);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffDays === 0) return t.workouts.today || "Сьогодні";
    if (diffDays === 1) return t.workouts.yesterday || "Вчора";
    return d.toLocaleDateString();
  };

  const handleToggle = () => {
    if (!open) load();
    setOpen(!open);
  };

  return (
    <div className="relative">
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleToggle}>
        <Info className="h-4 w-4 text-primary" />
      </Button>
      {open && (
        <div className="absolute right-0 top-9 z-50 w-64 rounded-xl border border-border bg-card shadow-lg p-3 space-y-2 animate-fade-in">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground">{t.templates.prevWorkout}</span>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setOpen(false)}>
              <X className="h-3 w-3" />
            </Button>
          </div>
          {loading && <p className="text-xs text-muted-foreground">{t.workouts.savingDots}</p>}
          {!loading && !data && <p className="text-xs text-muted-foreground">{t.templates.noPrevData}</p>}
          {!loading && data && (
            <>
              <p className="text-[11px] text-muted-foreground">{formatDate(data.date)}</p>
              <div className="space-y-1">
                <div className="grid grid-cols-3 gap-1 text-[10px] font-bold text-muted-foreground uppercase">
                  <span>{t.workouts.set}</span>
                  <span className="text-center">{t.common.kg}</span>
                  <span className="text-center">{t.workouts.reps}</span>
                </div>
                {data.sets.map((s, i) => (
                  <div key={i} className="grid grid-cols-3 gap-1 text-xs rounded-lg bg-accent/50 px-2 py-1.5">
                    <span className="font-medium text-muted-foreground">{s.set_number}</span>
                    <span className="text-center font-bold text-foreground">{s.weight}</span>
                    <span className="text-center font-bold text-foreground">{s.reps}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default PreviousWorkoutInfo;
