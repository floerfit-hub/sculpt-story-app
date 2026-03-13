import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslation } from "@/i18n";
import { calculateReadinessScore, getIntensityCap, type MorningCheckin } from "@/lib/muscleScience";
import { type RecoveryData, getRealtimeRecoveryPercent } from "@/lib/recovery";
import { Gauge, TrendingUp } from "lucide-react";

interface ReadinessScoreProps {
  recoveryData: RecoveryData[];
  checkin?: MorningCheckin | null;
  cnsFatigueHigh?: boolean;
}

const ReadinessScore = ({ recoveryData, checkin, cnsFatigueHigh = false }: ReadinessScoreProps) => {
  const { t } = useTranslation();

  const { readiness, intensityCap, avgRecovery } = useMemo(() => {
    if (recoveryData.length === 0) return { readiness: 100, intensityCap: 100, avgRecovery: 100 };

    const recoveries = recoveryData.map((r) => getRealtimeRecoveryPercent(r));
    const avg = recoveries.reduce((a, b) => a + b, 0) / recoveries.length;

    return {
      readiness: calculateReadinessScore(avg, checkin, cnsFatigueHigh),
      intensityCap: getIntensityCap(avg, checkin, cnsFatigueHigh),
      avgRecovery: Math.round(avg),
    };
  }, [recoveryData, checkin, cnsFatigueHigh]);

  const readinessColor =
    readiness >= 76 ? "text-primary" :
    readiness >= 41 ? "text-yellow-500" :
    "text-destructive";

  return (
    <Card className="border-primary/20 overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          {/* Score circle */}
          <div className="relative flex h-16 w-16 shrink-0 items-center justify-center">
            <svg className="h-16 w-16 -rotate-90" viewBox="0 0 64 64">
              <circle cx="32" cy="32" r="28" fill="none" strokeWidth="4" className="stroke-muted" />
              <circle
                cx="32" cy="32" r="28" fill="none" strokeWidth="4"
                strokeDasharray={`${(readiness / 100) * 175.9} 175.9`}
                strokeLinecap="round"
                className={readiness >= 76 ? "stroke-primary" : readiness >= 41 ? "stroke-yellow-500" : "stroke-destructive"}
              />
            </svg>
            <span className={`absolute text-lg font-display font-extrabold ${readinessColor}`}>
              {readiness}
            </span>
          </div>

          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-1.5">
              <Gauge className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold">{(t.recovery as any).dailyReadiness ?? "Daily Readiness"}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <TrendingUp className="h-3 w-3 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">
                {(t.recovery as any).recommendedIntensity ?? "Recommended intensity"}: <span className="font-bold text-foreground">{intensityCap}%</span>
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground">
              {(t.recovery as any).avgRecovery ?? "Avg recovery"}: {avgRecovery}%
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReadinessScore;
