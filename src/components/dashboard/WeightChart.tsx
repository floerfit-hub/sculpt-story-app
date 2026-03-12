import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/i18n";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { Scale } from "lucide-react";
import { format } from "date-fns";
import type { Tables } from "@/integrations/supabase/types";

type ProgressEntry = Tables<"progress_entries">;

const WeightChart = ({ entries }: { entries: ProgressEntry[] }) => {
  const { t } = useTranslation();
  const data = entries
    .filter((e) => e.weight != null)
    .map((e) => ({ date: format(new Date(e.entry_date), "MMM d"), weight: Number(e.weight) }));

  if (data.length < 2) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Scale className="h-4 w-4 text-primary" />
          {t.fitScore.weightProgress}
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <XAxis dataKey="date" fontSize={10} tick={{ fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis fontSize={10} tick={{ fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} domain={["dataMin - 1", "dataMax + 1"]} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "0.75rem", fontSize: 12 }} />
              <Line type="monotone" dataKey="weight" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ fill: "hsl(var(--primary))", r: 3 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default WeightChart;
