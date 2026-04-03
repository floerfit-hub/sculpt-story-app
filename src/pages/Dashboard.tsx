import { useEffect, useState, useMemo, useCallback, ReactNode } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { usePremium } from "@/hooks/usePremium";
import PersonalRecords from "@/components/dashboard/PersonalRecords";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { PlusCircle, Clock, Pencil, Trash2, Crown, ChevronUp, ChevronDown, Eye, EyeOff, Check, Flame, Footprints, UserCircle } from "lucide-react";
import { format, differenceInDays, addDays, startOfMonth, subDays } from "date-fns";
import { uk as ukLocale } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

import FitnessScore from "@/components/dashboard/FitnessScore";
import WeightChart from "@/components/dashboard/WeightChart";
import MeasurementsCard from "@/components/dashboard/MeasurementsCard";
import MuscleHeatmap from "@/components/dashboard/MuscleHeatmap";
import WorkoutActivity from "@/components/dashboard/WorkoutActivity";
import NutritionTracker from "@/components/dashboard/NutritionTracker";
import LastWorkoutPanel from "@/components/dashboard/LastWorkoutPanel";

import PremiumGate from "@/components/subscription/PremiumGate";
import { useFitnessStats, calculateFitScore, detectPRsLast30Days, getWeights } from "@/hooks/useFitnessStats";
import NotificationPrompt from "@/components/NotificationPrompt";
import { useNotificationScheduler } from "@/hooks/useNotificationScheduler";

type ProgressEntry = Tables<"progress_entries">;
const CHECKIN_INTERVAL = 14;

interface PerfData {
  workout_id: string;
  exercise_id: string;
  total_sets: number;
  total_reps: number;
  total_volume: number;
  max_weight: number;
  avg_weight: number;
  estimated_1rm: number;
}

interface ExerciseInfo {
  name: string;
  muscle_group: string;
}

const PANEL_IDS = ["checkin", "fitnessScore", "levels", "bento", "lastWorkout", "weightChart", "measurements", "muscleHeatmap", "workoutActivity", "personalRecords", "nutritionTracker", "insights", "recentEntries"] as const;
type PanelId = typeof PANEL_IDS[number];

interface PanelConfig { order: PanelId[]; hidden: PanelId[] }

function loadPanelConfig(): PanelConfig {
  try {
    const saved = localStorage.getItem("dashboard_panels");
    if (saved) return JSON.parse(saved);
  } catch {}
  return { order: [...PANEL_IDS], hidden: [] };
}

function savePanelConfig(config: PanelConfig) {
  localStorage.setItem("dashboard_panels", JSON.stringify(config));
}

/* ─── Skeleton Loading Screen ─── */
const DashboardSkeleton = () => (
  <div className="space-y-[var(--gap-section)] animate-fade-in">
    {/* Header */}
    <div>
      <Skeleton className="h-9 w-56 rounded-xl" />
      <Skeleton className="h-4 w-40 rounded-lg mt-2" />
    </div>
    {/* Fit Score circle */}
    <Card>
      <CardContent className="p-6 flex flex-col items-center gap-4">
        <Skeleton className="h-[220px] w-[220px] rounded-full" />
        <div className="w-full space-y-2">
          <Skeleton className="h-2 w-full rounded-full" />
          <Skeleton className="h-2 w-3/4 rounded-full" />
          <Skeleton className="h-2 w-5/6 rounded-full" />
          <Skeleton className="h-2 w-2/3 rounded-full" />
        </div>
      </CardContent>
    </Card>
    {/* XP bar */}
    <Skeleton className="h-16 w-full rounded-2xl" />
    {/* Bento widgets */}
    <div className="grid grid-cols-2 gap-4">
      <Skeleton className="h-36 rounded-3xl" />
      <Skeleton className="h-36 rounded-3xl" />
    </div>
    {/* Other panels */}
    <Skeleton className="h-48 rounded-4xl" />
    <Skeleton className="h-48 rounded-4xl" />
  </div>
);

