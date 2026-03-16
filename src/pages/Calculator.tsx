import { useState, useEffect } from "react";
import { useTranslation } from "@/i18n";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calculator as CalcIcon, ChevronRight, ChevronLeft, Flame, Beef, Droplets, Wheat, Brain } from "lucide-react";
import type { Translations } from "@/i18n/en";

interface FormData {
  gender: "male" | "female"; age: string; height: string; weight: string;
  steps: string; workActivity: string; trainingFreq: string; trainingExp: string;
  sleep: string; pace: string; goal: string;
}

interface Results { bmr: number; tdee: number; calories: number; protein: number; fat: number; carbs: number; insights: string[] }

const INITIAL: FormData = { gender: "male", age: "", height: "", weight: "", steps: "", workActivity: "", trainingFreq: "", trainingExp: "", sleep: "", pace: "", goal: "" };

function calcBMR(gender: string, weight: number, height: number, age: number) {
  if (gender === "male") return 10 * weight + 6.25 * height - 5 * age + 5;
  return 10 * weight + 6.25 * height - 5 * age - 161;
}

function stepMul(s: string) { return s === "<5000" ? 1.0 : s === "5000-8000" ? 1.05 : s === "8000-12000" ? 1.1 : 1.15; }
function workMul(w: string) { return w === "sedentary" ? 1.2 : w === "moderate" ? 1.4 : 1.6; }
function trainMul(f: string) { return f === "0" ? 1.0 : f === "1-2" ? 1.05 : f === "3-4" ? 1.1 : 1.15; }

function calculate(data: FormData, t: Translations): Results {
  const w = Number(data.weight), h = Number(data.height), a = Number(data.age);
  const bmr = calcBMR(data.gender, w, h, a);
  const tdee = Math.round(bmr * workMul(data.workActivity) * stepMul(data.steps) * trainMul(data.trainingFreq));
  let adj = 0;
  if (data.goal === "gain") adj = data.pace === "aggressive" ? 0.15 : data.pace === "moderate" ? 0.125 : 0.1;
  else if (data.goal === "loss") adj = data.pace === "aggressive" ? -0.2 : data.pace === "moderate" ? -0.175 : -0.15;
  const calories = Math.round(tdee * (1 + adj));
  const protPerKg = data.trainingExp === "advanced" ? 2.2 : data.trainingExp === "intermediate" ? 2.0 : 1.8;
  const fatPerKg = data.goal === "gain" ? 1.0 : 0.8;
  const protein = Math.round(w * protPerKg), fat = Math.round(w * fatPerKg);
  const carbs = Math.max(Math.round((calories - protein * 4 - fat * 9) / 4), 0);
  const insights = genInsights(data, w, calories, tdee, protein, t);
  return { bmr: Math.round(bmr), tdee, calories, protein, fat, carbs, insights };
}

function genInsights(d: FormData, w: number, cal: number, tdee: number, prot: number, t: Translations): string[] {
  const ins: string[] = [];
  const ci = t.calcInsights;
  if (d.goal === "loss") {
    const def = tdee - cal; const wl = ((def * 7) / 7700).toFixed(2); const wlMonth = (Number(wl) * 4).toFixed(1);
    ins.push(ci.fatLoss.replace("{wl}", wl).replace("{wlMonth}", wlMonth));
  } else if (d.goal === "gain") {
    const sur = cal - tdee; const wg = ((sur * 7) / 7700).toFixed(2);
    ins.push(ci.muscleGain.replace("{wg}", wg));
  } else { ins.push(ci.maintenance); }
  if (d.goal === "loss" && d.pace === "aggressive") ins.push(ci.aggressiveDeficit);
  if (d.goal === "loss" && d.steps === "<5000") ins.push(ci.lowSteps);
  if (d.sleep === "<6") ins.push(ci.sleepLow);
  else if (d.sleep === "6-7") ins.push(ci.sleepOk);
  if (d.trainingFreq === "0" || d.trainingFreq === "1-2") ins.push(ci.lowTraining);
  if (d.goal === "gain" && d.trainingExp === "beginner") ins.push(ci.beginnerAdvantage);
  if (prot > w * 2) ins.push(ci.highProtein.replace("{prot}", String(prot)));
  if (d.goal === "loss") ins.push(ci.highVolumeFoods);
  return ins;
}

