import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity } from "lucide-react";
import type { Json } from "@/integrations/supabase/types";
import MuscleBodySvg from "./MuscleBodySvg";

type MuscleKey = "legsGlutes" | "back" | "chest" | "shoulders" | "arms" | "core";

const MUSCLE_GROUP_MAP: Record<string, MuscleKey> = {
  "Legs & Glutes": "legsGlutes",
  "Back": "back",
  "Chest": "chest",
  "Shoulders": "shoulders",
  "Arms": "arms",
  "Core": "core",
};

function getHeatHue(sets: number): number {
  if (sets <= 0) return 120;
  if (sets >= 25) return 0;
  return 120 - (sets / 25) * 120;
}

function getHeatColor(sets: number, opacity = 0.55): string {
  if (sets === 0) return "transparent";
  const hue = getHeatHue(sets);
  const sat = 55 + Math.min(sets, 25) * 1.8;
  const light = 52 - Math.min(sets, 25) * 0.5;
  return `hsla(${hue}, ${sat}%, ${light}%, ${opacity})`;
}

function getLegendColor(sets: number): string {
  if (sets === 0) return "hsl(0 0% 70%)";
  const hue = getHeatHue(sets);
  const sat = 55 + Math.min(sets, 25) * 1.8;
  const light = 52 - Math.min(sets, 25) * 0.5;
  return `hsl(${hue} ${sat}% ${light}%)`;
}

interface MuscleData {
  sets: number;
  exercises: string[];
}

const MuscleHeatmap = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [data, setData] = useState<Record<MuscleKey, MuscleData>>({
    legsGlutes: { sets: 0, exercises: [] },
    back: { sets: 0, exercises: [] },
    chest: { sets: 0, exercises: [] },
    shoulders: { sets: 0, exercises: [] },
    arms: { sets: 0, exercises: [] },
    core: { sets: 0, exercises: [] },
  });
  const [selected, setSelected] = useState<MuscleKey | null>(null);

  useEffect(() => {
    if (!user) return;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const fetchData = async () => {
      const { data: workouts } = await supabase
        .from("workouts")
        .select("id")
        .eq("user_id", user.id)
        .gte("started_at", thirtyDaysAgo.toISOString());

      if (!workouts?.length) return;

      const { data: exercises } = await supabase
        .from("workout_exercises")
        .select("muscle_group, exercise_name, sets")
        .in("workout_id", workouts.map((w) => w.id));

      if (!exercises) return;

      const result: Record<MuscleKey, MuscleData> = {
        legsGlutes: { sets: 0, exercises: [] },
        back: { sets: 0, exercises: [] },
        chest: { sets: 0, exercises: [] },
        shoulders: { sets: 0, exercises: [] },
        arms: { sets: 0, exercises: [] },
        core: { sets: 0, exercises: [] },
      };

      exercises.forEach((ex) => {
        const key = MUSCLE_GROUP_MAP[ex.muscle_group];
        if (!key) return;
        const setsArr = ex.sets as Json[];
        result[key].sets += Array.isArray(setsArr) ? setsArr.length : 0;
        if (!result[key].exercises.includes(ex.exercise_name)) {
          result[key].exercises.push(ex.exercise_name);
        }
      });

      setData(result);
    };

    fetchData();
  }, [user]);

  const muscles: { key: MuscleKey; label: string }[] = [
    { key: "shoulders", label: t.muscleGroups.shoulders },
    { key: "chest", label: t.muscleGroups.chest },
    { key: "arms", label: t.muscleGroups.arms },
    { key: "back", label: t.muscleGroups.back },
    { key: "core", label: t.muscleGroups.core },
    { key: "legsGlutes", label: t.muscleGroups.legsGlutes },
  ];

  const getFill = (key: MuscleKey) =>
    getHeatColor(data[key].sets, selected === key ? 0.7 : 0.55);

  const getStroke = (key: MuscleKey) =>
    selected === key ? "hsl(var(--primary))" : "transparent";

  const getStrokeWidth = (key: MuscleKey) => (selected === key ? 1.2 : 0);

  const handleClick = (key: MuscleKey) =>
    setSelected(selected === key ? null : key);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="font-display text-lg flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          {t.dashboard.muscleActivity}
        </CardTitle>
        <p className="text-xs text-muted-foreground">{t.dashboard.last30Days}</p>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center gap-4">
          <MuscleBodySvg
            getFill={getFill}
            getStroke={getStroke}
            getStrokeWidth={getStrokeWidth}
            onClickMuscle={handleClick}
          />

          {/* Legend */}
          <div className="flex flex-wrap justify-center gap-2 text-[10px]">
            {[
              { label: "0", color: getLegendColor(0) },
              { label: "1-4", color: getLegendColor(2) },
              { label: "5-9", color: getLegendColor(7) },
              { label: "10-14", color: getLegendColor(12) },
              { label: "15-24", color: getLegendColor(20) },
              { label: "25+", color: getLegendColor(25) },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-1">
                <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: item.color }} />
                <span className="text-muted-foreground">{item.label}</span>
              </div>
            ))}
          </div>

          {/* Muscle group pills */}
          <div className="flex flex-wrap justify-center gap-1.5">
            {muscles.map((m) => (
              <button
                key={m.key}
                onClick={() => handleClick(m.key)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  selected === m.key
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-accent"
                }`}
              >
                {m.label}: {data[m.key].sets}
              </button>
            ))}
          </div>

          {/* Detail panel */}
          {selected && (
            <div className="w-full rounded-lg border bg-accent/50 p-3 animate-fade-in">
              <p className="font-display font-semibold text-sm">
                {muscles.find((m) => m.key === selected)?.label}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {data[selected].sets} {t.dashboard.setsLast30}
              </p>
              {data[selected].exercises.length > 0 ? (
                <ul className="mt-2 space-y-0.5">
                  {data[selected].exercises.map((ex) => (
                    <li key={ex} className="text-xs text-foreground">
                      • {t.exerciseNames[ex] || ex}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground mt-1">{t.dashboard.noExercisesLogged}</p>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default MuscleHeatmap;
