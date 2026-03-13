import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/i18n";
import { Activity } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface RecoveryData {
  muscle_group: string;
  fatigue_score: number;
  recovery_percent: number;
  last_trained_at: string;
}

interface MuscleRecoveryMapProps {
  recoveryData: RecoveryData[];
  highlightedMuscles?: string[];
}

const getRecoveryColor = (recovery: number): string => {
  if (recovery >= 71) return "hsl(142, 71%, 45%)";  // green
  if (recovery >= 31) return "hsl(48, 96%, 53%)";   // yellow
  return "hsl(0, 84%, 60%)";                         // red
};

const getRecoveryLabel = (recovery: number, t: any): string => {
  if (recovery >= 71) return t.recovery.ready;
  if (recovery >= 31) return t.recovery.recovering;
  return t.recovery.fatigued;
};

const getEstimatedRestTime = (recovery: number): string => {
  if (recovery >= 90) return "0";
  if (recovery >= 71) return "~6h";
  if (recovery >= 50) return "~24h";
  if (recovery >= 31) return "~48h";
  return "~72h";
};

const MUSCLE_PATHS: Record<string, { paths: string[]; label: string; cx: number; cy: number }> = {
  "Chest": {
    paths: [
      "M 85 95 Q 100 85 115 95 L 115 115 Q 100 120 85 115 Z",
      "M 115 95 Q 130 85 145 95 L 145 115 Q 130 120 115 115 Z",
    ],
    label: "chest",
    cx: 115,
    cy: 105,
  },
  "Shoulders": {
    paths: [
      "M 70 85 Q 75 75 85 80 L 85 100 Q 75 105 70 95 Z",
      "M 145 80 Q 155 75 160 85 L 160 95 Q 155 105 145 100 Z",
    ],
    label: "shoulders",
    cx: 115,
    cy: 82,
  },
  "Arms": {
    paths: [
      "M 65 100 Q 60 100 58 110 L 55 140 Q 60 145 65 140 L 70 115 Q 72 105 68 100 Z",
      "M 160 100 Q 165 100 167 110 L 170 140 Q 165 145 160 140 L 155 115 Q 153 105 157 100 Z",
    ],
    label: "arms",
    cx: 115,
    cy: 120,
  },
  "Core": {
    paths: [
      "M 95 120 L 135 120 L 133 165 Q 115 170 97 165 Z",
    ],
    label: "core",
    cx: 115,
    cy: 143,
  },
  "Back": {
    paths: [
      "M 88 95 L 95 95 L 95 120 L 88 120 Q 82 108 88 95 Z",
      "M 135 95 L 142 95 Q 148 108 142 120 L 135 120 Z",
    ],
    label: "back",
    cx: 115,
    cy: 107,
  },
  "Legs & Glutes": {
    paths: [
      "M 90 170 Q 95 165 105 168 L 103 220 Q 95 225 90 218 Z",
      "M 125 168 Q 135 165 140 170 L 140 218 Q 135 225 127 220 Z",
    ],
    label: "legsGlutes",
    cx: 115,
    cy: 195,
  },
};

