import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Brain, RefreshCw, Loader2 } from "lucide-react";

interface RecoveryData {
  muscle_group: string;
  fatigue_score: number;
  recovery_percent: number;
  last_trained_at: string;
}

interface AIRecoveryRecommendationProps {
  recoveryData: RecoveryData[];
  onSuggestedMuscles?: (muscles: string[]) => void;
}

const MUSCLE_KEYWORDS: Record<string, string[]> = {
  chest: ["chest", "груди", "грудні", "pec", "bench"],
  back: ["back", "спина", "спину", "lat", "row", "pull", "trap", "трапец", "широк", "поперек", "lower back"],
  shoulders: ["shoulder", "плечі", "плеч", "delt", "overhead", "дельт"],
  arms: ["arms", "arm", "руки", "bicep", "tricep", "біцепс", "трицепс", "curl", "передпліч", "forearm"],
  core: ["core", "кор", "abs", "прес", "plank"],
  "legs & glutes": ["leg", "legs", "ноги", "glute", "сідниці", "squat", "присід", "квадрицепс", "стегно", "quad", "hamstring", "calf", "литк"],
};

const extractSuggestedMuscles = (text: string): string[] => {
  const lower = text.toLowerCase();
  const found: string[] = [];
  for (const [group, keywords] of Object.entries(MUSCLE_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      found.push(group);
    }
  }
  return found;
};

const AIRecoveryRecommendation = ({ recoveryData, onSuggestedMuscles }: AIRecoveryRecommendationProps) => {
  const { t, lang } = useTranslation();
  const [recommendation, setRecommendation] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const daysSince = (dateStr: string) => {
    return Math.max(0, (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
  };

  const getRealtimeRecovery = (data: RecoveryData): number => {
    const days = daysSince(data.last_trained_at);
    const fatigueRemaining = data.fatigue_score * Math.exp(-0.9 * days);
    return Math.min(100, Math.max(0, 100 - fatigueRemaining));
  };

  const fetchRecommendation = useCallback(async () => {
    if (recoveryData.length === 0) return;
    setLoading(true);
    try {
      const recoveryStatus = recoveryData.map((r) => ({
        muscle_group: r.muscle_group,
        recovery_percent: Math.round(getRealtimeRecovery(r)),
        days_since_training: Math.round(daysSince(r.last_trained_at) * 10) / 10,
      }));

      const { data, error } = await supabase.functions.invoke("ai-workout-recommendation", {
        body: { recoveryStatus, language: lang },
      });

      if (error) throw error;
      const text = data?.recommendation || t.recovery.noRecommendation;
      setRecommendation(text);
      onSuggestedMuscles?.(extractSuggestedMuscles(text));
    } catch (e) {
      console.error("AI recommendation error:", e);
      const sorted = recoveryData
        .map((r) => ({ ...r, realRecovery: getRealtimeRecovery(r) }))
        .sort((a, b) => b.realRecovery - a.realRecovery);

      const ready = sorted.filter((r) => r.realRecovery >= 70);
      const fatigued = sorted.filter((r) => r.realRecovery < 50);

      let msg = "";
      if (ready.length > 0) {
        msg += `✅ ${t.recovery.readyToTrain}: ${ready.map((r) => r.muscle_group).join(", ")}. `;
      }
      if (fatigued.length > 0) {
        msg += `⚠️ ${t.recovery.stillRecovering}: ${fatigued.map((r) => r.muscle_group).join(", ")}.`;
      }
      if (!msg) msg = t.recovery.allRecovered;
      setRecommendation(msg);
      onSuggestedMuscles?.(extractSuggestedMuscles(msg));
    } finally {
      setLoading(false);
      setHasLoaded(true);
    }
  }, [recoveryData, lang, t, onSuggestedMuscles]);

  useEffect(() => {
    if (recoveryData.length > 0 && !hasLoaded) {
      fetchRecommendation();
    }
  }, [recoveryData.length, hasLoaded, fetchRecommendation]);

  if (recoveryData.length === 0) return null;

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            {t.recovery.aiRecommendation}
          </CardTitle>
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
