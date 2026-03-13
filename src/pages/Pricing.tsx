import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "@/i18n";
import { useAuth } from "@/hooks/useAuth";
import { usePremium } from "@/hooks/usePremium";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Crown, Target, Flame, Brain, BarChart3, Zap, Check, ArrowLeft, Info, X, Dumbbell, Shield, Camera } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Pricing = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { profile } = useAuth();
  // activateMockPremium and cooldown moved below
  const navigate = useNavigate();
  const [loading, setLoading] = useState<string | null>(null);

  const proFeatures = [
    { icon: BarChart3, label: "Розширена аналітика м'язових груп", desc: "Детальні теплові карти обсягу тренувань по м'язових групах за 30 днів" },
    { icon: Target, label: "Необмежена історія тренувань", desc: "Доступ до повної історії тренувань з фільтрами за датою та пошуком" },
    { icon: Brain, label: "AI-інсайти тренувань", desc: "Персоналізовані рекомендації, виявлення плато та оптимізація тренувань" },
    { icon: Flame, label: "Панель Fitness Score", desc: "Комплексна оцінка фітнесу на основі тренувань, сили та показників тіла" },
    { icon: Zap, label: "Панель складу тіла", desc: "Відстеження жиру, м'язової маси та детальна аналітика вимірювань" },
    { icon: Camera, label: "Розширені фото прогресу", desc: "Порівняння фото поруч з переглядом по хронології" },
    { icon: Shield, label: "Пріоритетна підтримка", desc: "Отримуйте швидші відповіді від нашої команди підтримки" },
    { icon: Dumbbell, label: "Графіки прогресу сили", desc: "Візуалізуйте оцінки 1ПМ та прогрес ваги з часом" },
  ];

  const comparisonRows = [
    { feature: "Логування тренувань (40+ вправ)", free: true, pro: true },
    { feature: "Базове відстеження вимірювань тіла", free: true, pro: true },
    { feature: "Завантаження фото прогресу", free: true, pro: true },
    { feature: "Калькулятор калорій та макросів", free: true, pro: true },
    { feature: "Перевірка прогресу кожні два тижні", free: true, pro: true },
    { feature: "Теплова карта м'язових груп", free: false, pro: true },
    { feature: "AI-інсайти тренувань", free: false, pro: true },
    { feature: "Панель Fitness Score", free: false, pro: true },
    { feature: "Аналітика складу тіла", free: false, pro: true },
    { feature: "Розширені графіки сили", free: false, pro: true },
    { feature: "Необмежена історія тренувань", free: false, pro: true },
    { feature: "Пріоритетна підтримка", free: false, pro: true },
  ];

  const { activateMockPremium, cooldown } = usePremium();

  const handleBuy = async (plan: "monthly" | "yearly") => {
    if (cooldown) return;
    setLoading(plan);
    await activateMockPremium(plan);
    toast({
      title: `Welcome to Pro, ${profile?.full_name || "Champion"}! 🚀`,
      description: "Premium subscription activated successfully! Your premium features are now unlocked.",
    });
    setLoading(null);
    navigate("/welcome-pro");
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-5 py-8 space-y-10">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link to="/" className="p-2 rounded-xl hover:bg-accent transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-display font-extrabold">Оновити до FitTrack Pro</h1>
            <p className="text-sm text-muted-foreground mt-1">Розблокуйте повну потужність відстеження фітнесу</p>
          </div>
        </div>

        {/* Notice */}
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4 flex gap-3 items-start">
            <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground">
              Paddle Checkout буде активний після завершення верифікації акаунта. Преміум-функції увімкнені для тестування.
            </p>
          </CardContent>
        </Card>

        {/* Pro Features List */}
        <div>
          <h2 className="text-lg font-display font-bold mb-4">Що входить у Pro</h2>
          <div className="space-y-2.5">
            {proFeatures.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-start gap-3 rounded-xl border border-border/50 p-3.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 mt-0.5">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <span className="text-sm font-semibold block">{label}</span>
                  <span className="text-xs text-muted-foreground">{desc}</span>
                </div>
                <Check className="h-4 w-4 text-primary ml-auto shrink-0 mt-1" />
              </div>
            ))}
          </div>
        </div>

        {/* Comparison Table */}
        <div>
          <h2 className="text-lg font-display font-bold mb-4">Free vs Pro Comparison</h2>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-3 font-display font-bold">Feature</th>
                      <th className="text-center p-3 font-display font-bold w-20">Free</th>
                      <th className="text-center p-3 font-display font-bold w-20 text-primary">Pro</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonRows.map(({ feature, free, pro }) => (
                      <tr key={feature} className="border-b border-border/50 last:border-0">
                        <td className="p-3 text-muted-foreground">{feature}</td>
                        <td className="p-3 text-center">
                          {free ? <Check className="h-4 w-4 text-primary mx-auto" /> : <X className="h-4 w-4 text-muted-foreground/30 mx-auto" />}
                        </td>
                        <td className="p-3 text-center">
                          {pro ? <Check className="h-4 w-4 text-primary mx-auto" /> : <X className="h-4 w-4 text-muted-foreground/30 mx-auto" />}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pricing Cards */}
        <div>
          <h2 className="text-lg font-display font-bold mb-4">Choose Your Plan</h2>
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-5 text-center space-y-3">
                <p className="font-display font-bold">{t.premium.monthly}</p>
                <p className="text-3xl font-display font-extrabold">$1</p>
                <p className="text-xs text-muted-foreground">/ {t.premium.month}</p>
                <p className="text-[10px] text-muted-foreground">7-day free trial included</p>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => handleBuy("monthly")}
                  disabled={loading !== null || cooldown}
                >
                  {loading === "monthly" ? t.premium.activating : "Start Free Trial"}
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
                <p className="text-[10px] text-muted-foreground">7-day free trial · Save 17%</p>
                <Button
                  className="w-full"
                  onClick={() => handleBuy("yearly")}
                  disabled={loading !== null || cooldown}
                >
                  {loading === "yearly" ? t.premium.activating : "Start Free Trial"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* FAQ / Trust */}
        <div className="space-y-3">
          <h2 className="text-lg font-display font-bold">Frequently Asked Questions</h2>
          <div className="space-y-2">
            {[
              { q: "Can I cancel anytime?", a: "Yes. Cancel from your Profile at any time. You keep access until the end of your billing period." },
              { q: "Is there a free trial?", a: "Yes! Every Pro subscription starts with a 7-day free trial. You won't be charged during the trial." },
              { q: "What payment methods are accepted?", a: "We accept credit/debit cards, PayPal, and other methods through our payment provider Paddle." },
              { q: "Can I get a refund?", a: "Yes. Full refunds are available within 7 days of your first payment (14 days for yearly plans)." },
            ].map(({ q, a }) => (
              <Card key={q}>
                <CardContent className="p-4">
                  <p className="font-semibold text-sm">{q}</p>
                  <p className="text-xs text-muted-foreground mt-1">{a}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Footer links */}
        <div className="flex justify-center gap-4 text-xs text-muted-foreground pt-4 pb-8">
          <Link to="/terms" className="hover:text-foreground transition-colors">Terms</Link>
          <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
          <Link to="/refund" className="hover:text-foreground transition-colors">Refund</Link>
          <Link to="/contact" className="hover:text-foreground transition-colors">Contact</Link>
        </div>
      </div>
    </div>
  );
};

export default Pricing;