/* ─── Bento Widget ─── */
const BentoWidget = ({ icon, label, value, sub }: { icon: ReactNode; label: string; value: string | number; sub?: string }) => (
  <Card className="rounded-3xl">
    <CardContent className="p-5 flex flex-col justify-between h-36">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-xs font-semibold uppercase tracking-widest">{label}</span>
      </div>
      <div>
        <p className="text-5xl font-display font-black leading-none text-foreground">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </div>
    </CardContent>
  </Card>
);

const Dashboard = () => {
  const { user, profile } = useAuth();
  const { t, lang } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [editMode, setEditMode] = useState(searchParams.get("edit") === "true");
  const [panelConfig, setPanelConfig] = useState<PanelConfig>(loadPanelConfig);
  const [entries, setEntries] = useState<ProgressEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  const [workouts, setWorkouts] = useState<Tables<"workouts">[]>([]);
  const [perfData, setPerfData] = useState<PerfData[]>([]);
  const [exerciseMap, setExerciseMap] = useState<Map<string, ExerciseInfo>>(new Map());
  const [todayCalories, setTodayCalories] = useState(0);
  const [calorieGoal, setCalorieGoal] = useState(2000);
  const { stats: fitnessStatsData, weeklyChange, isInactive, coldStart, updateFitScore, profileGoals, fetchStats: refetchFitnessStats } = useFitnessStats();
  useNotificationScheduler();


  useEffect(() => {
    if (!user) return;

    const fetchAll = async () => {
      const [entriesRes, workoutsRes] = await Promise.all([
        supabase.from("progress_entries").select("*").eq("user_id", user.id).order("entry_date", { ascending: true }),
        supabase.from("workouts").select("*").eq("user_id", user.id).order("started_at", { ascending: true }),
      ]);

      const allEntries = entriesRes.data ?? [];
      const allWorkouts = workoutsRes.data ?? [];
      setEntries(allEntries);
      setWorkouts(allWorkouts);

      if (allWorkouts.length > 0) {
        const { data: perf } = await (supabase as any)
          .from("exercise_performance")
          .select("workout_id, exercise_id, total_sets, total_reps, total_volume, max_weight, avg_weight, estimated_1rm")
          .eq("user_id", user.id);

        const perfItems = (perf || []) as PerfData[];
        setPerfData(perfItems);

        const exerciseIds = [...new Set(perfItems.map(p => p.exercise_id))];
        if (exerciseIds.length > 0) {
          const { data: exercises } = await (supabase as any)
            .from("exercises")
            .select("id, name, muscle_group")
            .in("id", exerciseIds);
          setExerciseMap(new Map((exercises || []).map((e: any) => [e.id, { name: e.name, muscle_group: e.muscle_group }])));
        }

        const firstWorkout = new Date(allWorkouts[0].started_at);
        const monthsTraining = differenceInDays(new Date(), firstWorkout) / 30;
        let autoLevel: string | null = null;
        if (monthsTraining >= 36) autoLevel = "advanced";
        else if (monthsTraining >= 12) autoLevel = "intermediate";
        else autoLevel = "beginner";
        
        const currentLevel = (profile as any)?.experience_level;
        if (autoLevel && autoLevel !== currentLevel) {
          await supabase.from("profiles").update({ experience_level: autoLevel } as any).eq("user_id", user.id);
        }
      }

      // Fetch today's calories for bento widget
      const todayStr = format(new Date(), "yyyy-MM-dd");
      const { data: foodLogs } = await (supabase as any)
        .from("food_logs")
        .select("kcal")
        .eq("user_id", user.id)
        .gte("created_at", `${todayStr}T00:00:00`)
        .lte("created_at", `${todayStr}T23:59:59`);
      
      if (foodLogs) {
        setTodayCalories(foodLogs.reduce((sum: number, l: any) => sum + Number(l.kcal), 0));
      }

      // Get calorie goal from profile
      const { data: prof } = await supabase
        .from("profiles")
        .select("daily_calories" as any)
        .eq("user_id", user.id)
        .single();
      if (prof && (prof as any).daily_calories) {
        setCalorieGoal((prof as any).daily_calories);
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

  const sortedEntriesDesc = useMemo(() => [...entries].reverse(), [entries]);
  const latest = sortedEntriesDesc[0];
  const previous = sortedEntriesDesc[1];
  const nextCheckinDate = latest ? addDays(new Date(latest.entry_date), CHECKIN_INTERVAL) : null;
  const daysUntilCheckin = nextCheckinDate ? differenceInDays(nextCheckinDate, new Date()) : 0;
  const canLogEntry = !latest || daysUntilCheckin <= 0;

  const monthStart = startOfMonth(new Date());
  const workoutsThisMonth = useMemo(
    () => workouts.filter((w) => new Date(w.started_at) >= monthStart).length,
    [workouts, monthStart]
  );

  const totalSetsThisMonth = useMemo(() => {
    const monthWorkoutIds = new Set(workouts.filter((w) => new Date(w.started_at) >= monthStart).map((w) => w.id));
    return perfData.filter((p) => monthWorkoutIds.has(p.workout_id)).reduce((sum, p) => sum + Number(p.total_sets), 0);
  }, [workouts, perfData, monthStart]);

  const currentStreak = useMemo(() => {
    if (workouts.length === 0) return 0;
    const workoutDays = new Set(workouts.map((w) => format(new Date(w.started_at), "yyyy-MM-dd")));
    let streak = 0;
    let day = new Date();
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

  const muscleData = useMemo(() => {
    const thirtyDaysAgo = subDays(new Date(), 30);
    const recentWorkoutIds = new Set(workouts.filter((w) => new Date(w.started_at) >= thirtyDaysAgo).map((w) => w.id));
    const groups: Record<string, number> = {};
    perfData
      .filter((p) => recentWorkoutIds.has(p.workout_id))
      .forEach((p) => {
        const ex = exerciseMap.get(p.exercise_id);
        if (ex) groups[ex.muscle_group] = (groups[ex.muscle_group] || 0) + Number(p.total_sets);
      });
    return groups;
  }, [workouts, perfData, exerciseMap]);

  const strengthTrending = useMemo(() => {
    const sortedWorkouts = [...workouts].sort((a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime());
    const workoutOrder = new Map(sortedWorkouts.map((w, i) => [w.id, i]));
    const exerciseHistory: Record<string, number[]> = {};
    perfData
      .sort((a, b) => (workoutOrder.get(a.workout_id) ?? 0) - (workoutOrder.get(b.workout_id) ?? 0))
      .forEach((p) => {
        const ex = exerciseMap.get(p.exercise_id);
        if (ex) {
          if (!exerciseHistory[ex.name]) exerciseHistory[ex.name] = [];
          exerciseHistory[ex.name].push(Number(p.max_weight));
        }
      });
    return Object.values(exerciseHistory).some((weights) => {
      if (weights.length < 3) return false;
      const last3 = weights.slice(-3);
      return last3[2] > last3[0];
    });
  }, [workouts, perfData, exerciseMap]);

  const [fitnessScores, setFitnessScores] = useState({ trainingConsistency: 0, strengthProgress: 0, bodyProgress: 0, muscleBalance: 0, overall: 0, undertrained: [] as string[] });

  useEffect(() => {
    if (!user || loading) return;
    
    const compute = async () => {
      const thirtyDaysAgo = subDays(new Date(), 30);
      const workoutsLast30Days = workouts.filter((w) => new Date(w.started_at) >= thirtyDaysAgo).length;

      let daysSinceLastMeasurement: number | null = null;
      const lastEntry = entries.length > 0 ? entries[entries.length - 1] : null;
      if (lastEntry) {
        daysSinceLastMeasurement = differenceInDays(new Date(), new Date(lastEntry.entry_date));
      }

      const measurementFields = {
        hasArm: lastEntry?.arm_circumference != null,
        hasChest: lastEntry?.chest != null,
        hasWaist: lastEntry?.waist != null,
        hasGlute: lastEntry?.glute_circumference != null,
        hasThigh: lastEntry?.thigh_circumference != null,
      };

      const sevenDaysAgo = subDays(new Date(), 7);
      const weekWorkoutIds = new Set(workouts.filter((w) => new Date(w.started_at) >= sevenDaysAgo).map((w) => w.id));
      const weeklySets: Record<string, number> = {};
      perfData
        .filter((p) => weekWorkoutIds.has(p.workout_id))
        .forEach((p) => {
          const ex = exerciseMap.get(p.exercise_id);
          if (ex) weeklySets[ex.muscle_group] = (weeklySets[ex.muscle_group] || 0) + Number(p.total_sets);
        });

      const prCount = await detectPRsLast30Days(user.id);

      const scores = calculateFitScore({
        workoutsLast30Days,
        trainingFrequency: profileGoals?.training_frequency ?? null,
        prCount,
        experienceLevel: profileGoals?.experience_level ?? null,
        weeklySets,
        measurementFields,
        daysSinceLastMeasurement,
        primaryGoal: profileGoals?.primary_goal ?? null,
      });

      setFitnessScores({
        trainingConsistency: scores.consistency,
        strengthProgress: scores.strength,
        bodyProgress: scores.measurements,
        muscleBalance: scores.balance,
        overall: scores.overall,
        undertrained: scores.undertrained,
      });

      const shouldBlock = coldStart && workoutsLast30Days === 0;
      if (fitnessStatsData && !shouldBlock && scores.overall !== fitnessStatsData.fit_score) {
        updateFitScore(scores.overall);
      }
    };

    compute();
  }, [user, loading, workouts, entries, muscleData, profileGoals, fitnessStatsData, coldStart, updateFitScore, perfData, exerciseMap]);

  const orderedPanels = useMemo(() => {
    const ordered = [...panelConfig.order];
    PANEL_IDS.forEach(id => { if (!ordered.includes(id)) ordered.push(id); });
    return ordered;
  }, [panelConfig.order]);

  // Steps from localStorage (placeholder)
  const steps = useMemo(() => {
    try {
      const saved = localStorage.getItem("daily_steps");
      return saved ? Number(saved) : 0;
    } catch { return 0; }
  }, []);

  if (loading) {
    return <DashboardSkeleton />;
  }

  const movePanel = (id: PanelId, dir: -1 | 1) => {
    setPanelConfig(prev => {
      const order = [...prev.order];
      const idx = order.indexOf(id);
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= order.length) return prev;
      [order[idx], order[newIdx]] = [order[newIdx], order[idx]];
      const next = { ...prev, order };
      savePanelConfig(next);
      return next;
    });
  };

  const togglePanel = (id: PanelId) => {
    setPanelConfig(prev => {
      const hidden = prev.hidden.includes(id)
        ? prev.hidden.filter(h => h !== id)
        : [...prev.hidden, id];
      const next = { ...prev, hidden };
      savePanelConfig(next);
      return next;
    });
  };

  const exitEditMode = () => {
    setEditMode(false);
    setSearchParams({});
  };

  const resetPanels = () => {
    const defaultConfig: PanelConfig = { order: [...PANEL_IDS], hidden: [] };
    setPanelConfig(defaultConfig);
    savePanelConfig(defaultConfig);
    toast({ title: t.dashboard.panelsReset });
  };

  const stepsLabel = lang === "uk" ? "Кроки" : "Steps";
  const caloriesLabel = lang === "uk" ? "Калорії" : "Calories";

  const panelComponents: Record<PanelId, ReactNode> = {
    checkin: canLogEntry && entries.length > 0 ? (
      <Card className="border-primary/20">
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
    ) : null,
    fitnessScore: <PremiumGate feature="Fitness Score Dashboard"><FitnessScore {...fitnessScores} totalXP={fitnessStatsData?.total_xp} level={fitnessStatsData?.level} fitScore={(coldStart && workoutsThisMonth === 0 && workouts.length === 0) ? undefined : fitnessScores.overall} weeklyChange={weeklyChange} isInactive={isInactive} coldStart={coldStart && workoutsThisMonth === 0 && workouts.length === 0} undertrained={fitnessScores.undertrained} showMeasurementReminder={fitnessScores.bodyProgress < 50 && entries.length > 0} hideXPBar /></PremiumGate>,
    levels: <FitnessScore {...fitnessScores} totalXP={fitnessStatsData?.total_xp} level={fitnessStatsData?.level} isInactive={isInactive} xpBarOnly />,
    bento: (
      <div className="grid grid-cols-2 gap-4">
        <BentoWidget
          icon={<Footprints className="h-4 w-4" />}
          label={stepsLabel}
          value={steps.toLocaleString()}
          sub={lang === "uk" ? "сьогодні" : "today"}
        />
        <BentoWidget
          icon={<Flame className="h-4 w-4" />}
          label={caloriesLabel}
          value={todayCalories}
          sub={`/ ${calorieGoal} kcal`}
        />
      </div>
    ),
    weightChart: <WeightChart entries={entries} />,
    measurements: <PremiumGate feature="Body Composition Dashboard"><MeasurementsCard latest={latest} previous={previous} /></PremiumGate>,
    muscleHeatmap: <PremiumGate feature="Muscle Heatmap Analytics"><MuscleHeatmap muscleData={muscleData} /></PremiumGate>,
    workoutActivity: <WorkoutActivity workoutsThisMonth={workoutsThisMonth} totalSetsThisMonth={totalSetsThisMonth} lastWorkoutAt={fitnessStatsData?.last_workout_at || (workouts.length > 0 ? workouts[workouts.length - 1].started_at : null)} />,
    personalRecords: <PersonalRecords />,
    nutritionTracker: <NutritionTracker />,
    insights: null,
    recentEntries: (
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
                    <p className="font-display font-semibold text-sm">{format(new Date(entry.entry_date), "d MMM yyyy", { locale: ukLocale })}</p>
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
    ),
  };


  return (
    <div className="flex flex-col gap-[calc(var(--gap-section)/2)] animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
        <Avatar className="h-12 w-12 border-2 border-primary/20 animate-scale-in">
            {profile?.avatar_url ? (
              <AvatarImage src={profile.avatar_url} alt={profile?.full_name || ""} className="animate-fade-in" />
            ) : null}
            <AvatarFallback className="bg-accent">
              <UserCircle className="h-6 w-6 text-muted-foreground" />
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-display font-bold tracking-tight">
              {t.dashboard.hey}, {profile?.full_name || t.dashboard.there}! 💪
            </h1>
            <p className="text-muted-foreground text-xs">
              {fitnessScores.overall > 0 ? `Fit Score: ${fitnessScores.overall}` : t.dashboard.trackTransformation}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {editMode ? (
            <>
              <Button size="sm" variant="outline" onClick={resetPanels}>
                {t.dashboard.resetPanels}
              </Button>
              <Button size="sm" onClick={exitEditMode}>
                <Check className="mr-1.5 h-4 w-4" />{t.dashboard.donePanels}
              </Button>
            </>
          ) : !canLogEntry ? (
            <Button variant="outline" size="sm" disabled>
              <Clock className="mr-1.5 h-4 w-4" />{daysUntilCheckin}{t.dashboard.daysLeft}
            </Button>
          ) : null}
        </div>
      </div>

      {editMode ? (
        <div className="space-y-2">
          {orderedPanels.map((id, idx) => {
            const isHidden = panelConfig.hidden.includes(id);
            const name = t.dashboard.panelNames[id as keyof typeof t.dashboard.panelNames] || id;
            return (
              <div key={id} className={`flex items-center gap-2 rounded-xl border p-3 transition-colors ${isHidden ? "opacity-50 border-border/30" : "border-border"}`}>
                <div className="flex flex-col gap-0.5">
                  <Button variant="ghost" size="icon" className="h-6 w-6" disabled={idx === 0} onClick={() => movePanel(id, -1)}>
                    <ChevronUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6" disabled={idx === orderedPanels.length - 1} onClick={() => movePanel(id, 1)}>
                    <ChevronDown className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <span className="flex-1 font-display font-semibold text-sm">{name}</span>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => togglePanel(id)}>
                  {isHidden ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-primary" />}
                </Button>
              </div>
            );
          })}
        </div>
      ) : (
        <>
          {orderedPanels.map(id => {
            if (panelConfig.hidden.includes(id)) return null;
            const component = panelComponents[id];
            if (!component) return null;
            return <div key={id}>{component}</div>;
          })}
        </>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="glass-strong rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t.dashboard.deleteEntry}</AlertDialogTitle>
            <AlertDialogDescription>{t.dashboard.deleteConfirm}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.workouts.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t.dashboard.deleteEntry}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <NotificationPrompt />
    </div>
  );
};

export default Dashboard;
