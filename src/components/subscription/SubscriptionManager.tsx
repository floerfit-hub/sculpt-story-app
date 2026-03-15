import { useState } from "react";
import { usePremium } from "@/hooks/usePremium";
import { useTranslation } from "@/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, CreditCard, Loader2 } from "lucide-react";
import Paywall from "./Paywall";

const SubscriptionManager = () => {
  const { isPremium, isTrialing, subscription, trialDaysLeft, cancelSubscription, cooldown } = usePremium();
  const { t } = useTranslation();
  const [showPaywall, setShowPaywall] = useState(false);
  const [canceling, setCanceling] = useState(false);

  const handleCancel = async () => {
    setCanceling(true);
    await cancelSubscription();
    setCanceling(false);
  };

  const planLabel = subscription?.plan === "yearly"
    ? t.premium.yearly
    : subscription?.plan === "monthly"
    ? t.premium.monthly
    : t.premium.free;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            {t.premium.subscription}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{t.premium.currentPlan}</span>
            <Badge variant={isPremium ? "default" : "secondary"} className="font-display">
              {isPremium ? (
                <><Crown className="mr-1 h-3 w-3" /> Premium — {planLabel}</>
              ) : (
                t.premium.free
              )}
            </Badge>
          </div>

          {isTrialing && trialDaysLeft !== null && (
            <div className="rounded-xl bg-primary/10 p-3 text-center">
              <p className="text-sm font-display font-semibold text-primary">
                {t.premium.trialDaysLeft.replace("{days}", String(trialDaysLeft))}
              </p>
            </div>
          )}

          {isPremium && subscription?.current_period_end && (
            <div className="rounded-xl bg-primary/10 p-3 text-center">
              <p className="text-sm font-display font-semibold text-primary">
                {t.premium.renewsOn} {new Date(subscription.current_period_end).toLocaleDateString()}
              </p>
            </div>
          )}

          {isPremium ? (
            <Button
              variant="outline"
              className="w-full"
              onClick={handleCancel}
              disabled={canceling || cooldown}
            >
              {canceling ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t.premium.canceling}</>
              ) : (
                t.premium.cancelSubscription
              )}
            </Button>
          ) : (
            <Button className="w-full" onClick={() => setShowPaywall(true)} disabled={cooldown}>
              <Crown className="mr-2 h-4 w-4" />
              {t.premium.upgrade}
            </Button>
          )}
        </CardContent>
      </Card>

      {showPaywall && <Paywall onClose={() => setShowPaywall(false)} />}
    </>
  );
};

export default SubscriptionManager;
