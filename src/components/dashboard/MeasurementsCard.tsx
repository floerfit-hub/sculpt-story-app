import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/i18n";
import { Ruler, TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type ProgressEntry = Tables<"progress_entries">;

interface MeasurementRowProps {
  label: string;
  current?: number | null;
  previous?: number | null;
  unit: string;
}

const MeasurementRow = ({ label, current, previous, unit }: MeasurementRowProps) => {
  const diff = current != null && previous != null ? Number((current - previous).toFixed(1)) : null;
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border/30 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-3">
        {previous != null && (
          <span className="text-xs text-muted-foreground/60 tabular-nums">{previous}</span>
        )}
        <span className="text-sm font-semibold tabular-nums">{current ?? "—"}{current != null && <span className="text-xs text-muted-foreground ml-0.5">{unit}</span>}</span>
        {diff != null && (
          <div className={`flex items-center gap-0.5 text-xs font-medium ${diff < 0 ? "text-primary" : diff > 0 ? "text-destructive" : "text-muted-foreground"}`}>
            {diff < 0 ? <TrendingDown className="h-3 w-3" /> : diff > 0 ? <TrendingUp className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
            {diff > 0 ? "+" : ""}{diff}
          </div>
        )}
      </div>
    </div>
  );
};

const MeasurementsCard = ({ latest, previous }: { latest?: ProgressEntry; previous?: ProgressEntry }) => {
  const { t } = useTranslation();

  const measurements = [
    { label: t.fitScore.arm, current: latest?.arm_circumference, previous: previous?.arm_circumference },
    { label: t.fitScore.chest, current: latest?.chest, previous: previous?.chest },
    { label: t.fitScore.waistM, current: latest?.waist, previous: previous?.waist },
    { label: t.fitScore.glute, current: latest?.glute_circumference, previous: previous?.glute_circumference },
    { label: t.fitScore.thigh, current: latest?.thigh_circumference, previous: previous?.thigh_circumference },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Ruler className="h-4 w-4 text-primary" />
          {t.fitScore.measurements}
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-3">
        {measurements.map((m) => (
          <MeasurementRow key={m.label} label={m.label} current={m.current} previous={m.previous} unit={t.common.cm} />
        ))}
      </CardContent>
    </Card>
  );
};

export default MeasurementsCard;