const CalculatorPage = () => {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>(INITIAL);
  const [results, setResults] = useState<Results | null>(null);

  const STEPS = [
    { key: "basics", title: t.calc.basicInfo, fields: ["gender", "age", "height", "weight"] },
    { key: "activity", title: t.calc.activityLevel, fields: ["steps", "workActivity"] },
    { key: "training", title: t.calc.training, fields: ["trainingFreq", "trainingExp"] },
    { key: "lifestyle", title: t.calc.lifestyleGoal, fields: ["sleep", "pace", "goal"] },
  ];

  const radioOptions: Record<string, { value: string; label: string; hint?: string }[]> = {
    steps: [
      { value: "<5000", label: "< 5,000", hint: t.calc.hints.steps_lt5000 },
      { value: "5000-8000", label: "5,000 – 8,000", hint: t.calc.hints.steps_5000_8000 },
      { value: "8000-12000", label: "8,000 – 12,000", hint: t.calc.hints.steps_8000_12000 },
      { value: "12000+", label: "12,000+", hint: t.calc.hints.steps_12000 },
    ],
    workActivity: [
      { value: "sedentary", label: t.calc.sedentary, hint: t.calc.hints.work_sedentary },
      { value: "moderate", label: t.calc.moderatelyActive, hint: t.calc.hints.work_moderate },
      { value: "active", label: t.calc.physicallyActive, hint: t.calc.hints.work_active },
    ],
    trainingFreq: [
      { value: "0", label: t.calc.workouts0, hint: t.calc.hints.train_0 },
      { value: "1-2", label: t.calc.workouts12, hint: t.calc.hints.train_12 },
      { value: "3-4", label: t.calc.workouts34, hint: t.calc.hints.train_34 },
      { value: "5+", label: t.calc.workouts5, hint: t.calc.hints.train_5 },
    ],
    trainingExp: [
      { value: "beginner", label: t.calc.beginner, hint: t.calc.hints.exp_beginner },
      { value: "intermediate", label: t.calc.intermediate, hint: t.calc.hints.exp_intermediate },
      { value: "advanced", label: t.calc.advanced, hint: t.calc.hints.exp_advanced },
    ],
    sleep: [
      { value: "<6", label: t.calc.sleepLt6, hint: t.calc.hints.sleep_lt6 },
      { value: "6-7", label: t.calc.sleep67, hint: t.calc.hints.sleep_67 },
      { value: "7-8", label: t.calc.sleep78, hint: t.calc.hints.sleep_78 },
      { value: "8+", label: t.calc.sleep8plus, hint: t.calc.hints.sleep_8plus },
    ],
    pace: [
      { value: "slow", label: t.calc.paceSlow, hint: form.goal === "gain" ? t.calc.hints.pace_slow_gain : form.goal === "loss" ? t.calc.hints.pace_slow_loss : t.calc.hints.pace_slow_maintain },
      { value: "moderate", label: t.calc.paceModerate, hint: form.goal === "gain" ? t.calc.hints.pace_moderate_gain : form.goal === "loss" ? t.calc.hints.pace_moderate_loss : t.calc.hints.pace_moderate_maintain },
      { value: "aggressive", label: t.calc.paceAggressive, hint: form.goal === "gain" ? t.calc.hints.pace_aggressive_gain : form.goal === "loss" ? t.calc.hints.pace_aggressive_loss : t.calc.hints.pace_aggressive_maintain },
    ],
    goal: [
      { value: "gain", label: t.calc.goalGain, hint: t.calc.hints.goal_gain },
      { value: "maintenance", label: t.calc.goalMaintenance, hint: t.calc.hints.goal_maintenance },
      { value: "loss", label: t.calc.goalLoss, hint: t.calc.hints.goal_loss },
    ],
  };

  const update = (key: keyof FormData, value: string) => setForm((f) => ({ ...f, [key]: value }));
  const canProceed = () => STEPS[step].fields.every((f) => form[f as keyof FormData]?.trim());
  const handleReset = () => { setResults(null); setStep(0); setForm(INITIAL); };

  const handleCalculate = () => {
    const res = calculate(form, t);
    setResults(res);
    localStorage.setItem("nutrition_results", JSON.stringify({
      calories: res.calories, protein: res.protein, fat: res.fat, carbs: res.carbs,
      bmr: res.bmr, tdee: res.tdee, updatedAt: new Date().toISOString(),
    }));
  };

  if (results) {
    const macros = [
      { label: t.calc.calories, value: results.calories, unit: "kcal", icon: Flame, color: "text-orange-500" },
      { label: t.calc.protein, value: results.protein, unit: "g", icon: Beef, color: "text-red-500" },
      { label: t.calc.fat, value: results.fat, unit: "g", icon: Droplets, color: "text-yellow-500" },
      { label: t.calc.carbs, value: results.carbs, unit: "g", icon: Wheat, color: "text-amber-600" },
    ];

    return (
      <div className="space-y-6 animate-fade-in max-w-xl mx-auto">
        <div className="text-center">
          <h1 className="text-2xl font-display font-bold">{t.calc.yourResults}</h1>
          <p className="text-muted-foreground text-sm mt-1">{t.calc.personalizedTargets}</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {macros.map((m) => (
            <Card key={m.label}>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent">
                  <m.icon className={`h-5 w-5 ${m.color}`} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{m.label}</p>
                  <p className="text-lg font-display font-semibold">{m.value}<span className="text-xs text-muted-foreground ml-1">{m.unit}</span></p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="p-4 space-y-2">
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">{t.calc.bmr}</span><span className="font-medium">{results.bmr} kcal</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">{t.calc.tdee}</span><span className="font-medium">{results.tdee} kcal</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">{t.calc.goalAdjustment}</span><span className="font-medium">{results.calories > results.tdee ? "+" : ""}{results.calories - results.tdee} kcal</span></div>
          </CardContent>
        </Card>
        <Card className="border-primary/30">
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-base flex items-center gap-2"><Brain className="h-5 w-5 text-primary" />{t.calc.aiInsights}</CardTitle>
            <CardDescription>{t.calc.personalizedRecs}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {results.insights.map((insight, i) => (
              <div key={i} className="rounded-lg bg-accent/50 p-3 text-sm leading-relaxed">{insight}</div>
            ))}
          </CardContent>
        </Card>
        <Button variant="outline" className="w-full" onClick={handleReset}>{t.calc.recalculate}</Button>
      </div>
    );
  }

  const currentStep = STEPS[step];

  const renderRadioGroup = (key: string, label: string) => {
    const selected = form[key as keyof FormData];
    const selectedOption = radioOptions[key].find((o) => o.value === selected);
    return (
      <div className="space-y-2">
        <Label>{label}</Label>
        <RadioGroup value={selected} onValueChange={(v) => update(key as keyof FormData, v)}>
          {radioOptions[key].map((o) => (
            <div key={o.value} onClick={() => update(key as keyof FormData, o.value)} className={`rounded-lg border p-3 cursor-pointer transition-colors ${selected === o.value ? "border-primary bg-primary/5" : "hover:bg-accent/50"}`}>
              <div className="flex items-center gap-2">
                <RadioGroupItem value={o.value} id={`${key}-${o.value}`} />
                <Label htmlFor={`${key}-${o.value}`} className="font-normal cursor-pointer flex-1">{o.label}</Label>
              </div>
              {selected === o.value && o.hint && (
                <p className="text-xs text-muted-foreground mt-2 ml-6 leading-relaxed">{o.hint}</p>
              )}
            </div>
          ))}
        </RadioGroup>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-xl mx-auto">
      <div className="text-center">
        <h1 className="text-2xl font-display font-bold flex items-center justify-center gap-2">
          <CalcIcon className="h-6 w-6 text-primary" />{t.calc.title}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">{t.calc.subtitle}</p>
      </div>

      <div className="flex gap-1.5">
        {STEPS.map((_, i) => (<div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= step ? "bg-primary" : "bg-muted"}`} />))}
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="font-display text-lg">{currentStep.title}</CardTitle>
          <CardDescription>{t.calc.step} {step + 1} {t.calc.of} {STEPS.length}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {step === 0 && (
            <>
              <div className="space-y-2">
                <Label>{t.calc.gender}</Label>
                <RadioGroup value={form.gender} onValueChange={(v) => update("gender", v)} className="flex gap-4">
                  <div className="flex items-center gap-2"><RadioGroupItem value="male" id="male" /><Label htmlFor="male" className="font-normal cursor-pointer">{t.calc.male}</Label></div>
                  <div className="flex items-center gap-2"><RadioGroupItem value="female" id="female" /><Label htmlFor="female" className="font-normal cursor-pointer">{t.calc.female}</Label></div>
                </RadioGroup>
              </div>
              <div className="space-y-2"><Label htmlFor="age">{t.calc.age}</Label><Input id="age" type="number" placeholder="28" value={form.age} onChange={(e) => update("age", e.target.value)} /></div>
              <div className="space-y-2"><Label htmlFor="height">{t.calc.heightCm}</Label><Input id="height" type="number" placeholder="175" value={form.height} onChange={(e) => update("height", e.target.value)} /></div>
              <div className="space-y-2"><Label htmlFor="weight">{t.calc.weightKg}</Label><Input id="weight" type="number" placeholder="80" value={form.weight} onChange={(e) => update("weight", e.target.value)} /></div>
            </>
          )}
          {step === 1 && (<>{renderRadioGroup("steps", t.calc.dailySteps)}{renderRadioGroup("workActivity", t.calc.workActivity)}</>)}
          {step === 2 && (<>{renderRadioGroup("trainingFreq", t.calc.trainingFreq)}{renderRadioGroup("trainingExp", t.calc.trainingExp)}</>)}
          {step === 3 && (<>{renderRadioGroup("sleep", t.calc.sleepDuration)}{renderRadioGroup("goal", t.calc.fitnessGoal)}{renderRadioGroup("pace", t.calc.pace)}</>)}
        </CardContent>
      </Card>

      <div className="flex gap-3">
        {step > 0 && (<Button variant="outline" className="flex-1" onClick={() => setStep(step - 1)}><ChevronLeft className="mr-1 h-4 w-4" />{t.calc.back}</Button>)}
        {step < STEPS.length - 1 ? (
          <Button className="flex-1" disabled={!canProceed()} onClick={() => setStep(step + 1)}>{t.calc.next}<ChevronRight className="ml-1 h-4 w-4" /></Button>
        ) : (
          <Button className="flex-1" disabled={!canProceed()} onClick={handleCalculate}>{t.calc.calculate}<CalcIcon className="ml-1 h-4 w-4" /></Button>
        )}
      </div>
    </div>
  );
};

export default CalculatorPage;
