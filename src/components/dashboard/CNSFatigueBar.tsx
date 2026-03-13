import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslation } from "@/i18n";
import { Brain } from "lucide-react";

interface CNSFatigueBarProps {
  lastHeavyCompoundAt?: string | null; // ISO timestamp
}

const CNS_RECOVERY_HOURS = 60; // 48-72h, use 60 as midpoint

const CNSFatigueBar = ({ lastHeavyCompoundAt }: CNSFatigueBarProps) => {
  const { t } = useTranslation();

  const { percent, hoursLeft, level } = useMemo(() => {
    if (!lastHeavyCompoundAt) return { percent: 100, hoursLeft: 0, level: "LOW" as const };

    const ms = new Date(lastHeavyCompoundAt).getTime();
    if (Number.isNaN(ms)) return { percent: 100, hoursLeft: 0, level: "LOW" as const };

    const hoursSince = (Date.now() - ms) / (1000 * 60 * 60);
    if (hoursSince >= CNS_RECOVERY_HOURS) return { percent: 100, hoursLeft: 0, level: "LOW" as const };

    const pct = Math.round((hoursSince / CNS_RECOVERY_HOURS) * 100);
    const left = Math.ceil(CNS_RECOVERY_HOURS - hoursSince);

    return {
      percent: pct,
      hoursLeft: left,
      level: pct < 40 ? "HIGH" as const : pct < 75 ? "MEDIUM" as const : "LOW" as const,
    };
  }, [lastHeavyCompoundAt]);

  const color = level === "HIGH" ? "hsl(var(--destructive))" : level === "MEDIUM" ? "hsl(var(--warning))" : "hsl(var(--success))";
  const labelKey = level === "HIGH" ? "cnsHigh" : level === "MEDIUM" ? "cnsMedium" : "cnsLow";

  return (
    <Card className="border-border/50">
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          <Brain className="h-4 w-4 shrink-0" style={{ color }} />
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wide">
                {(t.recovery as any).cnsRecovery ?? "CNS Recovery"}
              </span>
              <span className="text-[10px] font-bold" style={{ color }}>
                {(t.recovery as any)[labelKey] ?? level} · {percent}%
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${percent}%`, backgroundColor: color }}
              />
            </div>
            {hoursLeft > 0 && (
              <p className="text-[10px] text-muted-foreground">
                {(t.recovery as any).timeUntilFull ?? "Time left"}: {hoursLeft}h
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CNSFatigueBar;
