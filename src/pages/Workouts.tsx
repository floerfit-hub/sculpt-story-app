import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, BookOpen, History, BarChart3 } from "lucide-react";
import StartWorkout from "@/components/workout/StartWorkout";
import ExerciseLibrary from "@/components/workout/ExerciseLibrary";
import WorkoutHistory from "@/components/workout/WorkoutHistory";
import WorkoutProgressCharts from "@/components/workout/WorkoutProgressCharts";

type WorkoutView = "hub" | "start" | "library" | "history" | "charts";

const Workouts = () => {
  const { user } = useAuth();
  const [view, setView] = useState<WorkoutView>("hub");
  const [workoutCount, setWorkoutCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("workouts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .then(({ count }) => setWorkoutCount(count ?? 0));
  }, [user]);

  if (view === "start") return <StartWorkout onBack={() => setView("hub")} />;
  if (view === "library") return <ExerciseLibrary onBack={() => setView("hub")} />;
  if (view === "history") return <WorkoutHistory onBack={() => setView("hub")} />;
  if (view === "charts") return <WorkoutProgressCharts onBack={() => setView("hub")} />;

  const menuItems = [
    { key: "start" as const, icon: Play, label: "Start Workout", desc: "Begin a new training session", color: "bg-primary text-primary-foreground" },
    { key: "library" as const, icon: BookOpen, label: "Exercise Library", desc: "Browse all exercises by muscle group", color: "bg-accent text-accent-foreground" },
    { key: "history" as const, icon: History, label: "Workout History", desc: `${workoutCount} workout${workoutCount !== 1 ? "s" : ""} logged`, color: "bg-accent text-accent-foreground" },
    { key: "charts" as const, icon: BarChart3, label: "Progress Charts", desc: "Track strength gains over time", color: "bg-accent text-accent-foreground" },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      <h1 className="text-2xl font-display font-bold">Workouts</h1>
      <div className="grid gap-3">
        {menuItems.map((item) => (
          <Card
            key={item.key}
            className="cursor-pointer active:scale-[0.98] transition-transform"
            onClick={() => setView(item.key)}
          >
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