const MuscleRecoveryMap = ({ recoveryData, highlightedMuscles = [] }: MuscleRecoveryMapProps) => {
  const { t } = useTranslation();
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null);

  const recoveryMap = useMemo(() => {
    const map: Record<string, RecoveryData> = {};
    recoveryData.forEach((r) => { map[r.muscle_group] = r; });
    return map;
  }, [recoveryData]);

  const daysSince = (dateStr: string) => {
    return Math.max(0, (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
  };

  const getRealtimeRecovery = (data: RecoveryData | undefined): number => {
    if (!data) return 100;
    const days = daysSince(data.last_trained_at);
    const fatigueRemaining = data.fatigue_score * Math.exp(-0.9 * days);
    return Math.min(100, Math.max(0, 100 - fatigueRemaining));
  };

  const highlightSet = useMemo(() => new Set(highlightedMuscles.map(m => m.toLowerCase())), [highlightedMuscles]);

  const isHighlighted = (group: string, label: string) => {
    if (highlightSet.size === 0) return false;
    return highlightSet.has(group.toLowerCase()) || highlightSet.has(label.toLowerCase());
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
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <svg viewBox="40 40 150 210" className="w-48 h-64 mx-auto">
            {/* Head */}
            <circle cx="115" cy="55" r="14" fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth="1" />
            {/* Neck */}
            <rect x="109" y="69" width="12" height="10" rx="3" fill="hsl(var(--muted))" />

            {/* Muscle groups with click popover */}
            {Object.entries(MUSCLE_PATHS).map(([group, config]) => {
              const data = recoveryMap[group];
              const recovery = getRealtimeRecovery(data);
              const color = getRecoveryColor(recovery);
              const highlighted = isHighlighted(group, config.label);

              return (
                <Popover key={group} open={selectedMuscle === group} onOpenChange={(open) => setSelectedMuscle(open ? group : null)}>
                  <PopoverTrigger asChild>
                    <g
                      className="cursor-pointer transition-all hover:opacity-80"
                      onClick={() => setSelectedMuscle(selectedMuscle === group ? null : group)}
                    >
                      {config.paths.map((d, i) => (
                        <path
                          key={i}
                          d={d}
                          fill={color}
                          fillOpacity={highlighted ? 1 : 0.7}
                          stroke={highlighted ? "hsl(var(--primary))" : color}
                          strokeWidth={highlighted ? 2.5 : 1}
                          strokeOpacity={0.9}
                        />
                      ))}
                      {highlighted && (
                        <circle cx={config.cx} cy={config.cy} r="4" fill="hsl(var(--primary))" fillOpacity={0.6}>
                          <animate attributeName="r" values="3;6;3" dur="1.5s" repeatCount="indefinite" />
                          <animate attributeName="fill-opacity" values="0.6;0.2;0.6" dur="1.5s" repeatCount="indefinite" />
                        </circle>
                      )}
                    </g>
                  </PopoverTrigger>
                  <PopoverContent side="right" className="w-52 p-3" sideOffset={5}>
                    <div className="space-y-2">
                      <p className="font-display font-bold text-sm">
                        {(t.muscleGroups as any)[config.label] || group}
                      </p>
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
                        <span className="text-sm font-semibold" style={{ color }}>
                          {t.recovery.recoveryLabel}: {Math.round(recovery)}%
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{getRecoveryLabel(recovery, t)}</p>
                      <div className="border-t border-border/50 pt-2">
                        <p className="text-xs text-muted-foreground">
                          {t.recovery.restTimeRecommended}: <span className="font-semibold text-foreground">{getEstimatedRestTime(recovery)}</span>
                        </p>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              );
            })}

            {/* Hands/Feet outlines */}
            <ellipse cx="52" cy="148" rx="5" ry="8" fill="hsl(var(--muted))" />
            <ellipse cx="178" cy="148" rx="5" ry="8" fill="hsl(var(--muted))" />
            <ellipse cx="95" cy="235" rx="8" ry="5" fill="hsl(var(--muted))" />
            <ellipse cx="135" cy="235" rx="8" ry="5" fill="hsl(var(--muted))" />
          </svg>

          {/* Legend + list */}
          <div className="flex-1 space-y-2 w-full">
            {Object.entries(MUSCLE_PATHS).map(([group, config]) => {
              const data = recoveryMap[group];
              const recovery = getRealtimeRecovery(data);
              const color = getRecoveryColor(recovery);
              const highlighted = isHighlighted(group, config.label);

              return (
                <button
                  key={group}
                  onClick={() => setSelectedMuscle(selectedMuscle === group ? null : group)}
                  className={`flex items-center gap-2 rounded-lg border p-2 w-full text-left transition-all ${
                    highlighted ? "border-primary/50 bg-primary/5 ring-1 ring-primary/30" : "border-border/50 hover:bg-accent/30"
                  }`}
                >
                  <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate">
                      {(t.muscleGroups as any)[config.label] || group}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold" style={{ color }}>{Math.round(recovery)}%</p>
                    <p className="text-[9px] text-muted-foreground">{getRecoveryLabel(recovery, t)}</p>
                  </div>
                </button>
              );
            })}

            {/* Color legend */}
            <div className="flex gap-2 pt-2 flex-wrap">
              {[
                { color: "hsl(0, 84%, 60%)", label: "0-30%" },
                { color: "hsl(48, 96%, 53%)", label: "31-70%" },
                { color: "hsl(142, 71%, 45%)", label: "71-100%" },
              ].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-1">
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-[9px] text-muted-foreground">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MuscleRecoveryMap;
