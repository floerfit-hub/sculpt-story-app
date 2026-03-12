import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePremium } from "@/hooks/usePremium";
import { useTranslation } from "@/i18n";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Crown, Zap, BarChart3, Brain, Flame, Target, Check, X } from "lucide-react";

interface PaywallProps {
  onClose?: () => void;
  inline?: boolean;
}

const Paywall = ({ onClose, inline = false }: PaywallProps) => {
  const { activateMockPremium, activateMockTrial, subscription } = usePremium();
  const { t } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<string | null>(null);

  const hasUsedTrial = subscription?.trial_start != null;

  const features = [
    { icon: Target, label: t.premium.featureFitnessScore },
    { icon: Flame, label: t.premium.featureHeatmap },
    { icon: Brain, label: t.premium.featureAiInsights },
    { icon: BarChart3, label: t.premium.featureAdvancedCharts },
    { icon: Zap, label: t.premium.featureBodyComp },
  ];

  const handlePurchase = async (plan: "monthly" | "yearly") => {
    setLoading(plan);
    // Mock success — replace with Paddle checkout later
    await activateMockPremium(plan);
    toast({ title: t.premium.activated, description: t.premium.enjoyPremium });
    setLoading(null);
    onClose?.();
  };

  const handleTrial = async () => {
    setLoading("trial");
    await activateMockTrial();
    toast({ title: t.premium.trialStarted, description: t.premium.trialDesc });
    setLoading(null);
    onClose?.();
  };

  const content = (
    <div className="space-y-5">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl gradient-primary glow-primary">
            <Crown className="h-7 w-7 text-primary-foreground" />
          </div>
        </div>
        <h2 className="text-xl font-display font-extrabold">{t.premium.upgradeTo}</h2>
        <p className="text-sm text-muted-foreground">{t.premium.unlockAll}</p>
      </div>

      {/* Features */}
      <div className="space-y-2.5">
        {features.map(({ icon: Icon, label }) => (
          <div key={label} className="flex items-center gap-3 rounded-xl border border-border/50 p-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <span className="text-sm font-medium">{label}</span>
            <Check className="h-4 w-4 text-primary ml-auto shrink-0" />
          </div>
        ))}
      </div>

      {/* Trial CTA */}
      {!hasUsedTrial && (
        <Card className="border-primary/30 gradient-glow">
          <CardContent className="p-4 text-center space-y-2">
            <p className="font-display font-bold text-sm">{t.premium.freeTrial}</p>
            <p className="text-xs text-muted-foreground">{t.premium.freeTrialDesc}</p>
            <Button
              className="w-full"
              onClick={handleTrial}
              disabled={loading !== null}
            >
              {loading === "trial" ? t.premium.activating : t.premium.startTrial}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Plans */}
      <div className="grid grid-cols-2 gap-3">
        {/* Monthly */}
        <Card className="relative overflow-hidden">
          <CardContent className="p-4 text-center space-y-2">
            <p className="font-display font-bold text-sm">{t.premium.monthly}</p>
            <p className="text-2xl font-display font-extrabold">$1</p>
            <p className="text-xs text-muted-foreground">/ {t.premium.month}</p>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => handlePurchase("monthly")}
              disabled={loading !== null}
            >
              {loading === "monthly" ? t.premium.activating : t.premium.select}
            </Button>
          </CardContent>
        </Card>

        {/* Yearly */}
        <Card className="relative overflow-hidden border-primary/40">
          <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-bl-lg">
            {t.premium.save}
          </div>
          <CardContent className="p-4 text-center space-y-2">
            <p className="font-display font-bold text-sm">{t.premium.yearly}</p>
            <p className="text-2xl font-display font-extrabold">$10</p>
            <p className="text-xs text-muted-foreground">/ {t.premium.year}</p>
            <Button
              size="sm"
              className="w-full"
              onClick={() => handlePurchase("yearly")}
              disabled={loading !== null}
            >
              {loading === "yearly" ? t.premium.activating : t.premium.select}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Close / Cancel */}
      {onClose && (
        <Button variant="ghost" className="w-full text-muted-foreground" onClick={onClose}>
          {t.premium.maybeLater}
        </Button>
      )}
    </div>
  );

  if (inline) return content;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-fade-in">
      <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
        <CardContent className="p-5 relative">
          {onClose && (
            <button onClick={onClose} className="absolute top-3 right-3 p-1 rounded-lg hover:bg-accent transition-colors">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
          {content}
        </CardContent>
      </Card>
    </div>
  );
};

export default Paywall;
