import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calculator as CalcIcon, ChevronRight, ChevronLeft, Flame, Beef, Droplets, Wheat, Brain, Target, TrendingDown, AlertTriangle, Lightbulb, Activity } from "lucide-react";

// --- Types ---
interface FormData {
  gender: "male" | "female";
  age: string;
  height: string;
  weight: string;
  steps: string;
  workActivity: string;
  trainingFreq: string;
  trainingExp: string;
  sleep: string;
  pace: string;
  goal: string;
}

interface Results {
  bmr: number;
  tdee: number;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  insights: string[];
}

const INITIAL: FormData = {
  gender: "male",
  age: "",
  height: "",
  weight: "",
  steps: "",
  workActivity: "",
  trainingFreq: "",
  trainingExp: "",
  sleep: "",
  pace: "",
  goal: "",
};

// --- Calculation helpers ---
function calcBMR(gender: string, weight: number, height: number, age: number) {
  // Mifflin-St Jeor
  if (gender === "male") return 10 * weight + 6.25 * height - 5 * age + 5;
  return 10 * weight + 6.25 * height - 5 * age - 161;
}

function stepMultiplier(steps: string) {
  if (steps === "<5000") return 1.0;
  if (steps === "5000-8000") return 1.05;
  if (steps === "8000-12000") return 1.1;
  return 1.15; // 12000+
}

function workMultiplier(work: string) {
  if (work === "sedentary") return 1.2;
  if (work === "moderate") return 1.4;
  return 1.6; // active
}

function trainingMultiplier(freq: string) {
  if (freq === "0") return 1.0;
  if (freq === "1-2") return 1.05;
  if (freq === "3-4") return 1.1;
  return 1.15; // 5+
}

function calculate(data: FormData): Results {
  const weight = Number(data.weight);
  const height = Number(data.height);
  const age = Number(data.age);

  const bmr = calcBMR(data.gender, weight, height, age);
  const tdee = Math.round(bmr * workMultiplier(data.workActivity) * stepMultiplier(data.steps) * trainingMultiplier(data.trainingFreq));

  let calorieAdj = 0;
  if (data.goal === "gain") {
    calorieAdj = data.pace === "aggressive" ? 0.15 : data.pace === "moderate" ? 0.125 : 0.1;
  } else if (data.goal === "loss") {
    calorieAdj = data.pace === "aggressive" ? -0.2 : data.pace === "moderate" ? -0.175 : -0.15;
  }
  const calories = Math.round(tdee * (1 + calorieAdj));

  // Macros
  const proteinPerKg = data.trainingExp === "advanced" ? 2.2 : data.trainingExp === "intermediate" ? 2.0 : 1.8;
  const fatPerKg = data.goal === "gain" ? 1.0 : 0.8;
  const protein = Math.round(weight * proteinPerKg);
  const fat = Math.round(weight * fatPerKg);
  const carbs = Math.round((calories - protein * 4 - fat * 9) / 4);

  // AI Insights
  const insights = generateInsights(data, weight, calories, tdee, protein);

  return { bmr: Math.round(bmr), tdee, calories, protein, fat, carbs: Math.max(carbs, 0), insights };
}

