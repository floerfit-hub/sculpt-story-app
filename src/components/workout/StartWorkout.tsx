import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { EXERCISE_IMAGES } from "@/data/exerciseImages";
import { useAuth } from "@/hooks/useAuth";
import { useFitnessStats, getPRXP } from "@/hooks/useFitnessStats";
import { useTranslation } from "@/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { ArrowLeft, Plus, Trash2, Timer, Save, CheckCircle, Clock, Info, Copy, Camera, X, Star } from "lucide-react";
import ExerciseLibrary from "./ExerciseLibrary";
import PreviousWorkoutInfo from "./PreviousWorkoutInfo";
import RestTimer from "./RestTimer";
import LevelUpDialog from "@/components/LevelUpDialog";
import { useToast } from "@/hooks/use-toast";
import { useNotifications } from "@/hooks/useNotifications";
import confetti from "canvas-confetti";
import { useHaptics } from "@/hooks/useHaptics";

interface SetData { weight: number | ""; reps: number | ""; rest_time: number | null }
interface WorkoutExercise { name: string; muscleGroup: string; sets: SetData[]; notes: string; image?: string }

export interface EditWorkoutData {
  id: string;
  started_at: string;
  finished_at: string | null;
  notes: string | null;
  name: string | null;
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
  initialExercises?: { name: string; muscleGroup: string; sets: { weight: number | ""; reps: number | ""; rest_time: null }[] }[];
  initialName?: string;
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
      const { data } = await supabase.rpc("resolve_exercise_id", { _name: ex.name, _muscle_group: ex.muscleGroup });
      if (data) map.set(key, data as string);
    }
  }
  return map;
}

function getRestMultiplier(restSeconds: number | null): number {
  if (restSeconds === null) return 1.0;
  if (restSeconds > 480) return 1.0;
  if (restSeconds < 90) return 1.2;
  if (restSeconds <= 150) return 1.0;
  if (restSeconds <= 240) return 0.9;
  return 0.8;
}

