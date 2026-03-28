import NutritionTracker from "@/components/dashboard/NutritionTracker";
import { useTranslation } from "@/i18n";

const Nutrition = () => {
  const { t } = useTranslation();

  return (
    <div className="max-w-2xl animate-fade-in space-y-4">
      <h1 className="font-display text-xl font-bold">
        {(t as any).nutrition?.title ?? "Харчування"}
      </h1>
      <NutritionTracker />
    </div>
  );
};

export default Nutrition;
