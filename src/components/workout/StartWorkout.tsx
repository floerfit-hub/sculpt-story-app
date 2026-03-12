import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Plus, Trash2, Timer, Save, CheckCircle, Clock } from "lucide-react";
import ExerciseLibrary from "./ExerciseLibrary";
import RestTimer from "./RestTimer";
import { useToast } from "@/hooks/use-toast";

interface SetData { weight: number | ""; reps: number | "" }
interface WorkoutExercise { name: string; muscleGroup: string; sets: SetData[]; notes: string }

export interface EditWorkoutData {
  id: string;
  started_at: string;
  finished_at: string | null;
  notes: string | null;
  exercises: {
    id: string;
    exercise_name: string;
    muscle_group: string;
    sets: { weight: number; reps: number }[];
    notes: string | null;
    sort_order: number;
  }[];
}

interface StartWorkoutProps {
  onBack: () => void;
  editData?: EditWorkoutData;
}

const StartWorkout = ({ onBack, editData }: StartWorkoutProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const isEditing = !!editData;

  const [exercises, setExercises] = useState<WorkoutExercise[]>(() => {
    if (editData) {
      return editData.exercises
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((ex) => ({
          name: ex.exercise_name,
          muscleGroup: ex.muscle_group,
          sets: ex.sets.map((s) => ({ weight: s.weight as number | "", reps: s.reps as number | "" })),
          notes: ex.notes || "",
        }));
    }
    // Restore from sessionStorage
    const saved = sessionStorage.getItem("workout-in-progress");
    if (saved) {
      try { return JSON.parse(saved); } catch { /* ignore */ }
    }
    return [];
  });
  const [showLibrary, setShowLibrary] = useState(false);
  const [showTimer, setShowTimer] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [finalDuration, setFinalDuration] = useState<number>(0);

  // Workout timer
  const [startTime] = useState<number>(() => {
    if (isEditing) return Date.now();
    const saved = sessionStorage.getItem("workout-start-time");
    if (saved) return Number(saved);
    const now = Date.now();
    sessionStorage.setItem("workout-start-time", String(now));
    return now;
  });
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (saved) return;
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime, saved]);

  const formatTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  // Persist exercises to sessionStorage on every change (skip in edit mode)
  useEffect(() => {
    if (!isEditing) {
      sessionStorage.setItem("workout-in-progress", JSON.stringify(exercises));
    }
  }, [exercises, isEditing]);

  // Clear persisted data when workout is saved
  const clearPersistedData = useCallback(() => {
    sessionStorage.removeItem("workout-in-progress");
    sessionStorage.removeItem("workout-view");
    sessionStorage.removeItem("workout-start-time");
  }, []);

  const addExercise = (name: string, group: string) => {
    setExercises((prev) => [...prev, { name, muscleGroup: group, sets: [{ weight: "", reps: "" }], notes: "" }]);
    setShowLibrary(false);
  };

  const addSet = (idx: number) => {
    setExercises((prev) => { const c = [...prev]; c[idx] = { ...c[idx], sets: [...c[idx].sets, { weight: "", reps: "" }] }; return c; });
  };

  const removeExercise = (idx: number) => setExercises((prev) => prev.filter((_, i) => i !== idx));

  const updateSet = (exIdx: number, setIdx: number, field: "weight" | "reps", val: string) => {
    setExercises((prev) => { const c = [...prev]; const sets = [...c[exIdx].sets]; sets[setIdx] = { ...sets[setIdx], [field]: val === "" ? "" : Number(val) }; c[exIdx] = { ...c[exIdx], sets }; return c; });
  };

  const updateNotes = (idx: number, notes: string) => {
    setExercises((prev) => { const c = [...prev]; c[idx] = { ...c[idx], notes }; return c; });
  };

  const removeSet = (exIdx: number, setIdx: number) => {
    setExercises((prev) => { const c = [...prev]; c[exIdx] = { ...c[exIdx], sets: c[exIdx].sets.filter((_, i) => i !== setIdx) }; return c; });
  };

  const saveWorkout = async () => {
    if (!user || exercises.length === 0) return;
    setSaving(true);
    try {
      if (isEditing && editData) {
        // Update existing workout
        const { error: wErr } = await supabase.from("workouts").update({ notes: null }).eq("id", editData.id);
        if (wErr) throw wErr;

        // Delete old exercises and insert new ones
        const { error: delErr } = await supabase.from("workout_exercises").delete().eq("workout_id", editData.id);
        if (delErr) throw delErr;

        const rows = exercises.map((ex, i) => ({
          workout_id: editData.id, exercise_name: ex.name, muscle_group: ex.muscleGroup,
          sets: ex.sets.filter((s) => s.weight !== "" || s.reps !== "").map((s) => ({ weight: Number(s.weight) || 0, reps: Number(s.reps) || 0 })),
          notes: ex.notes || null, sort_order: i,
        }));
        const { error: eErr } = await supabase.from("workout_exercises").insert(rows);
        if (eErr) throw eErr;

        clearPersistedData();
        setFinalDuration(elapsed);
        setSaved(true);
        toast({ title: t.workouts.workoutUpdated, description: `${exercises.length} ${t.workouts.exercisesLogged}` });
      } else {
        const startedAt = new Date(startTime).toISOString();
        const { data: workout, error: wErr } = await supabase.from("workouts").insert({ user_id: user.id, started_at: startedAt, finished_at: new Date().toISOString() }).select("id").single();
        if (wErr || !workout) throw wErr;
        const rows = exercises.map((ex, i) => ({
          workout_id: workout.id, exercise_name: ex.name, muscle_group: ex.muscleGroup,
          sets: ex.sets.filter((s) => s.weight !== "" || s.reps !== "").map((s) => ({ weight: Number(s.weight) || 0, reps: Number(s.reps) || 0 })),
          notes: ex.notes || null, sort_order: i,
        }));
        const { error: eErr } = await supabase.from("workout_exercises").insert(rows);
        if (eErr) throw eErr;
        clearPersistedData();
        setFinalDuration(elapsed);
        setSaved(true);
        toast({ title: t.workouts.workoutSaved, description: `${exercises.length} ${t.workouts.exercisesLogged}` });
      }
    } catch (e: any) {
      toast({ title: t.workouts.errorSaving, description: e?.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  if (saved) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-fade-in space-y-4">
        <CheckCircle className="h-16 w-16 text-primary" />
        <h2 className="text-2xl font-display font-bold">{t.workouts.workoutComplete}</h2>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="h-5 w-5" />
          <span className="text-lg font-display font-semibold">{formatTime(finalDuration)}</span>
        </div>
        <p className="text-muted-foreground text-center">{t.workouts.greatSession}</p>
        <Button onClick={onBack} className="mt-4">{t.workouts.backToWorkouts}</Button>
      </div>
    );
  }

  if (showLibrary) return <ExerciseLibrary onBack={() => setShowLibrary(false)} onSelect={addExercise} selectable />;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-5 w-5" /></Button>
          <h2 className="text-xl font-display font-bold">{isEditing ? t.workouts.editWorkout : t.workouts.newWorkout}</h2>
        </div>
        <div className="flex items-center gap-2">
          {!isEditing && (
            <div className="flex items-center gap-1.5 rounded-xl bg-accent px-3 py-1.5">
              <Clock className="h-4 w-4 text-primary" />
              <span className="text-sm font-display font-semibold tabular-nums text-foreground">{formatTime(elapsed)}</span>
            </div>
          )}
          <Button variant="ghost" size="icon" onClick={() => setShowTimer(true)}><Timer className="h-5 w-5" /></Button>
        </div>
      </div>

      {exercises.length === 0 && <div className="py-12 text-center text-muted-foreground"><p className="mb-4">{t.workouts.noExercises}</p></div>}

      {exercises.map((ex, exIdx) => (
        <Card key={exIdx}>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div><p className="font-display font-semibold">{t.exerciseNames[ex.name] || ex.name}</p><p className="text-xs text-muted-foreground">{(() => { const keyMap: Record<string, string> = { "Legs & Glutes": "legsGlutes", "Back": "back", "Chest": "chest", "Shoulders": "shoulders", "Arms": "arms", "Core": "core" }; const k = keyMap[ex.muscleGroup] as keyof typeof t.muscleGroups; return k ? t.muscleGroups[k] : ex.muscleGroup; })()}</p></div>
              <Button variant="ghost" size="icon" onClick={() => removeExercise(exIdx)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
            <div className="grid grid-cols-[2rem_1fr_1fr_2rem] gap-2 text-xs text-muted-foreground font-medium">
              <span>{t.workouts.set}</span><span>{t.workouts.weightKg}</span><span>{t.workouts.reps}</span><span></span>
            </div>
            {ex.sets.map((set, setIdx) => (
              <div key={setIdx} className="grid grid-cols-[2rem_1fr_1fr_2rem] gap-2 items-center">
                <span className="text-sm font-medium text-muted-foreground">{setIdx + 1}</span>
                <Input type="number" placeholder="0" value={set.weight} onChange={(e) => updateSet(exIdx, setIdx, "weight", e.target.value)} className="h-10" />
                <Input type="number" placeholder="0" value={set.reps} onChange={(e) => updateSet(exIdx, setIdx, "reps", e.target.value)} className="h-10" />
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeSet(exIdx, setIdx)}><Trash2 className="h-3 w-3" /></Button>
              </div>
            ))}
            <Button variant="outline" size="sm" className="w-full" onClick={() => addSet(exIdx)}><Plus className="h-3 w-3 mr-1" /> {t.workouts.addSet}</Button>
            <Textarea placeholder={t.workouts.notesTip} value={ex.notes} onChange={(e) => updateNotes(exIdx, e.target.value)} className="min-h-[60px] text-sm" />
          </CardContent>
        </Card>
      ))}

      <div className="flex gap-3">
        <Button variant="outline" className="flex-1 h-12" onClick={() => setShowLibrary(true)}><Plus className="h-4 w-4 mr-2" /> {t.workouts.addExercise}</Button>
      </div>

      {exercises.length > 0 && (
        <Button className="w-full h-12 text-base" onClick={saveWorkout} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />{saving ? t.workouts.updatingDots : isEditing ? t.workouts.updateWorkout : t.workouts.finishSave}
        </Button>
      )}

      {showTimer && <RestTimer onClose={() => setShowTimer(false)} />}
    </div>
  );
};

export default StartWorkout;
