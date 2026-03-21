import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, BookOpen, History, BarChart3, RotateCcw } from "lucide-react";
import StartWorkout from "@/components/workout/StartWorkout";
import type { EditWorkoutData } from "@/components/workout/StartWorkout";
import ExerciseLibrary from "@/components/workout/ExerciseLibrary";
import WorkoutHistory from "@/components/workout/WorkoutHistory";
import WorkoutProgressCharts from "@/components/workout/WorkoutProgressCharts";
import WorkoutTemplates from "@/components/workout/WorkoutTemplates";
import { useToast } from "@/hooks/use-toast";

type WorkoutView = "hub" | "start" | "library" | "history" | "charts" | "edit";

interface TemplateStartData {
  exercises: { name: string; muscleGroup: string; sets: { weight: number | ""; reps: number | ""; rest_time: null }[] }[];
  name: string;
}

const Workouts = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { toast } = useToast();
  const [view, setView] = useState<WorkoutView>(() => {
    const saved = sessionStorage.getItem("workout-view");
    return (saved as WorkoutView) || "hub";
  });
  const [workoutCount, setWorkoutCount] = useState(0);
  const [editData, setEditData] = useState<EditWorkoutData | undefined>();
  const [templateStartData, setTemplateStartData] = useState<TemplateStartData | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("workouts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .then(({ count }) => setWorkoutCount(count ?? 0));
  }, [user]);

  useEffect(() => {
    sessionStorage.setItem("workout-view", view);
  }, [view]);

  const handleEdit = (data: EditWorkoutData) => {
    setEditData(data);
    setView("edit");
  };

  const handleStartFromTemplate = (exercises: TemplateStartData["exercises"], name: string) => {
    setTemplateStartData({ exercises, name });
    setView("start");
  };

  const duplicateLastWorkout = async () => {
    if (!user) return;
    const { data: lastWorkout } = await supabase
      .from("workouts")
      .select("id, name")
      .eq("user_id", user.id)
      .order("started_at", { ascending: false })
      .limit(1)
      .single();

    if (!lastWorkout) {
      toast({ title: t.templates.noLastWorkout, variant: "destructive" });
      return;
    }

    const { data: sets } = await supabase
      .from("workout_sets")
      .select("exercise_id, weight, reps, sort_order")
      .eq("workout_id", lastWorkout.id)
      .order("sort_order", { ascending: true });

    if (!sets?.length) {
      toast({ title: t.templates.noLastWorkout, variant: "destructive" });
      return;
    }

    // Get exercise names
    const exerciseIds = [...new Set(sets.map(s => s.exercise_id))];
    const { data: exercises } = await (supabase as any)
      .from("exercises")
      .select("id, name, muscle_group")
      .in("id", exerciseIds);

    const exMap = new Map((exercises || []).map((e: any) => [e.id, e as { id: string; name: string; muscle_group: string }]));

    // Group sets by exercise (by sort_order)
    const grouped = new Map<number, typeof sets>();
    for (const s of sets) {
      const arr = grouped.get(s.sort_order) || [];
      arr.push(s);
      grouped.set(s.sort_order, arr);
    }

    const templateExercises = [...grouped.entries()]
      .sort(([a], [b]) => a - b)
      .map(([_, groupSets]) => {
        const ex = exMap.get(groupSets[0].exercise_id) as { id: string; name: string; muscle_group: string } | undefined;
        return {
          name: ex?.name || "Unknown",
          muscleGroup: ex?.muscle_group || "Other",
          sets: groupSets.map(s => ({
            weight: s.weight as number | "",
            reps: s.reps as number | "",
            rest_time: null,
          })),
        };
      });

    setTemplateStartData({ exercises: templateExercises, name: lastWorkout.name || "" });
    setView("start");
  };

  if (view === "start") {
    const initialData = templateStartData;
    return (
      <StartWorkout
        onBack={() => { setView("hub"); setTemplateStartData(null); }}
        initialExercises={initialData?.exercises}
        initialName={initialData?.name}
      />
    );
  }
  if (view === "edit") return <StartWorkout onBack={() => { setEditData(undefined); setView("history"); }} editData={editData} />;
  if (view === "library") return <ExerciseLibrary onBack={() => setView("hub")} />;
  if (view === "history") return <WorkoutHistory onBack={() => setView("hub")} onEdit={handleEdit} />;
  if (view === "charts") return <WorkoutProgressCharts onBack={() => setView("hub")} />;

  const menuItems = [
    { key: "start" as const, icon: Play, label: t.workouts.startWorkout, desc: t.workouts.beginSession, color: "bg-primary text-primary-foreground" },
    { key: "library" as const, icon: BookOpen, label: t.workouts.exerciseLibrary, desc: t.workouts.browseExercises, color: "bg-accent text-accent-foreground" },
    { key: "history" as const, icon: History, label: t.workouts.workoutHistory, desc: `${workoutCount} ${t.workouts.workoutsLogged}`, color: "bg-accent text-accent-foreground" },
    { key: "charts" as const, icon: BarChart3, label: t.workouts.progressCharts, desc: t.workouts.trackStrength, color: "bg-accent text-accent-foreground" },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      <h1 className="text-2xl font-display font-bold">{t.workouts.title}</h1>

      <div className="grid gap-3">
        {menuItems.map((item) => (
          <Card key={item.key} className="cursor-pointer active:scale-[0.98] transition-transform" onClick={() => setView(item.key)}>
            <CardContent className="flex items-center gap-4 p-4">
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${item.color}`}>
                <item.icon className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <p className="font-display font-semibold">{item.label}</p>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Duplicate last workout button */}
      <Button variant="outline" className="w-full h-11" onClick={duplicateLastWorkout}>
        <RotateCcw className="h-4 w-4 mr-2" /> {t.templates.duplicateLastWorkout}
      </Button>

      {/* Workout Templates */}
      <WorkoutTemplates onStartFromTemplate={handleStartFromTemplate} />
    </div>
  );
};

export default Workouts;
