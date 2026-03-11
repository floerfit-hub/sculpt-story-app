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

// Overlay regions traced to match muscle-map.png (300×600 natural size)
// ViewBox: 0 0 300 600
const OVERLAY_REGIONS: Record<MuscleKey, { paths: string[] }> = {
  // BACK — on rear figure (left, centered ~x=75)
  back: {
    paths: [
      // Upper back / lats
      "M 52,140 C 52,132 58,124 66,120 L 74,118 C 78,118 82,120 86,120 L 90,118 C 96,120 102,128 102,140 L 102,195 C 98,200 90,204 82,204 L 72,204 C 64,204 56,200 52,195 Z",
      // Lower back
      "M 58,204 C 62,207 70,210 78,210 C 86,210 92,207 96,204 L 96,240 C 92,245 86,248 78,248 C 70,248 64,245 58,240 Z",
    ],
  },
  // CHEST — on front figure (right, centered ~x=225)
  chest: {
    paths: [
      // Left pec
      "M 196,128 C 200,122 206,118 214,120 L 220,125 C 222,130 222,140 220,148 C 216,154 210,158 204,156 C 198,154 196,146 196,140 Z",
      // Right pec
      "M 228,125 C 232,118 238,118 244,120 L 250,128 C 252,134 252,142 250,148 C 246,154 240,158 234,156 C 228,154 226,146 228,140 Z",
    ],
  },
  // SHOULDERS — deltoids
  shoulders: {
    paths: [
      // Rear left delt
      "M 38,110 C 42,100 48,96 54,100 L 54,120 C 52,130 46,134 40,130 Z",
      // Rear right delt
      "M 116,110 C 112,100 106,96 100,100 L 100,120 C 102,130 108,134 114,130 Z",
      // Front left delt
      "M 186,110 C 190,100 196,96 202,100 L 202,120 C 200,130 194,134 188,130 Z",
      // Front right delt
      "M 264,110 C 260,100 254,96 248,100 L 248,120 C 250,130 256,134 262,130 Z",
    ],
  },
  // ARMS — biceps/triceps
  arms: {
    paths: [
      // Rear left arm
      "M 36,130 C 34,140 30,160 28,180 C 26,200 26,210 28,220 L 32,220 C 34,210 36,196 38,180 C 40,164 42,148 42,134 Z",
      // Rear right arm
      "M 118,130 C 120,140 124,160 126,180 C 128,200 128,210 126,220 L 122,220 C 120,210 118,196 116,180 C 114,164 112,148 112,134 Z",
      // Front left arm
      "M 184,130 C 182,140 178,160 176,180 C 174,200 174,210 176,220 L 180,220 C 182,210 184,196 186,180 C 188,164 190,148 190,134 Z",
      // Front right arm
      "M 266,130 C 268,140 272,160 274,180 C 276,200 276,210 274,220 L 270,220 C 268,210 266,196 264,180 C 262,164 260,148 260,134 Z",
    ],
  },
  // CORE — abs on front figure
  core: {
    paths: [
      "M 210,156 C 214,158 220,160 224,160 C 228,160 234,158 238,156 L 238,240 C 236,246 230,250 224,250 C 218,250 212,246 210,240 Z",
    ],
  },
  // LEGS & GLUTES
  legsGlutes: {
    paths: [
      // Rear glutes
      "M 54,248 C 58,244 66,240 78,240 C 90,240 96,244 100,248 L 100,280 C 96,288 88,292 78,292 C 68,292 60,288 54,280 Z",
      // Rear left hamstring
      "M 54,292 C 58,290 64,288 70,288 L 74,288 L 72,400 C 70,410 68,416 66,420 C 62,412 58,396 56,370 Z",
      // Rear right hamstring
      "M 100,292 C 96,290 90,288 84,288 L 80,288 L 82,400 C 84,410 86,416 88,420 C 92,412 96,396 98,370 Z",
      // Front left quad
      "M 204,252 C 208,248 214,246 220,248 L 222,252 L 220,400 C 218,410 216,416 214,420 C 210,412 206,396 204,370 Z",
      // Front right quad
      "M 246,252 C 242,248 236,246 230,248 L 228,252 L 230,400 C 232,410 234,416 236,420 C 240,412 244,396 246,370 Z",
      // Front left calf
      "M 210,420 C 214,428 218,426 220,420 L 220,500 C 218,510 214,516 210,510 Z",
      // Front right calf
      "M 240,420 C 236,428 232,426 230,420 L 230,500 C 232,510 236,516 240,510 Z",
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
              viewBox="0 0 300 600"
              className="absolute inset-0 w-full h-full"
              preserveAspectRatio="xMidYMid meet"
            >
              {/* Debug calibration rectangles */}
              <rect x="0" y="0" width="10" height="10" fill="red" opacity="0.8" />
              <rect x="145" y="0" width="10" height="10" fill="blue" opacity="0.8" />
              <rect x="290" y="0" width="10" height="10" fill="red" opacity="0.8" />
              <rect x="0" y="590" width="10" height="10" fill="red" opacity="0.8" />
              <rect x="290" y="590" width="10" height="10" fill="red" opacity="0.8" />
              {/* Cross-hairs at figure centers */}
              <rect x="73" y="50" width="4" height="4" fill="yellow" opacity="0.9" />
              <rect x="223" y="50" width="4" height="4" fill="yellow" opacity="0.9" />
              {(Object.entries(OVERLAY_REGIONS) as [MuscleKey, { paths: string[] }][]).map(
                ([key, region]) =>
                  region.paths.map((path, i) => (
                    <path
                      key={`${key}-${i}`}
                      d={path}
                      fill={getHeatColor(data[key].sets, selected === key ? 0.65 : 0.45)}
                      stroke="rgba(255,0,0,0.5)"
                      strokeWidth={1}
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
