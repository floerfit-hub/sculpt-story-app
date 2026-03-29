import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Camera, Plus, Trash2, Loader2, Sparkles } from "lucide-react";
import { format } from "date-fns";

interface NutritionGoals {
  daily_calories: number;
  daily_protein: number;
  daily_fat: number;
  daily_carbs: number;
}

interface FoodLogEntry {
  id: string;
  food_name: string;
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
  coach_advice: string | null;
  created_at: string;
}

const DEFAULT_GOALS: NutritionGoals = { daily_calories: 2000, daily_protein: 150, daily_fat: 65, daily_carbs: 250 };

const CircularProgress = ({ value, max, label, current, unit, color }: { value: number; max: number; label: string; current: number; unit: string; color: string }) => {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative h-[68px] w-[68px]">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r={radius} fill="none" strokeWidth="5" className="stroke-muted/40" />
          <circle
            cx="32" cy="32" r={radius} fill="none" strokeWidth="5"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className={`transition-all duration-700 ease-out ${color}`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xs font-display font-extrabold leading-none">{current}</span>
          <span className="text-[8px] text-muted-foreground leading-none mt-0.5">/{max}</span>
        </div>
      </div>
      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{label}</span>
    </div>
  );
};

const NutritionTracker = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [goals, setGoals] = useState<NutritionGoals>(DEFAULT_GOALS);
  const [logs, setLogs] = useState<FoodLogEntry[]>([]);
  const [scanning, setScanning] = useState(false);
  const [lastAdvice, setLastAdvice] = useState<string | null>(null);

  const todayStr = format(new Date(), "yyyy-MM-dd");

  const fetchData = useCallback(async () => {
    if (!user) return;

    const [profileRes, logsRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("daily_calories, daily_protein, daily_fat, daily_carbs" as any)
        .eq("user_id", user.id)
        .single(),
      supabase
        .from("food_logs" as any)
        .select("*")
        .eq("user_id", user.id)
        .gte("created_at", `${todayStr}T00:00:00`)
        .lte("created_at", `${todayStr}T23:59:59`)
        .order("created_at", { ascending: false }),
    ]);

    if (profileRes.data) {
      const p = profileRes.data as any;
      let g = {
        daily_calories: p.daily_calories ?? 2000,
        daily_protein: p.daily_protein ?? 150,
        daily_fat: p.daily_fat ?? 65,
        daily_carbs: p.daily_carbs ?? 250,
      };

      // One-time migration: if profile still has defaults, pull from localStorage calculator results
      try {
        const saved = localStorage.getItem("nutrition_results");
        if (saved) {
          const calc = JSON.parse(saved);
          if (calc.calories && g.daily_calories === 2000) {
            g = {
              daily_calories: calc.calories,
              daily_protein: calc.protein,
              daily_fat: calc.fat,
              daily_carbs: calc.carbs,
            };
            supabase.from("profiles").update({
              daily_calories: calc.calories,
              daily_protein: calc.protein,
              daily_fat: calc.fat,
              daily_carbs: calc.carbs,
            }).eq("user_id", user.id);
          }
        }
      } catch {}

      setGoals(g);
    }

    if (logsRes.data) {
      setLogs(logsRes.data as any);
    }
  }, [user, todayStr]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totals = logs.reduce(
    (acc, l) => ({
      kcal: acc.kcal + Number(l.kcal),
      protein: acc.protein + Number(l.protein),
      fat: acc.fat + Number(l.fat),
      carbs: acc.carbs + Number(l.carbs),
    }),
    { kcal: 0, protein: 0, fat: 0, carbs: 0 }
  );

  const handleScanMeal = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    e.target.value = "";

    setScanning(true);
    setLastAdvice(null);

    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const { data, error } = await supabase.functions.invoke("analyze-meal", {
        body: { imageBase64: base64, mimeType: file.type },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const { food_name, kcal, protein, fat, carbs, coach_advice } = data;

      const { error: insertError } = await (supabase as any)
        .from("food_logs")
        .insert({
          user_id: user.id,
          food_name,
          kcal: Math.round(kcal),
          protein: Math.round(protein * 10) / 10,
          fat: Math.round(fat * 10) / 10,
          carbs: Math.round(carbs * 10) / 10,
          coach_advice,
        });

      if (insertError) throw insertError;

      if (coach_advice) setLastAdvice(coach_advice);

      toast({ title: `${food_name} додано ✅`, description: `${kcal} kcal · ${protein}g білка` });

      await fetchData();
    } catch (err: any) {
      console.error("Scan meal error:", err);
      toast({ title: (t as any).nutrition?.scanError ?? "Помилка сканування", description: err.message, variant: "destructive" });
    } finally {
      setScanning(false);
    }
  };

  const handleDeleteLog = async (id: string) => {
    const { error } = await (supabase as any).from("food_logs").delete().eq("id", id);
    if (!error) {
      setLogs(prev => prev.filter(l => l.id !== id));
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            {(t as any).nutrition?.title ?? "Харчування сьогодні"}
          </CardTitle>
          <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={handleScanMeal} disabled={scanning}>
            {scanning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
            {(t as any).nutrition?.scanMeal ?? "Сканувати"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Circular progress bars */}
        <div className="grid grid-cols-4 gap-2">
          <CircularProgress value={totals.kcal} max={goals.daily_calories} label={(t as any).nutrition?.calories ?? "Kcal"} current={totals.kcal} unit="kcal" color="stroke-orange-500" />
          <CircularProgress value={totals.protein} max={goals.daily_protein} label={(t as any).nutrition?.protein ?? "Білок"} current={Math.round(totals.protein)} unit="g" color="stroke-red-500" />
          <CircularProgress value={totals.fat} max={goals.daily_fat} label={(t as any).nutrition?.fat ?? "Жири"} current={Math.round(totals.fat)} unit="g" color="stroke-yellow-500" />
          <CircularProgress value={totals.carbs} max={goals.daily_carbs} label={(t as any).nutrition?.carbs ?? "Вугл"} current={Math.round(totals.carbs)} unit="g" color="stroke-amber-600" />
        </div>

        {/* AI coach advice */}
        {lastAdvice && (
          <div className="rounded-xl bg-primary/5 border border-primary/10 p-3 animate-fade-in">
            <p className="text-xs text-muted-foreground flex items-start gap-2">
              <Sparkles className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
              <span>{lastAdvice}</span>
            </p>
          </div>
        )}

        {/* Today's food log */}
        {logs.length > 0 && (
          <div className="space-y-1.5">
            {logs.map((log, i) => (
              <div
                key={log.id}
                className="flex items-center justify-between rounded-lg border border-border/40 px-3 py-2 text-xs animate-fade-in"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{log.food_name}</p>
                  <p className="text-muted-foreground">
                    {log.kcal} kcal · {log.protein}g · {log.fat}g · {log.carbs}g
                  </p>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteLog(log.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {logs.length === 0 && !scanning && (
          <p className="text-center text-xs text-muted-foreground py-2">
            {(t as any).nutrition?.noMeals ?? "Сфотографуйте страву щоб почати відстежувати"}
          </p>
        )}

        {scanning && (
          <div className="flex items-center justify-center gap-2 py-4 animate-fade-in">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">{(t as any).nutrition?.analyzing ?? "AI аналізує страву..."}</span>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileSelected}
        />
      </CardContent>
    </Card>
  );
};

export default NutritionTracker;
