import NutritionTracker from "@/components/dashboard/NutritionTracker";
import NutritionHistory from "@/components/dashboard/NutritionHistory";
import { useTranslation } from "@/i18n";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calculator as CalcIcon } from "lucide-react";

const Nutrition = () => {
  const { t } = useTranslation();

  return (
    <div className="max-w-2xl animate-fade-in space-y-4">
      <h1 className="font-display text-xl font-bold">
        {(t as any).nutrition?.title ?? "Харчування"}
      </h1>
      <Card>
        <CardContent className="flex items-center gap-3 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent">
            <CalcIcon className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold">{t.calc.title}</p>
            <p className="text-xs text-muted-foreground">{t.calc.subtitle}</p>
          </div>
          <Link to="/calculator">
            <Button size="sm">{t.dashboard.goToCalculator}</Button>
          </Link>
        </CardContent>
      </Card>
      <NutritionTracker />
      <NutritionHistory />
    </div>
  );
};

export default Nutrition;
