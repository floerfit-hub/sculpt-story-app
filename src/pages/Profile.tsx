import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation, type Language } from "@/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { User, LogOut, Save, Download, Globe, Moon, Sun } from "lucide-react";

const LANGUAGES: { code: Language; label: string }[] = [
  { code: "en", label: "English" },
  { code: "uk", label: "Українська" },
];

const Profile = () => {
  const { user, profile, signOut } = useAuth();
  const { toast } = useToast();
  const { t, lang, setLanguage } = useTranslation();
  const { theme, setTheme } = useTheme();
  const [name, setName] = useState(profile?.full_name || "");
  const [saving, setSaving] = useState(false);
  const [isStandalone] = useState(window.matchMedia("(display-mode: standalone)").matches);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ full_name: name }).eq("user_id", user.id);
    setSaving(false);
    if (error) {
      toast({ title: t.common.error, description: error.message, variant: "destructive" });
    } else {
      toast({ title: t.profile.profileUpdated });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-lg mx-auto">
      <h1 className="text-2xl font-display font-bold">{t.profile.title}</h1>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            {t.profile.account}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t.profile.email}</Label>
            <Input value={user?.email || ""} disabled className="bg-muted" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">{t.profile.fullName}</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder={t.profile.yourName} />
          </div>
          <Button onClick={handleSave} disabled={saving} className="w-full">
            <Save className="mr-2 h-4 w-4" />
            {saving ? t.profile.saving : t.profile.saveChanges}
          </Button>
        </CardContent>
      </Card>

      {/* Theme */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg flex items-center gap-2">
            {theme === "dark" ? <Moon className="h-5 w-5 text-primary" /> : <Sun className="h-5 w-5 text-primary" />}
            {t.profile.theme}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">{t.profile.themeDesc}</p>
          <div className="flex gap-2">
            <Button
              variant={theme === "dark" ? "default" : "outline"}
              className="flex-1"
              onClick={() => setTheme("dark")}
            >
              <Moon className="mr-2 h-4 w-4" />
              {t.profile.dark}
            </Button>
            <Button
              variant={theme === "light" ? "default" : "outline"}
              className="flex-1"
              onClick={() => setTheme("light")}
            >
              <Sun className="mr-2 h-4 w-4" />
              {t.profile.light}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Language */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            {t.profile.language}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">{t.profile.languageDesc}</p>
          <div className="flex gap-2">
            {LANGUAGES.map((l) => (
              <Button
                key={l.code}
                variant={lang === l.code ? "default" : "outline"}
                className="flex-1"
                onClick={() => setLanguage(l.code)}
              >
                {l.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {!isStandalone && (
        <Card className="border-primary/30">
          <CardContent className="p-4 flex items-center gap-3">
            <Download className="h-5 w-5 text-primary shrink-0" />
            <div className="flex-1">
              <p className="font-display font-semibold text-sm">{t.profile.installApp}</p>
              <p className="text-xs text-muted-foreground">{t.profile.addToHome}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Button variant="outline" className="w-full" onClick={signOut}>
        <LogOut className="mr-2 h-4 w-4" />
        {t.profile.signOut}
      </Button>
    </div>
  );
};

export default Profile;
