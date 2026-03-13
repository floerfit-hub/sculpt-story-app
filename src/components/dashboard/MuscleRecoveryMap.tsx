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
  if (recovery >= 71) return "hsl(142, 71%, 45%)";
  if (recovery >= 31) return "hsl(48, 96%, 53%)";
  return "hsl(0, 84%, 60%)";
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

// Map visual muscle areas to recovery data groups
const RECOVERY_GROUP_MAP: Record<string, string> = {
  chest: "Chest",
  frontDelts: "Shoulders",
  rearDelts: "Shoulders",
  abs: "Core",
  quads: "Legs & Glutes",
  biceps: "Arms",
  forearms: "Arms",
  traps: "Back",
  lats: "Back",
  lowerBack: "Back",
  glutes: "Legs & Glutes",
  hamstrings: "Legs & Glutes",
  calves: "Legs & Glutes",
};

interface MuscleArea {
  id: string;
  i18nKey: string;
  paths: string[];
  labelPos: { x: number; y: number };
}

// ─── FRONT VIEW muscles ───
const FRONT_MUSCLES: MuscleArea[] = [
  {
    id: "frontDelts",
    i18nKey: "frontDelts",
    paths: [
      // Left front delt
      "M 62 88 Q 56 82 58 74 Q 64 68 72 72 Q 74 78 72 88 Z",
      // Right front delt
      "M 108 88 Q 106 78 108 72 Q 116 68 122 74 Q 124 82 118 88 Z",
    ],
    labelPos: { x: 90, y: 80 },
  },
  {
    id: "chest",
    i18nKey: "chest",
    paths: [
      // Left pec
      "M 72 88 Q 72 82 78 80 Q 86 78 90 82 L 90 100 Q 82 104 72 100 Z",
      // Right pec
      "M 90 82 Q 94 78 102 80 Q 108 82 108 88 L 108 100 Q 98 104 90 100 Z",
    ],
    labelPos: { x: 90, y: 92 },
  },
  {
    id: "biceps",
    i18nKey: "biceps",
    paths: [
      // Left bicep
      "M 58 90 Q 54 90 52 96 L 48 118 Q 52 122 58 118 L 62 98 Q 64 92 62 88 Z",
      // Right bicep
      "M 118 88 Q 116 92 118 98 L 122 118 Q 128 122 132 118 L 128 96 Q 126 90 122 90 Z",
    ],
    labelPos: { x: 90, y: 105 },
  },
  {
    id: "forearms",
    i18nKey: "forearms",
    paths: [
      // Left forearm
      "M 48 120 Q 44 120 42 128 L 38 152 Q 42 156 48 152 L 52 130 Q 54 122 50 120 Z",
      // Right forearm
      "M 130 120 Q 126 122 128 130 L 132 152 Q 138 156 142 152 L 138 128 Q 136 120 132 120 Z",
    ],
    labelPos: { x: 90, y: 138 },
  },
  {
    id: "abs",
    i18nKey: "abs",
    paths: [
      "M 78 102 L 102 102 L 102 148 Q 96 156 90 158 Q 84 156 78 148 Z",
    ],
    labelPos: { x: 90, y: 130 },
  },
  {
    id: "quads",
    i18nKey: "quads",
    paths: [
      // Left quad
      "M 74 152 Q 78 148 84 152 L 82 200 Q 78 206 72 200 Z",
      // Right quad
      "M 96 152 Q 102 148 106 152 L 108 200 Q 102 206 98 200 Z",
    ],
    labelPos: { x: 90, y: 178 },
  },
];

