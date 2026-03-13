import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Brain, RefreshCw, Loader2 } from "lucide-react";
import { RecoveryData, getRealtimeRecoveryPercent } from "@/lib/recovery";

interface AIRecoveryRecommendationProps {
  recoveryData: RecoveryData[];
  focusedMuscle?: string | null;
  onSuggestedMuscles?: (muscles: string[]) => void;
}

const MUSCLE_KEYWORDS: Record<string, string[]> = {
  Chest: ["chest", "груди", "грудні", "pec", "bench"],
  "Upper back": ["upper back", "верх спини", "trap", "трапец"],
  Lats: ["lat", "широк", "pulldown", "row"],
  "Lower back": ["lower back", "поперек", "hyperext"],
  "Anterior delt": ["anterior delt", "передн", "front delt", "overhead"],
  "Lateral delt": ["lateral delt", "середн", "lateral raise", "бічн"],
  "Posterior delt": ["posterior delt", "задн", "rear delt", "face pull"],
  Biceps: ["bicep", "біцепс", "curl"],
  Triceps: ["tricep", "тріцепс", "pushdown", "extension"],
  Quadriceps: ["quad", "квадр", "squat", "присід", "leg press"],
  Glutes: ["glute", "сідниц", "hip thrust"],
  Hamstrings: ["hamstring", "задня поверхня", "leg curl"],
  Calves: ["calf", "calves", "литк", "calf raise"],
  Core: ["core", "кор", "abs", "прес", "plank"],
};

const extractSuggestedMuscles = (text: string): string[] => {
  const lower = text.toLowerCase();
  const found: string[] = [];
  for (const [group, keywords] of Object.entries(MUSCLE_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) found.push(group);
  }
  return found;
};

const AIRecoveryRecommendation = ({ recoveryData, focusedMuscle, onSuggestedMuscles }: AIRecoveryRecommendationProps) => {
  const { t, lang } = useTranslation();
  const [recommendation, setRecommendation] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const focusedMuscleLabel = useMemo(
    () => (focusedMuscle ? (t.muscleGroups as any)[focusedMuscle] || focusedMuscle : null),
    [focusedMuscle, t]
  );

  const fetchRecommendation = useCallback(async () => {
    if (recoveryData.length === 0) return;
    setLoading(true);

    try {
      const recoveryStatus = recoveryData.map((row) => {
        const recovery = getRealtimeRecoveryPercent(row);
        const daysSince = Math.max(0, (Date.now() - new Date(row.last_trained_at).getTime()) / (1000 * 60 * 60 * 24));
        return {
          muscle_group: row.muscle_group,
          recovery_percent: Math.round(recovery),
          days_since_training: Math.round(daysSince * 10) / 10,
          fatigue_score: Math.round(row.fatigue_score),
        };
      });

      const { data, error } = await supabase.functions.invoke("ai-workout-recommendation", {
        body: {
          recoveryStatus,
          language: lang,
          focusMuscle: focusedMuscle ?? null,
        },
      });

      if (error) throw error;

      const text = data?.recommendation || t.recovery.noRecommendation;
      setRecommendation(text);
      onSuggestedMuscles?.(extractSuggestedMuscles(text));
    } catch (error) {
      console.error("AI recommendation error:", error);

      if (focusedMuscle) {
        const targetGroup = FOCUS_TO_RECOVERY_GROUP[focusedMuscle] || focusedMuscle;
        const target = recoveryData.find((row) => row.muscle_group.toLowerCase() === targetGroup.toLowerCase());
        const targetRecovery = getRealtimeRecoveryPercent(target);

        if (targetRecovery <= 30) {
          setRecommendation(`⚠️ ${focusedMuscleLabel}: ${t.recovery.fatigued}. ${t.recovery.timeUntilFull} ${Math.ceil((72 * (100 - targetRecovery)) / 100)} ${t.recovery.hours}.`);
        } else if (targetRecovery <= 70) {
          setRecommendation(`🟡 ${focusedMuscleLabel}: ${t.recovery.recovering}. ${t.recovery.timeUntilFull} ${Math.ceil((48 * (100 - targetRecovery)) / 100)} ${t.recovery.hours}.`);
        } else {
          setRecommendation(`✅ ${focusedMuscleLabel}: ${t.recovery.ready}. ${t.recovery.aiRecommendation}`);
        }
      } else {
        const sorted = recoveryData
          .map((row) => ({ ...row, recovery: getRealtimeRecoveryPercent(row) }))
          .sort((a, b) => b.recovery - a.recovery);

        const ready = sorted.filter((row) => row.recovery >= 71).map((row) => row.muscle_group);
        const fatigued = sorted.filter((row) => row.recovery <= 30).map((row) => row.muscle_group);

        let fallback = "";
        if (ready.length > 0) fallback += `✅ ${t.recovery.readyToTrain}: ${ready.join(", ")}. `;
        if (fatigued.length > 0) fallback += `⚠️ ${t.recovery.stillRecovering}: ${fatigued.join(", ")}.`;
        if (!fallback) fallback = t.recovery.noRecommendation;
        setRecommendation(fallback);
      }
    } finally {
      setLoading(false);
    }
  }, [focusedMuscle, focusedMuscleLabel, lang, onSuggestedMuscles, recoveryData, t]);

  useEffect(() => {
    if (recoveryData.length > 0) fetchRecommendation();
  }, [recoveryData.length, focusedMuscle, fetchRecommendation]);

  if (recoveryData.length === 0) return null;

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <div className="space-y-1">
            <CardTitle className="text-sm flex items-center gap-2">
              <Brain className="h-4 w-4 text-primary" />
              {t.recovery.aiRecommendation}
            </CardTitle>
            {focusedMuscleLabel && (
              <p className="text-[10px] text-muted-foreground">
                {t.recovery.focusedMuscle}: <span className="font-semibold text-foreground">{focusedMuscleLabel}</span>
              </p>
            )}
          </div>

          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={fetchRecommendation} disabled={loading}>
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pb-4">
        {loading && !recommendation ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t.recovery.analyzing}
          </div>
        ) : (
          <div className="rounded-lg bg-accent/50 p-3 text-sm leading-relaxed whitespace-pre-wrap">
            {recommendation || t.recovery.noRecommendation}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AIRecoveryRecommendation;
