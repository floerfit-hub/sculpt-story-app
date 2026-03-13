import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/i18n";
import { Activity, RotateCcw } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  MUSCLE_CARD_LAYOUT,
  type MuscleCardConfig,
  getIntensityCap,
  type MorningCheckin,
} from "@/lib/muscleScience";
import {
  type RecoveryData,
  getHoursUntilFullRecovery,
  getRecoveryColor,
  getRecoveryLabelKey,
  getRealtimeRecoveryPercent,
} from "@/lib/recovery";

interface MuscleRecoveryMapProps {
  recoveryData: RecoveryData[];
  highlightedMuscles?: string[];
  onMuscleSelect?: (muscleId: string) => void;
  checkin?: MorningCheckin | null;
  cnsFatigueHigh?: boolean;
}

const formatTimeUntilFull = (hours: number, t: any) => {
  if (hours <= 0) return t.recovery.readyNow;
  if (hours < 1) return `${Math.ceil(hours * 60)} хв`;
  if (hours < 24) return `${Math.ceil(hours)} ${t.recovery.hours}`;
  return `${Math.round(hours / 24 * 10) / 10} ${t.recovery.days}`;
};

const MuscleRecoveryMap = ({
  recoveryData,
  highlightedMuscles = [],
  onMuscleSelect,
  checkin,
  cnsFatigueHigh = false,
}: MuscleRecoveryMapProps) => {
  const { t } = useTranslation();
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null);

  const recoveryByGroup = useMemo(() => {
    const map: Record<string, RecoveryData> = {};
    recoveryData.forEach((row) => {
      map[row.muscle_group] = row;
    });
    return map;
  }, [recoveryData]);

  const highlightSet = useMemo(
    () => new Set(highlightedMuscles.map((item) => item.toLowerCase())),
    [highlightedMuscles]
  );

  const renderCard = (muscle: MuscleCardConfig) => {
    const row = recoveryByGroup[muscle.id];
    const recovery = getRealtimeRecoveryPercent(row);
    const hoursUntilFull = getHoursUntilFullRecovery(row);
    const color = getRecoveryColor(recovery);
    const labelKey = getRecoveryLabelKey(recovery);
    const directSets = row?.direct_sets ?? 0;
    const synergistSets = row?.synergist_sets ?? 0;
    const intensity = getIntensityCap(recovery, checkin, cnsFatigueHigh);

    const isPeak = recovery >= 100;
    const highlighted =
      highlightSet.size > 0 &&
      (highlightSet.has(muscle.id.toLowerCase()) ||
        highlightSet.has(muscle.i18nKey.toLowerCase()));

    const muscleName = (t.muscleGroups as any)[muscle.i18nKey] || muscle.id;

    return (
      <Popover
        key={muscle.id}
        open={selectedMuscle === muscle.id}
        onOpenChange={(open) => setSelectedMuscle(open ? muscle.id : null)}
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            onClick={() => {
              const next = selectedMuscle === muscle.id ? null : muscle.id;
              setSelectedMuscle(next);
              if (next) onMuscleSelect?.(muscle.id);
            }}
            className={`rounded-xl border p-3 text-left transition-all w-full ${
              isPeak
                ? "border-primary/40 bg-primary/5 ring-1 ring-primary/20"
                : highlighted
                ? "border-primary/50 bg-primary/5 ring-1 ring-primary/30"
                : "border-border/50 hover:bg-accent/30"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">{muscle.emoji}</span>
                <p className="text-xs font-semibold leading-tight">{muscleName}</p>
              </div>
              <span className="text-sm font-bold shrink-0" style={{ color }}>
                {Math.round(recovery)}%
              </span>
            </div>

            {/* Progress bar */}
            <div className="mt-2 h-2 w-full rounded-full bg-muted">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${Math.min(100, Math.round(recovery))}%`, backgroundColor: color }}
              />
            </div>

            {/* Sets info */}
            {(directSets > 0 || synergistSets > 0) && (
              <div className="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground">
                {directSets > 0 && (
                  <span className="font-semibold text-foreground">{directSets} sets</span>
                )}
                {synergistSets > 0 && (
                  <span className="flex items-center gap-0.5 border-l border-dashed border-border pl-2 opacity-70">
                    <RotateCcw className="h-2.5 w-2.5" />
                    +{Math.round(synergistSets * 10) / 10}
                  </span>
                )}
              </div>
            )}

            {/* Time until recovery */}
            <p className="mt-1.5 text-[10px] text-muted-foreground truncate">
              {hoursUntilFull > 0
                ? `⏱ ${formatTimeUntilFull(hoursUntilFull, t)}`
                : isPeak
                ? `⚡ ${(t.recovery as any).peak ?? "Peak readiness"}`
                : `✅ ${t.recovery.readyNow}`}
            </p>
          </button>
        </PopoverTrigger>
        <PopoverContent side="top" className="w-60 p-3">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">{muscle.emoji}</span>
              <p className="font-display font-bold text-sm">{muscleName}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
              <span className="text-sm font-semibold" style={{ color }}>
                {(t.recovery as any)[labelKey] ?? labelKey} · {Math.round(recovery)}%
              </span>
            </div>
            {hoursUntilFull > 0 && (
              <p className="text-xs text-muted-foreground">
                {t.recovery.timeUntilFull} {formatTimeUntilFull(hoursUntilFull, t)}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              {(t.recovery as any).recommendedIntensity ?? "Max intensity"}: <span className="font-bold text-foreground">{intensity}%</span>
            </p>
            {directSets > 0 && (
              <p className="text-[10px] text-muted-foreground">
                {(t.recovery as any).directSets ?? "Direct"}: {directSets} · {(t.recovery as any).synergistSets ?? "Synergist"}: {Math.round(synergistSets * 10) / 10}
              </p>
            )}
          </div>
        </PopoverContent>
      </Popover>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          {t.recovery.title}
        </CardTitle>
        <p className="text-[10px] text-muted-foreground">{t.recovery.subtitle}</p>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="grid grid-cols-2 gap-2">
          {MUSCLE_CARD_LAYOUT.map(renderCard)}
        </div>

        {/* Legend */}
        <div className="flex gap-3 pt-3 flex-wrap justify-center">
          {[
            { color: "hsl(var(--destructive))", label: "0-40%" },
            { color: "hsl(var(--warning))", label: "41-75%" },
            { color: "hsl(var(--success))", label: "76-99%" },
            { color: "hsl(82 85% 55%)", label: "100% ⚡" },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-1">
              <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-[10px] text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default MuscleRecoveryMap;
