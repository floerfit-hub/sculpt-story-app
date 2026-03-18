import { useEffect, useState } from "react";

import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, ChevronRight, Clock, Pencil, Trash2, Check, X } from "lucide-react";
import { format } from "date-fns";
import { uk as ukLocale } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import type { EditWorkoutData } from "./StartWorkout";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const MUSCLE_GROUP_UK: Record<string, string> = {
  "Legs & Glutes": "Ноги та сідниці",
  "Back": "Спина",
  "Chest": "Груди",
  "Shoulders": "Плечі",
  "Arms": "Руки",
  "Core": "Кор",
};

interface WorkoutSetRow {
  id: string;
  workout_id: string;
  exercise_id: string;
  set_number: number;
  weight: number;
  reps: number;
  sort_order: number;
  notes: string | null;
  rest_time: number | null;
}

interface ExerciseRow {
  id: string;
  name: string;
  muscle_group: string;
}

interface WorkoutRow {
  id: string;
  started_at: string;
  finished_at: string | null;
  notes: string | null;
  duration_seconds: number | null;
  name: string | null;
}

interface GroupedExercise {
  exercise_id: string;
  exercise_name: string;
  muscle_group: string;
  sets: { weight: number; reps: number; rest_time: number | null }[];
  notes: string | null;
  sort_order: number;
}

interface WorkoutWithExercises extends WorkoutRow {
  exercises: GroupedExercise[];
}

interface WorkoutHistoryProps {
  onBack: () => void;
  onEdit?: (data: EditWorkoutData) => void;
}