// ─── BACK VIEW muscles ───
const BACK_MUSCLES: MuscleArea[] = [
  {
    id: "rearDelts",
    i18nKey: "rearDelts",
    paths: [
      "M 62 88 Q 56 82 58 74 Q 64 68 72 72 Q 74 78 72 88 Z",
      "M 108 88 Q 106 78 108 72 Q 116 68 122 74 Q 124 82 118 88 Z",
    ],
    labelPos: { x: 90, y: 80 },
  },
  {
    id: "traps",
    i18nKey: "traps",
    paths: [
      "M 78 68 Q 84 62 90 60 Q 96 62 102 68 L 102 84 Q 96 80 90 78 Q 84 80 78 84 Z",
    ],
    labelPos: { x: 90, y: 74 },
  },
  {
    id: "lats",
    i18nKey: "lats",
    paths: [
      // Left lat
      "M 70 90 Q 72 86 78 86 L 78 120 Q 74 126 68 118 Z",
      // Right lat
      "M 102 86 Q 108 86 110 90 L 112 118 Q 106 126 102 120 Z",
    ],
    labelPos: { x: 90, y: 106 },
  },
  {
    id: "lowerBack",
    i18nKey: "lowerBack",
    paths: [
      "M 78 122 L 102 122 L 102 150 Q 96 156 90 158 Q 84 156 78 150 Z",
    ],
    labelPos: { x: 90, y: 138 },
  },
  {
    id: "glutes",
    i18nKey: "glutes",
    paths: [
      // Left glute
      "M 74 152 Q 78 148 84 150 L 84 172 Q 78 176 72 170 Z",
      // Right glute
      "M 96 150 Q 102 148 106 152 L 108 170 Q 102 176 96 172 Z",
    ],
    labelPos: { x: 90, y: 162 },
  },
  {
    id: "hamstrings",
    i18nKey: "hamstrings",
    paths: [
      // Left hamstring
      "M 72 174 Q 78 170 84 174 L 82 210 Q 78 216 72 210 Z",
      // Right hamstring
      "M 96 174 Q 102 170 108 174 L 108 210 Q 102 216 98 210 Z",
    ],
    labelPos: { x: 90, y: 192 },
  },
  {
    id: "calves",
    i18nKey: "calves",
    paths: [
      // Left calf
      "M 72 214 Q 76 210 82 214 L 80 248 Q 76 252 72 248 Z",
      // Right calf
      "M 98 214 Q 104 210 108 214 L 108 248 Q 104 252 100 248 Z",
    ],
    labelPos: { x: 90, y: 232 },
  },
];

// Body outline for the silhouette
const BODY_OUTLINE_FRONT =
  "M 90 22 Q 78 22 74 32 Q 70 42 72 52 Q 74 62 82 66 Q 86 68 90 68 Q 94 68 98 66 Q 106 62 108 52 Q 110 42 106 32 Q 102 22 90 22 Z " + // Head
  "M 82 68 L 82 72 Q 80 72 78 72 L 78 68 Z M 98 68 L 102 68 Q 100 72 98 72 L 98 68 Z " + // Neck
  "M 78 72 Q 62 66 54 72 Q 48 78 48 88 L 44 116 Q 38 118 36 128 L 32 156 Q 34 162 40 158 L 46 124 Q 48 120 52 118 L 58 90 Q 56 92 52 96 L 46 122 " + // Left arm outer
  "M 102 72 Q 118 66 126 72 Q 132 78 132 88 L 136 116 Q 142 118 144 128 L 148 156 Q 146 162 140 158 L 134 124 Q 132 120 128 118 L 122 90 Q 124 92 128 96 L 134 122 " + // Right arm outer
  "M 78 148 L 74 152 L 70 200 Q 68 210 66 248 Q 68 260 74 260 Q 78 256 80 248 L 84 200 L 84 152 " + // Left leg
  "M 102 148 L 96 152 L 96 200 L 100 248 Q 102 256 106 260 Q 112 260 114 248 Q 112 210 110 200 L 106 152 Z"; // Right leg

const BODY_OUTLINE_BACK = BODY_OUTLINE_FRONT; // Same silhouette, interpreted as back

