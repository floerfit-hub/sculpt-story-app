import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity } from "lucide-react";
import type { Json } from "@/integrations/supabase/types";
import MuscleBodySvg, { type MuscleKey } from "./MuscleBodySvg";

const MUSCLE_GROUP_MAP: Record<string, MuscleKey> = {
  "Legs & Glutes": "legs",
  "Back": "back",
  "Chest": "chest",
  "Shoulders": "shoulders",
  "Arms": "arms",
  "Core": "abs",
};

/* Neon lime glow color based on set count */
function getNeonFill(sets: number, selected: boolean): string {
  if (sets === 0) return "transparent";
  const t = Math.min(sets, 50) / 50;
  // From subtle lime to bright neon lime
  const opacity = selected ? 0.55 + t * 0.3 : 0.25 + t * 0.35;
  return `hsla(82, 85%, ${55 - t * 10}%, ${opacity})`;
}

function getNeonGlow(sets: number, selected: boolean): string {
  if (sets === 0) return "transparent";
  return selected ? "hsl(82, 85%, 55%)" : sets > 10 ? "hsl(82, 85%, 45%)" : "transparent";
}

function getLegendColor(sets: number): string {
  if (sets === 0) return "hsl(var(--muted-foreground) / 0.3)";
  const t = Math.min(sets, 50) / 50;
  const l = 55 - t * 10;
  const opacity = 0.4 + t * 0.6;
  return `hsla(82, 85%, ${l}%, ${opacity})`;
}

interface MuscleData {
  sets: number;
  exercises: string[];
}

const ALL_KEYS: MuscleKey[] = [
  "chest", "back", "shoulders", "arms", "forearms", "abs", "glutes", "legs",
];

function emptyData(): Record<MuscleKey, MuscleData> {
  const r = {} as Record<MuscleKey, MuscleData>;
  ALL_KEYS.forEach((k) => (r[k] = { sets: 0, exercises: [] }));
  return r;
}

const MuscleHeatmap = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [data, setData] = useState<Record<MuscleKey, MuscleData>>(emptyData);
  const [selected, setSelected] = useState<MuscleKey | null>(null);

  useEffect(() => {
    if (!user) return;
    const ago = new Date();
    ago.setDate(ago.getDate() - 30);

    (async () => {
      const { data: workouts } = await supabase
        .from("workouts")
        .select("id")
        .eq("user_id", user.id)
        .gte("started_at", ago.toISOString());
      if (!workouts?.length) return;

      const { data: exercises } = await supabase
        .from("workout_exercises")
        .select("muscle_group, exercise_name, sets")
        .in("workout_id", workouts.map((w) => w.id));
      if (!exercises) return;

      const result = emptyData();
      exercises.forEach((ex) => {
        const key = MUSCLE_GROUP_MAP[ex.muscle_group];
        if (!key) return;
        const arr = ex.sets as Json[];
        result[key].sets += Array.isArray(arr) ? arr.length : 0;
        if (!result[key].exercises.includes(ex.exercise_name))
          result[key].exercises.push(ex.exercise_name);
      });
      setData(result);
    })();
  }, [user]);

  const muscles: { key: MuscleKey; label: string }[] = [
    { key: "shoulders", label: t.muscleGroups.shoulders },
    { key: "chest", label: t.muscleGroups.chest },
    { key: "arms", label: "Arms" },
    { key: "forearms", label: "Forearms" },
    { key: "back", label: "Back" },
    { key: "abs", label: t.muscleGroups.core },
    { key: "glutes", label: "Glutes" },
    { key: "legs", label: "Legs" },
  ];

  const toggle = (key: MuscleKey) => setSelected(selected === key ? null : key);

  return (
    <Card className="overflow-hidden">
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
            getFill={(k) => getNeonFill(data[k].sets, selected === k)}
            getStroke={(k) => selected === k ? "hsl(82, 85%, 55%)" : data[k].sets > 0 ? "hsl(82, 85%, 55% / 0.3)" : "transparent"}
            getStrokeWidth={(k) => selected === k ? 2 : data[k].sets > 0 ? 0.5 : 0}
            getGlow={(k) => getNeonGlow(data[k].sets, selected === k)}
            onClickMuscle={toggle}
          />

          <div className="flex flex-wrap justify-center gap-2 text-[10px]">
            {[
              { label: "0", sets: 0 },
              { label: "1-5", sets: 3 },
              { label: "6-15", sets: 10 },
              { label: "16-30", sets: 23 },
              { label: "31-49", sets: 40 },
              { label: "50+", sets: 50 },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-1">
                <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: getLegendColor(item.sets) }} />
                <span className="text-muted-foreground">{item.label}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap justify-center gap-1.5">
            {muscles.map((m) => (
              <button
                key={m.key}
                onClick={() => toggle(m.key)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  selected === m.key
                    ? "bg-primary text-primary-foreground glow-primary"
                    : "bg-muted text-muted-foreground hover:bg-accent"
                }`}
              >
                {m.label}: {data[m.key].sets}
              </button>
            ))}
          </div>

          {selected && (
            <div className="w-full rounded-lg border border-primary/20 bg-accent/50 p-3 animate-fade-in">
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
