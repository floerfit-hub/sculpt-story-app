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

const Auth = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

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
        navigate("/");
      }
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md animate-fade-in">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl gradient-primary">
            <Dumbbell className="h-7 w-7 text-primary-foreground" />
          </div>
          <CardTitle className="font-display text-2xl">
            {isSignUp ? t.auth.createAccount : t.auth.welcomeBack}
          </CardTitle>
          <CardDescription>
            {isSignUp ? t.auth.startTracking : t.auth.logInToSee}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="name">{t.auth.fullName}</Label>
                <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="John Doe" required />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">{t.auth.email}</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t.auth.password}</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t.auth.loading : isSignUp ? t.auth.signUp : t.auth.logIn}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <button onClick={() => setIsSignUp(!isSignUp)} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {isSignUp ? t.auth.alreadyHaveAccount : t.auth.dontHaveAccount}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
