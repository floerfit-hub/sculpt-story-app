import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity } from "lucide-react";
import type { Json } from "@/integrations/supabase/types";

type MuscleKey = "legsGlutes" | "back" | "chest" | "shoulders" | "arms" | "core";

const MUSCLE_GROUP_MAP: Record<string, MuscleKey> = {
  "Legs & Glutes": "legsGlutes",
  "Back": "back",
  "Chest": "chest",
  "Shoulders": "shoulders",
  "Arms": "arms",
  "Core": "core",
};

function getHeatColor(sets: number): string {
  if (sets === 0) return "hsl(0 0% 80%)";
  if (sets < 10) return "hsl(120 50% 55%)";
  if (sets < 25) return "hsl(50 90% 50%)";
  if (sets < 40) return "hsl(30 90% 50%)";
  if (sets < 50) return "hsl(20 90% 45%)";
  return "hsl(0 80% 50%)";
}

function getDarkHeatColor(sets: number): string {
  if (sets === 0) return "hsl(0 0% 25%)";
  if (sets < 10) return "hsl(120 40% 35%)";
  if (sets < 25) return "hsl(50 70% 40%)";
  if (sets < 40) return "hsl(30 70% 40%)";
  if (sets < 50) return "hsl(20 70% 38%)";
  return "hsl(0 65% 42%)";
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
  const isDark = document.documentElement.classList.contains("dark");

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

  const colorFn = isDark ? getDarkHeatColor : getHeatColor;

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
          {/* Body SVG */}
          <svg viewBox="0 0 200 380" className="w-48 h-auto" xmlns="http://www.w3.org/2000/svg">
            {/* Head */}
            <ellipse cx="100" cy="30" rx="18" ry="22" fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth="1" />
            {/* Neck */}
            <rect x="92" y="50" width="16" height="14" rx="4" fill="hsl(var(--muted))" />

            {/* Shoulders */}
            <ellipse cx="58" cy="72" rx="22" ry="12" fill={colorFn(data.shoulders.sets)}
              className="cursor-pointer transition-all hover:opacity-80"
              stroke={selected === "shoulders" ? "hsl(var(--primary))" : "hsl(var(--border))"} strokeWidth={selected === "shoulders" ? 2 : 1}
              onClick={() => setSelected(selected === "shoulders" ? null : "shoulders")} />
            <ellipse cx="142" cy="72" rx="22" ry="12" fill={colorFn(data.shoulders.sets)}
              className="cursor-pointer transition-all hover:opacity-80"
              stroke={selected === "shoulders" ? "hsl(var(--primary))" : "hsl(var(--border))"} strokeWidth={selected === "shoulders" ? 2 : 1}
              onClick={() => setSelected(selected === "shoulders" ? null : "shoulders")} />

            {/* Chest */}
            <path d="M68 78 Q100 75 132 78 L128 115 Q100 120 72 115 Z" fill={colorFn(data.chest.sets)}
              className="cursor-pointer transition-all hover:opacity-80"
              stroke={selected === "chest" ? "hsl(var(--primary))" : "hsl(var(--border))"} strokeWidth={selected === "chest" ? 2 : 1}
              onClick={() => setSelected(selected === "chest" ? null : "chest")} />

            {/* Core */}
            <rect x="74" y="118" width="52" height="60" rx="8" fill={colorFn(data.core.sets)}
              className="cursor-pointer transition-all hover:opacity-80"
              stroke={selected === "core" ? "hsl(var(--primary))" : "hsl(var(--border))"} strokeWidth={selected === "core" ? 2 : 1}
              onClick={() => setSelected(selected === "core" ? null : "core")} />

            {/* Back (shown as trapezius area behind shoulders) */}
            <path d="M72 80 Q100 95 128 80 L126 115 Q100 108 74 115 Z" fill={colorFn(data.back.sets)}
              className="cursor-pointer transition-all hover:opacity-80" opacity="0.5"
              stroke={selected === "back" ? "hsl(var(--primary))" : "none"} strokeWidth={selected === "back" ? 2 : 0}
              onClick={() => setSelected(selected === "back" ? null : "back")} />

            {/* Left Arm */}
            <rect x="32" y="80" width="20" height="55" rx="8" fill={colorFn(data.arms.sets)}
              className="cursor-pointer transition-all hover:opacity-80"
              stroke={selected === "arms" ? "hsl(var(--primary))" : "hsl(var(--border))"} strokeWidth={selected === "arms" ? 2 : 1}
              onClick={() => setSelected(selected === "arms" ? null : "arms")} />
            <rect x="30" y="138" width="18" height="45" rx="7" fill={colorFn(data.arms.sets)}
              className="cursor-pointer transition-all hover:opacity-80"
              stroke={selected === "arms" ? "hsl(var(--primary))" : "hsl(var(--border))"} strokeWidth={selected === "arms" ? 2 : 1}
              onClick={() => setSelected(selected === "arms" ? null : "arms")} />

            {/* Right Arm */}
            <rect x="148" y="80" width="20" height="55" rx="8" fill={colorFn(data.arms.sets)}
              className="cursor-pointer transition-all hover:opacity-80"
              stroke={selected === "arms" ? "hsl(var(--primary))" : "hsl(var(--border))"} strokeWidth={selected === "arms" ? 2 : 1}
              onClick={() => setSelected(selected === "arms" ? null : "arms")} />
            <rect x="152" y="138" width="18" height="45" rx="7" fill={colorFn(data.arms.sets)}
              className="cursor-pointer transition-all hover:opacity-80"
              stroke={selected === "arms" ? "hsl(var(--primary))" : "hsl(var(--border))"} strokeWidth={selected === "arms" ? 2 : 1}
              onClick={() => setSelected(selected === "arms" ? null : "arms")} />

            {/* Legs & Glutes */}
            <rect x="72" y="182" width="24" height="80" rx="8" fill={colorFn(data.legsGlutes.sets)}
              className="cursor-pointer transition-all hover:opacity-80"
              stroke={selected === "legsGlutes" ? "hsl(var(--primary))" : "hsl(var(--border))"} strokeWidth={selected === "legsGlutes" ? 2 : 1}
              onClick={() => setSelected(selected === "legsGlutes" ? null : "legsGlutes")} />
            <rect x="104" y="182" width="24" height="80" rx="8" fill={colorFn(data.legsGlutes.sets)}
              className="cursor-pointer transition-all hover:opacity-80"
              stroke={selected === "legsGlutes" ? "hsl(var(--primary))" : "hsl(var(--border))"} strokeWidth={selected === "legsGlutes" ? 2 : 1}
              onClick={() => setSelected(selected === "legsGlutes" ? null : "legsGlutes")} />
            {/* Calves */}
            <rect x="74" y="266" width="20" height="60" rx="7" fill={colorFn(data.legsGlutes.sets)}
              className="cursor-pointer transition-all hover:opacity-80"
              stroke={selected === "legsGlutes" ? "hsl(var(--primary))" : "hsl(var(--border))"} strokeWidth={selected === "legsGlutes" ? 2 : 1}
              onClick={() => setSelected(selected === "legsGlutes" ? null : "legsGlutes")} />
            <rect x="106" y="266" width="20" height="60" rx="7" fill={colorFn(data.legsGlutes.sets)}
              className="cursor-pointer transition-all hover:opacity-80"
              stroke={selected === "legsGlutes" ? "hsl(var(--primary))" : "hsl(var(--border))"} strokeWidth={selected === "legsGlutes" ? 2 : 1}
              onClick={() => setSelected(selected === "legsGlutes" ? null : "legsGlutes")} />
            {/* Feet */}
            <ellipse cx="84" cy="332" rx="12" ry="6" fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth="1" />
            <ellipse cx="116" cy="332" rx="12" ry="6" fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth="1" />
          </svg>

          {/* Legend */}
          <div className="flex flex-wrap justify-center gap-2 text-[10px]">
            {[
              { label: "0", color: colorFn(0) },
              { label: "1-9", color: colorFn(5) },
              { label: "10-24", color: colorFn(15) },
              { label: "25-39", color: colorFn(30) },
              { label: "40-49", color: colorFn(45) },
              { label: "50+", color: colorFn(55) },
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
