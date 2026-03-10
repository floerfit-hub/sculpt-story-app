import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Upload, X, Save, Clock, PartyPopper, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { differenceInDays, addDays, format } from "date-fns";
import type { Tables } from "@/integrations/supabase/types";

type ProgressEntry = Tables<"progress_entries">;

const CHECKIN_INTERVAL = 14;

const motivationalMessages = [
  "Amazing work! Consistency is the key to transformation! 🔥",
  "Every check-in brings you closer to your goals! 💪",
  "You're showing up for yourself — that's what champions do! 🏆",
  "Progress isn't always linear, but you're moving forward! 🚀",
  "Two more weeks of greatness ahead! Keep pushing! ⭐",
];

const AddEntry = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [canLog, setCanLog] = useState(true);
  const [daysLeft, setDaysLeft] = useState(0);
  const [nextDate, setNextDate] = useState<Date | null>(null);
  const [previousEntry, setPreviousEntry] = useState<ProgressEntry | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [savedEntry, setSavedEntry] = useState<Partial<ProgressEntry> | null>(null);

  const [form, setForm] = useState({
    entry_date: new Date().toISOString().split("T")[0],
    weight: "",
    waist: "",
    chest: "",
    hips: "",
    body_fat: "",
    notes: "",
  });
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;
    const checkEligibility = async () => {
      const { data } = await supabase
        .from("progress_entries")
        .select("*")
        .eq("user_id", user.id)
        .order("entry_date", { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        const lastEntry = data[0];
        setPreviousEntry(lastEntry);
        const next = addDays(new Date(lastEntry.entry_date), CHECKIN_INTERVAL);
        const diff = differenceInDays(next, new Date());
        if (diff > 0) {
          setCanLog(false);
          setDaysLeft(diff);
          setNextDate(next);
        }
      }
      setChecking(false);
    };
    checkEligibility();
  }, [user]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setPhotos((prev) => [...prev, ...files]);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setPreviews((prev) => [...prev, ev.target?.result as string]);
      };
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
      const { error } = await supabase.storage
        .from("progress-photos")
        .upload(path, photo);
      if (!error) {
        const { data: urlData } = supabase.storage
          .from("progress-photos")
          .getPublicUrl(path);
        photoUrls.push(urlData.publicUrl);
      }
    }

    const entryData = {
      user_id: user.id,
      entry_date: form.entry_date,
      weight: form.weight ? Number(form.weight) : null,
      waist: form.waist ? Number(form.waist) : null,
      chest: form.chest ? Number(form.chest) : null,
      hips: form.hips ? Number(form.hips) : null,
      body_fat: form.body_fat ? Number(form.body_fat) : null,
      notes: form.notes || null,
      photo_urls: photoUrls.length > 0 ? photoUrls : null,
    };

    const { error } = await supabase.from("progress_entries").insert(entryData);

    setLoading(false);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setSavedEntry(entryData);
      setShowComparison(true);
      const msg = motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)];
      toast({ title: "Progress Logged! 🎉", description: msg });
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
            <h2 className="text-xl font-display font-bold">Not Yet!</h2>
            <p className="text-muted-foreground">
              Your next progress check-in is available in{" "}
              <span className="font-semibold text-primary">{daysLeft} day{daysLeft !== 1 ? "s" : ""}</span>.
            </p>
            {nextDate && (
              <p className="text-sm text-muted-foreground">
                Come back on {format(nextDate, "MMMM d, yyyy")}
              </p>
            )}
            <Button variant="outline" onClick={() => navigate("/")}>
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (showComparison && savedEntry) {
    const comparisons = [
      { label: "Weight", unit: "kg", current: savedEntry.weight, prev: previousEntry?.weight },
      { label: "Waist", unit: "cm", current: savedEntry.waist, prev: previousEntry?.waist },
      { label: "Chest", unit: "cm", current: savedEntry.chest, prev: previousEntry?.chest },
      { label: "Hips", unit: "cm", current: savedEntry.hips, prev: previousEntry?.hips },
    ];

    return (
      <div className="lg:ml-56 max-w-2xl animate-fade-in space-y-6">
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="py-8 text-center space-y-3">
            <PartyPopper className="h-12 w-12 text-primary mx-auto" />
            <h2 className="text-xl font-display font-bold">Great Job! 🎉</h2>
            <p className="text-muted-foreground">
              {motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)]}
            </p>
          </CardContent>
        </Card>

        {previousEntry && (
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-lg">Your Progress Comparison</CardTitle>
            </CardHeader>
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

        <Button className="w-full" onClick={() => navigate("/")}>
          Back to Dashboard
        </Button>
      </div>
    );
  }

  const fields = [
    { key: "weight", label: "Weight (kg)", placeholder: "75" },
    { key: "waist", label: "Waist (cm)", placeholder: "80" },
    { key: "chest", label: "Chest (cm)", placeholder: "95" },
    { key: "hips", label: "Hips (cm)", placeholder: "90" },
    { key: "body_fat", label: "Body Fat % (optional)", placeholder: "15" },
  ] as const;

  return (
    <div className="lg:ml-56 max-w-2xl animate-fade-in">
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-xl">Log Bi-Weekly Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={form.entry_date}
                onChange={(e) => setForm({ ...form, entry_date: e.target.value })}
                required
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {fields.map((f) => (
                <div key={f.key} className="space-y-2">
                  <Label htmlFor={f.key}>{f.label}</Label>
                  <Input
                    id={f.key}
                    type="number"
                    step="0.1"
                    placeholder={f.placeholder}
                    value={form[f.key]}
                    onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                  />
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="How are you feeling? Any changes in diet or training?"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Progress Photos</Label>
              <div className="flex flex-wrap gap-3">
                {previews.map((src, i) => (
                  <div key={i} className="relative h-24 w-24 overflow-hidden rounded-lg border">
                    <img src={src} alt="" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removePhoto(i)}
                      className="absolute right-1 top-1 rounded-full bg-foreground/70 p-0.5 text-background"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-muted-foreground/30 text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                  <Upload className="h-5 w-5" />
                  <span className="text-xs">Upload</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              <Save className="mr-2 h-4 w-4" />
              {loading ? "Saving..." : "Save Entry"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AddEntry;
