import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/i18n";
import { Activity } from "lucide-react";

interface MuscleHeatmapProps {
  muscleData: Record<string, number>;
}

const MuscleHeatmap = ({ muscleData }: MuscleHeatmapProps) => {
  const { t } = useTranslation();
  const maxSets = Math.max(...Object.values(muscleData), 1);

  const groupLabels: Record<string, string> = {
    "Legs & Glutes": t.muscleGroups.legsGlutes,
    "Back": t.muscleGroups.back,
    "Chest": t.muscleGroups.chest,
    "Shoulders": t.muscleGroups.shoulders,
    "Arms": t.muscleGroups.arms,
    "Core": t.muscleGroups.core,
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          {t.dashboard.muscleActivity}
        </CardTitle>
        <p className="text-[10px] text-muted-foreground">{t.dashboard.last30Days}</p>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(groupLabels).map(([key, label]) => {
            const sets = muscleData[key] || 0;
            const intensity = sets / maxSets;
            const opacity = Math.max(0.1, intensity);
            return (
              <div
                key={key}
                className="rounded-xl p-3 text-center transition-all"
                style={{ background: `hsl(var(--primary) / ${opacity})` }}
              >
                <p className="text-xs font-semibold truncate" style={{ color: intensity > 0.5 ? "hsl(var(--primary-foreground))" : "hsl(var(--foreground))" }}>
                  {label}
                </p>
                <p className="text-lg font-display font-bold mt-0.5" style={{ color: intensity > 0.5 ? "hsl(var(--primary-foreground))" : "hsl(var(--foreground))" }}>
                  {sets}
                </p>
                <p className="text-[9px]" style={{ color: intensity > 0.5 ? "hsl(var(--primary-foreground) / 0.7)" : "hsl(var(--muted-foreground))" }}>
                  {t.dashboard.setsLast30.split(" ").slice(0, 1).join(" ")}
                </p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default MuscleHeatmap;
