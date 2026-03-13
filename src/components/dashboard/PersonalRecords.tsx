import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { usePremium } from "@/hooks/usePremium";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "@/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, Plus, TrendingUp, ArrowLeft, Search } from "lucide-react";
import { format } from "date-fns";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import PremiumGate from "@/components/subscription/PremiumGate";
import { MUSCLE_GROUPS, type MuscleGroup } from "@/data/exerciseLibrary";

interface PRRecord {
  exerciseName: string;
  exerciseId: string;
  maxWeight: number;
  date: string;
  muscleGroup: string;
}

interface HistoryPoint {
  date: string;
  weight: number;
}

const PersonalRecords = () => {
  const { user } = useAuth();
  const { isPremium } = usePremium();
  const { t } = useTranslation();
  const { toast } = useToast();

  const [records, setRecords] = useState<PRRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPR, setSelectedPR] = useState<PRRecord | null>(null);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // Manual entry state
  const [manualExercise, setManualExercise] = useState("");
  const [manualWeight, setManualWeight] = useState("");
  const [manualDate, setManualDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [exercises, setExercises] = useState<{ id: string; name: string; muscle_group: string }[]>([]);
  const [savingManual, setSavingManual] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!user) return;
    fetchRecords();
    fetchExercises();
  }, [user]);

  const fetchExercises = async () => {
    const { data } = await supabase.from("exercises").select("id, name, muscle_group");
    if (data) setExercises(data);
  };

  const fetchRecords = async () => {
    if (!user) return;
    setLoading(true);

    const { data: sets } = await supabase
      .from("workout_sets")
      .select(`weight, created_at, workout_id, exercise_id, exercises!inner(name, muscle_group)`)
      .order("weight", { ascending: false });

    if (!sets) { setLoading(false); return; }

    const { data: userWorkouts } = await supabase
      .from("workouts")
      .select("id, started_at")
      .eq("user_id", user.id);

    if (!userWorkouts) { setLoading(false); return; }

    const workoutMap = new Map(userWorkouts.map(w => [w.id, w.started_at]));

    const prMap = new Map<string, PRRecord>();
    for (const s of sets as any[]) {
      const workoutDate = workoutMap.get(s.workout_id);
      if (!workoutDate) continue;

      const exName = s.exercises.name;
      const existing = prMap.get(s.exercise_id);
      if (!existing || s.weight > existing.maxWeight) {
        prMap.set(s.exercise_id, {
          exerciseName: exName,
          exerciseId: s.exercise_id,
          maxWeight: s.weight,
          date: workoutDate,
          muscleGroup: s.exercises.muscle_group,
        });
      }
    }

    setRecords(Array.from(prMap.values()).sort((a, b) => b.maxWeight - a.maxWeight));
    setLoading(false);
  };

  const fetchHistory = async (exerciseId: string) => {
    if (!user) return;
    setHistoryLoading(true);

    const { data: userWorkouts } = await supabase
      .from("workouts")
      .select("id, started_at")
      .eq("user_id", user.id)
      .order("started_at", { ascending: true });

    if (!userWorkouts) { setHistoryLoading(false); return; }

    const workoutMap = new Map(userWorkouts.map(w => [w.id, w.started_at]));

    const { data: sets } = await supabase
      .from("workout_sets")
      .select("weight, workout_id")
      .eq("exercise_id", exerciseId);

    if (!sets) { setHistoryLoading(false); return; }

    const workoutMax = new Map<string, { date: string; weight: number }>();
    for (const s of sets) {
      const date = workoutMap.get(s.workout_id);
      if (!date) continue;
      const existing = workoutMax.get(s.workout_id);
      if (!existing || s.weight > existing.weight) {
        workoutMax.set(s.workout_id, { date, weight: s.weight });
      }
    }

    const points = Array.from(workoutMax.values())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    setHistory(points);
    setHistoryLoading(false);
  };

  const handleCardClick = (pr: PRRecord) => {
    setSelectedPR(pr);
    fetchHistory(pr.exerciseId);
  };

  const progressPercent = useMemo(() => {
    if (history.length < 2) return null;
    const first = history[0].weight;
    const last = history[history.length - 1].weight;
    if (first === 0) return null;
    return Math.round(((last - first) / first) * 100);
  }, [history]);

  // Group exercises by muscle group and filter by search
  const groupedExercises = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const groups: Record<string, typeof exercises> = {};

    for (const mg of MUSCLE_GROUPS) {
      const filtered = exercises.filter(
        (ex) =>
          ex.muscle_group === mg &&
          (q === "" ||
            (t.exerciseNames[ex.name] || ex.name).toLowerCase().includes(q) ||
            ex.name.toLowerCase().includes(q))
      );
      if (filtered.length > 0) groups[mg] = filtered;
    }

    return groups;
  }, [exercises, searchQuery, t]);

  const handleManualSave = async () => {
    if (!user || !manualExercise || !manualWeight) return;
    setSavingManual(true);

    try {
      const selectedEx = exercises.find(e => e.id === manualExercise);
      if (!selectedEx) throw new Error("Exercise not found");

      const { data: workout, error: wErr } = await supabase
        .from("workouts")
        .insert({
          user_id: user.id,
          started_at: new Date(manualDate).toISOString(),
          finished_at: new Date(manualDate).toISOString(),
          duration_seconds: 0,
          notes: "Manual PR entry",
        })
        .select("id")
        .single();

      if (wErr || !workout) throw wErr;

      const { error: sErr } = await supabase
        .from("workout_sets")
        .insert({
          workout_id: workout.id,
          exercise_id: manualExercise,
          weight: Number(manualWeight),
          reps: 1,
          set_number: 1,
          sort_order: 0,
        });

      if (sErr) throw sErr;

      toast({ title: t.pr.recordAdded });
      setShowAddModal(false);
      setManualExercise("");
      setManualWeight("");
      setManualDate(format(new Date(), "yyyy-MM-dd"));
      setSearchQuery("");
      fetchRecords();
    } catch (e: any) {
      toast({ title: t.common.error, description: e?.message, variant: "destructive" });
    } finally {
      setSavingManual(false);
    }
  };

  const muscleGroupLabel = (mg: string): string => {
    const key: Record<string, string> = {
      "Legs & Glutes": "legsGlutes", Back: "back", Chest: "chest",
      Shoulders: "shoulders", Arms: "arms", Core: "core",
    };
    return t.muscleGroups?.[key[mg] || mg] || mg;
  };

  if (selectedPR) {
    return (
      <Card className="animate-fade-in">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedPR(null)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex-1">
              <CardTitle className="font-display text-base flex items-center gap-2">
                <Trophy className="h-4 w-4 text-yellow-500" />
                {t.exerciseNames[selectedPR.exerciseName] || selectedPR.exerciseName}
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t.pr.maxWeight}: {selectedPR.maxWeight} {t.common.kg}
              </p>
            </div>
            {progressPercent !== null && (
              <Badge className={`${progressPercent >= 0 ? "bg-green-500/15 text-green-500 border-green-500/30" : "bg-red-500/15 text-red-500 border-red-500/30"}`}>
                <TrendingUp className="h-3 w-3 mr-1" />
                {progressPercent >= 0 ? "+" : ""}{progressPercent}%
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <PremiumGate feature={t.pr.progressView}>
            {historyLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : history.length < 2 ? (
              <p className="text-sm text-muted-foreground text-center py-4">{t.pr.needMoreData}</p>
            ) : (
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={history}>
                    <XAxis dataKey="date" tickFormatter={(d) => format(new Date(d), "dd.MM")} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" domain={["dataMin - 5", "dataMax + 5"]} />
                    <Tooltip
                      contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: "12px", fontSize: "12px" }}
                      labelFormatter={(d) => format(new Date(d), "dd MMM yyyy")}
                      formatter={(val: number) => [`${val} ${t.common.kg}`, t.pr.maxWeight]}
                    />
                    <Line type="monotone" dataKey="weight" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ fill: "hsl(var(--primary))", r: 3 }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </PremiumGate>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="animate-fade-in">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="font-display text-sm flex items-center gap-2">
              <Trophy className="h-4 w-4 text-yellow-500" />
              {t.pr.title}
            </CardTitle>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setShowAddModal(true)}>
              <Plus className="h-3 w-3" />
              {t.pr.addManual}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : records.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-3">{t.pr.noRecords}</p>
          ) : (
            <div className="grid grid-cols-2 gap-1.5">
              {records.slice(0, 6).map((pr) => (
                <div
                  key={pr.exerciseId}
                  onClick={() => handleCardClick(pr)}
                  className="group relative rounded-lg border border-border/50 px-2.5 py-2 cursor-pointer transition-all hover:border-primary/40 hover:bg-accent/30 active:scale-[0.98]"
                >
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Trophy className="h-3 w-3 text-yellow-500/70 shrink-0" />
                    <p className="font-display font-semibold text-[11px] leading-tight line-clamp-1 flex-1">
                      {t.exerciseNames[pr.exerciseName] || pr.exerciseName}
                    </p>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <p className="text-base font-display font-bold text-primary tabular-nums">
                      {pr.maxWeight} <span className="text-[10px] font-normal text-muted-foreground">{t.common.kg}</span>
                    </p>
                    <p className="text-[9px] text-muted-foreground">
                      {format(new Date(pr.date), "dd.MM.yy")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
          {records.length > 6 && (
            <p className="text-[10px] text-muted-foreground text-center mt-1.5">
              +{records.length - 6} {t.pr.moreRecords}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Manual PR Entry Modal */}
      <Dialog open={showAddModal} onOpenChange={(open) => {
        setShowAddModal(open);
        if (!open) { setSearchQuery(""); setManualExercise(""); }
      }}>
        <DialogContent className="rounded-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2 text-base">
              <Trophy className="h-4 w-4 text-yellow-500" />
              {t.pr.addManualTitle}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 flex-1 overflow-hidden flex flex-col">
            {/* Exercise search & selection */}
            <div className="space-y-1.5">
              <Label className="text-xs">{t.pr.exercise}</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  className="pl-9 h-9 text-sm"
                  placeholder={t.pr.searchExercise || "Пошук вправи..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="max-h-40 overflow-y-auto rounded-lg border border-border/50 divide-y divide-border/30">
                {Object.entries(groupedExercises).length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-3">{t.pr.noExercisesFound || "Нічого не знайдено"}</p>
                ) : (
                  Object.entries(groupedExercises).map(([group, exs]) => (
                    <div key={group}>
                      <div className="px-2.5 py-1 bg-muted/50 text-[10px] font-bold text-muted-foreground uppercase tracking-wider sticky top-0">
                        {muscleGroupLabel(group)}
                      </div>
                      {exs.map((ex) => (
                        <button
                          key={ex.id}
                          type="button"
                          onClick={() => setManualExercise(ex.id)}
                          className={`w-full text-left px-2.5 py-1.5 text-xs transition-colors hover:bg-accent/40 ${
                            manualExercise === ex.id ? "bg-primary/10 text-primary font-semibold" : ""
                          }`}
                        >
                          {t.exerciseNames[ex.name] || ex.name}
                        </button>
                      ))}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Weight & Date */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">{t.pr.maxWeight} ({t.common.kg})</Label>
                <Input type="number" className="h-9 text-sm" value={manualWeight} onChange={(e) => setManualWeight(e.target.value)} placeholder="100" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t.pr.date}</Label>
                <Input type="date" className="h-9 text-sm" value={manualDate} onChange={(e) => setManualDate(e.target.value)} />
              </div>
            </div>

            <Button
              className="w-full h-9 text-sm"
              onClick={handleManualSave}
              disabled={savingManual || !manualExercise || !manualWeight}
            >
              {savingManual ? t.profile.saving : t.pr.saveRecord}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PersonalRecords;
