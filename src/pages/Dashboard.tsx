import { useEffect, useState, useMemo, useCallback, ReactNode } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { usePremium } from "@/hooks/usePremium";
import PersonalRecords from "@/components/dashboard/PersonalRecords";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { PlusCircle, Clock, Pencil, Trash2, Crown, ChevronUp, ChevronDown, Eye, EyeOff, Check } from "lucide-react";
import { format, differenceInDays, addDays, startOfMonth, subDays } from "date-fns";
import { uk as ukLocale } from "date-fns/locale";
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
import { useFitnessStats } from "@/hooks/useFitnessStats";

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

const PANEL_IDS = ["checkin", "fitnessScore", "weightChart", "measurements", "muscleHeatmap", "workoutActivity", "personalRecords", "nutrition", "insights", "recentEntries"] as const;
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

const Dashboard = () => {
  const { user, profile } = useAuth();
  const { t } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [editMode, setEditMode] = useState(searchParams.get("edit") === "true");
  const [panelConfig, setPanelConfig] = useState<PanelConfig>(loadPanelConfig);
  const [entries, setEntries] = useState<ProgressEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [nutrition, setNutrition] = useState<{ calories: number; protein: number; fat: number; carbs: number } | null>(null);
  const [workouts, setWorkouts] = useState<Tables<"workouts">[]>([]);
  const [perfData, setPerfData] = useState<PerfData[]>([]);
  const [exerciseMap, setExerciseMap] = useState<Map<string, ExerciseInfo>>(new Map());

  useEffect(() => {
    try {
      const saved = localStorage.getItem("nutrition_results");
      if (saved) setNutrition(JSON.parse(saved));
    } catch {}
  }, []);

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

  const fitnessScores = useMemo(() => {
    const thirtyDaysAgo = subDays(new Date(), 30);
    const recentWorkouts = workouts.filter((w) => new Date(w.started_at) >= thirtyDaysAgo).length;
    const workoutsPerWeek = (recentWorkouts / 30) * 7;
    const trainingConsistency = Math.min(100, Math.round((workoutsPerWeek / 4) * 100));

    let strengthProgress = 50;
    const sortedW = [...workouts].sort((a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime());
    const wOrder = new Map(sortedW.map((w, i) => [w.id, i]));
    const exerciseHistory: Record<string, number[]> = {};
    perfData
      .sort((a, b) => (wOrder.get(a.workout_id) ?? 0) - (wOrder.get(b.workout_id) ?? 0))
      .forEach((p) => {
        const ex = exerciseMap.get(p.exercise_id);
        if (ex) {
          if (!exerciseHistory[ex.name]) exerciseHistory[ex.name] = [];
          exerciseHistory[ex.name].push(Number(p.max_weight));
        }
      });
    const improvements = Object.values(exerciseHistory).filter((weights) => {
      if (weights.length < 2) return false;
      return weights[weights.length - 1] > weights[0];
    }).length;
    const totalExercises = Object.keys(exerciseHistory).length;
    if (totalExercises > 0) strengthProgress = Math.min(100, Math.round((improvements / totalExercises) * 100));

    let bodyProgress = 50;
    if (entries.length >= 2) {
      const first = entries[0];
      const last = entries[entries.length - 1];
      let positiveChanges = 0;
      let totalMeasured = 0;
      if (last.waist != null && first.waist != null) { totalMeasured++; if (last.waist <= first.waist) positiveChanges++; }
      if (last.body_fat != null && first.body_fat != null) { totalMeasured++; if (last.body_fat <= first.body_fat) positiveChanges++; }
      if (last.arm_circumference != null && first.arm_circumference != null) { totalMeasured++; if (last.arm_circumference >= first.arm_circumference) positiveChanges++; }
      if (last.chest != null && first.chest != null) { totalMeasured++; if (last.chest >= first.chest) positiveChanges++; }
      if (totalMeasured > 0) bodyProgress = Math.round((positiveChanges / totalMeasured) * 100);
    }

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
  }, [workouts, perfData, exerciseMap, entries, muscleData]);

  // Ensure all panel IDs are in order (handle new panels added after user saved config)
  const orderedPanels = useMemo(() => {
    const ordered = [...panelConfig.order];
    PANEL_IDS.forEach(id => { if (!ordered.includes(id)) ordered.push(id); });
    return ordered;
  }, [panelConfig.order]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
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

  const panelComponents: Record<PanelId, ReactNode> = {
    checkin: canLogEntry && entries.length > 0 ? (
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
    ) : null,
    fitnessScore: <PremiumGate feature="Fitness Score Dashboard"><FitnessScore {...fitnessScores} /></PremiumGate>,
    weightChart: <WeightChart entries={entries} />,
    measurements: <PremiumGate feature="Body Composition Dashboard"><MeasurementsCard latest={latest} previous={previous} /></PremiumGate>,
    muscleHeatmap: <PremiumGate feature="Muscle Heatmap Analytics"><MuscleHeatmap muscleData={muscleData} /></PremiumGate>,
    workoutActivity: <WorkoutActivity workoutsThisMonth={workoutsThisMonth} totalSetsThisMonth={totalSetsThisMonth} currentStreak={currentStreak} />,
    personalRecords: <PersonalRecords />,
    nutrition: <NutritionSummary nutrition={nutrition} />,
    insights: <PremiumGate feature="AI Training Insights"><SmartInsights entries={entries} muscleData={muscleData} strengthTrending={strengthTrending} /></PremiumGate>,
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
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-extrabold tracking-tight">
            {t.dashboard.hey}, {profile?.full_name || t.dashboard.there} 💪
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">{t.dashboard.trackTransformation}</p>
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
          ) : canLogEntry ? (
            <Link to="/add-entry">
              <Button size="sm"><PlusCircle className="mr-1.5 h-4 w-4" />{t.dashboard.newEntry}</Button>
            </Link>
          ) : (
            <Button variant="outline" size="sm" disabled>
              <Clock className="mr-1.5 h-4 w-4" />{daysUntilCheckin}{t.dashboard.daysLeft}
            </Button>
          )}
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
    </div>
  );
};

export default Dashboard;
