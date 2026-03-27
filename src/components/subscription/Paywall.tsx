import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePremium } from "@/hooks/usePremium";
import { useTranslation } from "@/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Crown, Zap, BarChart3, Brain, Flame, Target, Check, X } from "lucide-react";

interface PaywallProps {
  onClose?: () => void;
  inline?: boolean;
}

const Paywall = ({ onClose, inline = false }: PaywallProps) => {
  const { subscription } = usePremium();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const features = [
    { icon: Target, label: t.premium.featureFitnessScore },
    { icon: Flame, label: t.premium.featureHeatmap },
    { icon: Brain, label: t.premium.featureAiInsights },
    { icon: BarChart3, label: t.premium.featureAdvancedCharts },
    { icon: Zap, label: t.premium.featureBodyComp },
  ];

  const handleViewPlans = () => {
    navigate("/pricing");
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

      {/* View Plans CTA */}
      <Button className="w-full" onClick={handleViewPlans}>
        <Crown className="mr-2 h-4 w-4" />
        {t.premium.upgrade}
      </Button>

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
