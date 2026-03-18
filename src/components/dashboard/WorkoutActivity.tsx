import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/i18n";
import { Dumbbell } from "lucide-react";
import { isToday, isYesterday, format } from "date-fns";
import { uk as ukLocale } from "date-fns/locale";

interface WorkoutActivityProps {
  workoutsThisMonth: number;
  totalSetsThisMonth: number;
  lastWorkoutAt: string | null;
}

const WorkoutActivity = ({ workoutsThisMonth, totalSetsThisMonth, lastWorkoutAt }: WorkoutActivityProps) => {
  const { t, lang } = useTranslation();

  const getLastWorkoutLabel = (): string => {
    if (!lastWorkoutAt) return "—";
    const date = new Date(lastWorkoutAt);
    if (isToday(date)) return lang === "uk" ? "Сьогодні" : "Today";
    if (isYesterday(date)) return lang === "uk" ? "Вчора" : "Yesterday";
    return format(date, "d MMM", { locale: lang === "uk" ? ukLocale : undefined });
  };

  const lastWorkoutLabel = getLastWorkoutLabel();

  const stats = [
    { label: t.fitScore.workoutsMonth, value: workoutsThisMonth },
    { label: t.fitScore.setsMonth, value: totalSetsThisMonth },
    { label: t.fitScore.lastWorkout, value: lastWorkoutLabel },
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
