import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { PlusCircle, Clock, Pencil, Trash2 } from "lucide-react";
import { format, differenceInDays, addDays, startOfMonth, subDays, differenceInCalendarDays } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

import FitnessScore from "@/components/dashboard/FitnessScore";
import WeightChart from "@/components/dashboard/WeightChart";
import MeasurementsCard from "@/components/dashboard/MeasurementsCard";
import MuscleHeatmap from "@/components/dashboard/MuscleHeatmap";
import WorkoutActivity from "@/components/dashboard/WorkoutActivity";
import NutritionSummary from "@/components/dashboard/NutritionSummary";
import SmartInsights from "@/components/dashboard/SmartInsights";
import PremiumGate from "@/components/subscription/PremiumGate";

type ProgressEntry = Tables<"progress_entries">;
const CHECKIN_INTERVAL = 14;

interface SetData { weight: number; reps: number }

const Dashboard = () => {
  const { user, profile } = useAuth();
  const { t } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [entries, setEntries] = useState<ProgressEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [nutrition, setNutrition] = useState<{ calories: number; protein: number; fat: number; carbs: number } | null>(null);
  const [workouts, setWorkouts] = useState<Tables<"workouts">[]>([]);
  const [workoutExercises, setWorkoutExercises] = useState<Tables<"workout_exercises">[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("nutrition_results");
      if (saved) setNutrition(JSON.parse(saved));
    } catch {}
  }, []);

  useEffect(() => {
    if (!user) return;

    const fetchAll = async () => {
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();

      const [entriesRes, workoutsRes] = await Promise.all([
        supabase.from("progress_entries").select("*").eq("user_id", user.id).order("entry_date", { ascending: true }),
        supabase.from("workouts").select("*").eq("user_id", user.id).order("started_at", { ascending: true }),
      ]);

      const allEntries = entriesRes.data ?? [];
      const allWorkouts = workoutsRes.data ?? [];
      setEntries(allEntries);
      setWorkouts(allWorkouts);

      if (allWorkouts.length > 0) {
        const { data: exercises } = await supabase
          .from("workout_exercises").select("*")
          .in("workout_id", allWorkouts.map((w) => w.id));
        setWorkoutExercises(exercises ?? []);
      }

      setLoading(false);
    };

    fetchAll();
  }, [user]);

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("progress_entries").delete().eq("id", deleteId);
    if (!error) {
      toast({ title: t.dashboard.entryDeleted });
      setEntries((prev) => prev.filter((e) => e.id !== deleteId));
    } else {
      toast({ title: t.common.error, description: error.message, variant: "destructive" });
    }
    setDeleteId(null);
  };

  // Derived data
  const sortedEntriesDesc = useMemo(() => [...entries].reverse(), [entries]);
  const latest = sortedEntriesDesc[0];
  const previous = sortedEntriesDesc[1];
  const nextCheckinDate = latest ? addDays(new Date(latest.entry_date), CHECKIN_INTERVAL) : null;
  const daysUntilCheckin = nextCheckinDate ? differenceInDays(nextCheckinDate, new Date()) : 0;
  const canLogEntry = !latest || daysUntilCheckin <= 0;

  // Workout stats
  const monthStart = startOfMonth(new Date());
  const workoutsThisMonth = useMemo(
    () => workouts.filter((w) => new Date(w.started_at) >= monthStart).length,
    [workouts, monthStart]
  );

  const totalSetsThisMonth = useMemo(() => {
    const monthWorkoutIds = new Set(workouts.filter((w) => new Date(w.started_at) >= monthStart).map((w) => w.id));
    return workoutExercises
      .filter((e) => monthWorkoutIds.has(e.workout_id))
      .reduce((sum, e) => sum + (Array.isArray(e.sets) ? (e.sets as unknown as SetData[]).length : 0), 0);
  }, [workouts, workoutExercises, monthStart]);

  // Workout streak (consecutive days with workouts, looking back)
  const currentStreak = useMemo(() => {
    if (workouts.length === 0) return 0;
    const workoutDays = new Set(workouts.map((w) => format(new Date(w.started_at), "yyyy-MM-dd")));
    let streak = 0;
    let day = new Date();
    // Check today first, if no workout today, check yesterday
    if (!workoutDays.has(format(day, "yyyy-MM-dd"))) {
      day = subDays(day, 1);
      if (!workoutDays.has(format(day, "yyyy-MM-dd"))) return 0;
    }
    while (workoutDays.has(format(day, "yyyy-MM-dd"))) {
      streak++;
      day = subDays(day, 1);
    }
    return streak;
  }, [workouts]);

  // Muscle heatmap data (last 30 days)
  const muscleData = useMemo(() => {
    const thirtyDaysAgo = subDays(new Date(), 30);
    const recentWorkoutIds = new Set(
      workouts.filter((w) => new Date(w.started_at) >= thirtyDaysAgo).map((w) => w.id)
    );
    const groups: Record<string, number> = {};
    workoutExercises
      .filter((e) => recentWorkoutIds.has(e.workout_id))
      .forEach((e) => {
        const sets = Array.isArray(e.sets) ? (e.sets as unknown as SetData[]).length : 0;
        groups[e.muscle_group] = (groups[e.muscle_group] || 0) + sets;
      });
    return groups;
  }, [workouts, workoutExercises]);

  // Strength trending (any exercise with increasing max weight in last 3+ sessions)
  const strengthTrending = useMemo(() => {
    const exerciseHistory: Record<string, number[]> = {};
    const sortedWorkouts = [...workouts].sort((a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime());
    const workoutOrder = Object.fromEntries(sortedWorkouts.map((w, i) => [w.id, i]));

    workoutExercises
      .sort((a, b) => (workoutOrder[a.workout_id] ?? 0) - (workoutOrder[b.workout_id] ?? 0))
      .forEach((e) => {
        const sets = Array.isArray(e.sets) ? (e.sets as unknown as SetData[]) : [];
        const maxW = Math.max(...sets.map((s) => s.weight || 0), 0);
        if (!exerciseHistory[e.exercise_name]) exerciseHistory[e.exercise_name] = [];
        exerciseHistory[e.exercise_name].push(maxW);
      });

    return Object.values(exerciseHistory).some((weights) => {
      if (weights.length < 3) return false;
      const last3 = weights.slice(-3);
      return last3[2] > last3[0];
    });
  }, [workouts, workoutExercises]);

  // Fitness Score calculation
  const fitnessScores = useMemo(() => {
    // Training consistency: based on workouts per week in last 30 days
    const thirtyDaysAgo = subDays(new Date(), 30);
    const recentWorkouts = workouts.filter((w) => new Date(w.started_at) >= thirtyDaysAgo).length;
    const workoutsPerWeek = (recentWorkouts / 30) * 7;
    const trainingConsistency = Math.min(100, Math.round((workoutsPerWeek / 4) * 100));

    // Strength progress
    let strengthProgress = 50; // default
    const exerciseHistory: Record<string, number[]> = {};
    const sortedW = [...workouts].sort((a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime());
    const wOrder = Object.fromEntries(sortedW.map((w, i) => [w.id, i]));
    workoutExercises
      .sort((a, b) => (wOrder[a.workout_id] ?? 0) - (wOrder[b.workout_id] ?? 0))
      .forEach((e) => {
        const sets = Array.isArray(e.sets) ? (e.sets as unknown as SetData[]) : [];
        const maxW = Math.max(...sets.map((s) => s.weight || 0), 0);
        if (!exerciseHistory[e.exercise_name]) exerciseHistory[e.exercise_name] = [];
        exerciseHistory[e.exercise_name].push(maxW);
      });
    const improvements = Object.values(exerciseHistory).filter((weights) => {
      if (weights.length < 2) return false;
      return weights[weights.length - 1] > weights[0];
    }).length;
    const totalExercises = Object.keys(exerciseHistory).length;
    if (totalExercises > 0) {
      strengthProgress = Math.min(100, Math.round((improvements / totalExercises) * 100));
    }

    // Body measurements progress
    let bodyProgress = 50;
    if (entries.length >= 2) {
      const first = entries[0];
      const last = entries[entries.length - 1];
      let positiveChanges = 0;
      let totalMeasured = 0;
      // For waist/body_fat: decrease = good. For others: depends on goal, use neutral.
      if (last.waist != null && first.waist != null) { totalMeasured++; if (last.waist <= first.waist) positiveChanges++; }
      if (last.body_fat != null && first.body_fat != null) { totalMeasured++; if (last.body_fat <= first.body_fat) positiveChanges++; }
      if (last.arm_circumference != null && first.arm_circumference != null) { totalMeasured++; if (last.arm_circumference >= first.arm_circumference) positiveChanges++; }
      if (last.chest != null && first.chest != null) { totalMeasured++; if (last.chest >= first.chest) positiveChanges++; }
      if (totalMeasured > 0) bodyProgress = Math.round((positiveChanges / totalMeasured) * 100);
    }

    // Muscle balance
    const groupCounts = Object.values(muscleData);
    let muscleBalance = 50;
    if (groupCounts.length >= 2) {
      const max = Math.max(...groupCounts);
      const min = Math.min(...groupCounts);
      if (max > 0) muscleBalance = Math.round((min / max) * 100);
    } else if (groupCounts.length === 1) {
      muscleBalance = 30;
    }

    return { trainingConsistency, strengthProgress, bodyProgress, muscleBalance };
  }, [workouts, workoutExercises, entries, muscleData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Hero */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-extrabold tracking-tight">
            {t.dashboard.hey}, {profile?.full_name || t.dashboard.there} 💪
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">{t.dashboard.trackTransformation}</p>
        </div>
        {canLogEntry ? (
          <Link to="/add-entry">
            <Button size="sm"><PlusCircle className="mr-1.5 h-4 w-4" />{t.dashboard.newEntry}</Button>
          </Link>
        ) : (
          <Button variant="outline" size="sm" disabled>
            <Clock className="mr-1.5 h-4 w-4" />{daysUntilCheckin}{t.dashboard.daysLeft}
          </Button>
        )}
      </div>

      {/* Check-in banner */}
      {!canLogEntry && nextCheckinDate && (
        <Card className="border-primary/20 gradient-glow">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <Clock className="h-4 w-4 text-primary" />
            </div>
            <p className="text-sm">
              {t.dashboard.nextCheckin}{" "}
              <span className="font-bold text-primary">{daysUntilCheckin} {daysUntilCheckin !== 1 ? t.dashboard.days : t.dashboard.day}</span>
            </p>
          </CardContent>
        </Card>
      )}

      {canLogEntry && entries.length > 0 && (
        <Card className="border-primary/20 gradient-glow">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <PlusCircle className="h-4 w-4 text-primary" />
            </div>
            <p className="text-sm">
              {t.dashboard.checkinReady}{" "}
              <Link to="/add-entry" className="font-bold text-primary hover:underline">{t.dashboard.logProgressNow}</Link>.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Fitness Score — Premium */}
      <PremiumGate feature="Fitness Score Dashboard">
        <FitnessScore {...fitnessScores} />
      </PremiumGate>

      {/* Weight Chart */}
      <WeightChart entries={entries} />

      {/* Body Measurements — Premium */}
      <PremiumGate feature="Body Composition Dashboard">
        <MeasurementsCard latest={latest} previous={previous} />
      </PremiumGate>

      {/* Muscle Heatmap — Premium */}
      <PremiumGate feature="Muscle Heatmap Analytics">
        <MuscleHeatmap muscleData={muscleData} />
      </PremiumGate>

      {/* Workout Activity */}
      <WorkoutActivity workoutsThisMonth={workoutsThisMonth} totalSetsThisMonth={totalSetsThisMonth} currentStreak={currentStreak} />

      {/* Nutrition Summary */}
      <NutritionSummary nutrition={nutrition} />

      {/* Smart Insights — Premium */}
      <PremiumGate feature="AI Training Insights">
        <SmartInsights entries={entries} muscleData={muscleData} strengthTrending={strengthTrending} />
      </PremiumGate>

      {/* Recent Entries */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{t.dashboard.recentEntries}</CardTitle>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <p className="text-sm">{t.dashboard.noEntries}</p>
              <Link to="/add-entry">
                <Button className="mt-4" variant="outline" size="sm">
                  <PlusCircle className="mr-1.5 h-4 w-4" />{t.dashboard.addFirstEntry}
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {sortedEntriesDesc.slice(0, 5).map((entry, i) => (
                <div key={entry.id} className="flex items-center justify-between rounded-xl border border-border/50 p-3 transition-all hover:bg-accent/30 animate-fade-in" style={{ animationDelay: `${i * 60}ms`, animationFillMode: "backwards" }}>
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-semibold text-sm">{format(new Date(entry.entry_date), "MMM d, yyyy")}</p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {[entry.weight && `${entry.weight}${t.common.kg}`, entry.waist && `${t.dashboard.waist}: ${entry.waist}${t.common.cm}`, entry.body_fat && `BF: ${entry.body_fat}%`].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    {entry.photo_urls && entry.photo_urls.length > 0 && (
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-[10px] font-semibold">📷{entry.photo_urls.length}</div>
                    )}
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate("/add-entry", { state: { editEntry: entry } })}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteId(entry.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="glass-strong rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t.dashboard.deleteEntry}</AlertDialogTitle>
            <AlertDialogDescription>{t.dashboard.deleteConfirm}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">{t.dashboard.cancelDelete}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl">
              {t.dashboard.confirmDelete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Dashboard;
