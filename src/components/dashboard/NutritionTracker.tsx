import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/i18n";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Camera, Image, Trash2, Loader2, Sparkles, Plus, X, Pencil, Check } from "lucide-react";
import { format, startOfDay, endOfDay } from "date-fns";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface NutritionGoals {
  daily_calories: number;
  daily_protein: number;
  daily_fat: number;
  daily_carbs: number;
}

interface FoodComponent {
  name: string;
  weight_g: number;
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
  _origWeight?: number;
  _origKcal?: number;
  _origProtein?: number;
  _origFat?: number;
  _origCarbs?: number;
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
  meal_type: string;
}

interface PendingScan {
  food_name: string;
  total_weight_g: number;
  components: FoodComponent[];
  coach_advice: string | null;
}

const DEFAULT_GOALS: NutritionGoals = { daily_calories: 2000, daily_protein: 150, daily_fat: 65, daily_carbs: 250 };

const MEAL_TYPE_LABELS: Record<string, { uk: string; en: string; color: string }> = {
  breakfast: { uk: "Сніданок", en: "Breakfast", color: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400" },
  lunch: { uk: "Обід", en: "Lunch", color: "bg-green-500/15 text-green-700 dark:text-green-400" },
  dinner: { uk: "Вечеря", en: "Dinner", color: "bg-blue-500/15 text-blue-700 dark:text-blue-400" },
  snack: { uk: "Перекус", en: "Snack", color: "bg-orange-500/15 text-orange-700 dark:text-orange-400" },
};

function detectMealType(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) return "breakfast";
  if (hour >= 11 && hour < 15) return "lunch";
  if (hour >= 15 && hour < 18) return "snack";
  if (hour >= 18 && hour < 23) return "dinner";
  return "snack";
}

