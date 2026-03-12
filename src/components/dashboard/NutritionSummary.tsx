import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n";
import { Flame, Beef, Droplets, Wheat } from "lucide-react";

interface NutritionSummaryProps {
  nutrition: { calories: number; protein: number; fat: number; carbs: number } | null;
}

const NutritionSummary = ({ nutrition }: NutritionSummaryProps) => {
  const { t } = useTranslation();

  if (!nutrition) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex items-center gap-4 p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent">
            <Flame className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">{t.dashboard.setupNutrition}</p>
          </div>
          <Link to="/calculator">
            <Button size="sm" variant="outline">{t.dashboard.goToCalculator}</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  const macros = [
    { label: t.calc.calories, value: nutrition.calories, unit: "kcal", icon: Flame, color: "text-orange-500" },
    { label: t.calc.protein, value: nutrition.protein, unit: "g", icon: Beef, color: "text-red-500" },
    { label: t.calc.fat, value: nutrition.fat, unit: "g", icon: Droplets, color: "text-yellow-500" },
    { label: t.calc.carbs, value: nutrition.carbs, unit: "g", icon: Wheat, color: "text-amber-600" },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Flame className="h-4 w-4 text-primary" />
          {t.dashboard.yourNutrition}
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="grid grid-cols-4 gap-2">
          {macros.map((m) => (
            <div key={m.label} className="text-center">
              <m.icon className={`h-4 w-4 mx-auto mb-1 ${m.color}`} />
              <p className="text-base font-display font-bold">{m.value}</p>
              <p className="text-[9px] text-muted-foreground uppercase">{m.unit}</p>
              <p className="text-[9px] text-muted-foreground mt-0.5">{m.label}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default NutritionSummary;
