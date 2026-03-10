import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, TrendingDown, TrendingUp, Minus, Scale, Ruler, Activity, Clock } from "lucide-react";
import { format, differenceInDays, addDays } from "date-fns";
import type { Tables } from "@/integrations/supabase/types";

type ProgressEntry = Tables<"progress_entries">;

const CHECKIN_INTERVAL = 14;

const Dashboard = () => {
  const { user, profile } = useAuth();
  const [entries, setEntries] = useState<ProgressEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchEntries = async () => {
      const { data } = await supabase
        .from("progress_entries")
        .select("*")
        .eq("user_id", user.id)
        .order("entry_date", { ascending: false })
        .limit(10);
      setEntries(data ?? []);
      setLoading(false);
    };
    fetchEntries();
  }, [user]);

  const latest = entries[0];
  const previous = entries[1];

  // Calculate next check-in
  const nextCheckinDate = latest
    ? addDays(new Date(latest.entry_date), CHECKIN_INTERVAL)
    : null;
  const daysUntilCheckin = nextCheckinDate
    ? differenceInDays(nextCheckinDate, new Date())
    : 0;
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
    { label: "Weight", value: latest?.weight, prevValue: previous?.weight, unit: "kg", icon: Scale, trend: getTrend(latest?.weight, previous?.weight) },
    { label: "Waist", value: latest?.waist, prevValue: previous?.waist, unit: "cm", icon: Ruler, trend: getTrend(latest?.waist, previous?.waist) },
    { label: "Body Fat", value: latest?.body_fat, prevValue: previous?.body_fat, unit: "%", icon: Activity, trend: getTrend(latest?.body_fat, previous?.body_fat) },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">
            Hey, {profile?.full_name || "there"} 💪
          </h1>
          <p className="text-muted-foreground">Track your transformation</p>
        </div>
        {canLogEntry ? (
          <Link to="/add-entry">
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              New Entry
            </Button>
          </Link>
        ) : (
          <Button variant="outline" disabled>
            <Clock className="mr-2 h-4 w-4" />
            {daysUntilCheckin}d left
          </Button>
        )}
      </div>

      {/* Next check-in banner */}
      {!canLogEntry && nextCheckinDate && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex items-center gap-3 p-4">
            <Clock className="h-5 w-5 text-primary shrink-0" />
            <p className="text-sm">
              Your next progress check-in is available in{" "}
              <span className="font-semibold text-primary">{daysUntilCheckin} day{daysUntilCheckin !== 1 ? "s" : ""}</span>
              {" "}({format(nextCheckinDate, "MMM d, yyyy")}).
            </p>
          </CardContent>
        </Card>
      )}

      {canLogEntry && entries.length > 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex items-center gap-3 p-4">
            <PlusCircle className="h-5 w-5 text-primary shrink-0" />
            <p className="text-sm">
              Your bi-weekly check-in is ready!{" "}
              <Link to="/add-entry" className="font-semibold text-primary underline underline-offset-2">
                Log your progress now
              </Link>.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Stat cards with comparison */}
      <div className="grid gap-4 sm:grid-cols-3">
        {statCards.map((stat) => {
          const diff = getDiff(stat.value, stat.prevValue);
          return (
            <Card key={stat.label}>
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-accent">
                  <stat.icon className="h-5 w-5 text-accent-foreground" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-display font-semibold">
                      {stat.value != null ? stat.value : "—"}
                    </span>
                    {stat.value != null && (
                      <span className="text-sm text-muted-foreground">{stat.unit}</span>
                    )}
                    <TrendIcon trend={stat.trend} />
                  </div>
                  {diff != null && (
                    <p className={`text-xs mt-0.5 ${diff < 0 ? "text-primary" : diff > 0 ? "text-destructive" : "text-muted-foreground"}`}>
                      {diff > 0 ? "+" : ""}{diff} {stat.unit} vs previous
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
          <CardTitle className="font-display text-lg">Recent Entries</CardTitle>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <p>No entries yet. Start tracking your progress!</p>
              <Link to="/add-entry">
                <Button className="mt-4" variant="outline">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add First Entry
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {entries.slice(0, 5).map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="font-medium font-display">
                      {format(new Date(entry.entry_date), "MMM d, yyyy")}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {[
                        entry.weight && `${entry.weight}kg`,
                        entry.waist && `Waist: ${entry.waist}cm`,
                        entry.body_fat && `BF: ${entry.body_fat}%`,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  {entry.photo_urls && entry.photo_urls.length > 0 && (
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-accent text-xs text-accent-foreground">
                      📷 {entry.photo_urls.length}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
