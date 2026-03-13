import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { usePremium } from "@/hooks/usePremium";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "@/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, Plus, TrendingUp, ArrowLeft, Crown } from "lucide-react";
import { format } from "date-fns";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import PremiumGate from "@/components/subscription/PremiumGate";

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
  const [manualMuscleGroup, setManualMuscleGroup] = useState("");
  const [exercises, setExercises] = useState<{ id: string; name: string; muscle_group: string }[]>([]);
  const [savingManual, setSavingManual] = useState(false);

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

    // Get all workout_sets with exercise info, find max weight per exercise
    const { data: sets } = await supabase
      .from("workout_sets")
      .select(`
        weight,
        created_at,
        workout_id,
        exercise_id,
        exercises!inner(name, muscle_group)
      `)
      .order("weight", { ascending: false });

    if (!sets) { setLoading(false); return; }

    // Filter to only user's workouts
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

    // Group by workout, take max weight per workout
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

  const handleManualSave = async () => {
    if (!user || !manualExercise || !manualWeight) return;
    setSavingManual(true);

    try {
      const selectedEx = exercises.find(e => e.id === manualExercise);
      if (!selectedEx) throw new Error("Exercise not found");

      // Create a workout entry for the manual record
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
      fetchRecords();
    } catch (e: any) {
      toast({ title: t.common.error, description: e?.message, variant: "destructive" });
    } finally {
      setSavingManual(false);
    }
  };

  const muscleGroupKey = (mg: string): string => {
    const map: Record<string, string> = {
      "Legs & Glutes": "legsGlutes", Back: "back", Chest: "chest",
      Shoulders: "shoulders", Arms: "arms", Core: "core",
    };
    return map[mg] || mg;
  };

  if (selectedPR) {
    return (
      <Card className="animate-fade-in">
        <CardHeader className="pb-3">
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
              <div className="flex items-center justify-center py-10">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : history.length < 2 ? (
              <p className="text-sm text-muted-foreground text-center py-6">{t.pr.needMoreData}</p>
            ) : (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={history}>
                    <XAxis
                      dataKey="date"
                      tickFormatter={(d) => format(new Date(d), "dd.MM")}
                      tick={{ fontSize: 10 }}
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <YAxis
                      tick={{ fontSize: 10 }}
                      stroke="hsl(var(--muted-foreground))"
                      domain={["dataMin - 5", "dataMax + 5"]}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "12px",
                        fontSize: "12px",
                      }}
                      labelFormatter={(d) => format(new Date(d), "dd MMM yyyy")}
                      formatter={(val: number) => [`${val} ${t.common.kg}`, t.pr.maxWeight]}
                    />
                    <Line
                      type="monotone"
                      dataKey="weight"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2.5}
                      dot={{ fill: "hsl(var(--primary))", r: 3 }}
                      activeDot={{ r: 5 }}
                    />
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
        <CardHeader className="pb-3">
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
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : records.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">{t.pr.noRecords}</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {records.slice(0, 8).map((pr) => (
                <div
                  key={pr.exerciseId}
                  onClick={() => handleCardClick(pr)}
                  className="group relative rounded-xl border border-border/50 p-3 cursor-pointer transition-all hover:border-primary/40 hover:bg-accent/30 active:scale-[0.98]"
                >
                  <div className="flex items-start justify-between mb-1.5">
                    <Trophy className="h-3.5 w-3.5 text-yellow-500/70 shrink-0 mt-0.5" />
                    {isPremium && (
                      <TrendingUp className="h-3 w-3 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                    )}
                  </div>
                  <p className="font-display font-semibold text-xs leading-tight line-clamp-2 mb-1">
                    {t.exerciseNames[pr.exerciseName] || pr.exerciseName}
                  </p>
                  <p className="text-lg font-display font-bold text-primary tabular-nums">
                    {pr.maxWeight} <span className="text-xs font-normal text-muted-foreground">{t.common.kg}</span>
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {format(new Date(pr.date), "dd.MM.yyyy")}
                  </p>
                </div>
              ))}
            </div>
          )}
          {records.length > 8 && (
            <p className="text-xs text-muted-foreground text-center mt-2">
              +{records.length - 8} {t.pr.moreRecords}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Manual PR Entry Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              {t.pr.addManualTitle}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>{t.pr.exercise}</Label>
              <Select value={manualExercise} onValueChange={(v) => {
                setManualExercise(v);
                const ex = exercises.find(e => e.id === v);
                if (ex) setManualMuscleGroup(ex.muscle_group);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder={t.pr.selectExercise} />
                </SelectTrigger>
                <SelectContent>
                  {exercises.map((ex) => (
                    <SelectItem key={ex.id} value={ex.id}>
                      {t.exerciseNames[ex.name] || ex.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t.pr.maxWeight} ({t.common.kg})</Label>
              <Input
                type="number"
                value={manualWeight}
                onChange={(e) => setManualWeight(e.target.value)}
                placeholder="100"
              />
            </div>
            <div className="space-y-2">
              <Label>{t.pr.date}</Label>
              <Input
                type="date"
                value={manualDate}
                onChange={(e) => setManualDate(e.target.value)}
              />
            </div>
            <Button
              className="w-full"
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
