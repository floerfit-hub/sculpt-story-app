import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Target, Dumbbell, Zap, Flame, Heart, ChevronRight, ChevronLeft, Check } from "lucide-react";

const GOALS = ["muscle_gain", "fat_loss", "strength", "maintenance", "endurance"] as const;
const FREQUENCIES = [2, 3, 4, 5, 6] as const;
const LEVELS = ["beginner", "intermediate", "advanced"] as const;
const STYLES = ["gym", "bodyweight", "mixed"] as const; // kept for type but removed from flow
const PRIORITIES = ["strength", "composition", "consistency", "balance"] as const;

type Goal = typeof GOALS[number];
type Level = typeof LEVELS[number];
type Style = typeof STYLES[number];
type Priority = typeof PRIORITIES[number];

const goalIcons: Record<Goal, React.ReactNode> = {
  muscle_gain: <Dumbbell className="h-5 w-5" />,
  fat_loss: <Flame className="h-5 w-5" />,
  strength: <Zap className="h-5 w-5" />,
  maintenance: <Heart className="h-5 w-5" />,
  endurance: <Target className="h-5 w-5" />,
};

const Onboarding = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const [goal, setGoal] = useState<Goal | null>(null);
  const [frequency, setFrequency] = useState<number>(4);
  const [level, setLevel] = useState<Level | null>(null);
  const [style, setStyle] = useState<Style>("gym"); // default, no longer asked
  const [priority, setPriority] = useState<Priority | null>(null);

  const ob = t.onboarding;

  const steps = [
    {
      title: ob.goalTitle,
      subtitle: ob.goalSubtitle,
      content: (
        <div className="grid gap-3">
          {GOALS.map((g) => (
            <button
              key={g}
              onClick={() => setGoal(g)}
              className={`flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-all ${
                goal === g ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"
              }`}
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${goal === g ? "bg-primary text-primary-foreground" : "bg-accent text-muted-foreground"}`}>
                {goalIcons[g]}
              </div>
              <div>
                <p className="font-display font-semibold text-sm">{ob.goals[g]}</p>
              </div>
            </button>
          ))}
        </div>
      ),
      valid: !!goal,
    },
    {
      title: ob.frequencyTitle,
      subtitle: ob.frequencySubtitle,
      content: (
        <div className="flex flex-wrap gap-3 justify-center">
          {FREQUENCIES.map((f) => (
            <button
              key={f}
              onClick={() => setFrequency(f)}
              className={`flex h-16 w-16 items-center justify-center rounded-2xl border-2 text-lg font-display font-bold transition-all ${
                frequency === f ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/40"
              }`}
            >
              {f}x
            </button>
          ))}
        </div>
      ),
      valid: true,
    },
    {
      title: ob.levelTitle,
      subtitle: ob.levelSubtitle,
      content: (
        <div className="grid gap-3">
          {LEVELS.map((l) => (
            <button
              key={l}
              onClick={() => setLevel(l)}
              className={`rounded-xl border-2 p-4 text-left transition-all ${
                level === l ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"
              }`}
            >
              <p className="font-display font-semibold">{ob.levels[l]}</p>
              <p className="text-xs text-muted-foreground mt-1">{ob.levelDescs[l]}</p>
            </button>
          ))}
        </div>
      ),
      valid: !!level,
    },
    {
      title: ob.styleTitle,
      subtitle: ob.styleSubtitle,
      content: (
        <div className="grid gap-3">
          {STYLES.map((s) => (
            <button
              key={s}
              onClick={() => setStyle(s)}
              className={`rounded-xl border-2 p-4 text-left transition-all ${
                style === s ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"
              }`}
            >
              <p className="font-display font-semibold">{ob.styles[s]}</p>
            </button>
          ))}
        </div>
      ),
      valid: !!style,
    },
    {
      title: ob.priorityTitle,
      subtitle: ob.prioritySubtitle,
      content: (
        <div className="grid gap-3">
          {PRIORITIES.map((p) => (
            <button
              key={p}
              onClick={() => setPriority(p)}
              className={`rounded-xl border-2 p-4 text-left transition-all ${
                priority === p ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"
              }`}
            >
              <p className="font-display font-semibold">{ob.priorities[p]}</p>
            </button>
          ))}
        </div>
      ),
      valid: !!priority,
    },
  ];

  const handleFinish = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await (supabase as any).from("profiles").update({
      primary_goal: goal,
      training_frequency: frequency,
      experience_level: level,
      preferred_style: style,
      priority_focus: priority,
      onboarding_completed: true,
    }).eq("user_id", user.id);

    if (error) {
      toast({ title: t.common.error, description: error.message, variant: "destructive" });
    } else {
      // Ensure fitness_stats row exists
      await (supabase as any).from("fitness_stats").upsert({ user_id: user.id }, { onConflict: "user_id" });
      navigate("/", { replace: true });
      window.location.reload();
    }
    setSaving(false);
  };

  const currentStep = steps[step];
  const isLast = step === steps.length - 1;
  const progress = ((step + 1) / steps.length) * 100;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
      <div className="w-full max-w-md space-y-6 animate-fade-in">
        {/* Progress bar */}
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground text-center">
          {step + 1} / {steps.length}
        </p>

        <div className="text-center space-y-1">
          <h1 className="text-2xl font-display font-extrabold">{currentStep.title}</h1>
          <p className="text-sm text-muted-foreground">{currentStep.subtitle}</p>
        </div>

        <Card>
          <CardContent className="p-4">
            {currentStep.content}
          </CardContent>
        </Card>

        <div className="flex gap-3">
          {step > 0 && (
            <Button variant="outline" className="flex-1" onClick={() => setStep(step - 1)}>
              <ChevronLeft className="mr-1 h-4 w-4" /> {ob.back}
            </Button>
          )}
          {isLast ? (
            <Button
              className="flex-1"
              disabled={!currentStep.valid || saving}
              onClick={handleFinish}
            >
              <Check className="mr-1 h-4 w-4" /> {saving ? ob.saving : ob.finish}
            </Button>
          ) : (
            <Button
              className="flex-1"
              disabled={!currentStep.valid}
              onClick={() => setStep(step + 1)}
            >
              {ob.next} <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Skip */}
        <button
          onClick={handleFinish}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors mx-auto block"
        >
          {ob.skip}
        </button>
      </div>
    </div>
  );
};

export default Onboarding;
