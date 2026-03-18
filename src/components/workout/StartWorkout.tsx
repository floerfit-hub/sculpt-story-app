import { useState, useEffect, useCallback, useRef, useMemo } from "react";

import { useAuth } from "@/hooks/useAuth";
import { useFitnessStats, getPRXP } from "@/hooks/useFitnessStats";
import { useTranslation } from "@/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ArrowLeft, Plus, Trash2, Timer, Save, CheckCircle, Clock, Info, Copy } from "lucide-react";
import ExerciseLibrary from "./ExerciseLibrary";
import RestTimer from "./RestTimer";
import LevelUpDialog from "@/components/LevelUpDialog";
import { useToast } from "@/hooks/use-toast";
import { useNotifications } from "@/hooks/useNotifications";
import confetti from "canvas-confetti";
import { useHaptics } from "@/hooks/useHaptics";

interface SetData { weight: number | ""; reps: number | ""; rest_time: number | null }
interface WorkoutExercise { name: string; muscleGroup: string; sets: SetData[]; notes: string }

export interface EditWorkoutData {
  id: string;
  started_at: string;
  finished_at: string | null;
  notes: string | null;
  exercises: {
    exercise_id: string;
    exercise_name: string;
    muscle_group: string;
    sets: { weight: number; reps: number; rest_time?: number | null }[];
    notes: string | null;
    sort_order: number;
  }[];
}

interface StartWorkoutProps {
  onBack: () => void;
  editData?: EditWorkoutData;
}

async function resolveExerciseIds(
  exercises: { name: string; muscleGroup: string }[]
): Promise<Map<string, string>> {
  const uniqueKeys = [...new Map(exercises.map(e => [`${e.name}::${e.muscleGroup}`, e])).values()];
  const names = uniqueKeys.map(e => e.name);

  const { data: existing } = await (supabase as any)
    .from("exercises")
    .select("id, name, muscle_group")
    .in("name", names);

  const map = new Map<string, string>();
  (existing || []).forEach((e: any) => map.set(`${e.name}::${e.muscle_group}`, e.id));

  for (const ex of uniqueKeys) {
    const key = `${ex.name}::${ex.muscleGroup}`;
    if (!map.has(key)) {
      const { data } = await (supabase as any)
        .from("exercises")
        .insert({ name: ex.name, muscle_group: ex.muscleGroup })
        .select("id")
        .single();
      if (data) map.set(key, data.id);
    }
  }

  return map;
}

function getRestMultiplier(restSeconds: number | null): number {
  if (restSeconds === null) return 1.0;
  if (restSeconds > 480) return 1.0; // > 8 min = likely recorded late
  if (restSeconds < 90) return 1.2;
  if (restSeconds <= 150) return 1.0;
  if (restSeconds <= 240) return 0.9;
  return 0.8;
}

