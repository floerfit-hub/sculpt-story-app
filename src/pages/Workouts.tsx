import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Play, BookOpen, History, BarChart3 } from "lucide-react";
import StartWorkout from "@/components/workout/StartWorkout";
import type { EditWorkoutData } from "@/components/workout/StartWorkout";
import ExerciseLibrary from "@/components/workout/ExerciseLibrary";
import WorkoutHistory from "@/components/workout/WorkoutHistory";
import WorkoutProgressCharts from "@/components/workout/WorkoutProgressCharts";

type WorkoutView = "hub" | "start" | "library" | "history" | "charts" | "edit";

const Workouts = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [view, setView] = useState<WorkoutView>(() => {
    const saved = sessionStorage.getItem("workout-view");
    return (saved as WorkoutView) || "hub";
  });
  const [workoutCount, setWorkoutCount] = useState(0);
  const [editData, setEditData] = useState<EditWorkoutData | undefined>();

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

  if (view === "start") return <StartWorkout onBack={() => setView("hub")} />;
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
    </div>
  );
};

export default Workouts;
