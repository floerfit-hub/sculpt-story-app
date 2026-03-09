import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import type { Tables } from "@/integrations/supabase/types";
import { Users, ChevronDown, ChevronUp } from "lucide-react";

type Profile = Tables<"profiles">;
type ProgressEntry = Tables<"progress_entries">;

const CoachView = () => {
  const { isCoach } = useAuth();
  const [clients, setClients] = useState<(Profile & { entries: ProgressEntry[] })[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!isCoach) return;
    const fetch = async () => {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .order("full_name");

      if (profiles) {
        const withEntries = await Promise.all(
          profiles.map(async (p) => {
            const { data: entries } = await supabase
              .from("progress_entries")
              .select("*")
              .eq("user_id", p.user_id)
              .order("entry_date", { ascending: false })
              .limit(5);
            return { ...p, entries: entries ?? [] };
          })
        );
        setClients(withEntries);
      }
      setLoading(false);
    };
    fetch();
  }, [isCoach]);

  if (!isCoach) {
    return (
      <div className="lg:ml-56 py-20 text-center text-muted-foreground">
        <p>Coach access only.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 lg:ml-56">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="lg:ml-56 space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Users className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-display font-bold">All Clients</h1>
        <span className="rounded-full bg-accent px-3 py-0.5 text-sm text-accent-foreground">
          {clients.length}
        </span>
      </div>

      {clients.map((client) => {
        const isExpanded = expanded === client.id;
        const latest = client.entries[0];
        return (
          <Card key={client.id}>
            <CardHeader
              className="cursor-pointer"
              onClick={() => setExpanded(isExpanded ? null : client.id)}
            >
              <CardTitle className="flex items-center justify-between font-display text-base">
                <span>{client.full_name || "Unnamed Client"}</span>
                <div className="flex items-center gap-3">
                  {latest && (
                    <span className="text-sm font-normal text-muted-foreground">
                      Last: {format(new Date(latest.entry_date), "MMM d, yyyy")}
                    </span>
                  )}
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            {isExpanded && (
              <CardContent>
                {client.entries.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No entries yet.</p>
                ) : (
                  <div className="space-y-2">
                    {client.entries.map((entry) => (
                      <div key={entry.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                        <span className="font-medium">
                          {format(new Date(entry.entry_date), "MMM d, yyyy")}
                        </span>
                        <span className="text-muted-foreground">
                          {[
                            entry.weight && `${entry.weight}kg`,
                            entry.waist && `W: ${entry.waist}cm`,
                            entry.body_fat && `BF: ${entry.body_fat}%`,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
};

export default CoachView;
