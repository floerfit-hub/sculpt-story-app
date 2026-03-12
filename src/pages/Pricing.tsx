import { Link } from "react-router-dom";
import { useTranslation } from "@/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Crown, Target, Flame, Brain, BarChart3, Zap, Check, ArrowLeft, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Pricing = () => {
  const { t } = useTranslation();
  const { toast } = useToast();

  const features = [
    { icon: Target, label: t.premium.featureFitnessScore },
    { icon: Flame, label: t.premium.featureHeatmap },
    { icon: Brain, label: t.premium.featureAiInsights },
    { icon: BarChart3, label: t.premium.featureAdvancedCharts },
    { icon: Zap, label: t.premium.featureBodyComp },
  ];

  const handleBuy = () => {
    toast({
      title: "Paddle Checkout Pending",
      description: "Paddle Checkout will be active once account verification is complete. Premium features are enabled for testing.",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-5 py-8 space-y-8">
        <div className="flex items-center gap-3">
          <Link to="/" className="p-2 rounded-xl hover:bg-accent transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-display font-extrabold">Upgrade to Premium</h1>
        </div>

        {/* Notice */}
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4 flex gap-3 items-start">
            <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground">
              Paddle Checkout will be active once account verification is complete. Premium features are currently enabled for testing.
            </p>
          </CardContent>
        </Card>

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

        {/* Plans */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-5 text-center space-y-3">
              <p className="font-display font-bold">{t.premium.monthly}</p>
              <p className="text-3xl font-display font-extrabold">$1</p>
              <p className="text-xs text-muted-foreground">/ {t.premium.month}</p>
              <Button variant="outline" className="w-full" onClick={handleBuy}>
                Buy Now
              </Button>
            </CardContent>
          </Card>

          <Card className="border-primary/40 relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-bl-lg">
              {t.premium.save}
            </div>
            <CardContent className="p-5 text-center space-y-3">
              <p className="font-display font-bold">{t.premium.yearly}</p>
              <p className="text-3xl font-display font-extrabold">$10</p>
              <p className="text-xs text-muted-foreground">/ {t.premium.year}</p>
              <Button className="w-full" onClick={handleBuy}>
                Buy Now
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Footer links */}
        <div className="flex justify-center gap-4 text-xs text-muted-foreground pt-4">
          <Link to="/terms" className="hover:text-foreground transition-colors">Terms</Link>
          <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
          <Link to="/refund" className="hover:text-foreground transition-colors">Refund</Link>
        </div>
      </div>
    </div>
  );
};

export default Pricing;
