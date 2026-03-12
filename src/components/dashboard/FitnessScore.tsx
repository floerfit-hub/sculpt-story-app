import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslation } from "@/i18n";

interface FitnessScoreProps {
  trainingConsistency: number;
  strengthProgress: number;
  bodyProgress: number;
  muscleBalance: number;
}

const CircularProgress = ({ score, size = 140, strokeWidth = 10 }: { score: number; size?: number; strokeWidth?: number }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 70 ? "hsl(var(--primary))" : score >= 40 ? "hsl(45 90% 55%)" : "hsl(var(--destructive))";

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth={strokeWidth} />
      <circle
        cx={size / 2} cy={size / 2} r={radius} fill="none"
        stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"
        strokeDasharray={circumference} strokeDashoffset={offset}
        className="transition-all duration-1000 ease-out"
      />
    </svg>
  );
};

const MiniBar = ({ value, label }: { value: number; label: string }) => (
  <div className="flex items-center gap-3">
    <div className="flex-1 min-w-0">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-muted-foreground truncate">{label}</span>
        <span className="text-xs font-semibold tabular-nums">{value}</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${value}%`,
            background: value >= 70 ? "hsl(var(--primary))" : value >= 40 ? "hsl(45 90% 55%)" : "hsl(var(--destructive))",
          }}
        />
      </div>
    </div>
  </div>
);

const FitnessScore = ({ trainingConsistency, strengthProgress, bodyProgress, muscleBalance }: FitnessScoreProps) => {
  const { t } = useTranslation();
  const overall = useMemo(
    () => Math.round(trainingConsistency * 0.3 + strengthProgress * 0.25 + bodyProgress * 0.25 + muscleBalance * 0.2),
    [trainingConsistency, strengthProgress, bodyProgress, muscleBalance]
  );

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-center gap-5">
          <div className="relative shrink-0">
            <CircularProgress score={overall} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-display font-extrabold">{overall}</span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">/ 100</span>
            </div>
          </div>
          <div className="flex-1 space-y-2.5">
            <h3 className="font-display font-bold text-sm mb-3">{t.fitScore.title}</h3>
            <MiniBar value={trainingConsistency} label={t.fitScore.training} />
            <MiniBar value={strengthProgress} label={t.fitScore.strength} />
            <MiniBar value={bodyProgress} label={t.fitScore.body} />
            <MiniBar value={muscleBalance} label={t.fitScore.balance} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FitnessScore;