const CircularProgress = ({ value, max, label, current, color }: { value: number; max: number; label: string; current: number; unit: string; color: string }) => {
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
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [goals, setGoals] = useState<NutritionGoals>(DEFAULT_GOALS);
  const [logs, setLogs] = useState<FoodLogEntry[]>([]);
  const [scanning, setScanning] = useState(false);
  const [lastAdvice, setLastAdvice] = useState<string | null>(null);
  const [pendingScan, setPendingScan] = useState<PendingScan | null>(null);
  const [selectedMealType, setSelectedMealType] = useState(detectMealType());
  const [addingComponent, setAddingComponent] = useState(false);
  const [newComp, setNewComp] = useState({ name: "", weight_g: 100, kcal: 0, protein: 0, fat: 0, carbs: 0 });
  const [editingGoals, setEditingGoals] = useState(false);
  const [editGoals, setEditGoals] = useState<NutritionGoals>(DEFAULT_GOALS);

  const lang = ((t as any)?.nav?.home === "Головна") ? "uk" : "en";

  const fetchData = useCallback(async () => {
    if (!user) return;

    const now = new Date();
    const dayStart = startOfDay(now).toISOString();
    const dayEnd = endOfDay(now).toISOString();

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
        .gte("created_at", dayStart)
        .lte("created_at", dayEnd)
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
            } as any).eq("user_id", user.id);
          }
        }
      } catch {}

      setGoals(g);
    }

    if (logsRes.data) {
      setLogs(logsRes.data as any);
    }
  }, [user]);

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

  const pendingTotals = pendingScan
    ? pendingScan.components.reduce(
        (acc, c) => ({
          kcal: acc.kcal + Math.round(c.kcal),
          protein: acc.protein + Math.round(c.protein * 10) / 10,
          fat: acc.fat + Math.round(c.fat * 10) / 10,
          carbs: acc.carbs + Math.round(c.carbs * 10) / 10,
        }),
        { kcal: 0, protein: 0, fat: 0, carbs: 0 }
      )
    : null;

  const processImage = async (file: File) => {
    if (!user) return;
    setScanning(true);
    setLastAdvice(null);
    setPendingScan(null);

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

      const { food_name, total_weight_g, components, coach_advice } = data;

      const comps: FoodComponent[] = (components || []).map((c: any) => ({
        name: c.name,
        weight_g: c.weight_g || 0,
        kcal: c.kcal || 0,
        protein: c.protein || 0,
        fat: c.fat || 0,
        carbs: c.carbs || 0,
        _origWeight: c.weight_g || 0,
        _origKcal: c.kcal || 0,
        _origProtein: c.protein || 0,
        _origFat: c.fat || 0,
        _origCarbs: c.carbs || 0,
      }));

      if (comps.length === 0) {
        comps.push({
          name: food_name || "Страва",
          weight_g: total_weight_g || 100,
          kcal: data.kcal || 0,
          protein: data.protein || 0,
          fat: data.fat || 0,
          carbs: data.carbs || 0,
          _origWeight: total_weight_g || 100,
          _origKcal: data.kcal || 0,
          _origProtein: data.protein || 0,
          _origFat: data.fat || 0,
          _origCarbs: data.carbs || 0,
        });
      }

      setSelectedMealType(detectMealType());
      setPendingScan({
        food_name: food_name || "Страва",
        total_weight_g: total_weight_g || 0,
        components: comps,
        coach_advice,
      });
    } catch (err: any) {
      console.error("Scan meal error:", err);
      toast({ title: (t as any).nutrition?.scanError ?? "Помилка сканування", description: err.message, variant: "destructive" });
    } finally {
      setScanning(false);
    }
  };

  const updateComponentWeight = (index: number, newWeight: number) => {
    if (!pendingScan) return;
    const updated = [...pendingScan.components];
    const comp = { ...updated[index] };
    const origW = comp._origWeight || comp.weight_g || 1;
    const ratio = newWeight / origW;
    comp.weight_g = newWeight;
    comp.kcal = Math.round((comp._origKcal || 0) * ratio);
    comp.protein = Math.round((comp._origProtein || 0) * ratio * 10) / 10;
    comp.fat = Math.round((comp._origFat || 0) * ratio * 10) / 10;
    comp.carbs = Math.round((comp._origCarbs || 0) * ratio * 10) / 10;
    updated[index] = comp;
    setPendingScan({ ...pendingScan, components: updated });
  };

  const removeComponent = (index: number) => {
    if (!pendingScan) return;
    const updated = pendingScan.components.filter((_, i) => i !== index);
    setPendingScan({ ...pendingScan, components: updated });
  };

  const addCustomComponent = () => {
    if (!pendingScan || !newComp.name.trim()) return;
    const comp: FoodComponent = {
      ...newComp,
      _origWeight: newComp.weight_g,
      _origKcal: newComp.kcal,
      _origProtein: newComp.protein,
      _origFat: newComp.fat,
      _origCarbs: newComp.carbs,
    };
    setPendingScan({ ...pendingScan, components: [...pendingScan.components, comp] });
    setNewComp({ name: "", weight_g: 100, kcal: 0, protein: 0, fat: 0, carbs: 0 });
    setAddingComponent(false);
  };

  const confirmScan = async () => {
    if (!pendingScan || !user || !pendingTotals) return;

    const { food_name, coach_advice } = pendingScan;
    const { kcal, protein, fat, carbs } = pendingTotals;

    const { data: inserted, error: insertError } = await (supabase as any)
      .from("food_logs")
      .insert({
        user_id: user.id,
        food_name,
        kcal: Math.round(kcal),
        protein: Math.round(protein * 10) / 10,
        fat: Math.round(fat * 10) / 10,
        carbs: Math.round(carbs * 10) / 10,
        coach_advice,
        meal_type: selectedMealType,
      })
      .select()
      .single();

    if (insertError) {
      toast({ title: "Помилка", description: insertError.message, variant: "destructive" });
      return;
    }

    // Optimistic update
    if (inserted) {
      setLogs(prev => [inserted as FoodLogEntry, ...prev]);
    }

    if (coach_advice) setLastAdvice(coach_advice);
    toast({ title: `${food_name} додано ✅`, description: `${Math.round(kcal)} kcal · ${Math.round(protein)}g білка` });
    setPendingScan(null);
    setAddingComponent(false);
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    await processImage(file);
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
          <div className="flex gap-1.5">
            <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => galleryInputRef.current?.click()} disabled={scanning}>
              <Image className="h-3.5 w-3.5" />
              {lang === "uk" ? "Галерея" : "Gallery"}
            </Button>
            <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => cameraInputRef.current?.click()} disabled={scanning}>
              {scanning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
              {(t as any).nutrition?.scanMeal ?? "Сканувати"}
            </Button>
          </div>
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

        {/* Edit goals inline */}
        {editingGoals ? (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-2 animate-fade-in">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {lang === "uk" ? "Редагувати цілі" : "Edit Goals"}
            </p>
            <div className="grid grid-cols-4 gap-2">
              <div>
                <label className="text-[9px] text-muted-foreground">Kcal</label>
                <Input type="number" value={editGoals.daily_calories} onChange={e => setEditGoals(g => ({ ...g, daily_calories: Number(e.target.value) || 0 }))} className="h-8 text-xs px-1.5" />
              </div>
              <div>
                <label className="text-[9px] text-muted-foreground">{lang === "uk" ? "Білок" : "Protein"}</label>
                <Input type="number" value={editGoals.daily_protein} onChange={e => setEditGoals(g => ({ ...g, daily_protein: Number(e.target.value) || 0 }))} className="h-8 text-xs px-1.5" />
              </div>
              <div>
                <label className="text-[9px] text-muted-foreground">{lang === "uk" ? "Жири" : "Fat"}</label>
                <Input type="number" value={editGoals.daily_fat} onChange={e => setEditGoals(g => ({ ...g, daily_fat: Number(e.target.value) || 0 }))} className="h-8 text-xs px-1.5" />
              </div>
              <div>
                <label className="text-[9px] text-muted-foreground">{lang === "uk" ? "Вугл" : "Carbs"}</label>
                <Input type="number" value={editGoals.daily_carbs} onChange={e => setEditGoals(g => ({ ...g, daily_carbs: Number(e.target.value) || 0 }))} className="h-8 text-xs px-1.5" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="h-7 text-xs flex-1 gap-1" onClick={async () => {
                if (!user) return;
                await supabase.from("profiles").update({
                  daily_calories: editGoals.daily_calories,
                  daily_protein: editGoals.daily_protein,
                  daily_fat: editGoals.daily_fat,
                  daily_carbs: editGoals.daily_carbs,
                } as any).eq("user_id", user.id);
                localStorage.setItem("nutrition_results", JSON.stringify({
                  calories: editGoals.daily_calories,
                  protein: editGoals.daily_protein,
                  fat: editGoals.daily_fat,
                  carbs: editGoals.daily_carbs,
                }));
                setGoals(editGoals);
                setEditingGoals(false);
                toast({ title: lang === "uk" ? "Цілі збережено ✅" : "Goals saved ✅" });
              }}>
                <Check className="h-3 w-3" />
                {lang === "uk" ? "Зберегти" : "Save"}
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingGoals(false)}>
                {lang === "uk" ? "Скасувати" : "Cancel"}
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="ghost" size="sm" className="h-7 w-full text-xs gap-1.5 text-muted-foreground" onClick={() => { setEditGoals(goals); setEditingGoals(true); }}>
            <Pencil className="h-3 w-3" />
            {lang === "uk" ? "Редагувати цілі КБЖВ" : "Edit KBJU goals"}
          </Button>
        )}

        {/* Pending scan confirmation with components */}
        {pendingScan && pendingTotals && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-3 animate-fade-in">
            <p className="text-sm font-semibold">{pendingScan.food_name}</p>
            <p className="text-xs text-muted-foreground font-medium">
              {lang === "uk" ? "Разом:" : "Total:"} {Math.round(pendingTotals.kcal)} kcal · {Math.round(pendingTotals.protein)}g · {Math.round(pendingTotals.fat)}g · {Math.round(pendingTotals.carbs)}g
            </p>

            {/* Components list */}
            <div className="space-y-2">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                {lang === "uk" ? "Компоненти" : "Components"}
              </p>
              {pendingScan.components.map((comp, i) => (
                <div key={i} className="flex items-center gap-2 rounded-lg border border-border/40 bg-background/50 px-2 py-1.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{comp.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {Math.round(comp.kcal)} kcal · {comp.protein}g · {comp.fat}g · {comp.carbs}g
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Input
                      type="number"
                      value={comp.weight_g}
                      onChange={(e) => updateComponentWeight(i, Number(e.target.value) || 0)}
                      className="h-7 w-16 text-xs text-center px-1"
                    />
                    <span className="text-[10px] text-muted-foreground">g</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => removeComponent(i)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}

              {/* Add component */}
              {addingComponent ? (
                <div className="space-y-2 rounded-lg border border-dashed border-primary/30 p-2">
                  <Input placeholder={lang === "uk" ? "Назва" : "Name"} value={newComp.name} onChange={e => setNewComp(p => ({ ...p, name: e.target.value }))} className="h-7 text-xs" />
                  <div className="grid grid-cols-5 gap-1">
                    <div>
                      <label className="text-[9px] text-muted-foreground">g</label>
                      <Input type="number" value={newComp.weight_g} onChange={e => setNewComp(p => ({ ...p, weight_g: Number(e.target.value) || 0 }))} className="h-7 text-xs px-1" />
                    </div>
                    <div>
                      <label className="text-[9px] text-muted-foreground">kcal</label>
                      <Input type="number" value={newComp.kcal} onChange={e => setNewComp(p => ({ ...p, kcal: Number(e.target.value) || 0 }))} className="h-7 text-xs px-1" />
                    </div>
                    <div>
                      <label className="text-[9px] text-muted-foreground">{lang === "uk" ? "Б" : "P"}</label>
                      <Input type="number" value={newComp.protein} onChange={e => setNewComp(p => ({ ...p, protein: Number(e.target.value) || 0 }))} className="h-7 text-xs px-1" />
                    </div>
                    <div>
                      <label className="text-[9px] text-muted-foreground">{lang === "uk" ? "Ж" : "F"}</label>
                      <Input type="number" value={newComp.fat} onChange={e => setNewComp(p => ({ ...p, fat: Number(e.target.value) || 0 }))} className="h-7 text-xs px-1" />
                    </div>
                    <div>
                      <label className="text-[9px] text-muted-foreground">{lang === "uk" ? "В" : "C"}</label>
                      <Input type="number" value={newComp.carbs} onChange={e => setNewComp(p => ({ ...p, carbs: Number(e.target.value) || 0 }))} className="h-7 text-xs px-1" />
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" className="h-7 text-xs flex-1" onClick={addCustomComponent}>
                      {lang === "uk" ? "Додати" : "Add"}
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setAddingComponent(false)}>
                      {lang === "uk" ? "Скасувати" : "Cancel"}
                    </Button>
                  </div>
                </div>
              ) : (
                <Button variant="ghost" size="sm" className="h-7 w-full text-xs gap-1 text-muted-foreground" onClick={() => setAddingComponent(true)}>
                  <Plus className="h-3 w-3" />
                  {lang === "uk" ? "Додати компонент" : "Add component"}
                </Button>
              )}
            </div>

            {/* Coach advice in pending scan */}
            {pendingScan.coach_advice && (
              <div className="rounded-lg bg-primary/5 border border-primary/10 p-2.5 animate-fade-in">
                <p className="text-xs text-muted-foreground flex items-start gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                  <span>{pendingScan.coach_advice}</span>
                </p>
              </div>
            )}

            {/* Meal type + confirm */}
            <div className="flex items-center gap-2">
              <Select value={selectedMealType} onValueChange={setSelectedMealType}>
                <SelectTrigger className="h-8 w-[140px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(MEAL_TYPE_LABELS).map(([key, val]) => (
                    <SelectItem key={key} value={key} className="text-xs">
                      {lang === "uk" ? val.uk : val.en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" className="h-8 flex-1" onClick={confirmScan}>
                {lang === "uk" ? "Додати" : "Add"}
              </Button>
              <Button size="sm" variant="ghost" className="h-8" onClick={() => { setPendingScan(null); setAddingComponent(false); }}>
                ✕
              </Button>
            </div>
          </div>
        )}

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
                  <div className="flex items-center gap-2">
                    <p className="font-semibold truncate">{log.food_name}</p>
                    {log.meal_type && MEAL_TYPE_LABELS[log.meal_type] && (
                      <Badge variant="secondary" className={`text-[9px] px-1.5 py-0 shrink-0 ${MEAL_TYPE_LABELS[log.meal_type].color}`}>
                        {lang === "uk" ? MEAL_TYPE_LABELS[log.meal_type].uk : MEAL_TYPE_LABELS[log.meal_type].en}
                      </Badge>
                    )}
                  </div>
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

        {logs.length === 0 && !scanning && !pendingScan && (
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

        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileSelected} />
        <input ref={galleryInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelected} />
      </CardContent>
    </Card>
  );
};

export default NutritionTracker;