const WorkoutHistory = ({ onBack, onEdit }: WorkoutHistoryProps) => {
  
  const { user } = useAuth();
  const { t } = useTranslation();
  const { toast } = useToast();
  const [workouts, setWorkouts] = useState<WorkoutWithExercises[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}год ${m}хв`;
    return `${m} хв`;
  };

  const formatDurationFromDates = (start: Date, end: Date) => {
    return formatDuration(Math.floor((end.getTime() - start.getTime()) / 1000));
  };

  useEffect(() => {
    if (!user) return;
    loadWorkouts();
  }, [user]);

  const loadWorkouts = async () => {
    if (!user) return;
    setLoading(true);

    const { data: wData } = await supabase
      .from("workouts")
      .select("id, started_at, finished_at, notes, duration_seconds, name" as any)
      .eq("user_id", user.id)
      .order("started_at", { ascending: false });

    if (!wData?.length) { setWorkouts([]); setLoading(false); return; }

    // Fetch workout_sets for all workouts
    const { data: setsData } = await (supabase as any)
      .from("workout_sets")
      .select("id, workout_id, exercise_id, set_number, weight, reps, sort_order, notes, rest_time")
      .in("workout_id", wData.map((w: any) => w.id))
      .order("sort_order", { ascending: true })
      .order("set_number", { ascending: true });

    // Get unique exercise IDs and fetch exercise details
    const exerciseIds = [...new Set((setsData || []).map((s: any) => s.exercise_id))];
    let exerciseMap = new Map<string, ExerciseRow>();

    if (exerciseIds.length > 0) {
      const { data: exData } = await (supabase as any)
        .from("exercises")
        .select("id, name, muscle_group")
        .in("id", exerciseIds);
      exerciseMap = new Map((exData || []).map((e: any) => [e.id, e]));
    }

    // Group sets by workout and exercise
    const mapped: WorkoutWithExercises[] = (wData as any[]).map((w) => {
      const workoutSets = (setsData || []).filter((s: any) => s.workout_id === w.id) as WorkoutSetRow[];

      // Group by exercise_id
      const exerciseGroups = new Map<string, WorkoutSetRow[]>();
      workoutSets.forEach(s => {
        if (!exerciseGroups.has(s.exercise_id)) exerciseGroups.set(s.exercise_id, []);
        exerciseGroups.get(s.exercise_id)!.push(s);
      });

      const exercises: GroupedExercise[] = [...exerciseGroups.entries()].map(([exerciseId, sets]) => {
        const ex = exerciseMap.get(exerciseId);
        sets.sort((a, b) => a.set_number - b.set_number);
        return {
          exercise_id: exerciseId,
          exercise_name: ex?.name || '',
          muscle_group: ex?.muscle_group || '',
          sets: sets.map(s => ({ weight: Number(s.weight), reps: Number(s.reps), rest_time: s.rest_time })),
          notes: sets[0]?.notes || null,
          sort_order: sets[0]?.sort_order || 0,
        };
      }).sort((a, b) => a.sort_order - b.sort_order);

      return { ...w, exercises };
    });

    setWorkouts(mapped);
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("workouts").delete().eq("id", deleteId);
    if (!error) {
      setWorkouts((prev) => prev.filter((w) => w.id !== deleteId));
      toast({ title: t.workouts.workoutDeleted });
    }
    setDeleteId(null);
  };

  const handleEdit = (w: WorkoutWithExercises) => {
    if (!onEdit) return;
    onEdit({
      id: w.id,
      started_at: w.started_at,
      finished_at: w.finished_at,
      notes: w.notes,
      name: w.name,
      exercises: w.exercises,
    });
  };

  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [editNameValue, setEditNameValue] = useState("");

  const handleSaveName = async (workoutId: string) => {
    const { error } = await supabase.from("workouts").update({ name: editNameValue || null } as any).eq("id", workoutId);
    if (!error) {
      setWorkouts(prev => prev.map(w => w.id === workoutId ? { ...w, name: editNameValue || null } : w));
      toast({ title: t.workouts.workoutUpdated });
    }
    setEditingNameId(null);
  };

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
        const duration = w.duration_seconds
          ? formatDuration(w.duration_seconds)
          : w.finished_at
            ? formatDurationFromDates(new Date(w.started_at), new Date(w.finished_at))
            : null;

        return (
          <Card key={w.id} className="cursor-pointer" onClick={() => setExpandedId(expanded ? null : w.id)}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="font-display font-semibold">{format(new Date(w.started_at), "EEEE, d MMM yyyy", { locale: ukLocale })}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{w.exercises.length} {t.workouts.exercises}</span>
                    {duration && (
                      <>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {duration}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <ChevronRight className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform ${expanded ? "rotate-90" : ""}`} />
              </div>
              {expanded && (
                <div className="space-y-3 pt-2 border-t">
                  {w.exercises.map((ex, exIdx) => (
                    <div key={ex.exercise_id} className="space-y-1">
                      <p className="font-medium text-sm">
                        <span className="text-muted-foreground mr-1">{w.exercises.length - exIdx}.</span>
                        {t.exerciseNames[ex.exercise_name] || ex.exercise_name}{" "}
                        <span className="text-muted-foreground text-xs">({MUSCLE_GROUP_UK[ex.muscle_group] || ex.muscle_group})</span>
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {ex.sets.map((s, i) => (
                          <div key={i} className="flex flex-col items-center gap-0.5">
                            <span className="rounded-md bg-accent px-2 py-1 text-xs text-accent-foreground">
                              {s.weight}{t.common.kg} × {s.reps}
                            </span>
                            {s.rest_time != null && s.rest_time > 0 && (
                              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                <Clock className="h-2.5 w-2.5" />
                                {s.rest_time >= 60 ? `${Math.floor(s.rest_time / 60)}:${(s.rest_time % 60).toString().padStart(2, "0")}` : `${s.rest_time}с`}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                      {ex.notes && <p className="text-xs text-muted-foreground italic">"{ex.notes}"</p>}
                    </div>
                  ))}
                  <div className="flex gap-2 pt-2">
                    {onEdit && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 min-w-0"
                        onClick={(e) => { e.stopPropagation(); handleEdit(w); }}
                      >
                        <Pencil className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{t.workouts.editWorkout}</span>
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 min-w-0 text-destructive hover:text-destructive"
                      onClick={(e) => { e.stopPropagation(); setDeleteId(w.id); }}
                    >
                      <Trash2 className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{t.workouts.deleteWorkout}</span>
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.workouts.deleteWorkout}</AlertDialogTitle>
            <AlertDialogDescription>{t.workouts.deleteWorkoutConfirm}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.dashboard.cancelDelete}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t.dashboard.confirmDelete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default WorkoutHistory;
