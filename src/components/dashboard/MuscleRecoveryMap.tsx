import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/i18n";
import { Activity } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DETAILED_MUSCLE_LAYOUT,
  RecoveryData,
  getHoursUntilFullRecovery,
  getRecoveryColor,
  getRecoveryLabelKey,
  getRealtimeRecoveryPercent,
} from "@/lib/recovery";

interface MuscleRecoveryMapProps {
  recoveryData: RecoveryData[];
  highlightedMuscles?: string[];
  onMuscleSelect?: (muscleId: string) => void;
  debugLastChestTrainedAt?: string | null;
}

const formatTimeUntilFull = (hours: number, t: any) => {
  if (hours <= 0) return t.recovery.readyNow;
  if (hours < 24) return `${Math.ceil(hours)} ${t.recovery.hours}`;
  return `${Math.ceil(hours / 24)} ${t.recovery.days}`;
};

const MuscleRecoveryMap = ({
  recoveryData,
  highlightedMuscles = [],
  onMuscleSelect,
  debugLastChestTrainedAt,
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

  const upperBodyCards = useMemo(
    () => DETAILED_MUSCLE_LAYOUT.filter((item) => item.category === "upper"),
    []
  );
  const lowerBodyCards = useMemo(
    () => DETAILED_MUSCLE_LAYOUT.filter((item) => item.category === "lower"),
    []
  );

  const renderCard = (muscle: (typeof DETAILED_MUSCLE_LAYOUT)[number]) => {
    const row = recoveryByGroup[muscle.sourceGroup];
    const recovery = getRealtimeRecoveryPercent(row);
    const hoursUntilFull = getHoursUntilFullRecovery(row);
    const color = getRecoveryColor(recovery);

    const highlighted =
      highlightSet.size > 0 &&
      (highlightSet.has(muscle.id.toLowerCase()) ||
        highlightSet.has(muscle.sourceGroup.toLowerCase()) ||
        highlightSet.has(muscle.i18nKey.toLowerCase()));

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
              highlighted
                ? "border-primary/50 bg-primary/5 ring-1 ring-primary/30"
                : "border-border/50 hover:bg-accent/30"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-semibold leading-tight">{(t.muscleGroups as any)[muscle.i18nKey] || muscle.id}</p>
              <span className="text-xs font-bold" style={{ color }}>
                {Math.round(recovery)}%
              </span>
            </div>

            <div className="mt-2 h-2 w-full rounded-full bg-muted">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${Math.round(recovery)}%`, backgroundColor: color }}
              />
            </div>

            <p className="mt-2 text-[10px] text-muted-foreground">
              {t.recovery.timeUntilFull} {formatTimeUntilFull(hoursUntilFull, t)}
            </p>
          </button>
        </PopoverTrigger>
        <PopoverContent side="top" className="w-56 p-3">
          <div className="space-y-2">
            <p className="font-display font-bold text-sm">{(t.muscleGroups as any)[muscle.i18nKey] || muscle.id}</p>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
              <span className="text-sm font-semibold" style={{ color }}>
                {t.recovery.recoveryLabel}: {Math.round(recovery)}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground">{(t.recovery as any)[getRecoveryLabelKey(recovery)]}</p>
            <p className="text-xs text-muted-foreground">
              {t.recovery.restTimeRecommended}: <span className="font-semibold text-foreground">{formatTimeUntilFull(hoursUntilFull, t)}</span>
            </p>
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
      <CardContent className="pb-4 space-y-4">
        <div>
          <p className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground mb-2">
            {t.recovery.upperBody}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {upperBodyCards.map(renderCard)}
          </div>
        </div>

        <div>
          <p className="text-[10px] uppercase tracking-wide font-semibold text-muted-foreground mb-2">
            {t.recovery.lowerBody}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {lowerBodyCards.map(renderCard)}
          </div>
        </div>

        <div className="flex gap-3 pt-1 flex-wrap">
          {[
            { color: "hsl(var(--destructive))", label: "0-30%" },
            { color: "hsl(var(--warning))", label: "31-70%" },
            { color: "hsl(var(--success))", label: "71-100%" },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-1">
              <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-[10px] text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>

        <p className="text-[10px] text-muted-foreground">
          {t.recovery.debugChestDate}: {debugLastChestTrainedAt ? new Date(debugLastChestTrainedAt).toLocaleString() : "—"}
        </p>
      </CardContent>
    </Card>
  );
};

export default MuscleRecoveryMap;
