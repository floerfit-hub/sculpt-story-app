import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useTranslation } from "@/i18n";
import { Sun, Moon, Zap, Activity } from "lucide-react";
import type { MorningCheckin as CheckinType } from "@/lib/muscleScience";

interface MorningCheckinProps {
  onCheckin: (data: CheckinType) => void;
  existingCheckin?: CheckinType | null;
}

const CHECKIN_STORAGE_KEY = "morning-checkin";

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

const MorningCheckinCard = ({ onCheckin, existingCheckin }: MorningCheckinProps) => {
  const { t } = useTranslation();
  const [sleepHours, setSleepHours] = useState(7);
  const [sorenessScore, setSorenessScore] = useState(3);
  const [energyScore, setEnergyScore] = useState(3);
  const [nutritionScore, setNutritionScore] = useState(7);
  const [submitted, setSubmitted] = useState(!!existingCheckin);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(CHECKIN_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.date === getTodayKey()) {
          setSleepHours(parsed.data.sleepHours);
          setSorenessScore(parsed.data.sorenessScore);
          setEnergyScore(parsed.data.energyScore);
          setNutritionScore(parsed.data.nutritionScore);
          setSubmitted(true);
          onCheckin(parsed.data);
        }
      }
    } catch { /* ignore */ }
  }, []);

  const handleSubmit = () => {
    const data: CheckinType = { sleepHours, sorenessScore, energyScore, nutritionScore };
    localStorage.setItem(CHECKIN_STORAGE_KEY, JSON.stringify({ date: getTodayKey(), data }));
    setSubmitted(true);
    onCheckin(data);
  };

  if (submitted) {
    return (
      <Card className="border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <Sun className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold">{(t.recovery as any).checkinDone ?? "Morning check-in done"}</p>
              <p className="text-[10px] text-muted-foreground">
                {(t.recovery as any).sleep ?? "Sleep"}: {sleepHours}h · {(t.recovery as any).energy ?? "Energy"}: {energyScore}/5 · {(t.recovery as any).soreness ?? "Soreness"}: {sorenessScore}/5
              </p>
            </div>
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setSubmitted(false)}>
              {(t.recovery as any).edit ?? "Edit"}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Sun className="h-4 w-4 text-primary" />
          {(t.recovery as any).morningCheckin ?? "Morning Check-in"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pb-4">
        {/* Sleep */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs flex items-center gap-1.5">
              <Moon className="h-3 w-3 text-muted-foreground" />
              {(t.recovery as any).sleepHours ?? "Sleep (hours)"}
            </span>
            <span className="text-xs font-bold">{sleepHours}h</span>
          </div>
          <Slider value={[sleepHours]} onValueChange={([v]) => setSleepHours(v)} min={3} max={12} step={0.5} />
        </div>

        {/* Energy */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs flex items-center gap-1.5">
              <Zap className="h-3 w-3 text-muted-foreground" />
              {(t.recovery as any).energy ?? "Energy"}
            </span>
            <span className="text-xs font-bold">{energyScore}/5</span>
          </div>
          <Slider value={[energyScore]} onValueChange={([v]) => setEnergyScore(v)} min={1} max={5} step={1} />
        </div>

        {/* Soreness */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs flex items-center gap-1.5">
              <Activity className="h-3 w-3 text-muted-foreground" />
              {(t.recovery as any).soreness ?? "Soreness"} <span className="text-muted-foreground">(1={(t.recovery as any).high ?? "high"}, 5={(t.recovery as any).none ?? "none"})</span>
            </span>
            <span className="text-xs font-bold">{sorenessScore}/5</span>
          </div>
          <Slider value={[sorenessScore]} onValueChange={([v]) => setSorenessScore(v)} min={1} max={5} step={1} />
        </div>

        {/* Nutrition */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs">🍽 {(t.recovery as any).nutritionScore ?? "Nutrition"}</span>
            <span className="text-xs font-bold">{nutritionScore}/10</span>
          </div>
          <Slider value={[nutritionScore]} onValueChange={([v]) => setNutritionScore(v)} min={1} max={10} step={1} />
        </div>

        <Button onClick={handleSubmit} className="w-full" size="sm">
          {(t.recovery as any).submitCheckin ?? "Submit Check-in"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default MorningCheckinCard;
