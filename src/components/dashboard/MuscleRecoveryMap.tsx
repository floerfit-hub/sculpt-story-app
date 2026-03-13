import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/i18n";
import { Activity } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface RecoveryData {
  muscle_group: string;
  fatigue_score: number;
  recovery_percent: number;
  last_trained_at: string;
}

interface MuscleRecoveryMapProps {
  recoveryData: RecoveryData[];
}

const getRecoveryColor = (recovery: number): string => {
  if (recovery >= 85) return "hsl(142, 71%, 45%)"; // green
  if (recovery >= 60) return "hsl(48, 96%, 53%)";  // yellow
  if (recovery >= 30) return "hsl(25, 95%, 53%)";  // orange
  return "hsl(0, 84%, 60%)";                        // red
};

const getRecoveryLabel = (recovery: number, t: any): string => {
  if (recovery >= 85) return t.recovery.ready;
  if (recovery >= 60) return t.recovery.almostReady;
  if (recovery >= 30) return t.recovery.recovering;
  return t.recovery.fatigued;
};

// SVG muscle group regions mapped to path data
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

const MuscleRecoveryMap = ({ recoveryData }: MuscleRecoveryMapProps) => {
  const { t } = useTranslation();

  const recoveryMap = useMemo(() => {
    const map: Record<string, RecoveryData> = {};
    recoveryData.forEach((r) => {
      map[r.muscle_group] = r;
    });
    return map;
  }, [recoveryData]);

  const daysSince = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    return Math.max(0, diff / (1000 * 60 * 60 * 24));
  };

  // Calculate real-time recovery using exponential decay
  const getRealtimeRecovery = (data: RecoveryData | undefined): number => {
    if (!data) return 100; // never trained = fully recovered
    const days = daysSince(data.last_trained_at);
    const fatigueRemaining = data.fatigue_score * Math.exp(-0.9 * days);
    return Math.min(100, Math.max(0, 100 - fatigueRemaining));
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
          {/* SVG Body */}
          <TooltipProvider>
            <svg viewBox="40 40 150 210" className="w-48 h-64 mx-auto">
              {/* Head */}
              <circle cx="115" cy="55" r="14" fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth="1" />

              {/* Neck */}
              <rect x="109" y="69" width="12" height="10" rx="3" fill="hsl(var(--muted))" />

              {/* Muscle groups */}
              {Object.entries(MUSCLE_PATHS).map(([group, config]) => {
                const data = recoveryMap[group];
                const recovery = getRealtimeRecovery(data);
                const color = getRecoveryColor(recovery);

                return (
                  <Tooltip key={group}>
                    <TooltipTrigger asChild>
                      <g className="cursor-pointer transition-opacity hover:opacity-80">
                        {config.paths.map((d, i) => (
                          <path
                            key={i}
                            d={d}
                            fill={color}
                            fillOpacity={0.7}
                            stroke={color}
                            strokeWidth="1"
                            strokeOpacity={0.9}
                          />
                        ))}
                      </g>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-semibold">
                        {(t.muscleGroups as any)[config.label] || group}
                      </p>
                      <p className="text-xs">
                        {t.recovery.recoveryLabel}: {Math.round(recovery)}%
                      </p>
                      <p className="text-xs">
                        {getRecoveryLabel(recovery, t)}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}

              {/* Hands/Feet outlines */}
              <ellipse cx="52" cy="148" rx="5" ry="8" fill="hsl(var(--muted))" />
              <ellipse cx="178" cy="148" rx="5" ry="8" fill="hsl(var(--muted))" />
              <ellipse cx="95" cy="235" rx="8" ry="5" fill="hsl(var(--muted))" />
              <ellipse cx="135" cy="235" rx="8" ry="5" fill="hsl(var(--muted))" />
            </svg>
          </TooltipProvider>

          {/* Legend + list */}
          <div className="flex-1 space-y-2 w-full">
            {Object.entries(MUSCLE_PATHS).map(([group, config]) => {
              const data = recoveryMap[group];
              const recovery = getRealtimeRecovery(data);
              const color = getRecoveryColor(recovery);

              return (
                <div key={group} className="flex items-center gap-2 rounded-lg border border-border/50 p-2">
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
                </div>
              );
            })}

            {/* Color legend */}
            <div className="flex gap-2 pt-2 flex-wrap">
              {[
                { color: "hsl(0, 84%, 60%)", label: "0-30%" },
                { color: "hsl(25, 95%, 53%)", label: "30-60%" },
                { color: "hsl(48, 96%, 53%)", label: "60-85%" },
                { color: "hsl(142, 71%, 45%)", label: "85-100%" },
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