function generateInsights(data: FormData, weight: number, calories: number, tdee: number, protein: number): string[] {
  const insights: string[] = [];

  // Progress speed prediction
  if (data.goal === "loss") {
    const deficit = tdee - calories;
    const weeklyLoss = ((deficit * 7) / 7700).toFixed(2);
    insights.push(`📉 Estimated fat loss: ~${weeklyLoss} kg per week. At this pace you could lose ~${(Number(weeklyLoss) * 4).toFixed(1)} kg in a month.`);
  } else if (data.goal === "gain") {
    const surplus = calories - tdee;
    const weeklyGain = ((surplus * 7) / 7700).toFixed(2);
    insights.push(`📈 Estimated lean mass gain: ~${weeklyGain} kg per week under optimal conditions.`);
  } else {
    insights.push("⚖️ At maintenance calories your weight should stay stable while body composition can still improve with consistent training.");
  }

  // Plateau risks
  if (data.goal === "loss" && data.pace === "aggressive") {
    insights.push("⚠️ Aggressive deficits increase plateau risk after 4–6 weeks. Consider a diet break or refeed days every 3–4 weeks.");
  }
  if (data.goal === "loss" && data.steps === "<5000") {
    insights.push("🚶 Low daily steps reduce NEAT significantly. Aim for 8,000+ steps to support your deficit without extra gym time.");
  }

  // Sleep
  if (data.sleep === "<6") {
    insights.push("😴 Poor sleep (<6h) impairs recovery, increases hunger hormones, and can reduce fat loss by up to 55%. Prioritize 7–8 hours.");
  } else if (data.sleep === "6-7") {
    insights.push("💤 6–7 hours of sleep is okay but not optimal. Try to push closer to 7–8 hours for better recovery and hormonal balance.");
  }

  // Training
  if (data.trainingFreq === "0" || data.trainingFreq === "1-2") {
    insights.push("🏋️ Training only 0–2x/week limits muscle stimulus. Consider adding 1–2 more resistance sessions for better results.");
  }
  if (data.goal === "gain" && data.trainingExp === "beginner") {
    insights.push("🌟 As a beginner, you have great potential for 'newbie gains'—expect faster muscle growth in your first 6–12 months!");
  }

  // Nutrition tips
  if (protein > weight * 2) {
    insights.push(`🥩 Your protein target (${protein}g) is high. Spread it across 4–5 meals for optimal absorption.`);
  }
  if (data.goal === "loss") {
    insights.push("🥗 Focus on high-volume, low-calorie foods (vegetables, lean proteins) to stay full on fewer calories.");
  }

  return insights;
}

// --- Step definitions ---
const STEPS = [
  { key: "basics", title: "Basic Info", fields: ["gender", "age", "height", "weight"] },
  { key: "activity", title: "Activity Level", fields: ["steps", "workActivity"] },
  { key: "training", title: "Training", fields: ["trainingFreq", "trainingExp"] },
  { key: "lifestyle", title: "Lifestyle & Goal", fields: ["sleep", "pace", "goal"] },
];

const radioOptions: Record<string, { value: string; label: string }[]> = {
  steps: [
    { value: "<5000", label: "< 5,000" },
    { value: "5000-8000", label: "5,000 – 8,000" },
    { value: "8000-12000", label: "8,000 – 12,000" },
    { value: "12000+", label: "12,000+" },
  ],
  workActivity: [
    { value: "sedentary", label: "Sedentary (desk job)" },
    { value: "moderate", label: "Moderately active" },
    { value: "active", label: "Physically active" },
  ],
  trainingFreq: [
    { value: "0", label: "0 workouts" },
    { value: "1-2", label: "1–2 per week" },
    { value: "3-4", label: "3–4 per week" },
    { value: "5+", label: "5+ per week" },
  ],
  trainingExp: [
    { value: "beginner", label: "Beginner" },
    { value: "intermediate", label: "Intermediate" },
    { value: "advanced", label: "Advanced" },
  ],
  sleep: [
    { value: "<6", label: "< 6 hours" },
    { value: "6-7", label: "6–7 hours" },
    { value: "7-8", label: "7–8 hours" },
    { value: "8+", label: "8+ hours" },
  ],
  pace: [
    { value: "slow", label: "Slow & sustainable" },
    { value: "moderate", label: "Moderate" },
    { value: "aggressive", label: "Aggressive" },
  ],
  goal: [
    { value: "gain", label: "Muscle gain" },
    { value: "maintenance", label: "Maintenance / Recomp" },
    { value: "loss", label: "Fat loss" },
  ],
};

