import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/i18n";
import { Brain } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type ProgressEntry = Tables<"progress_entries">;

interface SmartInsightsProps {
  entries: ProgressEntry[];
  muscleData: Record<string, number>;
  strengthTrending: boolean;
}

const SmartInsights = ({ entries, muscleData, strengthTrending }: SmartInsightsProps) => {
  const { t } = useTranslation();

  const insights = useMemo(() => {
    const result: string[] = [];
    const latest = entries[entries.length - 1];
    const previous = entries.length >= 2 ? entries[entries.length - 2] : null;

    // Muscle balance insight
    const upperGroups = ["Chest", "Back", "Shoulders", "Arms"];
    const lowerGroups = ["Legs & Glutes"];
    const upperSets = upperGroups.reduce((sum, g) => sum + (muscleData[g] || 0), 0);
    const lowerSets = lowerGroups.reduce((sum, g) => sum + (muscleData[g] || 0), 0);
    if (upperSets > lowerSets * 2 && lowerSets > 0) {
      result.push(t.fitScore.insightUpperHeavy);
    } else if (lowerSets > upperSets * 2 && upperSets > 0) {
      result.push(t.fitScore.insightLowerHeavy);
    }

    // Waist improvement
    if (latest && previous && latest.waist != null && previous.waist != null && latest.waist < previous.waist) {
      result.push(t.fitScore.insightWaistImproving);
    }

    // Strength progress
    if (strengthTrending) {
      result.push(t.fitScore.insightStrengthUp);
    }

    // Core neglect
    if ((muscleData["Core"] || 0) === 0 && Object.values(muscleData).some(v => v > 0)) {
      result.push(t.fitScore.insightCoreNeglect);
    }

    if (result.length === 0) {
      result.push(t.fitScore.insightKeepGoing);
    }

    return result;
  }, [entries, muscleData, strengthTrending, t]);

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Brain className="h-4 w-4 text-primary" />
          {t.fitScore.smartInsights}
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-4 space-y-2">
        {insights.map((insight, i) => (
          <div key={i} className="rounded-lg bg-accent/50 p-3 text-sm leading-relaxed">
            {insight}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default SmartInsights;
