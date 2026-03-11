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

// Overlay regions for new muscle-map image (200×200, front-left, back-right)
// ViewBox: 0 0 100 100 (percentage coordinates)
const OVERLAY_REGIONS: Record<MuscleKey, { paths: string[] }> = {
  // BACK — on rear figure (RIGHT side, centered ~x=72)
  back: {
    paths: [
      // Upper back / lats (right figure)
      "M 64,24 L 68,22 L 72,21 L 76,22 L 80,24 L 80,36 C 78,38 76,39 72,39 C 68,39 66,38 64,36 Z",
      // Lower back
      "M 66,39 C 68,40 70,41 72,41 C 74,41 76,40 78,39 L 78,48 C 76,49 74,50 72,50 C 70,50 68,49 66,48 Z",
    ],
  },
  // CHEST — on front figure (LEFT side, centered ~x=28)
  chest: {
    paths: [
      // Left pec
      "M 21,23 C 22,21 24,20 27,21 L 29,23 C 30,25 30,28 29,30 C 27,32 24,33 22,31 C 20,29 20,26 21,24 Z",
      // Right pec
      "M 29,23 C 30,21 32,20 35,21 L 37,23 C 38,25 38,28 37,30 C 35,32 32,33 30,31 C 28,29 28,26 29,24 Z",
    ],
  },
  // SHOULDERS — deltoids on both figures
  shoulders: {
    paths: [
      // Front left delt
      "M 16,19 C 18,16 20,15 22,17 L 22,24 C 21,27 19,28 17,26 Z",
      // Front right delt
      "M 40,19 C 38,16 36,15 34,17 L 34,24 C 35,27 37,28 39,26 Z",
      // Rear left delt
      "M 60,19 C 62,16 64,15 66,17 L 66,24 C 65,27 63,28 61,26 Z",
      // Rear right delt
      "M 84,19 C 82,16 80,15 78,17 L 78,24 C 79,27 81,28 83,26 Z",
    ],
  },
  // ARMS — biceps/triceps on both figures
  arms: {
    paths: [
      // Front left arm
      "M 15,26 C 14,30 12,36 11,42 C 10,46 11,48 12,46 C 13,42 14,36 16,30 C 17,27 17,25 16,26 Z",
      // Front right arm
      "M 41,26 C 42,30 44,36 45,42 C 46,46 45,48 44,46 C 43,42 42,36 40,30 C 39,27 39,25 40,26 Z",
      // Rear left arm
      "M 59,26 C 58,30 56,36 55,42 C 54,46 55,48 56,46 C 57,42 58,36 60,30 C 61,27 61,25 60,26 Z",
      // Rear right arm
      "M 85,26 C 86,30 88,36 89,42 C 90,46 89,48 88,46 C 87,42 86,36 84,30 C 83,27 83,25 84,26 Z",
    ],
  },
  // CORE — abs on front figure (LEFT)
  core: {
    paths: [
      "M 24,32 C 26,33 28,34 30,34 C 32,34 34,33 36,32 L 36,48 C 34,50 32,51 30,51 C 28,51 26,50 24,48 Z",
    ],
  },
  // LEGS & GLUTES
  legsGlutes: {
    paths: [
      // Rear glutes (right figure)
      "M 65,50 C 67,48 70,47 72,47 C 74,47 77,48 79,50 L 79,56 C 77,58 75,59 72,59 C 69,59 67,58 65,56 Z",
      // Front left quad
      "M 22,52 C 24,50 26,49 28,50 L 29,52 L 28,72 C 27,74 26,75 25,74 C 24,72 23,68 22,62 Z",
      // Front right quad
      "M 36,52 C 34,50 32,49 30,50 L 29,52 L 30,72 C 31,74 32,75 33,74 C 34,72 35,68 36,62 Z",
      // Rear left hamstring
      "M 65,59 C 67,58 69,57 71,58 L 72,60 L 71,78 C 70,80 69,81 68,80 C 67,78 66,74 65,68 Z",
      // Rear right hamstring
      "M 79,59 C 77,58 75,57 73,58 L 72,60 L 73,78 C 74,80 75,81 76,80 C 77,78 78,74 79,68 Z",
      // Front left calf
      "M 24,74 C 25,76 26,75 27,74 L 27,86 C 26,88 25,89 24,88 Z",
      // Front right calf
      "M 34,74 C 33,76 32,75 31,74 L 31,86 C 32,88 33,89 34,88 Z",
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
              viewBox="0 0 100 100"
              className="absolute inset-0 w-full h-full"
              preserveAspectRatio="xMidYMid meet"
            >
              {(Object.entries(OVERLAY_REGIONS) as [MuscleKey, { paths: string[] }][]).map(
                ([key, region]) =>
                  region.paths.map((path, i) => (
                    <path
                      key={`${key}-${i}`}
                      d={path}
                      fill={getHeatColor(data[key].sets, selected === key ? 0.65 : 0.5)}
                      stroke={selected === key ? "hsl(var(--primary))" : "transparent"}
                      strokeWidth={selected === key ? 1.5 : 0}
                      strokeLinejoin="round"
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