// --- Component ---
const CalculatorPage = () => {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>(INITIAL);
  const [results, setResults] = useState<Results | null>(null);

  const update = (key: keyof FormData, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const canProceed = () => {
    const fields = STEPS[step].fields;
    return fields.every((f) => form[f as keyof FormData]?.trim());
  };

  const handleCalculate = () => {
    setResults(calculate(form));
  };

  const handleReset = () => {
    setResults(null);
    setStep(0);
    setForm(INITIAL);
  };

  // --- Results screen ---
  if (results) {
    const macros = [
      { label: "Calories", value: results.calories, unit: "kcal", icon: Flame, color: "text-orange-500" },
      { label: "Protein", value: results.protein, unit: "g", icon: Beef, color: "text-red-500" },
      { label: "Fat", value: results.fat, unit: "g", icon: Droplets, color: "text-yellow-500" },
      { label: "Carbs", value: results.carbs, unit: "g", icon: Wheat, color: "text-amber-600" },
    ];

    return (
      <div className="lg:ml-56 space-y-6 animate-fade-in max-w-xl mx-auto">
        <div className="text-center">
          <h1 className="text-2xl font-display font-bold">Your Results</h1>
          <p className="text-muted-foreground text-sm mt-1">Personalized nutrition targets</p>
        </div>

        {/* Macro cards */}
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

        {/* Breakdown detail */}
        <Card>
          <CardContent className="p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">BMR</span>
              <span className="font-medium">{results.bmr} kcal</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">TDEE</span>
              <span className="font-medium">{results.tdee} kcal</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Goal adjustment</span>
              <span className="font-medium">{results.calories > results.tdee ? "+" : ""}{results.calories - results.tdee} kcal</span>
            </div>
          </CardContent>
        </Card>

        {/* AI Insights */}
        <Card className="border-primary/30">
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-base flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              AI Insights
            </CardTitle>
            <CardDescription>Personalized recommendations based on your profile</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {results.insights.map((insight, i) => (
              <div key={i} className="rounded-lg bg-accent/50 p-3 text-sm leading-relaxed">
                {insight}
              </div>
            ))}
          </CardContent>
        </Card>

        <Button variant="outline" className="w-full" onClick={handleReset}>
          Recalculate
        </Button>
      </div>
    );
  }

  // --- Wizard steps ---
  const currentStep = STEPS[step];

  return (
    <div className="lg:ml-56 space-y-6 animate-fade-in max-w-xl mx-auto">
      <div className="text-center">
        <h1 className="text-2xl font-display font-bold flex items-center justify-center gap-2">
          <CalcIcon className="h-6 w-6 text-primary" />
          Calorie Calculator
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Answer a few questions for personalized targets</p>
      </div>

      {/* Progress bar */}
      <div className="flex gap-1.5">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${i <= step ? "bg-primary" : "bg-muted"}`}
          />
        ))}
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="font-display text-lg">{currentStep.title}</CardTitle>
          <CardDescription>Step {step + 1} of {STEPS.length}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Basics */}
          {step === 0 && (
            <>
              <div className="space-y-2">
                <Label>Gender</Label>
                <RadioGroup value={form.gender} onValueChange={(v) => update("gender", v)} className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="male" id="male" />
                    <Label htmlFor="male" className="font-normal cursor-pointer">Male</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="female" id="female" />
                    <Label htmlFor="female" className="font-normal cursor-pointer">Female</Label>
                  </div>
                </RadioGroup>
              </div>
              <div className="space-y-2">
                <Label htmlFor="age">Age</Label>
                <Input id="age" type="number" placeholder="e.g. 28" value={form.age} onChange={(e) => update("age", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="height">Height (cm)</Label>
                <Input id="height" type="number" placeholder="e.g. 175" value={form.height} onChange={(e) => update("height", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="weight">Weight (kg)</Label>
                <Input id="weight" type="number" placeholder="e.g. 80" value={form.weight} onChange={(e) => update("weight", e.target.value)} />
              </div>
            </>
          )}

          {/* Activity */}
          {step === 1 && (
            <>
              <div className="space-y-2">
                <Label>Average daily steps</Label>
                <RadioGroup value={form.steps} onValueChange={(v) => update("steps", v)}>
                  {radioOptions.steps.map((o) => (
                    <div key={o.value} className="flex items-center gap-2 rounded-lg border p-3 cursor-pointer hover:bg-accent/50 transition-colors">
                      <RadioGroupItem value={o.value} id={`steps-${o.value}`} />
                      <Label htmlFor={`steps-${o.value}`} className="font-normal cursor-pointer flex-1">{o.label}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
              <div className="space-y-2">
                <Label>Work activity</Label>
                <RadioGroup value={form.workActivity} onValueChange={(v) => update("workActivity", v)}>
                  {radioOptions.workActivity.map((o) => (
                    <div key={o.value} className="flex items-center gap-2 rounded-lg border p-3 cursor-pointer hover:bg-accent/50 transition-colors">
                      <RadioGroupItem value={o.value} id={`work-${o.value}`} />
                      <Label htmlFor={`work-${o.value}`} className="font-normal cursor-pointer flex-1">{o.label}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            </>
          )}

          {/* Training */}
          {step === 2 && (
            <>
              <div className="space-y-2">
                <Label>Training frequency</Label>
                <RadioGroup value={form.trainingFreq} onValueChange={(v) => update("trainingFreq", v)}>
                  {radioOptions.trainingFreq.map((o) => (
                    <div key={o.value} className="flex items-center gap-2 rounded-lg border p-3 cursor-pointer hover:bg-accent/50 transition-colors">
                      <RadioGroupItem value={o.value} id={`freq-${o.value}`} />
                      <Label htmlFor={`freq-${o.value}`} className="font-normal cursor-pointer flex-1">{o.label}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
              <div className="space-y-2">
                <Label>Training experience</Label>
                <RadioGroup value={form.trainingExp} onValueChange={(v) => update("trainingExp", v)}>
                  {radioOptions.trainingExp.map((o) => (
                    <div key={o.value} className="flex items-center gap-2 rounded-lg border p-3 cursor-pointer hover:bg-accent/50 transition-colors">
                      <RadioGroupItem value={o.value} id={`exp-${o.value}`} />
                      <Label htmlFor={`exp-${o.value}`} className="font-normal cursor-pointer flex-1">{o.label}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            </>
          )}

          {/* Lifestyle & Goal */}
          {step === 3 && (
            <>
              <div className="space-y-2">
                <Label>Sleep duration</Label>
                <RadioGroup value={form.sleep} onValueChange={(v) => update("sleep", v)}>
                  {radioOptions.sleep.map((o) => (
                    <div key={o.value} className="flex items-center gap-2 rounded-lg border p-3 cursor-pointer hover:bg-accent/50 transition-colors">
                      <RadioGroupItem value={o.value} id={`sleep-${o.value}`} />
                      <Label htmlFor={`sleep-${o.value}`} className="font-normal cursor-pointer flex-1">{o.label}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
              <div className="space-y-2">
                <Label>Desired pace of progress</Label>
                <RadioGroup value={form.pace} onValueChange={(v) => update("pace", v)}>
                  {radioOptions.pace.map((o) => (
                    <div key={o.value} className="flex items-center gap-2 rounded-lg border p-3 cursor-pointer hover:bg-accent/50 transition-colors">
                      <RadioGroupItem value={o.value} id={`pace-${o.value}`} />
                      <Label htmlFor={`pace-${o.value}`} className="font-normal cursor-pointer flex-1">{o.label}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
              <div className="space-y-2">
                <Label>Fitness goal</Label>
                <RadioGroup value={form.goal} onValueChange={(v) => update("goal", v)}>
                  {radioOptions.goal.map((o) => (
                    <div key={o.value} className="flex items-center gap-2 rounded-lg border p-3 cursor-pointer hover:bg-accent/50 transition-colors">
                      <RadioGroupItem value={o.value} id={`goal-${o.value}`} />
                      <Label htmlFor={`goal-${o.value}`} className="font-normal cursor-pointer flex-1">{o.label}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex gap-3">
        {step > 0 && (
          <Button variant="outline" className="flex-1" onClick={() => setStep(step - 1)}>
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
        )}
        {step < STEPS.length - 1 ? (
          <Button className="flex-1" disabled={!canProceed()} onClick={() => setStep(step + 1)}>
            Next
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        ) : (
          <Button className="flex-1" disabled={!canProceed()} onClick={handleCalculate}>
            Calculate
            <CalcIcon className="ml-1 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default CalculatorPage;
