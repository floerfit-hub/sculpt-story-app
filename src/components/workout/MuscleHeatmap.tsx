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
// Precise overlay regions traced to match the muscle-map.png anatomy illustration
// ViewBox: 0 0 200 260 — coordinates match the dual-figure layout (back left, front right)
const OVERLAY_REGIONS: Record<MuscleKey, { paths: string[] }> = {
  // BACK — upper & lower back on rear figure (left)
  back: {
    paths: [
      // Upper back / lats (rear figure)
      "M 30,44 C 30,42 33,38 38,37 L 42,37 C 42,37 44,38 46,38 L 50,38 C 55,38 58,37 60,37 C 65,38 68,42 68,44 L 68,60 C 66,62 62,63 60,63 L 56,64 C 52,65 48,65 44,64 L 40,63 C 36,62 32,60 30,58 Z",
      // Lower back (rear figure)
      "M 36,63 C 38,64 42,65 48,66 C 54,65 58,64 62,63 L 62,75 C 60,76 56,77 48,77 C 42,77 38,76 36,75 Z",
    ],
  },
  // CHEST — pectorals on front figure (right)
  chest: {
    paths: [
      // Left pec
      "M 130,38 C 132,36 136,35 140,36 L 146,38 C 148,40 148,44 148,47 C 146,50 142,52 138,52 C 134,51 130,48 130,44 Z",
      // Right pec
      "M 150,38 C 152,36 156,35 160,36 L 166,38 C 168,40 168,44 168,47 C 166,50 162,52 158,52 C 154,51 150,48 150,44 Z",
    ],
  },
  // SHOULDERS — deltoids on both figures
  shoulders: {
    paths: [
      // Rear left delt
      "M 22,34 C 24,30 28,28 32,30 L 32,38 C 30,42 26,42 24,40 Z",
      // Rear right delt
      "M 76,34 C 74,30 70,28 66,30 L 66,38 C 68,42 72,42 74,40 Z",
      // Front left delt
      "M 122,34 C 124,30 128,28 132,30 L 132,38 C 130,42 126,42 124,40 Z",
      // Front right delt
      "M 176,34 C 174,30 170,28 166,30 L 166,38 C 168,42 172,42 174,40 Z",
    ],
  },
  // ARMS — biceps/triceps on both figures
  arms: {
    paths: [
      // Rear left arm (tricep)
      "M 22,40 C 20,42 18,46 16,52 C 14,58 14,62 15,66 C 16,64 18,58 20,54 C 22,48 24,44 24,40 Z",
      // Rear right arm (tricep)
      "M 76,40 C 78,42 80,46 82,52 C 84,58 84,62 83,66 C 82,64 80,58 78,54 C 76,48 74,44 74,40 Z",
      // Front left arm (bicep)
      "M 122,40 C 120,42 118,46 116,52 C 114,58 114,62 115,66 C 116,64 118,58 120,54 C 122,48 124,44 124,40 Z",
      // Front right arm (bicep)
      "M 176,40 C 178,42 180,46 182,52 C 184,58 184,62 183,66 C 182,64 180,58 178,54 C 176,48 174,44 174,40 Z",
    ],
  },
  // CORE — abdominals on front figure
  core: {
    paths: [
      // Abs block
      "M 140,52 C 142,53 146,54 148,54 C 150,54 154,53 158,52 L 158,74 C 156,76 152,77 148,77 C 144,77 142,76 140,74 Z",
    ],
  },
  // LEGS & GLUTES
  legsGlutes: {
    paths: [
      // Rear glutes
      "M 34,76 C 36,74 42,73 48,73 C 54,73 62,74 64,76 L 64,86 C 62,90 56,92 48,92 C 40,92 36,90 34,86 Z",
      // Rear left leg (hamstring)
      "M 34,92 C 36,90 40,88 44,88 L 46,88 L 46,130 C 44,136 42,140 40,144 C 38,140 36,132 34,124 Z",
      // Rear right leg (hamstring)
      "M 64,92 C 62,90 58,88 54,88 L 52,88 L 52,130 C 54,136 56,140 58,144 C 60,140 62,132 64,124 Z",
      // Front left quad
      "M 134,78 C 136,76 140,75 144,76 L 146,78 L 146,130 C 144,136 142,140 140,144 C 138,140 136,132 134,124 Z",
      // Front right quad
      "M 164,78 C 162,76 158,75 154,76 L 152,78 L 152,130 C 154,136 156,140 158,144 C 160,140 162,132 164,124 Z",
      // Front left calf
      "M 138,144 C 140,148 142,146 144,144 L 144,170 C 142,174 140,176 138,174 Z",
      // Front right calf
      "M 160,144 C 158,148 156,146 154,144 L 154,170 C 156,174 158,176 160,174 Z",
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
