import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/i18n";
import { ArrowLeft, Mail } from "lucide-react";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const baseUrl = window.location.href.split("#")[0];
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${baseUrl}#/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast({ title: t.common.error, description: error.message, variant: "destructive" });
    } else {
      setSent(true);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-5">
      <div className="fixed top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />

      <Card className="w-full max-w-md animate-fade-in relative">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl gradient-primary glow-primary-strong">
            <Mail className="h-8 w-8 text-primary-foreground" />
          </div>
          <CardTitle className="font-display text-2xl font-bold">
            {sent ? t.auth.checkEmail : t.auth.forgotPasswordTitle}
          </CardTitle>
          <CardDescription className="mt-1">
            {sent ? t.auth.resetPasswordSentDesc : t.auth.forgotPasswordDesc}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          {sent ? (
            <div className="space-y-5 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                <Mail className="h-10 w-10 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">
                {t.auth.resetEmailSentTo} <span className="font-medium text-foreground">{email}</span>
              </p>
              <Button variant="outline" className="w-full" onClick={() => navigate("/auth")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t.auth.backToLogin}
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">{t.auth.email}</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>
              <Button type="submit" className="w-full h-12 text-base font-bold" disabled={loading}>
                {loading ? t.auth.loading : t.auth.sendResetLink}
              </Button>
              <Button variant="ghost" className="w-full" type="button" onClick={() => navigate("/auth")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t.auth.backToLogin}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ForgotPassword;