const BodySilhouette = ({ viewBox = "28 16 124 252" }: { viewBox?: string }) => (
  <>
    {/* Head */}
    <ellipse cx="90" cy="38" rx="16" ry="20" fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth="0.8" />
    {/* Neck */}
    <rect x="84" y="56" width="12" height="12" rx="4" fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth="0.5" />
    {/* Torso */}
    <path
      d="M 72 68 Q 64 66 56 72 Q 50 80 50 90 L 50 100 Q 52 90 58 88 L 62 88 L 72 88 L 72 68 Z"
      fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth="0.5"
    />
    <path
      d="M 108 68 Q 116 66 124 72 Q 130 80 130 90 L 130 100 Q 128 90 122 88 L 118 88 L 108 88 L 108 68 Z"
      fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth="0.5"
    />
    {/* Arms */}
    <path
      d="M 58 90 Q 52 90 48 96 L 42 120 Q 38 120 36 128 L 32 156 Q 36 160 40 156 L 44 132 Q 48 124 50 120 L 56 98 Q 58 94 62 90 Z"
      fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth="0.5"
    />
    <path
      d="M 122 90 Q 128 90 132 96 L 138 120 Q 142 120 144 128 L 148 156 Q 144 160 140 156 L 136 132 Q 132 124 130 120 L 124 98 Q 122 94 118 90 Z"
      fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth="0.5"
    />
    {/* Hands */}
    <ellipse cx="34" cy="160" rx="5" ry="7" fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth="0.4" />
    <ellipse cx="146" cy="160" rx="5" ry="7" fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth="0.4" />
    {/* Legs */}
    <path
      d="M 78 148 Q 74 152 72 162 L 68 210 Q 66 232 66 248 Q 68 258 76 258 Q 80 254 80 248 L 84 210 L 84 162 Q 84 156 82 152 Z"
      fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth="0.5"
    />
    <path
      d="M 96 152 Q 96 156 96 162 L 96 210 L 100 248 Q 100 254 104 258 Q 112 258 114 248 Q 114 232 112 210 L 108 162 Q 106 152 102 148 Z"
      fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth="0.5"
    />
    {/* Feet */}
    <ellipse cx="72" cy="260" rx="8" ry="4" fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth="0.4" />
    <ellipse cx="108" cy="260" rx="8" ry="4" fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth="0.4" />
  </>
);

interface MuscleViewProps {
  muscles: MuscleArea[];
  recoveryMap: Record<string, RecoveryData>;
  getRealtimeRecovery: (data: RecoveryData | undefined) => number;
  highlightSet: Set<string>;
  selectedMuscle: string | null;
  setSelectedMuscle: (m: string | null) => void;
  t: any;
}

const MuscleView = ({
  muscles,
  recoveryMap,
  getRealtimeRecovery,
  highlightSet,
  selectedMuscle,
  setSelectedMuscle,
  t,
}: MuscleViewProps) => (
  <svg viewBox="28 16 124 252" className="w-full h-full" style={{ maxHeight: 320 }}>
    <BodySilhouette />
    {muscles.map((muscle) => {
      const recoveryGroup = RECOVERY_GROUP_MAP[muscle.id];
      const data = recoveryMap[recoveryGroup];
      const recovery = getRealtimeRecovery(data);
      const color = getRecoveryColor(recovery);
      const highlighted =
        highlightSet.size > 0 &&
        (highlightSet.has(muscle.id.toLowerCase()) ||
          highlightSet.has(muscle.i18nKey.toLowerCase()) ||
          highlightSet.has(recoveryGroup.toLowerCase()));

      return (
        <Popover
          key={muscle.id}
          open={selectedMuscle === muscle.id}
          onOpenChange={(open) => setSelectedMuscle(open ? muscle.id : null)}
        >
          <PopoverTrigger asChild>
            <g
              className="cursor-pointer transition-all hover:opacity-80"
              onClick={() => setSelectedMuscle(selectedMuscle === muscle.id ? null : muscle.id)}
            >
              {muscle.paths.map((d, i) => (
                <path
                  key={i}
                  d={d}
                  fill={color}
                  fillOpacity={highlighted ? 1 : 0.75}
                  stroke={highlighted ? "hsl(var(--primary))" : color}
                  strokeWidth={highlighted ? 2 : 0.8}
                  strokeOpacity={0.9}
                  rx="2"
                />
              ))}
              {highlighted && (
                <circle
                  cx={muscle.labelPos.x}
                  cy={muscle.labelPos.y}
                  r="3"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.6}
                >
                  <animate attributeName="r" values="2;5;2" dur="1.5s" repeatCount="indefinite" />
                  <animate attributeName="fill-opacity" values="0.6;0.2;0.6" dur="1.5s" repeatCount="indefinite" />
                </circle>
              )}
            </g>
          </PopoverTrigger>
          <PopoverContent side="right" className="w-52 p-3" sideOffset={5}>
            <div className="space-y-2">
              <p className="font-display font-bold text-sm">
                {(t.muscleGroups as any)[muscle.i18nKey] || muscle.id}
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
                  {t.recovery.restTimeRecommended}:{" "}
                  <span className="font-semibold text-foreground">{getEstimatedRestTime(recovery)}</span>
                </p>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      );
    })}
  </svg>
);

