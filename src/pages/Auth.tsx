import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/i18n";
import { Dumbbell } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Link } from "react-router-dom";

const Auth = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    if (isSignUp && !acceptedTerms) {
      toast({ title: t.common.error, description: t.auth.mustAcceptTerms, variant: "destructive" });
      setLoading(false);
      return;
    }

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: window.location.origin,
        },
      });
      if (error) {
        toast({ title: t.common.error, description: error.message, variant: "destructive" });
      } else {
        toast({ title: t.auth.checkEmail, description: t.auth.confirmationSent });
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast({ title: t.common.error, description: error.message, variant: "destructive" });
      } else {
        if (!rememberMe) {
          sessionStorage.setItem("forget-on-close", "true");
        } else {
          sessionStorage.removeItem("forget-on-close");
        }
        navigate("/");
      }
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-5">
      {/* Ambient glow */}
      <div className="fixed top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />

      <Card className="w-full max-w-md animate-fade-in relative">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl gradient-primary glow-primary-strong">
            <Dumbbell className="h-8 w-8 text-primary-foreground" />
          </div>
          <CardTitle className="font-display text-2xl font-bold">
            {isSignUp ? t.auth.createAccount : t.auth.welcomeBack}
          </CardTitle>
          <CardDescription className="mt-1">
            {isSignUp ? t.auth.startTracking : t.auth.logInToSee}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <form onSubmit={handleSubmit} className="space-y-5">
            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">{t.auth.fullName}</Label>
                <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="John Doe" required />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">{t.auth.email}</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">{t.auth.password}</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="remember" checked={rememberMe} onCheckedChange={(v) => setRememberMe(!!v)} />
              <Label htmlFor="remember" className="text-sm text-muted-foreground cursor-pointer">{t.auth.rememberMe || "Запам'ятати мене"}</Label>
            </div>
            <Button type="submit" className="w-full h-12 text-base font-bold" disabled={loading}>
              {loading ? t.auth.loading : isSignUp ? t.auth.signUp : t.auth.logIn}
            </Button>
          </form>
          <div className="mt-6 text-center">
            <button onClick={() => setIsSignUp(!isSignUp)} className="text-sm text-muted-foreground hover:text-primary transition-colors duration-200">
              {isSignUp ? t.auth.alreadyHaveAccount : t.auth.dontHaveAccount}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