const StartWorkout = ({ onBack, editData }: StartWorkoutProps) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const { t, lang } = useTranslation();
  const { addXP, updateLastWorkout, checkAndAwardFrequencyXP, stats: fitnessStats } = useFitnessStats();
  const isEditing = !!editData;
  const [xpGained, setXpGained] = useState(0);
  const [levelUpLevel, setLevelUpLevel] = useState<number | null>(null);
  const { sendNotification } = useNotifications();
  const { trigger: haptic } = useHaptics();

  const [exercises, setExercises] = useState<WorkoutExercise[]>(() => {
    if (editData) {
      return editData.exercises
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((ex) => ({
          name: ex.exercise_name,
          muscleGroup: ex.muscle_group,
          sets: ex.sets.map((s) => ({ weight: s.weight as number | "", reps: s.reps as number | "", rest_time: s.rest_time ?? null })),
          notes: ex.notes || "",
        }));
    }
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
  const [showRestTooltip, setShowRestTooltip] = useState(false);
  const prMapRef = useRef<Map<string, number>>(new Map());
  const prCountRef = useRef(0); // count PRs detected during this session

  // Load existing PRs for confetti detection
  useEffect(() => {
    if (!user) return;
    const loadPRs = async () => {
      const { data: userWorkouts } = await supabase.from("workouts").select("id").eq("user_id", user.id);
      if (!userWorkouts?.length) return;
      const wIds = userWorkouts.map(w => w.id);
      const { data: sets } = await supabase.from("workout_sets").select("exercise_id, weight").in("workout_id", wIds);
      if (!sets) return;
      const map = new Map<string, number>();
      for (const s of sets) {
        const current = map.get(s.exercise_id) || 0;
        if (s.weight > current) map.set(s.exercise_id, s.weight);
      }
      prMapRef.current = map;
    };
    loadPRs();
  }, [user]);

  // Track time of last set completion for auto rest tracking
  const lastSetTimeRef = useRef<number | null>(null);
  const [autoRestSeconds, setAutoRestSeconds] = useState<number | null>(null);
  const autoRestIntervalRef = useRef<ReturnType<typeof setInterval>>();

  const [startTime, setStartTime] = useState<number | null>(() => {
    if (isEditing) return Date.now();
    const saved = sessionStorage.getItem("workout-start-time");
    return saved ? Number(saved) : null;
  });
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (isEditing) return;
    if (exercises.length > 0 && startTime === null) {
      const now = Date.now();
      sessionStorage.setItem("workout-start-time", String(now));
      setStartTime(now);
    } else if (exercises.length === 0 && startTime !== null) {
      sessionStorage.removeItem("workout-start-time");
      setStartTime(null);
      setElapsed(0);
    }
  }, [exercises.length, startTime, isEditing]);

  useEffect(() => {
    if (saved || startTime === null) return;
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime, saved]);

  // Auto rest timer - counts up after each set is recorded
  useEffect(() => {
    if (lastSetTimeRef.current === null) return;
    clearInterval(autoRestIntervalRef.current);
    autoRestIntervalRef.current = setInterval(() => {
      if (lastSetTimeRef.current) {
        setAutoRestSeconds(Math.floor((Date.now() - lastSetTimeRef.current) / 1000));
      }
    }, 1000);
    return () => clearInterval(autoRestIntervalRef.current);
  }, [lastSetTimeRef.current]);

  const formatTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  useEffect(() => {
    if (isEditing) {
      sessionStorage.setItem("workout-edit-in-progress", JSON.stringify(exercises));
    } else {
      sessionStorage.setItem("workout-in-progress", JSON.stringify(exercises));
    }
  }, [exercises, isEditing]);

  const clearPersistedData = useCallback(() => {
    sessionStorage.removeItem("workout-in-progress");
    sessionStorage.removeItem("workout-edit-in-progress");
    sessionStorage.removeItem("workout-view");
    sessionStorage.removeItem("workout-start-time");
    sessionStorage.removeItem("workout-autosave-id");
    autoSaveIdRef.current = null;
  }, []);

  // Keep refs in sync for auto-save on app exit
  const exercisesRef = useRef(exercises);
  exercisesRef.current = exercises;
  const savedRef = useRef(saved);
  savedRef.current = saved;
  const savingRef = useRef(saving);
  savingRef.current = saving;
  const startTimeRef = useRef(startTime);
  startTimeRef.current = startTime;

  // Track auto-saved workout ID to avoid duplicates
  const autoSaveIdRef = useRef<string | null>(
    sessionStorage.getItem("workout-autosave-id")
  );

  // Auto-save workout when user leaves the app (tab hidden / close)
  useEffect(() => {
    const autoSave = async () => {
      const currentExercises = exercisesRef.current;
      if (savedRef.current || savingRef.current || !user || currentExercises.length === 0) return;

      // Check if there are any filled sets
      const hasSets = currentExercises.some(ex => ex.sets.some(s => s.weight !== "" || s.reps !== ""));
      if (!hasSets) return;

      try {
        const exerciseIdMap = await resolveExerciseIds(
          currentExercises.map(ex => ({ name: ex.name, muscleGroup: ex.muscleGroup }))
        );

        if (isEditing && editData) {
          // Edit mode: update existing workout in-place
          await (supabase as any).from("workout_sets").delete().eq("workout_id", editData.id);

          const setsRows: any[] = [];
          currentExercises.forEach((ex, exIdx) => {
            const exerciseId = exerciseIdMap.get(`${ex.name}::${ex.muscleGroup}`);
            if (!exerciseId) return;
            ex.sets
              .filter((s) => s.weight !== "" || s.reps !== "")
              .forEach((s, setIdx) => {
                setsRows.push({
                  workout_id: editData.id,
                  exercise_id: exerciseId,
                  set_number: setIdx + 1,
                  weight: Number(s.weight) || 0,
                  reps: Number(s.reps) || 0,
                  sort_order: exIdx,
                  notes: setIdx === 0 ? (ex.notes || null) : null,
                  rest_time: s.rest_time,
                });
              });
          });

          if (setsRows.length > 0) {
            await (supabase as any).from("workout_sets").insert(setsRows);
          }
        } else {
          // New workout mode
          const startedAt = new Date(startTimeRef.current || Date.now()).toISOString();
          const elapsedNow = startTimeRef.current ? Math.floor((Date.now() - startTimeRef.current) / 1000) : 0;

          let workoutId = autoSaveIdRef.current;

          if (workoutId) {
            await (supabase as any).from("workout_sets").delete().eq("workout_id", workoutId);
          } else {
            const { data: workout, error: wErr } = await supabase.from("workouts")
              .insert({ user_id: user.id, started_at: startedAt })
              .select("id").single();
            if (wErr || !workout) return;
            workoutId = workout.id;
            autoSaveIdRef.current = workoutId;
            sessionStorage.setItem("workout-autosave-id", workoutId);
          }

          const setsRows: any[] = [];
          currentExercises.forEach((ex, exIdx) => {
            const exerciseId = exerciseIdMap.get(`${ex.name}::${ex.muscleGroup}`);
            if (!exerciseId) return;
            ex.sets
              .filter((s) => s.weight !== "" || s.reps !== "")
              .forEach((s, setIdx) => {
                setsRows.push({
                  workout_id: workoutId,
                  exercise_id: exerciseId,
                  set_number: setIdx + 1,
                  weight: Number(s.weight) || 0,
                  reps: Number(s.reps) || 0,
                  sort_order: exIdx,
                  notes: setIdx === 0 ? (ex.notes || null) : null,
                  rest_time: s.rest_time,
                });
              });
          });

          if (setsRows.length > 0) {
            await (supabase as any).from("workout_sets").insert(setsRows);
          }

          await supabase.from("workouts").update({
            finished_at: new Date().toISOString(),
            duration_seconds: elapsedNow,
          } as any).eq("id", workoutId);
        }
      } catch {
        // Silent fail – data is still in sessionStorage for recovery
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        autoSave();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [user, isEditing, editData]);

  const addExercise = (name: string, group: string) => {
    setExercises((prev) => [{ name, muscleGroup: group, sets: [{ weight: "", reps: "", rest_time: null }], notes: "" }, ...prev]);
    setShowLibrary(false);
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  };

  const addSet = (idx: number) => {
    const restTime = lastSetTimeRef.current
      ? Math.floor((Date.now() - lastSetTimeRef.current) / 1000)
      : null;
    
    setExercises((prev) => {
      const c = [...prev];
      c[idx] = { ...c[idx], sets: [...c[idx].sets, { weight: "", reps: "", rest_time: restTime }] };
      return c;
    });
    lastSetTimeRef.current = Date.now();
    setAutoRestSeconds(0);
  };

  const copySet = (idx: number) => {
    const lastSet = exercises[idx].sets[exercises[idx].sets.length - 1];
    const restTime = lastSetTimeRef.current
      ? Math.floor((Date.now() - lastSetTimeRef.current) / 1000)
      : null;
    setExercises((prev) => {
      const c = [...prev];
      c[idx] = { ...c[idx], sets: [...c[idx].sets, { weight: lastSet.weight, reps: lastSet.reps, rest_time: restTime }] };
      return c;
    });
    lastSetTimeRef.current = Date.now();
    setAutoRestSeconds(0);
  };

  const removeExercise = (idx: number) => setExercises((prev) => prev.filter((_, i) => i !== idx));

  const updateSet = (exIdx: number, setIdx: number, field: "weight" | "reps", val: string) => {
    setExercises((prev) => {
      const c = [...prev];
      const sets = [...c[exIdx].sets];
      sets[setIdx] = { ...sets[setIdx], [field]: val === "" ? "" : Number(val) };
      c[exIdx] = { ...c[exIdx], sets };
      return c;
    });

    // Check for new PR on weight entry
    if (field === "weight" && val !== "") {
      const weight = Number(val);
      const exName = exercises[exIdx]?.name;
      const exGroup = exercises[exIdx]?.muscleGroup;
      if (weight > 0 && exName) {
        // We need exercise_id - resolve async
        resolveExerciseIds([{ name: exName, muscleGroup: exGroup }]).then((idMap) => {
          const exId = idMap.get(`${exName}::${exGroup}`);
          if (exId) {
            const currentPR = prMapRef.current.get(exId) || 0;
            if (weight > currentPR && currentPR > 0) {
              prMapRef.current.set(exId, weight);
              prCountRef.current += 1;
              confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
              toast({ title: t.pr.newRecord, description: `${t.exerciseNames[exName] || exName}: ${weight} ${t.common.kg}` });
            }
          }
        });
      }
    }

    // Mark time when a set value is entered (for auto rest tracking)
    if (field === "reps" && val !== "") {
      lastSetTimeRef.current = Date.now();
      setAutoRestSeconds(0);
      // Show tooltip on first set
      if (!showRestTooltip) setShowRestTooltip(true);
    }
  };

  const updateNotes = (idx: number, notes: string) => {
    setExercises((prev) => { const c = [...prev]; c[idx] = { ...c[idx], notes }; return c; });
  };

  const removeSet = (exIdx: number, setIdx: number) => {
    setExercises((prev) => { const c = [...prev]; c[exIdx] = { ...c[exIdx], sets: c[exIdx].sets.filter((_, i) => i !== setIdx) }; return c; });
  };

  const quickAdjust = (exIdx: number, setIdx: number, field: "weight" | "reps", delta: number) => {
    setExercises((prev) => {
      const c = [...prev];
      const sets = [...c[exIdx].sets];
      const current = Number(sets[setIdx][field]) || 0;
      const newVal = Math.max(0, current + delta);
      sets[setIdx] = { ...sets[setIdx], [field]: newVal };
      c[exIdx] = { ...c[exIdx], sets };
      return c;
    });
  };

  const saveWorkout = async () => {
    if (!user || exercises.length === 0) return;
    setSaving(true);
    try {
      const exerciseIdMap = await resolveExerciseIds(
        exercises.map(ex => ({ name: ex.name, muscleGroup: ex.muscleGroup }))
      );

      if (isEditing && editData) {
        await (supabase as any).from("workout_sets").delete().eq("workout_id", editData.id);

        const setsRows: any[] = [];
        exercises.forEach((ex, exIdx) => {
          const exerciseId = exerciseIdMap.get(`${ex.name}::${ex.muscleGroup}`);
          if (!exerciseId) return;
          ex.sets
            .filter((s) => s.weight !== "" || s.reps !== "")
            .forEach((s, setIdx) => {
              setsRows.push({
                workout_id: editData.id,
                exercise_id: exerciseId,
                set_number: setIdx + 1,
                weight: Number(s.weight) || 0,
                reps: Number(s.reps) || 0,
                sort_order: exIdx,
                notes: setIdx === 0 ? (ex.notes || null) : null,
                rest_time: s.rest_time,
              });
            });
        });

        if (setsRows.length > 0) {
          const { error: sErr } = await (supabase as any).from("workout_sets").insert(setsRows);
          if (sErr) throw sErr;
        }

        const { error: wErr } = await supabase.from("workouts").update({
          notes: null,
          finished_at: editData.finished_at || new Date().toISOString(),
        }).eq("id", editData.id);
        if (wErr) throw wErr;

        clearPersistedData();
        // Show original workout duration, not editing session time
        const originalDuration = editData.finished_at && editData.started_at
          ? Math.floor((new Date(editData.finished_at).getTime() - new Date(editData.started_at).getTime()) / 1000)
          : 0;
        setFinalDuration(originalDuration);
        setSaved(true);
        toast({ title: t.workouts.workoutUpdated, description: `${exercises.length} ${t.workouts.exercisesLogged}` });
      } else {
        const startedAt = new Date(startTime || Date.now()).toISOString();
        let workoutId = autoSaveIdRef.current;

        if (workoutId) {
          // Reuse existing autosaved workout – delete old sets
          await (supabase as any).from("workout_sets").delete().eq("workout_id", workoutId);
          await supabase.from("workouts").update({ started_at: startedAt } as any).eq("id", workoutId);
        } else {
          const { data: workout, error: wErr } = await supabase.from("workouts")
            .insert({ user_id: user.id, started_at: startedAt })
            .select("id").single();
          if (wErr || !workout) throw wErr;
          workoutId = workout.id;
        }

        const setsRows: any[] = [];
        exercises.forEach((ex, exIdx) => {
          const exerciseId = exerciseIdMap.get(`${ex.name}::${ex.muscleGroup}`);
          if (!exerciseId) return;
          ex.sets
            .filter((s) => s.weight !== "" || s.reps !== "")
            .forEach((s, setIdx) => {
              setsRows.push({
                workout_id: workoutId,
                exercise_id: exerciseId,
                set_number: setIdx + 1,
                weight: Number(s.weight) || 0,
                reps: Number(s.reps) || 0,
                sort_order: exIdx,
                notes: setIdx === 0 ? (ex.notes || null) : null,
                rest_time: s.rest_time,
              });
            });
        });

        if (setsRows.length > 0) {
          const { error: sErr } = await (supabase as any).from("workout_sets").insert(setsRows);
          if (sErr) throw sErr;
        }

        const { error: uErr } = await supabase.from("workouts").update({
          finished_at: new Date().toISOString(),
          duration_seconds: elapsed,
        } as any).eq("id", workoutId);
        if (uErr) throw uErr;

        clearPersistedData();
        setFinalDuration(elapsed);
        
        // Award XP for workout completion
        let earnedXP = 10; // base workout XP
        
        // Award PR XP
        const sessionPRs = prCountRef.current;
        if (sessionPRs > 0) {
          const prXP = getPRXP(profile?.experience_level || null);
          earnedXP += sessionPRs * prXP;
          console.log(`[XP] PRs detected: ${sessionPRs} × ${prXP} = +${sessionPRs * prXP} XP`);
        }
        
        // Check frequency bonus
        const freqXP = await checkAndAwardFrequencyXP();
        if (freqXP > 0) earnedXP += freqXP;
        
        console.log(`[XP] Workout complete: base=10, PR=${sessionPRs > 0 ? sessionPRs * getPRXP(profile?.experience_level || null) : 0}, freq=${freqXP}, total=${earnedXP}`);
        
        const xpResult = await addXP(earnedXP, 'workout_complete');
        setXpGained(earnedXP);
        await updateLastWorkout();
        
        // Check for level up
        if (xpResult?.leveledUp && xpResult.newLevel) {
          setLevelUpLevel(xpResult.newLevel);
          sendNotification(
            lang === "uk" ? "Новий рівень! 🎉" : "Level Up! 🎉",
            `${lang === "uk" ? "Ви досягли рівня" : "You reached level"} ${xpResult.newLevel}`
          );
        }

        // Notify about PR
        if (sessionPRs > 0) {
          sendNotification(
            lang === "uk" ? "Новий рекорд! 🏆" : "New Record! 🏆",
            `+${sessionPRs * getPRXP(profile?.experience_level || null)} XP ${lang === "uk" ? "зараховано" : "earned"}`
          );
        }
        
        // Confetti for XP
        if (earnedXP > 0) {
          confetti({ particleCount: 100 + earnedXP * 3, spread: 80, origin: { y: 0.5 } });
        }
        
        setSaved(true);
        toast({ title: t.workouts.workoutSaved, description: `${exercises.length} ${t.workouts.exercisesLogged}` });
      }
    } catch (e: any) {
      toast({ title: t.workouts.errorSaving, description: e?.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  if (saved) {
    return (
      <>
        <div className="flex flex-col items-center justify-center py-20 animate-fade-in space-y-4">
          <CheckCircle className="h-16 w-16 text-primary" />
          <h2 className="text-2xl font-display font-bold">{t.workouts.workoutComplete}</h2>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-5 w-5" />
            <span className="text-lg font-display font-semibold">{formatTime(finalDuration)}</span>
          </div>
          {xpGained > 0 && !isEditing && (
            <div className="flex items-center gap-2 animate-fade-in" style={{ animationDelay: "300ms", animationFillMode: "backwards" }}>
              <div className="rounded-full bg-primary/15 px-4 py-2 flex items-center gap-2">
                <span className="text-primary font-display font-bold text-lg">+{xpGained} XP</span>
              </div>
            </div>
          )}
          <p className="text-muted-foreground text-center">{t.workouts.greatSession}</p>
          <Button onClick={onBack} className="mt-4">{t.workouts.backToWorkouts}</Button>
        </div>
        {levelUpLevel && (
          <LevelUpDialog open={!!levelUpLevel} onClose={() => setLevelUpLevel(null)} newLevel={levelUpLevel} />
        )}
      </>
    );
  }

  if (showLibrary) return <ExerciseLibrary onBack={() => setShowLibrary(false)} onSelect={addExercise} selectable />;

  return (
    <TooltipProvider>
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

        {/* Finish button at top */}
        {exercises.length > 0 && (
          <Button className="w-full h-12 text-base" onClick={saveWorkout} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />{saving ? t.workouts.updatingDots : isEditing ? t.workouts.updateWorkout : t.workouts.finishSave}
          </Button>
        )}

        {/* Add exercise button */}
        <Button variant="outline" className="w-full h-12" onClick={() => setShowLibrary(true)}><Plus className="h-4 w-4 mr-2" /> {t.workouts.addExercise}</Button>

        {exercises.length === 0 && <div className="py-12 text-center text-muted-foreground"><p className="mb-4">{t.workouts.noExercises}</p></div>}

        {exercises.map((ex, exIdx) => (
          <Card key={exIdx}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div><p className="font-display font-semibold">{t.exerciseNames[ex.name] || ex.name}</p><p className="text-xs text-muted-foreground">{(() => { const keyMap: Record<string, string> = { "Legs & Glutes": "legsGlutes", "Back": "back", "Chest": "chest", "Shoulders": "shoulders", "Arms": "arms", "Core": "core" }; const k = keyMap[ex.muscleGroup] as keyof typeof t.muscleGroups; return k ? t.muscleGroups[k] : ex.muscleGroup; })()}</p></div>
                <Button variant="ghost" size="icon" onClick={() => removeExercise(exIdx)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
              <div className="grid grid-cols-[2rem_1fr_1fr_2rem] gap-2 text-xs font-bold text-foreground uppercase tracking-wide">
                <span>{t.workouts.set}</span><span className="text-center">{profile?.weight_unit === "lb" ? t.workouts.weightLb : t.workouts.weightKg}</span><span className="text-center">{t.workouts.reps}</span><span></span>
              </div>
              {ex.sets.map((set, setIdx) => (
                <div key={setIdx}>
                  <div className="grid grid-cols-[2rem_1fr_1fr_2rem] gap-2 items-center">
                    <span className="text-sm font-medium text-muted-foreground">{setIdx + 1}</span>
                    <Input type="number" placeholder="0" value={set.weight} onChange={(e) => updateSet(exIdx, setIdx, "weight", e.target.value)} className="h-10" />
                    <Input type="number" placeholder="0" value={set.reps} onChange={(e) => updateSet(exIdx, setIdx, "reps", e.target.value)} className="h-10" />
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeSet(exIdx, setIdx)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                  <div className="grid grid-cols-[2rem_1fr_1fr_2rem] gap-2 items-center mt-1">
                    <span></span>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" className="h-7 flex-1 text-xs px-1" onClick={() => quickAdjust(exIdx, setIdx, "weight", -0.5)}>−</Button>
                      <span className="flex items-center text-xs text-muted-foreground">0.5</span>
                      <Button variant="outline" size="sm" className="h-7 flex-1 text-xs px-1" onClick={() => quickAdjust(exIdx, setIdx, "weight", 0.5)}>+</Button>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" className="h-7 flex-1 text-xs px-1" onClick={() => quickAdjust(exIdx, setIdx, "reps", -1)}>−</Button>
                      <span className="flex items-center text-xs text-muted-foreground">1</span>
                      <Button variant="outline" size="sm" className="h-7 flex-1 text-xs px-1" onClick={() => quickAdjust(exIdx, setIdx, "reps", 1)}>+</Button>
                    </div>
                    <span></span>
                  </div>
                </div>
              ))}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => addSet(exIdx)}><Plus className="h-3 w-3 mr-1" /> {t.workouts.addSet}</Button>
                {ex.sets.length > 0 && (
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => copySet(exIdx)}><Copy className="h-3 w-3 mr-1" /> {t.workouts.copySet}</Button>
                )}
              </div>
              <Textarea placeholder={t.workouts.notesTip} value={ex.notes} onChange={(e) => updateNotes(exIdx, e.target.value)} className="min-h-[60px] text-sm" />

              {/* Auto rest timer inside last exercise card */}
              {exIdx === 0 && autoRestSeconds !== null && autoRestSeconds > 0 && (
                <div className="flex items-center justify-center gap-2 rounded-xl bg-accent/50 border border-border/50 px-3 py-2">
                  <Timer className="h-4 w-4 text-primary animate-pulse" />
                  <span className="text-sm font-display font-semibold tabular-nums">
                    {t.workouts.restTimer}: {formatTime(autoRestSeconds)}
                  </span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-[220px]">
                      <p className="text-xs">{t.recovery.restTooltip}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {showTimer && <RestTimer onClose={() => setShowTimer(false)} />}
      </div>
    </TooltipProvider>
  );
};

export default StartWorkout;
