import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ArrowLeft, Plus, Trash2, Pencil, Play, Copy, FileText, Send, CalendarDays, Globe, RefreshCw, UserPlus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import ExerciseLibrary from "./ExerciseLibrary";
import { useToast } from "@/hooks/use-toast";

interface DayMeta { id: string; name: string; sort_order: number }

interface TemplateExercise {
  id?: string;
  exercise_name: string;
  muscle_group: string;
  sort_order: number;
  default_sets: number;
  default_reps: number;
  default_weight: number;
  day_id?: string | null;
}

interface Template {
  id: string;
  name: string;
  exercises: TemplateExercise[];
  created_at: string;
  days: DayMeta[];
  is_global: boolean;
  user_id: string;
}

interface Props {
  onStartFromTemplate: (exercises: { name: string; muscleGroup: string; sets: { weight: number | ""; reps: number | ""; rest_time: null }[] }[], templateName: string) => void;
}

const newDay = (sortOrder: number, name: string): DayMeta => ({
  id: `d_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
  name,
  sort_order: sortOrder,
});

const WorkoutTemplates = ({ onStartFromTemplate }: Props) => {
  const { user, isAdmin } = useAuth();
  const { t, lang } = useTranslation();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [view, setView] = useState<"list" | "create" | "edit">("list");
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [templateExercises, setTemplateExercises] = useState<TemplateExercise[]>([]);
  const [days, setDays] = useState<DayMeta[]>([]);
  const [isMultiDay, setIsMultiDay] = useState(false);
  const [activeDayId, setActiveDayId] = useState<string | null>(null);
  const [showLibrary, setShowLibrary] = useState(false);
  const [loading, setLoading] = useState(true);
  const [replaceTarget, setReplaceTarget] = useState<number | null>(null);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assignTemplate, setAssignTemplate] = useState<Template | null>(null);
  const [assignNickname, setAssignNickname] = useState("");
  const [assignBusy, setAssignBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadTemplates();
  }, [user]);

  const loadTemplates = async () => {
    if (!user) return;
    setLoading(true);
    const { data: tmpl } = await (supabase as any)
      .from("workout_templates")
      .select("id, name, created_at, days, is_global, user_id")
      .or(`user_id.eq.${user.id},is_global.eq.true`)
      .order("created_at", { ascending: false });

    if (!tmpl) { setLoading(false); return; }

    const templateIds = tmpl.map((t: any) => t.id);
    const { data: exercises } = templateIds.length > 0
      ? await (supabase as any)
          .from("workout_template_exercises")
          .select("id, template_id, exercise_name, muscle_group, sort_order, default_sets, default_reps, default_weight, day_id")
          .in("template_id", templateIds)
          .order("sort_order", { ascending: true })
      : { data: [] };

    const result: Template[] = tmpl.map((t: any) => ({
      ...t,
      days: Array.isArray(t.days) ? t.days : [],
      exercises: (exercises || []).filter((e: any) => e.template_id === t.id),
    }));
    setTemplates(result);
    setLoading(false);
  };

  const resetForm = () => {
    setTemplateName("");
    setTemplateExercises([]);
    setDays([]);
    setIsMultiDay(false);
    setActiveDayId(null);
    setEditingTemplate(null);
  };

  const startCreate = () => {
    resetForm();
    setView("create");
  };

  const startEdit = (tmpl: Template) => {
    setEditingTemplate(tmpl);
    setTemplateName(tmpl.name);
    setTemplateExercises(tmpl.exercises);
    const hasDays = tmpl.days && tmpl.days.length > 0;
    setIsMultiDay(hasDays);
    setDays(hasDays ? tmpl.days : []);
    setActiveDayId(hasDays ? tmpl.days[0].id : null);
    setView("edit");
  };

  const switchToMultiDay = () => {
    setIsMultiDay(true);
    if (days.length === 0) {
      const first = newDay(0, lang === "uk" ? "День 1" : "Day 1");
      setDays([first]);
      setActiveDayId(first.id);
      // assign existing exercises to first day
      setTemplateExercises((prev) => prev.map((ex) => ({ ...ex, day_id: ex.day_id || first.id })));
    } else {
      setActiveDayId(days[0].id);
    }
  };

  const switchToSingleDay = () => {
    setIsMultiDay(false);
    setTemplateExercises((prev) => prev.map((ex) => ({ ...ex, day_id: null })));
  };

  const addDay = () => {
    const d = newDay(days.length, `${lang === "uk" ? "День" : "Day"} ${days.length + 1}`);
    setDays((prev) => [...prev, d]);
    setActiveDayId(d.id);
  };

  const renameDay = (id: string, name: string) => {
    setDays((prev) => prev.map((d) => (d.id === id ? { ...d, name } : d)));
  };

  const deleteDay = (id: string) => {
    if (days.length <= 1) return;
    setTemplateExercises((prev) => prev.filter((ex) => ex.day_id !== id));
    const remaining = days.filter((d) => d.id !== id);
    setDays(remaining);
    if (activeDayId === id) setActiveDayId(remaining[0].id);
  };

  const saveTemplate = async (sendToAll = false): Promise<string | null> => {
    if (!user || !templateName.trim() || templateExercises.length === 0) return null;
    const daysJson = isMultiDay ? days.map((d, i) => ({ ...d, sort_order: i })) : [];
    const payload: any = {
      name: templateName.trim(),
      days: daysJson,
    };
    if (sendToAll && isAdmin) {
      payload.is_global = true;
      payload.created_by = user.id;
    }

    let tmplId: string | null = null;
    if (editingTemplate) {
      await (supabase as any).from("workout_templates").update(payload).eq("id", editingTemplate.id);
      await (supabase as any).from("workout_template_exercises").delete().eq("template_id", editingTemplate.id);
      tmplId = editingTemplate.id;
    } else {
      const { data: tmpl, error } = await (supabase as any)
        .from("workout_templates")
        .insert({ user_id: user.id, ...payload })
        .select("id")
        .single();
      if (error || !tmpl) {
        toast({ title: t.common.error, description: error?.message, variant: "destructive" });
        return null;
      }
      tmplId = tmpl.id;
    }

    const rows = templateExercises.map((ex, i) => ({
      template_id: tmplId,
      exercise_name: ex.exercise_name,
      muscle_group: ex.muscle_group,
      sort_order: i,
      default_sets: ex.default_sets,
      default_reps: ex.default_reps,
      default_weight: ex.default_weight,
      day_id: isMultiDay ? (ex.day_id || days[0]?.id || null) : null,
    }));
    await (supabase as any).from("workout_template_exercises").insert(rows);

    toast({ title: editingTemplate ? t.templates.templateUpdated : t.templates.templateSaved });
    resetForm();
    setView("list");
    await loadTemplates();
    return tmplId;
  };

  const sendToAllClients = async () => {
    if (!isAdmin || !editingTemplate) return;
    await (supabase as any)
      .from("workout_templates")
      .update({ is_global: true, created_by: user!.id })
      .eq("id", editingTemplate.id);
    toast({ title: t.templates.sentToAll });
    await loadTemplates();
    resetForm();
    setView("list");
  };

  const sendExistingToAll = async (tmpl: Template) => {
    if (!isAdmin) return;
    await (supabase as any)
      .from("workout_templates")
      .update({ is_global: true, created_by: user!.id })
      .eq("id", tmpl.id);
    toast({ title: t.templates.sentToAll });
    await loadTemplates();
  };

  const deleteTemplate = async (id: string) => {
    await (supabase as any).from("workout_templates").delete().eq("id", id);
    setTemplates((prev) => prev.filter((t) => t.id !== id));
    toast({ title: t.templates.templateDeleted });
  };

  const duplicateTemplate = async (template: Template) => {
    if (!user) return;
    const { data: tmpl } = await (supabase as any)
      .from("workout_templates")
      .insert({ user_id: user.id, name: `${template.name} (${t.templates.copy})`, days: template.days, is_global: false })
      .select("id")
      .single();
    if (!tmpl) return;

    const rows = template.exercises.map((ex, i) => ({
      template_id: tmpl.id,
      exercise_name: ex.exercise_name,
      muscle_group: ex.muscle_group,
      sort_order: i,
      default_sets: ex.default_sets,
      default_reps: ex.default_reps,
      default_weight: ex.default_weight,
      day_id: ex.day_id || null,
    }));
    await (supabase as any).from("workout_template_exercises").insert(rows);
    toast({ title: t.templates.templateDuplicated });
    await loadTemplates();
  };

  const startFromTemplate = (template: Template, dayId?: string) => {
    let list = template.exercises;
    let suffix = "";
    if (dayId) {
      list = list.filter((e) => e.day_id === dayId);
      const day = template.days.find((d) => d.id === dayId);
      suffix = day ? ` — ${day.name}` : "";
    }
    const exercises = list.map((ex) => ({
      name: ex.exercise_name,
      muscleGroup: ex.muscle_group,
      sets: Array.from({ length: Math.max(1, ex.default_sets) }, () => ({
        weight: ex.default_weight > 0 ? ex.default_weight : ("" as number | ""),
        reps: ex.default_reps > 0 ? ex.default_reps : ("" as number | ""),
        rest_time: null,
      })),
    }));
    onStartFromTemplate(exercises, `${template.name}${suffix}`);
  };

  const addExerciseToTemplate = (name: string, group: string) => {
    if (replaceTarget !== null) {
      const idx = replaceTarget;
      setTemplateExercises((prev) => prev.map((ex, i) => (i === idx ? { ...ex, exercise_name: name, muscle_group: group } : ex)));
      setReplaceTarget(null);
      setShowLibrary(false);
      return;
    }
    setTemplateExercises((prev) => [
      ...prev,
      {
        exercise_name: name,
        muscle_group: group,
        sort_order: prev.length,
        default_sets: 1,
        default_reps: 0,
        default_weight: 0,
        day_id: isMultiDay ? activeDayId : null,
      },
    ]);
    setShowLibrary(false);
  };

  const assignToUser = async () => {
    if (!isAdmin || !assignTemplate || !assignNickname.trim()) return;
    setAssignBusy(true);
    try {
      const nick = assignNickname.trim();
      const { data: matches } = await (supabase as any)
        .from("profiles")
        .select("user_id, full_name")
        .ilike("full_name", nick)
        .limit(2);
      if (!matches || matches.length === 0) {
        toast({ title: lang === "uk" ? "Користувача не знайдено" : "User not found", variant: "destructive" });
        return;
      }
      if (matches.length > 1) {
        toast({ title: lang === "uk" ? "Знайдено кілька користувачів — уточніть нік" : "Multiple users found — refine nickname", variant: "destructive" });
        return;
      }
      const target = matches[0];
      const { error } = await (supabase as any)
        .from("user_assigned_programs")
        .insert({ user_id: target.user_id, template_id: assignTemplate.id, dismissed: false });
      if (error) {
        toast({ title: t.common.error, description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: lang === "uk" ? `Шаблон надіслано користувачу ${target.full_name} 📤` : `Template sent to ${target.full_name} 📤` });
      setAssignDialogOpen(false);
      setAssignNickname("");
      setAssignTemplate(null);
    } finally {
      setAssignBusy(false);
    }
  };

  const MUSCLE_GROUP_KEYS: Record<string, string> = {
    "Legs & Glutes": "legsGlutes", "Back": "back", "Chest": "chest",
    "Shoulders": "shoulders", "Arms": "arms", "Core": "core",
  };

  if (showLibrary) {
    return <ExerciseLibrary onBack={() => { setShowLibrary(false); setReplaceTarget(null); }} onSelect={addExerciseToTemplate} selectable />;
  }

  if (view === "create" || view === "edit") {
    const visibleExercises = isMultiDay
      ? templateExercises
          .map((ex, originalIdx) => ({ ex, originalIdx }))
          .filter(({ ex }) => ex.day_id === activeDayId)
      : templateExercises.map((ex, originalIdx) => ({ ex, originalIdx }));

    const updateExerciseAt = (originalIdx: number, patch: Partial<TemplateExercise>) => {
      setTemplateExercises((prev) => prev.map((x, j) => (j === originalIdx ? { ...x, ...patch } : x)));
    };
    const removeExerciseAt = (originalIdx: number) => {
      setTemplateExercises((prev) => prev.filter((_, j) => j !== originalIdx));
    };

    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => { setView("list"); resetForm(); }}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h2 className="text-xl font-display font-bold">
            {view === "edit" ? t.templates.editTemplate : t.templates.createTemplate}
          </h2>
        </div>

        <Input
          placeholder={t.templates.templateNamePlaceholder}
          value={templateName}
          onChange={(e) => setTemplateName(e.target.value)}
        />

        {/* Mode toggle */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant={!isMultiDay ? "default" : "outline"}
            size="sm"
            onClick={switchToSingleDay}
          >
            {t.templates.singleDay}
          </Button>
          <Button
            variant={isMultiDay ? "default" : "outline"}
            size="sm"
            onClick={switchToMultiDay}
          >
            <CalendarDays className="h-4 w-4 mr-1" /> {t.templates.multiDay}
          </Button>
        </div>

        {/* Day tabs (multi-day mode) */}
        {isMultiDay && days.length > 0 && (
          <div className="space-y-2">
            <Tabs value={activeDayId ?? undefined} onValueChange={setActiveDayId}>
              <TabsList className="w-full justify-start overflow-x-auto h-auto flex-wrap">
                {days.map((d) => (
                  <TabsTrigger key={d.id} value={d.id} className="text-xs">
                    {d.name}
                  </TabsTrigger>
                ))}
              </TabsList>
              {days.map((d) => (
                <TabsContent key={d.id} value={d.id} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Input
                      value={d.name}
                      onChange={(e) => renameDay(d.id, e.target.value)}
                      placeholder={t.templates.dayNamePlaceholder}
                      className="h-9 text-sm"
                    />
                    {days.length > 1 && (
                      <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => deleteDay(d.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
            <Button variant="outline" size="sm" className="w-full" onClick={addDay}>
              <Plus className="h-4 w-4 mr-1" /> {t.templates.addDay}
            </Button>
          </div>
        )}

        {visibleExercises.map(({ ex, originalIdx }) => (
          <Card key={originalIdx}>
            <CardContent className="p-3 flex items-center justify-between">
              <div className="flex-1">
                <p className="font-medium text-sm">{t.exerciseNames[ex.exercise_name] || ex.exercise_name}</p>
                <p className="text-xs text-muted-foreground">
                  {(() => { const k = MUSCLE_GROUP_KEYS[ex.muscle_group] as keyof typeof t.muscleGroups; return k ? t.muscleGroups[k] : ex.muscle_group; })()}
                </p>
                <div className="flex items-center gap-3 mt-1.5">
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">{t.workouts.set}:</span>
                    <Input
                      type="number"
                      inputMode="numeric"
                      value={ex.default_sets === 0 ? "" : ex.default_sets}
                      onChange={(e) => {
                        const v = e.target.value;
                        updateExerciseAt(originalIdx, { default_sets: v === "" ? 0 : parseInt(v) || 0 });
                      }}
                      onBlur={(e) => {
                        if (e.target.value === "" || parseInt(e.target.value) < 1) {
                          updateExerciseAt(originalIdx, { default_sets: 1 });
                        }
                      }}
                      className="h-7 w-14 text-xs text-center"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">{t.workouts.reps}:</span>
                    <Input
                      type="number"
                      inputMode="numeric"
                      value={ex.default_reps === 0 ? "" : ex.default_reps}
                      onChange={(e) => {
                        const v = e.target.value;
                        updateExerciseAt(originalIdx, { default_reps: v === "" ? 0 : parseInt(v) || 0 });
                      }}
                      className="h-7 w-14 text-xs text-center"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">{t.common.kg}:</span>
                    <Input
                      type="number"
                      inputMode="decimal"
                      value={ex.default_weight || ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        updateExerciseAt(originalIdx, { default_weight: v === "" ? 0 : parseFloat(v) || 0 });
                      }}
                      className="h-7 w-14 text-xs text-center"
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  title={lang === "uk" ? "Замінити вправу" : "Replace exercise"}
                  onClick={() => { setReplaceTarget(originalIdx); setShowLibrary(true); }}
                >
                  <RefreshCw className="h-4 w-4 text-primary" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => removeExerciseAt(originalIdx)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        <Button variant="outline" className="w-full" onClick={() => setShowLibrary(true)}>
          <Plus className="h-4 w-4 mr-2" /> {t.workouts.addExercise}
        </Button>

        <Button className="w-full" onClick={() => saveTemplate(false)} disabled={!templateName.trim() || templateExercises.length === 0}>
          {view === "edit" ? t.templates.updateTemplate : t.templates.saveTemplate}
        </Button>

        {isAdmin && (
          <Button
            variant="outline"
            className="w-full border-primary/40 text-primary"
            onClick={async () => {
              if (editingTemplate) {
                await sendToAllClients();
              } else {
                await saveTemplate(true);
              }
            }}
            disabled={!templateName.trim() || templateExercises.length === 0}
          >
            <Send className="h-4 w-4 mr-2" /> {t.templates.sendToAll}
          </Button>
        )}
      </div>
    );
  }

  // Template list
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-display font-bold">{t.templates.title}</h3>
        <Button variant="outline" size="sm" onClick={startCreate}>
          <Plus className="h-4 w-4 mr-1" /> {t.templates.create}
        </Button>
      </div>

      {loading && <p className="text-sm text-muted-foreground text-center py-4">{t.workouts.savingDots}</p>}

      {!loading && templates.length === 0 && (
        <Card>
          <CardContent className="py-6 text-center">
            <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">{t.templates.noTemplates}</p>
          </CardContent>
        </Card>
      )}

      {templates.map((tmpl) => {
        const isOwner = tmpl.user_id === user?.id;
        const canEdit = isOwner || (tmpl.is_global && isAdmin);
        const canDelete = canEdit;
        const isMulti = tmpl.days && tmpl.days.length > 0;

        return (
          <Card key={tmpl.id} className="overflow-hidden">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="font-display font-semibold truncate">{tmpl.name}</p>
                    {tmpl.is_global && (
                      <span className="text-[10px] rounded-full bg-primary/15 text-primary px-2 py-0.5 flex items-center gap-1">
                        <Globe className="h-2.5 w-2.5" /> {t.templates.fromAdmin}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {isMulti
                      ? `${tmpl.days.length} ${t.templates.daysCount} · ${tmpl.exercises.length} ${t.workouts.exercises}`
                      : `${tmpl.exercises.length} ${t.workouts.exercises}`}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {canEdit && (
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(tmpl)}>
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  )}
                  {isOwner && (
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => duplicateTemplate(tmpl)}>
                      <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  )}
                  {isAdmin && isOwner && !tmpl.is_global && (
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => sendExistingToAll(tmpl)} title={t.templates.sendToAll}>
                      <Send className="h-3.5 w-3.5 text-primary" />
                    </Button>
                  )}
                  {isAdmin && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => { setAssignTemplate(tmpl); setAssignDialogOpen(true); }}
                      title={lang === "uk" ? "Надіслати конкретному користувачу" : "Send to specific user"}
                    >
                      <UserPlus className="h-3.5 w-3.5 text-primary" />
                    </Button>
                  )}
                  {canDelete && (
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteTemplate(tmpl.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>

              {isMulti ? (
                <div className="space-y-2">
                  {tmpl.days
                    .slice()
                    .sort((a, b) => a.sort_order - b.sort_order)
                    .map((d) => {
                      const dayEx = tmpl.exercises.filter((e) => e.day_id === d.id);
                      return (
                        <div key={d.id} className="rounded-xl border border-border/50 p-2 flex items-center gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate">{d.name}</p>
                            <p className="text-[10px] text-muted-foreground">{dayEx.length} {t.workouts.exercises}</p>
                          </div>
                          <Button size="sm" className="h-8" disabled={dayEx.length === 0} onClick={() => startFromTemplate(tmpl, d.id)}>
                            <Play className="h-3.5 w-3.5 mr-1" /> {t.templates.startWorkout}
                          </Button>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap gap-1">
                    {tmpl.exercises.map((ex, i) => (
                      <span key={i} className="text-[10px] rounded-full bg-accent px-2 py-0.5 text-accent-foreground">
                        {t.exerciseNames[ex.exercise_name] || ex.exercise_name}
                      </span>
                    ))}
                  </div>
                  <Button className="w-full h-10" onClick={() => startFromTemplate(tmpl)}>
                    <Play className="h-4 w-4 mr-2" /> {t.templates.startWorkout}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        );
      })}

      {/* Assign template to specific user dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={(o) => { setAssignDialogOpen(o); if (!o) { setAssignNickname(""); setAssignTemplate(null); } }}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">
              {lang === "uk" ? "Надіслати шаблон користувачу" : "Send template to user"}
            </DialogTitle>
            <DialogDescription>
              {lang === "uk"
                ? `Введіть нік (повне ім'я) користувача. Шаблон «${assignTemplate?.name ?? ""}» з'явиться у нього на головній.`
                : `Enter the user's nickname (full name). The template "${assignTemplate?.name ?? ""}" will appear on their dashboard.`}
            </DialogDescription>
          </DialogHeader>
          <Input
            autoFocus={false}
            placeholder={lang === "uk" ? "Нік користувача" : "User nickname"}
            value={assignNickname}
            onChange={(e) => setAssignNickname(e.target.value)}
          />
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button className="w-full" onClick={assignToUser} disabled={!assignNickname.trim() || assignBusy}>
              <Send className="h-4 w-4 mr-2" /> {lang === "uk" ? "Надіслати" : "Send"}
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => setAssignDialogOpen(false)}>
              {lang === "uk" ? "Скасувати" : "Cancel"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WorkoutTemplates;
