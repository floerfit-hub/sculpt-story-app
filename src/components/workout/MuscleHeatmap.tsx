import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity } from "lucide-react";
import type { Json } from "@/integrations/supabase/types";
import muscleMapImage from "@/assets/muscle-map.png";

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
  // Smooth gradient: 1 set = 120 (green), 25+ sets = 0 (red)
  if (sets <= 0) return 120;
  if (sets >= 25) return 0;
  // Linear interpolation: green(120) → red(0)
  return 120 - (sets / 25) * 120;
}

function getHeatColor(sets: number, opacity = 0.5): string {
  if (sets === 0) return "transparent";
  const hue = getHeatHue(sets);
  // Increase saturation and brightness as sets increase
  const sat = 50 + Math.min(sets, 25) * 2; // 50-100
  const light = 50 - Math.min(sets, 25) * 0.4; // 50-40
  return `hsla(${hue}, ${sat}%, ${light}%, ${opacity})`;
}

function getLegendColor(sets: number): string {
  if (sets === 0) return "hsl(0 0% 70%)";
  const hue = getHeatHue(sets);
  const sat = 50 + Math.min(sets, 25) * 2;
  const light = 50 - Math.min(sets, 25) * 0.4;
  return `hsl(${hue} ${sat}% ${light}%)`;
}

interface MuscleData {
  sets: number;
  exercises: string[];
}

// Overlay regions mapped to the dual-view image (back left, front right)
// Coordinates are percentages of the image dimensions
const OVERLAY_REGIONS: Record<MuscleKey, { paths: string[] }> = {
  // Back view (left figure) - back muscles
  back: {
    paths: [
      // Upper back on rear figure
      "M 12,16 L 22,14 L 26,18 L 26,30 L 12,30 L 8,18 Z",
      // Lower back
      "M 13,30 L 25,30 L 25,38 L 13,38 Z",
    ],
  },
  // Front view (right figure) - chest
  chest: {
    paths: [
      "M 60,16 L 66,14 L 74,14 L 80,16 L 80,26 L 70,28 L 60,26 Z",
    ],
  },
  // Shoulders on both figures
  shoulders: {
    paths: [
      // Rear left shoulder
      "M 6,13 L 12,12 L 14,16 L 8,18 Z",
      // Rear right shoulder
      "M 26,12 L 32,13 L 30,18 L 24,16 Z",
      // Front left shoulder
      "M 56,13 L 62,12 L 64,16 L 58,18 Z",
      // Front right shoulder
      "M 76,12 L 82,13 L 80,18 L 74,16 Z",
    ],
  },
  // Arms on both figures
  arms: {
    paths: [
      // Rear left arm
      "M 4,18 L 8,18 L 7,32 L 3,36 L 1,32 Z",
      // Rear right arm
      "M 30,18 L 34,18 L 37,32 L 35,36 L 31,32 Z",
      // Front left arm
      "M 54,18 L 58,18 L 57,32 L 53,36 L 51,32 Z",
      // Front right arm
      "M 80,18 L 84,18 L 87,32 L 85,36 L 81,32 Z",
    ],
  },
  // Core on front figure
  core: {
    paths: [
      "M 62,28 L 76,28 L 76,40 L 62,40 Z",
    ],
  },
  // Legs & Glutes - glutes on rear, quads on front
  legsGlutes: {
    paths: [
      // Rear glutes
      "M 10,40 L 28,40 L 27,50 L 11,50 Z",
      // Rear left leg
      "M 11,50 L 18,50 L 17,72 L 14,80 L 11,72 Z",
      // Rear right leg
      "M 20,50 L 27,50 L 27,72 L 24,80 L 21,72 Z",
      // Front left leg
      "M 61,42 L 68,42 L 67,72 L 64,80 L 61,72 Z",
      // Front right leg
      "M 70,42 L 77,42 L 77,72 L 74,80 L 71,72 Z",
    ],
  },
};

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
          {/* Image with SVG overlay */}
          <div className="relative w-full max-w-xs mx-auto">
            <img
              src={muscleMapImage}
              alt="Muscle map"
              className="w-full h-auto"
              draggable={false}
            />
            <svg
              viewBox="0 0 100 90"
              className="absolute inset-0 w-full h-full"
              preserveAspectRatio="xMidYMid meet"
            >
              {(Object.entries(OVERLAY_REGIONS) as [MuscleKey, { paths: string[] }][]).map(
                ([key, region]) =>
                  region.paths.map((path, i) => (
                    <path
                      key={`${key}-${i}`}
                      d={path}
                      fill={getHeatColor(data[key].sets, selected === key ? 0.6 : 0.4)}
                      stroke={selected === key ? "hsl(var(--primary))" : "transparent"}
                      strokeWidth={selected === key ? 0.5 : 0}
                      className="cursor-pointer transition-all duration-200"
                      onClick={() => setSelected(selected === key ? null : key)}
                    />
                  ))
              )}
            </svg>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap justify-center gap-2 text-[10px]">
            {[
              { label: "0", color: getLegendColor(0) },
              { label: "1-9", color: getLegendColor(5) },
              { label: "10-24", color: getLegendColor(15) },
              { label: "25-39", color: getLegendColor(30) },
              { label: "40-49", color: getLegendColor(45) },
              { label: "50+", color: getLegendColor(55) },
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
                onClick={() => setSelected(selected === m.key ? null : m.key)}
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
