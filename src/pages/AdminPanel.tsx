import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/i18n";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import type { Tables } from "@/integrations/supabase/types";
import {
  Shield, Users, ChevronDown, ChevronUp, Trash2, UserCog,
  Weight, Ruler, Camera, Dumbbell, TrendingUp, TrendingDown, Download,
} from "lucide-react";
import { toCsv, downloadCsv, buildFilename } from "@/lib/csvExport";

type Profile = Tables<"profiles">;
type ProgressEntry = Tables<"progress_entries">;
type Workout = Tables<"workouts"> & { workout_exercises: Tables<"workout_exercises">[] };
type UserRole = Tables<"user_roles">;

interface ClientData {
  profile: Profile;
  entries: ProgressEntry[];
  workouts: Workout[];
  roles: UserRole[];
}

const AdminPanel = () => {
  const { isAdmin } = useAuth();
  const { t } = useTranslation();
  const { toast } = useToast();
  const [clients, setClients] = useState<ClientData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [tab, setTab] = useState<"progress" | "photos" | "workouts">("progress");
  const [roleDialog, setRoleDialog] = useState<{ userId: string; currentRoles: string[] } | null>(null);
  const [newRole, setNewRole] = useState<string>("");
  const [lightbox, setLightbox] = useState<{ urls: string[]; index: number } | null>(null);

  const fetchClients = async () => {
    setLoading(true);
    const { data: profiles } = await supabase.from("profiles").select("*").order("full_name");
    if (!profiles) { setLoading(false); return; }

    const clientData = await Promise.all(
      profiles.map(async (p) => {
        const [{ data: entries }, { data: workouts }, { data: roles }] = await Promise.all([
          supabase.from("progress_entries").select("*").eq("user_id", p.user_id).order("entry_date", { ascending: false }),
          supabase.from("workouts").select("*, workout_exercises(*)").eq("user_id", p.user_id).order("started_at", { ascending: false }).limit(10),
          supabase.from("user_roles").select("*").eq("user_id", p.user_id),
        ]);
        return { profile: p, entries: entries ?? [], workouts: (workouts ?? []) as Workout[], roles: roles ?? [] };
      })
    );
    setClients(clientData);
    setLoading(false);
  };

  useEffect(() => { if (isAdmin) fetchClients(); }, [isAdmin]);

  const handleDeleteEntry = async (entryId: string) => {
    await supabase.from("progress_entries").delete().eq("id", entryId);
    toast({ title: t.admin.entryDeleted });
    fetchClients();
  };

  const handleDeleteWorkout = async (workoutId: string) => {
    await supabase.from("workout_exercises").delete().eq("workout_id", workoutId);
    await supabase.from("workouts").delete().eq("id", workoutId);
    toast({ title: t.admin.workoutDeleted });
    fetchClients();
  };

  const handleAddRole = async () => {
    if (!roleDialog || !newRole) return;
    await supabase.from("user_roles").insert({ user_id: roleDialog.userId, role: newRole as any });
    toast({ title: t.admin.roleUpdated });
    setRoleDialog(null);
    setNewRole("");
    fetchClients();
  };

  const handleRemoveRole = async (roleId: string) => {
    await supabase.from("user_roles").delete().eq("id", roleId);
    toast({ title: t.admin.roleUpdated });
    fetchClients();
  };

  const handleExportUsers = () => {
    const headers = ["Name", "Registration Date", "Latest Weight (kg)", "Weight Trend", "Roles"];
    const keys = ["name", "regDate", "weight", "trend", "roles"];
    const rows = clients.map((c) => {
      const latest = c.entries[0];
      const prev = c.entries[1];
      const diff = latest?.weight && prev?.weight ? latest.weight - prev.weight : null;
      return {
        name: c.profile.full_name || "—",
        regDate: format(new Date(c.profile.created_at), "yyyy-MM-dd"),
        weight: latest?.weight ?? "",
        trend: diff !== null ? `${diff > 0 ? "+" : ""}${diff.toFixed(1)}` : "",
        roles: c.roles.map((r) => r.role).join(", "),
      };
    });
    const csv = toCsv(headers, rows, keys);
    downloadCsv(csv, buildFilename("floerfit_users"));
    toast({ title: "CSV exported" });
  };

  const handleExportProgress = (client: ClientData) => {
    const name = (client.profile.full_name || "user").replace(/\s+/g, "_").toLowerCase();
    const progressHeaders = ["Date", "Weight (kg)", "Body Fat (%)", "Waist (cm)", "Chest (cm)", "Hips (cm)", "Arm (cm)", "Glute (cm)", "Thigh (cm)", "Notes"];
    const progressKeys = ["date", "weight", "bodyFat", "waist", "chest", "hips", "arm", "glute", "thigh", "notes"];
    const progressRows = client.entries.map((e) => ({
      date: format(new Date(e.entry_date), "yyyy-MM-dd"),
      weight: e.weight ?? "", bodyFat: e.body_fat ?? "", waist: e.waist ?? "",
      chest: e.chest ?? "", hips: e.hips ?? "", arm: e.arm_circumference ?? "",
      glute: e.glute_circumference ?? "", thigh: e.thigh_circumference ?? "", notes: e.notes ?? "",
    }));
    const workoutHeaders = ["Date", "Exercise", "Muscle Group", "Sets (JSON)"];
    const workoutKeys = ["date", "exercise", "muscle", "sets"];
    const workoutRows = client.workouts.flatMap((w) =>
      w.workout_exercises.map((ex) => ({
        date: format(new Date(w.started_at), "yyyy-MM-dd HH:mm"),
        exercise: ex.exercise_name, muscle: ex.muscle_group, sets: JSON.stringify(ex.sets),
      }))
    );
    const combined = "=== PROGRESS ===\n" + toCsv(progressHeaders, progressRows, progressKeys) +
      "\n\n=== WORKOUTS ===\n" + toCsv(workoutHeaders, workoutRows, workoutKeys);
    downloadCsv(combined, buildFilename(`floerfit_${name}_progress`));
    toast({ title: "CSV exported" });
  };

  if (!isAdmin) {
    return (
      <div className="py-20 text-center text-muted-foreground">
        <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p className="text-lg font-medium">{t.admin.accessDenied}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary">
          <Shield className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-display font-bold">{t.admin.title}</h1>
          <p className="text-sm text-muted-foreground">{t.admin.subtitle}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportUsers}>
            <Download className="h-3.5 w-3.5 mr-1" />
            Export CSV
          </Button>
          <Badge variant="secondary" className="text-sm">
            <Users className="h-3.5 w-3.5 mr-1" />
            {clients.length}
          </Badge>
        </div>
      </div>

      {clients.map((client) => {
        const isExpanded = expanded === client.profile.id;
        const latestEntry = client.entries[0];
        const roleNames = client.roles.map((r) => r.role);

        return (
          <Card key={client.profile.id} className="overflow-hidden">
            <CardHeader
              className="cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => { setExpanded(isExpanded ? null : client.profile.id); setTab("progress"); }}
            >
              <CardTitle className="flex items-center justify-between text-base">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-accent flex items-center justify-center text-sm font-bold">
                    {(client.profile.full_name || "?")[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="font-display">{client.profile.full_name || t.admin.unnamed}</div>
                    <div className="flex gap-1 mt-0.5">
                      {roleNames.map((r) => (
                        <Badge key={r} variant="outline" className="text-[10px] px-1.5 py-0">
                          {r}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {latestEntry && (
                    <span className="text-xs text-muted-foreground hidden sm:inline">
                      {format(new Date(latestEntry.entry_date), "dd.MM.yyyy")}
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => { e.stopPropagation(); handleExportProgress(client); }}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => { e.stopPropagation(); setRoleDialog({ userId: client.profile.user_id, currentRoles: roleNames }); }}
                  >
                    <UserCog className="h-4 w-4" />
                  </Button>
                  {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </div>
              </CardTitle>
            </CardHeader>

            {isExpanded && (
              <CardContent className="pt-0">
                {/* Stats Summary */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="rounded-lg bg-accent/50 p-3 text-center">
                    <Weight className="h-4 w-4 mx-auto mb-1 text-primary" />
                    <div className="text-lg font-bold">{latestEntry?.weight ?? "—"}</div>
                    <div className="text-[10px] text-muted-foreground">{t.common.kg}</div>
                  </div>
                  <div className="rounded-lg bg-accent/50 p-3 text-center">
                    <Ruler className="h-4 w-4 mx-auto mb-1 text-primary" />
                    <div className="text-lg font-bold">{latestEntry?.waist ?? "—"}</div>
                    <div className="text-[10px] text-muted-foreground">{t.common.cm}</div>
                  </div>
                  <div className="rounded-lg bg-accent/50 p-3 text-center">
                    <Dumbbell className="h-4 w-4 mx-auto mb-1 text-primary" />
                    <div className="text-lg font-bold">{client.workouts.length}</div>
                    <div className="text-[10px] text-muted-foreground">{t.admin.workoutsCount}</div>
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 mb-4 bg-accent/30 rounded-lg p-1">
                  {(["progress", "photos", "workouts"] as const).map((t2) => (
                    <button
                      key={t2}
                      onClick={() => setTab(t2)}
                      className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                        tab === t2 ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {t.admin.tabs[t2]}
                    </button>
                  ))}
                </div>

                {/* Progress Tab */}
                {tab === "progress" && (
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {client.entries.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">{t.admin.noEntries}</p>
                    ) : (
                      client.entries.map((entry, idx) => {
                        const prev = client.entries[idx + 1];
                        const weightDiff = prev && entry.weight && prev.weight ? entry.weight - prev.weight : null;
                        return (
                          <div key={entry.id} className="rounded-lg border p-3 text-sm">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium">{format(new Date(entry.entry_date), "dd.MM.yyyy")}</span>
                              <div className="flex items-center gap-2">
                                {weightDiff !== null && (
                                  <span className={`flex items-center text-xs ${weightDiff < 0 ? "text-green-500" : weightDiff > 0 ? "text-red-500" : "text-muted-foreground"}`}>
                                    {weightDiff < 0 ? <TrendingDown className="h-3 w-3 mr-0.5" /> : <TrendingUp className="h-3 w-3 mr-0.5" />}
                                    {weightDiff > 0 ? "+" : ""}{weightDiff.toFixed(1)}
                                  </span>
                                )}
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7">
                                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>{t.admin.confirmDeleteTitle}</AlertDialogTitle>
                                      <AlertDialogDescription>{t.admin.confirmDeleteDesc}</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>{t.dashboard.cancelDelete}</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleDeleteEntry(entry.id)}>
                                        {t.dashboard.confirmDelete}
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                              {entry.weight && <span>{t.dashboard.weight}: {entry.weight}{t.common.kg}</span>}
                              {entry.waist && <span>· {t.dashboard.waist}: {entry.waist}{t.common.cm}</span>}
                              {entry.body_fat && <span>· {t.dashboard.bodyFat}: {entry.body_fat}%</span>}
                              {entry.chest && <span>· {t.addEntry.chest}: {entry.chest}{t.common.cm}</span>}
                              {entry.hips && <span>· {t.addEntry.hips}: {entry.hips}{t.common.cm}</span>}
                              {entry.arm_circumference && <span>· {t.addEntry.arm}: {entry.arm_circumference}{t.common.cm}</span>}
                              {entry.glute_circumference && <span>· {t.addEntry.glute}: {entry.glute_circumference}{t.common.cm}</span>}
                              {entry.thigh_circumference && <span>· {t.addEntry.thigh}: {entry.thigh_circumference}{t.common.cm}</span>}
                            </div>
                            {entry.notes && <p className="text-xs mt-1 text-muted-foreground italic">"{entry.notes}"</p>}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {/* Photos Tab */}
                {tab === "photos" && (
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {client.entries.filter((e) => e.photo_urls && e.photo_urls.length > 0).length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        <Camera className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        {t.admin.noPhotos}
                      </p>
                    ) : (
                      client.entries
                        .filter((e) => e.photo_urls && e.photo_urls.length > 0)
                        .map((entry) => (
                          <div key={entry.id}>
                            <p className="text-xs font-medium mb-2">{format(new Date(entry.entry_date), "dd.MM.yyyy")}</p>
                            <div className="grid grid-cols-3 gap-2">
                              {entry.photo_urls!.map((url, i) => (
                                <img
                                  key={i}
                                  src={url}
                                  alt={`Progress photo ${i + 1}`}
                                  className="rounded-lg aspect-square object-cover w-full cursor-pointer hover:opacity-80 transition-opacity"
                                  loading="lazy"
                                  onClick={() => setLightbox({ urls: entry.photo_urls!, index: i })}
                                />
                              ))}
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                )}

                {/* Workouts Tab */}
                {tab === "workouts" && (
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {client.workouts.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">{t.admin.noWorkouts}</p>
                    ) : (
                      client.workouts.map((w) => (
                        <div key={w.id} className="rounded-lg border p-3 text-sm">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium">{format(new Date(w.started_at), "dd.MM.yyyy HH:mm")}</span>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-[10px]">
                                {w.workout_exercises.length} {t.workouts.exercises}
                              </Badge>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-7 w-7">
                                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>{t.admin.confirmDeleteTitle}</AlertDialogTitle>
                                    <AlertDialogDescription>{t.workouts.deleteWorkoutConfirm}</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>{t.dashboard.cancelDelete}</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteWorkout(w.id)}>
                                      {t.dashboard.confirmDelete}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {w.workout_exercises.map((ex) => (
                              <Badge key={ex.id} variant="secondary" className="text-[10px]">
                                {ex.exercise_name}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        );
      })}

      {/* Role Management Dialog */}
      <Dialog open={!!roleDialog} onOpenChange={() => { setRoleDialog(null); setNewRole(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.admin.manageRoles}</DialogTitle>
            <DialogDescription>{t.admin.manageRolesDesc}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {roleDialog && clients
              .find((c) => c.profile.user_id === roleDialog.userId)
              ?.roles.map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-lg border p-3">
                  <Badge>{r.role}</Badge>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t.admin.removeRoleTitle}</AlertDialogTitle>
                        <AlertDialogDescription>{t.admin.removeRoleDesc}</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t.dashboard.cancelDelete}</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleRemoveRole(r.id)}>
                          {t.dashboard.confirmDelete}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
            <div className="flex gap-2">
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder={t.admin.selectRole} />
                </SelectTrigger>
                <SelectContent>
                  {["admin", "coach", "client"]
                    .filter((r) => !roleDialog?.currentRoles.includes(r))
                    .map((r) => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Button onClick={handleAddRole} disabled={!newRole}>{t.admin.addRole}</Button>
            </div>
          </div>
          <DialogFooter />
        </DialogContent>
      </Dialog>

      {/* Lightbox */}
      <Dialog open={!!lightbox} onOpenChange={() => setLightbox(null)}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-2 sm:p-4 bg-black/95 border-none">
          <DialogHeader className="sr-only">
            <DialogTitle>Photo</DialogTitle>
            <DialogDescription>Full screen photo view</DialogDescription>
          </DialogHeader>
          {lightbox && (
            <div className="relative flex items-center justify-center min-h-[60vh]">
              <img
                src={lightbox.urls[lightbox.index]}
                alt="Full size"
                className="max-w-full max-h-[85vh] object-contain rounded-lg"
              />
              {lightbox.urls.length > 1 && (
                <>
                  <button
                    onClick={() => setLightbox({ ...lightbox, index: (lightbox.index - 1 + lightbox.urls.length) % lightbox.urls.length })}
                    className="absolute left-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-background/20 hover:bg-background/40 flex items-center justify-center text-white transition-colors"
                  >
                    <ChevronUp className="h-5 w-5 -rotate-90" />
                  </button>
                  <button
                    onClick={() => setLightbox({ ...lightbox, index: (lightbox.index + 1) % lightbox.urls.length })}
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-background/20 hover:bg-background/40 flex items-center justify-center text-white transition-colors"
                  >
                    <ChevronDown className="h-5 w-5 -rotate-90" />
                  </button>
                </>
              )}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-white/70">
                {lightbox.index + 1} / {lightbox.urls.length}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPanel;