const StartWorkout = ({ onBack, editData, initialExercises, initialName }: StartWorkoutProps) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const { t, lang } = useTranslation();
  const { addXP, updateLastWorkout, checkAndAwardFrequencyXP, stats: fitnessStats } = useFitnessStats();
  const isEditing = !!editData;
  const [xpGained, setXpGained] = useState(0);
  const [levelUpLevel, setLevelUpLevel] = useState<number | null>(null);
  const { sendNotification } = useNotifications();
  const { trigger: haptic } = useHaptics();

  // Rating dialog state
  const [showRating, setShowRating] = useState(false);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [ratingSubmitted, setRatingSubmitted] = useState(false);

  const [workoutName, setWorkoutName] = useState<string>(() => {
    if (editData) return editData.name || "";
    if (initialName) return initialName;
    const saved = sessionStorage.getItem("workout-name");
    return saved || "";
  });

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
    if (initialExercises) {
      return initialExercises.map((ex) => ({
        name: ex.name,
        muscleGroup: ex.muscleGroup,
        sets: ex.sets.map(s => ({ ...s, rest_time: s.rest_time ?? null })),
        notes: "",
      }));
    }
    const saved = sessionStorage.getItem("workout-in-progress");
    if (saved) {
      try { return JSON.parse(saved); } catch { /* ignore */ }
    }
    return [];
  });
  const [showLibrary, setShowLibrary] = useState(false);

  const [timerExIdx, setTimerExIdx] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [finalDuration, setFinalDuration] = useState<number>(0);
  const [showRestTooltip, setShowRestTooltip] = useState(false);
  const prMapRef = useRef<Map<string, { weight: number; reps: number }>>(new Map());
  const prCountRef = useRef(0);
  const exerciseImageRef = useRef<HTMLInputElement>(null);
  const [exerciseImageIdx, setExerciseImageIdx] = useState<number | null>(null);
  // Store saved workout id for rating
  const savedWorkoutIdRef = useRef<string | null>(null);

  const getOverrideImages = (): Record<string, string> => {
    try { return JSON.parse(localStorage.getItem("exercise-photo-overrides") || "{}"); } catch { return {}; }
  };

  const [dbAnimationMap, setDbAnimationMap] = useState<Record<string, string>>({});
  useEffect(() => {
    const loadAnimations = async () => {
      const { data } = await supabase
        .from("exercises")
        .select("name, animation_url, gif_url" as any);
      if (data) {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const map: Record<string, string> = {};
        (data as any[]).forEach((e: any) => {
          if (e.gif_url) {
            map[e.name] = `${supabaseUrl}/storage/v1/object/public/exercise-gifs/${e.gif_url}`;
          } else if (e.animation_url) {
            map[e.name] = e.animation_url;
          }
        });
        setDbAnimationMap(map);
      }
    };
    loadAnimations();
  }, []);

  const getExerciseImage = (ex: WorkoutExercise): string | undefined => {
    if (ex.image) return ex.image;
    const overrides = getOverrideImages();
    if (overrides[ex.name]) return overrides[ex.name];
    if (dbAnimationMap[ex.name]) return dbAnimationMap[ex.name];
    return EXERCISE_IMAGES[ex.name];
  };

  const uploadWorkoutExerciseImage = async (file: File, exIdx: number) => {
    if (!user) return;
    try {
      const img = new Image();
      const reader = new FileReader();
      reader.onload = () => { img.src = reader.result as string; };
      reader.readAsDataURL(file);
      await new Promise<void>((resolve) => { img.onload = () => resolve(); });
      const size = Math.min(img.width, img.height);
      const sx = (img.width - size) / 2;
      const sy = (img.height - size) / 2;
      const canvas = document.createElement("canvas");
      canvas.width = 256; canvas.height = 256;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, sx, sy, size, size, 0, 0, 256, 256);
      const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.8));
      const exName = encodeURIComponent(exercises[exIdx].name);
      const filePath = `${user.id}/workout-${exName}-${Date.now()}.jpg`;
      await supabase.storage.from("exercise-images").upload(filePath, blob, { upsert: true, contentType: "image/jpeg" });
      const { data: urlData } = supabase.storage.from("exercise-images").getPublicUrl(filePath);
      const url = urlData.publicUrl + "?t=" + Date.now();
      setExercises(prev => {
        const c = [...prev];
        c[exIdx] = { ...c[exIdx], image: url };
        return c;
      });
    } catch { /* silent */ }
  };

  // Load existing PRs for confetti detection (both weight AND reps)
  useEffect(() => {
    if (!user) return;
    const loadPRs = async () => {
      const { data: userWorkouts } = await supabase.from("workouts").select("id").eq("user_id", user.id);
      if (!userWorkouts?.length) return;
      const wIds = userWorkouts.map(w => w.id);
      const { data: sets } = await supabase.from("workout_sets").select("exercise_id, weight, reps").in("workout_id", wIds);
      if (!sets) return;
      const map = new Map<string, { weight: number; reps: number }>();
      for (const s of sets) {
        const current = map.get(s.exercise_id) || { weight: 0, reps: 0 };
        if (s.weight > current.weight) current.weight = s.weight;
        if (s.reps > current.reps) current.reps = s.reps;
        map.set(s.exercise_id, current);
      }
      prMapRef.current = map;
    };
    loadPRs();
  }, [user]);

  // Load previous notes for exercises
  const [prevNotesMap, setPrevNotesMap] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!user) return;
    const loadNotes = async () => {
      const { data: userWorkouts } = await supabase.from("workouts").select("id").eq("user_id", user.id).order("started_at", { ascending: false }).limit(50);
      if (!userWorkouts?.length) return;
      const wIds = userWorkouts.map(w => w.id);
      const { data: sets } = await supabase.from("workout_sets").select("exercise_id, notes, workout_id").in("workout_id", wIds).not("notes", "is", null);
      if (!sets?.length) return;
      // Get exercise names
      const exIds = [...new Set(sets.map(s => s.exercise_id))];
      const { data: exData } = await (supabase as any).from("exercises").select("id, name").in("id", exIds);
      if (!exData) return;
      const idToName: Record<string, string> = {};
      (exData as any[]).forEach((e: any) => { idToName[e.id] = e.name; });
      const notesMap: Record<string, string> = {};
      // Only take the most recent note per exercise
      for (const s of sets) {
        const name = idToName[s.exercise_id];
        if (name && s.notes && !notesMap[name]) {
          notesMap[name] = s.notes;
        }
      }
      setPrevNotesMap(notesMap);
    };
    loadNotes();
  }, [user]);

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
    const handleAddExercise = () => setShowLibrary(true);
    const handleFinish = () => { if (exercises.length > 0 && !saving) saveWorkout(); };
    window.addEventListener("workout-add-exercise", handleAddExercise);
    window.addEventListener("workout-finish", handleFinish);
    return () => {
      window.removeEventListener("workout-add-exercise", handleAddExercise);
      window.removeEventListener("workout-finish", handleFinish);
    };
  }, [exercises.length, saving]);

  useEffect(() => {
    if (isEditing) {
      sessionStorage.setItem("workout-edit-in-progress", JSON.stringify(exercises));
    } else {
      sessionStorage.setItem("workout-in-progress", JSON.stringify(exercises));
      sessionStorage.setItem("workout-name", workoutName);
    }
  }, [exercises, isEditing, workoutName]);

  const clearPersistedData = useCallback(() => {
    sessionStorage.removeItem("workout-in-progress");
    sessionStorage.removeItem("workout-edit-in-progress");
    sessionStorage.removeItem("workout-view");
    sessionStorage.removeItem("workout-start-time");
    sessionStorage.removeItem("workout-autosave-id");
    sessionStorage.removeItem("workout-name");
    autoSaveIdRef.current = null;
  }, []);

  const exercisesRef = useRef(exercises);
  exercisesRef.current = exercises;
  const savedRef = useRef(saved);
  savedRef.current = saved;
  const savingRef = useRef(saving);
  savingRef.current = saving;
  const startTimeRef = useRef(startTime);
  startTimeRef.current = startTime;

  const autoSaveIdRef = useRef<string | null>(sessionStorage.getItem("workout-autosave-id"));

  useEffect(() => {
    const autoSave = async () => {
      const currentExercises = exercisesRef.current;
      if (savedRef.current || savingRef.current || !user || currentExercises.length === 0) return;
      const hasSets = currentExercises.some(ex => ex.sets.some(s => s.weight !== "" || s.reps !== ""));
      if (!hasSets) return;
      try {
        const exerciseIdMap = await resolveExerciseIds(currentExercises.map(ex => ({ name: ex.name, muscleGroup: ex.muscleGroup })));
        if (isEditing && editData) {
          await (supabase as any).from("workout_sets").delete().eq("workout_id", editData.id);
          const setsRows: any[] = [];
          currentExercises.forEach((ex, exIdx) => {
            const exerciseId = exerciseIdMap.get(`${ex.name}::${ex.muscleGroup}`);
            if (!exerciseId) return;
            ex.sets.filter((s) => s.weight !== "" || s.reps !== "").forEach((s, setIdx) => {
              setsRows.push({ workout_id: editData.id, exercise_id: exerciseId, set_number: setIdx + 1, weight: Number(s.weight) || 0, reps: Number(s.reps) || 0, sort_order: exIdx, notes: setIdx === 0 ? (ex.notes || null) : null, rest_time: s.rest_time });
            });
          });
          if (setsRows.length > 0) await (supabase as any).from("workout_sets").insert(setsRows);
        } else {
          const startedAt = new Date(startTimeRef.current || Date.now()).toISOString();
          let workoutId = autoSaveIdRef.current;
          if (workoutId) {
            await (supabase as any).from("workout_sets").delete().eq("workout_id", workoutId);
          } else {
            const { data: workout, error: wErr } = await supabase.from("workouts").insert({ user_id: user.id, started_at: startedAt, name: workoutName || null } as any).select("id").single();
            if (wErr || !workout) return;
            workoutId = workout.id;
            autoSaveIdRef.current = workoutId;
            sessionStorage.setItem("workout-autosave-id", workoutId);
          }
          const setsRows: any[] = [];
          currentExercises.forEach((ex, exIdx) => {
            const exerciseId = exerciseIdMap.get(`${ex.name}::${ex.muscleGroup}`);
            if (!exerciseId) return;
            ex.sets.filter((s) => s.weight !== "" || s.reps !== "").forEach((s, setIdx) => {
              setsRows.push({ workout_id: workoutId, exercise_id: exerciseId, set_number: setIdx + 1, weight: Number(s.weight) || 0, reps: Number(s.reps) || 0, sort_order: exIdx, notes: setIdx === 0 ? (ex.notes || null) : null, rest_time: s.rest_time });
            });
          });
          if (setsRows.length > 0) await (supabase as any).from("workout_sets").insert(setsRows);
          await supabase.from("workouts").update({ finished_at: new Date().toISOString(), duration_seconds: startTimeRef.current ? Math.floor((Date.now() - startTimeRef.current) / 1000) : 0 } as any).eq("id", workoutId);
        }
      } catch { /* silent */ }
    };
    const handleVisibilityChange = () => { if (document.visibilityState === "hidden") autoSave(); };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [user, isEditing, editData]);

  const addExercise = (name: string, group: string) => {
    // Clear timer from previous exercise
    setTimerExIdx(null);
    // Load previous notes for this exercise
    const prevNotes = prevNotesMap[name] || "";
    setExercises((prev) => [{ name, muscleGroup: group, sets: [{ weight: "", reps: 0, rest_time: null }], notes: prevNotes }, ...prev]);
    setShowLibrary(false);
    haptic("light");
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  };

  const addSet = (idx: number) => {
    const restTime = lastSetTimeRef.current ? Math.floor((Date.now() - lastSetTimeRef.current) / 1000) : null;
    setExercises((prev) => {
      const c = [...prev];
      c[idx] = { ...c[idx], sets: [...c[idx].sets, { weight: "", reps: "", rest_time: restTime }] };
      return c;
    });
    lastSetTimeRef.current = Date.now();
    setAutoRestSeconds(0);
    haptic("light");
  };

  const copySet = (idx: number) => {
    const lastSet = exercises[idx].sets[exercises[idx].sets.length - 1];
    const restTime = lastSetTimeRef.current ? Math.floor((Date.now() - lastSetTimeRef.current) / 1000) : null;
    setExercises((prev) => {
      const c = [...prev];
      c[idx] = { ...c[idx], sets: [...c[idx].sets, { weight: lastSet.weight, reps: lastSet.reps, rest_time: restTime }] };
      return c;
    });
    lastSetTimeRef.current = Date.now();
    setAutoRestSeconds(0);
  };

  const removeExercise = (idx: number) => {
    // Clear timer if it was on this exercise
    if (timerExIdx === idx) setTimerExIdx(null);
    else if (timerExIdx !== null && timerExIdx > idx) setTimerExIdx(timerExIdx - 1);
    setExercises((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateSet = (exIdx: number, setIdx: number, field: "weight" | "reps", val: string) => {
    setExercises((prev) => {
      const c = [...prev];
      const sets = [...c[exIdx].sets];
      sets[setIdx] = { ...sets[setIdx], [field]: val === "" ? "" : Number(val) };
      c[exIdx] = { ...c[exIdx], sets };
      return c;
    });

    // Check for new PR on weight OR reps entry
    if (val !== "") {
      const numVal = Number(val);
      const exName = exercises[exIdx]?.name;
      const exGroup = exercises[exIdx]?.muscleGroup;
      if (numVal > 0 && exName) {
        resolveExerciseIds([{ name: exName, muscleGroup: exGroup }]).then((idMap) => {
          const exId = idMap.get(`${exName}::${exGroup}`);
          if (exId) {
            const currentPR = prMapRef.current.get(exId) || { weight: 0, reps: 0 };
            let isNewPR = false;
            if (field === "weight" && numVal > currentPR.weight && currentPR.weight > 0) {
              currentPR.weight = numVal;
              isNewPR = true;
            }
            if (field === "reps" && numVal > currentPR.reps && currentPR.reps > 0) {
              currentPR.reps = numVal;
              isNewPR = true;
            }
            if (isNewPR) {
              prMapRef.current.set(exId, currentPR);
              prCountRef.current += 1;
              confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
              haptic("prCelebration");
              const desc = field === "weight"
                ? `${t.exerciseNames[exName] || exName}: ${numVal} ${t.common.kg}`
                : `${t.exerciseNames[exName] || exName}: ${numVal} ${lang === "uk" ? "повт." : "reps"}`;
              toast({ title: t.pr.newRecord, description: desc });
            }
          }
        });
      }
    }

    if (field === "reps" && val !== "") {
      lastSetTimeRef.current = Date.now();
      setAutoRestSeconds(0);
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

  const submitRating = async () => {
    if (!user || rating === 0) return;
    try {
      await supabase.from("app_reviews" as any).insert({
        user_id: user.id,
        rating,
        feedback: feedback.trim() || null,
        workout_id: savedWorkoutIdRef.current,
      } as any);
      setRatingSubmitted(true);
      toast({ title: lang === "uk" ? "Дякуємо за відгук! ❤️" : "Thanks for your feedback! ❤️" });
    } catch { /* silent */ }
  };

  const saveWorkout = async () => {
    if (!user || exercises.length === 0) return;
    setSaving(true);
    try {
      const exerciseIdMap = await resolveExerciseIds(exercises.map(ex => ({ name: ex.name, muscleGroup: ex.muscleGroup })));

      if (isEditing && editData) {
        await (supabase as any).from("workout_sets").delete().eq("workout_id", editData.id);
        const setsRows: any[] = [];
        exercises.forEach((ex, exIdx) => {
          const exerciseId = exerciseIdMap.get(`${ex.name}::${ex.muscleGroup}`);
          if (!exerciseId) return;
          ex.sets.filter((s) => s.weight !== "" || s.reps !== "").forEach((s, setIdx) => {
            setsRows.push({ workout_id: editData.id, exercise_id: exerciseId, set_number: setIdx + 1, weight: Number(s.weight) || 0, reps: Number(s.reps) || 0, sort_order: exIdx, notes: setIdx === 0 ? (ex.notes || null) : null, rest_time: s.rest_time });
          });
        });
        if (setsRows.length > 0) {
          const { error: sErr } = await (supabase as any).from("workout_sets").insert(setsRows);
          if (sErr) throw sErr;
        }
        const { error: wErr } = await supabase.from("workouts").update({ notes: null, name: workoutName || null, finished_at: editData.finished_at || new Date().toISOString() } as any).eq("id", editData.id);
        if (wErr) throw wErr;
        clearPersistedData();
        const originalDuration = editData.finished_at && editData.started_at ? Math.floor((new Date(editData.finished_at).getTime() - new Date(editData.started_at).getTime()) / 1000) : 0;
        setFinalDuration(originalDuration);
        setSaved(true);
        toast({ title: t.workouts.workoutUpdated, description: `${exercises.length} ${t.workouts.exercisesLogged}` });
      } else {
        const startedAt = new Date(startTime || Date.now()).toISOString();
        let workoutId = autoSaveIdRef.current;
        if (workoutId) {
          await (supabase as any).from("workout_sets").delete().eq("workout_id", workoutId);
          await supabase.from("workouts").update({ started_at: startedAt } as any).eq("id", workoutId);
        } else {
          const { data: workout, error: wErr } = await supabase.from("workouts").insert({ user_id: user.id, started_at: startedAt }).select("id").single();
          if (wErr || !workout) throw wErr;
          workoutId = workout.id;
        }
        savedWorkoutIdRef.current = workoutId;
        const setsRows: any[] = [];
        exercises.forEach((ex, exIdx) => {
          const exerciseId = exerciseIdMap.get(`${ex.name}::${ex.muscleGroup}`);
          if (!exerciseId) return;
          ex.sets.filter((s) => s.weight !== "" || s.reps !== "").forEach((s, setIdx) => {
            setsRows.push({ workout_id: workoutId, exercise_id: exerciseId, set_number: setIdx + 1, weight: Number(s.weight) || 0, reps: Number(s.reps) || 0, sort_order: exIdx, notes: setIdx === 0 ? (ex.notes || null) : null, rest_time: s.rest_time });
          });
        });
        if (setsRows.length > 0) {
          const { error: sErr } = await (supabase as any).from("workout_sets").insert(setsRows);
          if (sErr) throw sErr;
        }
        const { error: uErr } = await supabase.from("workouts").update({ finished_at: new Date().toISOString(), duration_seconds: elapsed, name: workoutName || null } as any).eq("id", workoutId);
        if (uErr) throw uErr;
        clearPersistedData();
        setFinalDuration(elapsed);
        localStorage.setItem("workoutCompleted", "true");
        let earnedXP = 10;
        const sessionPRs = prCountRef.current;
        if (sessionPRs > 0) {
          const prXP = getPRXP(profile?.experience_level || null);
          earnedXP += sessionPRs * prXP;
        }
        const freqXP = await checkAndAwardFrequencyXP();
        if (freqXP > 0) earnedXP += freqXP;
        const xpResult = await addXP(earnedXP, 'workout_complete');
        setXpGained(earnedXP);
        await updateLastWorkout();
        if (xpResult?.leveledUp && xpResult.newLevel) {
          setLevelUpLevel(xpResult.newLevel);
          sendNotification(lang === "uk" ? "Новий рівень! 🎉" : "Level Up! 🎉", `${lang === "uk" ? "Ви досягли рівня" : "You reached level"} ${xpResult.newLevel}`);
        }
        if (sessionPRs > 0) {
          sendNotification(lang === "uk" ? "Новий рекорд! 🏆" : "New Record! 🏆", `+${sessionPRs * getPRXP(profile?.experience_level || null)} XP ${lang === "uk" ? "зараховано" : "earned"}`);
        }
        haptic("workoutComplete");
        if (earnedXP > 0) confetti({ particleCount: 100 + earnedXP * 3, spread: 80, origin: { y: 0.5 } });
        setSaved(true);
        // Show rating dialog after a short delay
        setTimeout(() => setShowRating(true), 1500);
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
        {levelUpLevel && <LevelUpDialog open={!!levelUpLevel} onClose={() => setLevelUpLevel(null)} newLevel={levelUpLevel} />}

        {/* Rating Dialog */}
        <Dialog open={showRating && !ratingSubmitted} onOpenChange={(open) => !open && setShowRating(false)}>
          <DialogContent className="rounded-2xl max-w-sm">
            <DialogHeader>
              <DialogTitle className="font-display text-center">
                {lang === "uk" ? "Оцініть додаток" : "Rate the App"}
              </DialogTitle>
              <DialogDescription className="text-center">
                {lang === "uk" ? "Ваша думка допоможе нам стати краще" : "Your feedback helps us improve"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {/* Stars */}
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className="p-1 transition-transform active:scale-90"
                  >
                    <Star
                      className={`h-10 w-10 transition-colors ${star <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
                    />
                  </button>
                ))}
              </div>
              {/* Feedback text */}
              <Textarea
                placeholder={lang === "uk" ? "Поділіться вашими думками (необов'язково)..." : "Share your thoughts (optional)..."}
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                className="min-h-[80px]"
              />
            </div>
            <DialogFooter className="flex-col gap-2 sm:flex-col">
              <Button className="w-full" onClick={submitRating} disabled={rating === 0}>
                {lang === "uk" ? "Надіслати" : "Submit"}
              </Button>
              <Button variant="ghost" className="w-full" onClick={() => setShowRating(false)}>
                {lang === "uk" ? "Пропустити" : "Skip"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
            <Button variant="ghost" size="icon" onClick={() => setTimerExIdx(prev => prev !== null ? null : 0)}><Timer className="h-5 w-5" /></Button>
          </div>
        </div>

        <Input placeholder={t.workouts.workoutNamePlaceholder} value={workoutName} onChange={(e) => setWorkoutName(e.target.value)} className="h-11" />

        <Button variant="outline" className="w-full h-12" onClick={() => setShowLibrary(true)}>
          <Plus className="h-4 w-4 mr-2" /> {t.workouts.addExercise}
        </Button>

        {exercises.length === 0 && <div className="py-12 text-center text-muted-foreground"><p className="mb-4">{t.workouts.noExercises}</p></div>}

        {exercises.map((ex, exIdx) => (
          <React.Fragment key={exIdx}>
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative shrink-0">
                    {getExerciseImage(ex) ? (
                      <img src={getExerciseImage(ex)!} alt={ex.name} className="h-10 w-10 rounded-lg object-cover bg-muted" />
                    ) : (
                      <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                        <Camera className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-display font-semibold">{t.exerciseNames[ex.name] || ex.name}</p>
                    <p className="text-xs text-muted-foreground">{(() => { const keyMap: Record<string, string> = { "Legs & Glutes": "legsGlutes", "Back": "back", "Chest": "chest", "Shoulders": "shoulders", "Arms": "arms", "Core": "core" }; const k = keyMap[ex.muscleGroup] as keyof typeof t.muscleGroups; return k ? t.muscleGroups[k] : ex.muscleGroup; })()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <PreviousWorkoutInfo exerciseName={ex.name} muscleGroup={ex.muscleGroup} />
                  <Button variant="ghost" size="icon" onClick={() => removeExercise(exIdx)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
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
              <Button variant="outline" size="sm" className="w-full" onClick={() => setTimerExIdx(timerExIdx === exIdx ? null : exIdx)}>
                <Timer className="h-3.5 w-3.5 mr-1.5" /> {t.workouts.restTimer}
              </Button>
              {autoRestSeconds !== null && autoRestSeconds > 0 && (
                <div className="flex items-center justify-center gap-2 rounded-xl bg-accent/50 border border-border/50 px-3 py-2">
                  <Timer className="h-4 w-4 text-primary animate-pulse" />
                  <span className="text-sm font-display font-semibold tabular-nums">{t.workouts.restTimer}: {formatTime(autoRestSeconds)}</span>
                  <Tooltip>
                    <TooltipTrigger asChild><Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" /></TooltipTrigger>
                    <TooltipContent className="max-w-[220px]"><p className="text-xs">{t.recovery.restTooltip}</p></TooltipContent>
                  </Tooltip>
                </div>
              )}
            </CardContent>
          </Card>
          {timerExIdx === exIdx && <RestTimer inline onClose={() => setTimerExIdx(null)} />}
          </React.Fragment>
        ))}

        {exercises.length > 0 && (
          <Button className="w-full h-12 text-base" onClick={saveWorkout} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />{saving ? t.workouts.updatingDots : isEditing ? t.workouts.updateWorkout : t.workouts.finishSave}
          </Button>
        )}

        <input
          ref={exerciseImageRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file && exerciseImageIdx !== null) uploadWorkoutExerciseImage(file, exerciseImageIdx);
            if (e.target) e.target.value = "";
          }}
        />
      </div>
    </TooltipProvider>
  );
};

export default StartWorkout;
