import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Upload, X, Save, Clock, PartyPopper, TrendingDown, TrendingUp, Minus } from "lucide-react";
import MeasurementsCard from "@/components/dashboard/MeasurementsCard";
import { differenceInDays, addDays, format } from "date-fns";
import type { Tables } from "@/integrations/supabase/types";

type ProgressEntry = Tables<"progress_entries">;
const CHECKIN_INTERVAL = 14;

const AddEntry = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [canLog, setCanLog] = useState(true);
  const [daysLeft, setDaysLeft] = useState(0);
  const [nextDate, setNextDate] = useState<Date | null>(null);
  const [previousEntry, setPreviousEntry] = useState<ProgressEntry | null>(null);
  const [secondPreviousEntry, setSecondPreviousEntry] = useState<ProgressEntry | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [savedEntry, setSavedEntry] = useState<Partial<ProgressEntry> | null>(null);

  // Edit mode
  const editEntry = (location.state as any)?.editEntry as ProgressEntry | undefined;
  const isEditing = !!editEntry;

  const [form, setForm] = useState({
    entry_date: editEntry?.entry_date || new Date().toISOString().split("T")[0],
    weight: editEntry?.weight?.toString() || "",
    waist: editEntry?.waist?.toString() || "",
    chest: editEntry?.chest?.toString() || "",
    hips: editEntry?.hips?.toString() || "",
    body_fat: editEntry?.body_fat?.toString() || "",
    arm_circumference: (editEntry as any)?.arm_circumference?.toString() || "",
    glute_circumference: (editEntry as any)?.glute_circumference?.toString() || "",
    thigh_circumference: (editEntry as any)?.thigh_circumference?.toString() || "",
    notes: editEntry?.notes || "",
  });
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;
    if (isEditing) { setChecking(false); setCanLog(true); return; }
    const checkEligibility = async () => {
      const { data } = await supabase
        .from("progress_entries").select("*").eq("user_id", user.id)
        .order("entry_date", { ascending: false }).limit(2);
      if (data && data.length > 0) {
        const lastEntry = data[0];
        setPreviousEntry(lastEntry);
        if (data.length > 1) setSecondPreviousEntry(data[1]);
        const next = addDays(new Date(lastEntry.entry_date), CHECKIN_INTERVAL);
        const diff = differenceInDays(next, new Date());
        if (diff > 0) { setCanLog(false); setDaysLeft(diff); setNextDate(next); }
      }
      setChecking(false);
    };
    checkEligibility();
  }, [user, isEditing]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setPhotos((prev) => [...prev, ...files]);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => { setPreviews((prev) => [...prev, ev.target?.result as string]); };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    const photoUrls: string[] = [];
    for (const photo of photos) {
      const ext = photo.name.split(".").pop();
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("progress-photos").upload(path, photo);
      if (!error) {
        const { data: urlData } = supabase.storage.from("progress-photos").getPublicUrl(path);
        photoUrls.push(urlData.publicUrl);
      }
    }

    const entryData: Record<string, any> = {
      entry_date: form.entry_date,
      weight: form.weight ? Number(form.weight) : null,
      waist: form.waist ? Number(form.waist) : null,
      chest: form.chest ? Number(form.chest) : null,
      hips: form.hips ? Number(form.hips) : null,
      body_fat: form.body_fat ? Number(form.body_fat) : null,
      arm_circumference: form.arm_circumference ? Number(form.arm_circumference) : null,
      glute_circumference: form.glute_circumference ? Number(form.glute_circumference) : null,
      thigh_circumference: form.thigh_circumference ? Number(form.thigh_circumference) : null,
      notes: form.notes || null,
    };

    if (isEditing) {
      if (photoUrls.length > 0) {
        entryData.photo_urls = [...(editEntry?.photo_urls || []), ...photoUrls];
      }
      const { error } = await supabase.from("progress_entries").update(entryData).eq("id", editEntry!.id);
      setLoading(false);
      if (error) {
        toast({ title: t.addEntry.error, description: error.message, variant: "destructive" });
      } else {
        toast({ title: t.dashboard.entryUpdated });
        navigate("/");
      }
      return;
    }

    entryData.user_id = user.id;
    if (photoUrls.length > 0) entryData.photo_urls = photoUrls;

    const { error } = await supabase.from("progress_entries").insert(entryData as any);
    setLoading(false);

    if (error) {
      toast({ title: t.addEntry.error, description: error.message, variant: "destructive" });
    } else {
      setSavedEntry(entryData);
      setShowComparison(true);
      const msg = t.motivation[Math.floor(Math.random() * t.motivation.length)];
      toast({ title: t.addEntry.progressLogged, description: msg });
    }
  };

  const getDiff = (current?: number | null, prev?: number | null) => {
    if (current == null || prev == null) return null;
    return Number((current - prev).toFixed(1));
  };

  const DiffIcon = ({ diff }: { diff: number | null }) => {
    if (diff == null) return null;
    if (diff < 0) return <TrendingDown className="h-4 w-4 text-primary" />;
    if (diff > 0) return <TrendingUp className="h-4 w-4 text-destructive" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  if (checking) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!canLog) {
    return (
      <div className="max-w-2xl animate-fade-in">
        <Card className="border-primary/30">
          <CardContent className="py-12 text-center space-y-4">
            <Clock className="h-12 w-12 text-primary mx-auto" />
            <h2 className="text-xl font-display font-bold">{t.addEntry.notYet}</h2>
            <p className="text-muted-foreground">
              {t.addEntry.nextCheckinIn}{" "}
              <span className="font-semibold text-primary">{daysLeft} {daysLeft !== 1 ? t.dashboard.days : t.dashboard.day}</span>.
            </p>
            {nextDate && <p className="text-sm text-muted-foreground">{t.addEntry.comeBackOn} {format(nextDate, "MMMM d, yyyy")}</p>}
            <Button variant="outline" onClick={() => navigate("/")}>{t.addEntry.backToDashboard}</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (showComparison && savedEntry) {
    const comparisons = [
      { label: t.dashboard.weight, unit: t.common.kg, current: savedEntry.weight, prev: previousEntry?.weight },
      { label: t.addEntry.waistCm, unit: t.common.cm, current: savedEntry.waist, prev: previousEntry?.waist },
      { label: t.addEntry.chest, unit: t.common.cm, current: savedEntry.chest, prev: previousEntry?.chest },
      { label: t.addEntry.hips, unit: t.common.cm, current: savedEntry.hips, prev: previousEntry?.hips },
    ];

    return (
      <div className="max-w-2xl animate-fade-in space-y-6">
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="py-8 text-center space-y-3">
            <PartyPopper className="h-12 w-12 text-primary mx-auto" />
            <h2 className="text-xl font-display font-bold">{t.addEntry.greatJob}</h2>
            <p className="text-muted-foreground">{t.motivation[Math.floor(Math.random() * t.motivation.length)]}</p>
          </CardContent>
        </Card>

        {previousEntry && (
          <Card>
            <CardHeader><CardTitle className="font-display text-lg">{t.addEntry.progressComparison}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {comparisons.map((c) => {
                const diff = getDiff(c.current, c.prev);
                return (
                  <div key={c.label} className="flex items-center justify-between rounded-lg border p-3">
                    <span className="font-medium">{c.label}</span>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-muted-foreground">{c.prev ?? "—"}</span>
                      <span>→</span>
                      <span className="font-semibold">{c.current ?? "—"}</span>
                      {diff != null && (
                        <span className={`flex items-center gap-1 ${diff < 0 ? "text-primary" : diff > 0 ? "text-destructive" : "text-muted-foreground"}`}>
                          <DiffIcon diff={diff} />
                          {diff > 0 ? "+" : ""}{diff}{c.unit}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        <Button className="w-full" onClick={() => navigate("/")}>{t.addEntry.backToDashboard}</Button>
      </div>
    );
  }

  const fields = [
    { key: "weight", label: t.addEntry.weightKg, placeholder: "75" },
    { key: "waist", label: t.addEntry.waistCm, placeholder: "80" },
    { key: "chest", label: t.addEntry.chestCm, placeholder: "95" },
    { key: "hips", label: t.addEntry.hipsCm, placeholder: "90" },
    { key: "arm_circumference", label: t.addEntry.armCm, placeholder: "35" },
    { key: "glute_circumference", label: t.addEntry.gluteCm, placeholder: "100" },
    { key: "thigh_circumference", label: t.addEntry.thighCm, placeholder: "55" },
    { key: "body_fat", label: t.addEntry.bodyFatOptional, placeholder: "15" },
  ] as const;



  return (
    <div className="max-w-2xl animate-fade-in space-y-4">
      {previousEntry && !isEditing && (
        <MeasurementsCard latest={previousEntry} previous={secondPreviousEntry ?? undefined} />
      )}

      <Card>
        <CardHeader><CardTitle className="font-display text-xl">{isEditing ? t.addEntry.update : t.addEntry.logProgress}</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="date">{t.addEntry.date}</Label>
              <Input id="date" type="date" value={form.entry_date} onChange={(e) => setForm({ ...form, entry_date: e.target.value })} required />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {fields.map((f) => (
                <div key={f.key} className="space-y-2">
                  <Label htmlFor={f.key}>{f.label}</Label>
                  <Input id={f.key} type="number" step="0.1" placeholder={f.placeholder} value={(form as any)[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">{t.addEntry.notes}</Label>
              <Textarea id="notes" placeholder={t.addEntry.notesPlaceholder} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
            </div>

            <div className="space-y-2">
              <Label>{t.addEntry.progressPhotos}</Label>
              <div className="flex flex-wrap gap-3">
                {previews.map((src, i) => (
                  <div key={i} className="relative h-24 w-24 overflow-hidden rounded-lg border">
                    <img src={src} alt="" className="h-full w-full object-cover" />
                    <button type="button" onClick={() => removePhoto(i)} className="absolute right-1 top-1 rounded-full bg-foreground/70 p-0.5 text-background">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-muted-foreground/30 text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                  <Upload className="h-5 w-5" />
                  <span className="text-xs">{t.addEntry.upload}</span>
                  <input type="file" accept="image/*" multiple onChange={handlePhotoChange} className="hidden" />
                </label>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              <Save className="mr-2 h-4 w-4" />
              {loading ? (isEditing ? t.addEntry.updating : t.addEntry.saving) : (isEditing ? t.addEntry.update : t.addEntry.saveEntry)}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AddEntry;