const MuscleRecoveryMap = ({ recoveryData, highlightedMuscles = [] }: MuscleRecoveryMapProps) => {
  const { t } = useTranslation();
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null);

  const recoveryMap = useMemo(() => {
    const map: Record<string, RecoveryData> = {};
    recoveryData.forEach((r) => {
      map[r.muscle_group] = r;
    });
    return map;
  }, [recoveryData]);

  const daysSince = (dateStr: string) =>
    Math.max(0, (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));

  const getRealtimeRecovery = (data: RecoveryData | undefined): number => {
    if (!data) return 100;
    const days = daysSince(data.last_trained_at);
    const fatigueRemaining = data.fatigue_score * Math.exp(-0.9 * days);
    return Math.min(100, Math.max(0, 100 - fatigueRemaining));
  };

  const highlightSet = useMemo(
    () => new Set(highlightedMuscles.map((m) => m.toLowerCase())),
    [highlightedMuscles]
  );

  // Collect all unique visual muscles for the legend list
  const allMuscles = useMemo(() => {
    const seen = new Set<string>();
    const result: { id: string; i18nKey: string; recoveryGroup: string }[] = [];
    [...FRONT_MUSCLES, ...BACK_MUSCLES].forEach((m) => {
      if (!seen.has(m.id)) {
        seen.add(m.id);
        result.push({ id: m.id, i18nKey: m.i18nKey, recoveryGroup: RECOVERY_GROUP_MAP[m.id] });
      }
    });
    return result;
  }, []);

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
        {/* Dual SVG views */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="text-center">
            <p className="text-[10px] font-semibold text-muted-foreground mb-1">{t.recovery.frontView}</p>
            <div className="aspect-[1/2] max-h-[280px]">
              <MuscleView
                muscles={FRONT_MUSCLES}
                recoveryMap={recoveryMap}
                getRealtimeRecovery={getRealtimeRecovery}
                highlightSet={highlightSet}
                selectedMuscle={selectedMuscle}
                setSelectedMuscle={setSelectedMuscle}
                t={t}
              />
            </div>
          </div>
          <div className="text-center">
            <p className="text-[10px] font-semibold text-muted-foreground mb-1">{t.recovery.backView}</p>
            <div className="aspect-[1/2] max-h-[280px]">
              <MuscleView
                muscles={BACK_MUSCLES}
                recoveryMap={recoveryMap}
                getRealtimeRecovery={getRealtimeRecovery}
                highlightSet={highlightSet}
                selectedMuscle={selectedMuscle}
                setSelectedMuscle={setSelectedMuscle}
                t={t}
              />
            </div>
          </div>
        </div>

        {/* Muscle list */}
        <div className="space-y-1.5">
          {allMuscles.map(({ id, i18nKey, recoveryGroup }) => {
            const data = recoveryMap[recoveryGroup];
            const recovery = getRealtimeRecovery(data);
            const color = getRecoveryColor(recovery);
            const highlighted =
              highlightSet.size > 0 &&
              (highlightSet.has(id.toLowerCase()) || highlightSet.has(recoveryGroup.toLowerCase()));

            return (
              <button
                key={id}
                onClick={() => setSelectedMuscle(selectedMuscle === id ? null : id)}
                className={`flex items-center gap-2 rounded-lg border p-2 w-full text-left transition-all ${
                  highlighted
                    ? "border-primary/50 bg-primary/5 ring-1 ring-primary/30"
                    : "border-border/50 hover:bg-accent/30"
                }`}
              >
                <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate">
                    {(t.muscleGroups as any)[i18nKey] || id}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-bold" style={{ color }}>
                    {Math.round(recovery)}%
                  </p>
                  <p className="text-[9px] text-muted-foreground">{getRecoveryLabel(recovery, t)}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Color legend */}
        <div className="flex gap-3 pt-3 flex-wrap">
          {[
            { color: "hsl(0, 84%, 60%)", label: "0-30%" },
            { color: "hsl(48, 96%, 53%)", label: "31-70%" },
            { color: "hsl(142, 71%, 45%)", label: "71-100%" },
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
