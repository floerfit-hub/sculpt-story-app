import { useState, ReactNode } from "react";
import { usePremium } from "@/hooks/usePremium";
import { useTranslation } from "@/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Crown, Lock } from "lucide-react";
import Paywall from "./Paywall";

interface PremiumGateProps {
  children: ReactNode;
  feature?: string;
  blur?: boolean;
}

const PremiumGate = ({ children, feature, blur = true }: PremiumGateProps) => {
  const { isPremium, loading } = usePremium();
  const { t } = useTranslation();
  const [showPaywall, setShowPaywall] = useState(false);

  if (loading) return null;
  if (isPremium) return <>{children}</>;

  return (
    <>
      <div className="relative">
        {blur && (
          <div className="pointer-events-none select-none blur-sm opacity-50">
            {children}
          </div>
        )}
        <div className={`${blur ? "absolute inset-0" : ""} flex items-center justify-center`}>
          <Card className="border-primary/20 w-full max-w-xs">
            <CardContent className="p-4 text-center space-y-3">
              <div className="flex justify-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <Lock className="h-5 w-5 text-primary" />
                </div>
              </div>
              <p className="font-display font-bold text-sm">{t.premium.premiumFeature}</p>
              <p className="text-xs text-muted-foreground">{feature || t.premium.unlockAll}</p>
              <Button size="sm" className="w-full" onClick={() => setShowPaywall(true)}>
                <Crown className="mr-1.5 h-3.5 w-3.5" />
                {t.premium.upgrade}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
      {showPaywall && <Paywall onClose={() => setShowPaywall(false)} />}
    </>
  );
};

export default PremiumGate;
