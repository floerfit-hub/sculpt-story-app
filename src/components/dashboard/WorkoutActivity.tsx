import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/i18n";
import { Dumbbell } from "lucide-react";

interface WorkoutActivityProps {
  workoutsThisMonth: number;
  totalSetsThisMonth: number;
  currentStreak: number;
}

const WorkoutActivity = ({ workoutsThisMonth, totalSetsThisMonth, currentStreak }: WorkoutActivityProps) => {
  const { t } = useTranslation();

  const stats = [
    { label: t.fitScore.workoutsMonth, value: workoutsThisMonth },
    { label: t.fitScore.setsMonth, value: totalSetsThisMonth },
    { label: t.fitScore.streak, value: `${currentStreak} ${t.fitScore.streakDays}` },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Dumbbell className="h-4 w-4 text-primary" />
          {t.fitScore.workoutActivity}
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="grid grid-cols-3 gap-3">
          {stats.map((s) => (
            <div key={s.label} className="text-center rounded-xl bg-accent/50 p-3">
              <p className="text-xl font-display font-bold">{s.value}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default WorkoutActivity;
