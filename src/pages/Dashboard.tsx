import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { PlusCircle, TrendingDown, TrendingUp, Minus, Scale, Ruler, Activity, Clock, Pencil, Trash2 } from "lucide-react";
import { format, differenceInDays, addDays } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

type ProgressEntry = Tables<"progress_entries">;
const CHECKIN_INTERVAL = 14;

const Dashboard = () => {
  const { user, profile } = useAuth();
  const { t } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [entries, setEntries] = useState<ProgressEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchEntries = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("progress_entries")
      .select("*")
      .eq("user_id", user.id)
      .order("entry_date", { ascending: false })
      .limit(10);
    setEntries(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchEntries(); }, [user]);

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("progress_entries").delete().eq("id", deleteId);
    if (!error) {
      toast({ title: t.dashboard.entryDeleted });
      setEntries((prev) => prev.filter((e) => e.id !== deleteId));
    } else {
      toast({ title: t.common.error, description: error.message, variant: "destructive" });
    }
    setDeleteId(null);
  };

  const latest = entries[0];
  const previous = entries[1];
  const nextCheckinDate = latest ? addDays(new Date(latest.entry_date), CHECKIN_INTERVAL) : null;
  const daysUntilCheckin = nextCheckinDate ? differenceInDays(nextCheckinDate, new Date()) : 0;
  const canLogEntry = !latest || daysUntilCheckin <= 0;

  const getTrend = (current?: number | null, prev?: number | null) => {
    if (current == null || prev == null) return null;
    if (current < prev) return "down";
    if (current > prev) return "up";
    return "same";
  };

  const getDiff = (current?: number | null, prev?: number | null) => {
    if (current == null || prev == null) return null;
    return Number((current - prev).toFixed(1));
  };

  const TrendIcon = ({ trend }: { trend: string | null }) => {
    if (trend === "down") return <TrendingDown className="h-4 w-4 text-primary" />;
    if (trend === "up") return <TrendingUp className="h-4 w-4 text-destructive" />;
    if (trend === "same") return <Minus className="h-4 w-4 text-muted-foreground" />;
    return null;
  };

  const statCards = [
    { label: t.dashboard.weight, value: latest?.weight, prevValue: previous?.weight, unit: t.common.kg, icon: Scale, trend: getTrend(latest?.weight, previous?.weight) },
    { label: t.dashboard.waist, value: latest?.waist, prevValue: previous?.waist, unit: t.common.cm, icon: Ruler, trend: getTrend(latest?.waist, previous?.waist) },
    { label: t.dashboard.bodyFat, value: latest?.body_fat, prevValue: previous?.body_fat, unit: "%", icon: Activity, trend: getTrend(latest?.body_fat, previous?.body_fat) },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-7 animate-fade-in">
      {/* Hero section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-extrabold tracking-tight">
            {t.dashboard.hey}, {profile?.full_name || t.dashboard.there} 💪
          </h1>
          <p className="text-muted-foreground mt-1">{t.dashboard.trackTransformation}</p>
        </div>
        {canLogEntry ? (
          <Link to="/add-entry">
            <Button size="lg">
              <PlusCircle className="mr-2 h-4 w-4" />
              {t.dashboard.newEntry}
            </Button>
          </Link>
        ) : (
          <Button variant="outline" disabled>
            <Clock className="mr-2 h-4 w-4" />
            {daysUntilCheckin}{t.dashboard.daysLeft}
          </Button>
        )}
      </div>

      {/* Check-in banner */}
      {!canLogEntry && nextCheckinDate && (
        <Card className="border-primary/20 gradient-glow">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <p className="text-sm">
              {t.dashboard.nextCheckin}{" "}
              <span className="font-bold text-primary text-glow">{daysUntilCheckin} {daysUntilCheckin !== 1 ? t.dashboard.days : t.dashboard.day}</span>
              {" "}({format(nextCheckinDate, "MMM d, yyyy")}).
            </p>
          </CardContent>
        </Card>
      )}

      {canLogEntry && entries.length > 0 && (
        <Card className="border-primary/20 gradient-glow">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <PlusCircle className="h-5 w-5 text-primary" />
            </div>
            <p className="text-sm">
              {t.dashboard.checkinReady}{" "}
              <Link to="/add-entry" className="font-bold text-primary hover:underline underline-offset-2">
                {t.dashboard.logProgressNow}
              </Link>.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {statCards.map((stat, i) => {
          const diff = getDiff(stat.value, stat.prevValue);
          return (
            <Card key={stat.label} className="animate-fade-in-up" style={{ animationDelay: `${i * 100}ms`, animationFillMode: 'backwards' }}>
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent">
                  <stat.icon className="h-5 w-5 text-accent-foreground" />
                </div>
                <div className="flex-1">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{stat.label}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-2xl font-display font-extrabold">
                      {stat.value != null ? stat.value : "—"}
                    </span>
                    {stat.value != null && <span className="text-sm text-muted-foreground">{stat.unit}</span>}
                    <TrendIcon trend={stat.trend} />
                  </div>
                  {diff != null && (
                    <p className={`text-xs mt-1 font-medium ${diff < 0 ? "text-primary" : diff > 0 ? "text-destructive" : "text-muted-foreground"}`}>
                      {diff > 0 ? "+" : ""}{diff} {stat.unit} {t.dashboard.vsPrevious}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent entries */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t.dashboard.recentEntries}</CardTitle>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">
              <p>{t.dashboard.noEntries}</p>
              <Link to="/add-entry">
                <Button className="mt-5" variant="outline">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  {t.dashboard.addFirstEntry}
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {entries.slice(0, 5).map((entry, i) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between rounded-xl border border-border/50 p-4 transition-all duration-200 hover:bg-accent/30 animate-fade-in"
                  style={{ animationDelay: `${i * 80}ms`, animationFillMode: 'backwards' }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-semibold">{format(new Date(entry.entry_date), "MMM d, yyyy")}</p>
                    <p className="text-sm text-muted-foreground truncate mt-0.5">
                      {[
                        entry.weight && `${entry.weight}${t.common.kg}`,
                        entry.waist && `${t.dashboard.waist}: ${entry.waist}${t.common.cm}`,
                        entry.body_fat && `BF: ${entry.body_fat}%`,
                      ].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-3">
                    {entry.photo_urls && entry.photo_urls.length > 0 && (
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-xs text-accent-foreground font-semibold">
                        📷{entry.photo_urls.length}
                      </div>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-lg"
                      onClick={() => navigate("/add-entry", { state: { editEntry: entry } })}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-lg text-destructive hover:text-destructive"
                      onClick={() => setDeleteId(entry.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="glass-strong rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t.dashboard.deleteEntry}</AlertDialogTitle>
            <AlertDialogDescription>{t.dashboard.deleteConfirm}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">{t.dashboard.cancelDelete}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl">
              {t.dashboard.confirmDelete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Dashboard;
