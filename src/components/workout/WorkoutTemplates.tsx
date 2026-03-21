import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/i18n";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Plus, Trash2, Pencil, Play, Copy, FileText } from "lucide-react";
import ExerciseLibrary from "./ExerciseLibrary";
import { useToast } from "@/hooks/use-toast";

interface TemplateExercise {
  id?: string;
  exercise_name: string;
  muscle_group: string;
  sort_order: number;
  default_sets: number;
  default_reps: number;
  default_weight: number;
}

interface Template {
  id: string;
  name: string;
  exercises: TemplateExercise[];
  created_at: string;
}

interface Props {
  onStartFromTemplate: (exercises: { name: string; muscleGroup: string; sets: { weight: number | ""; reps: number | ""; rest_time: null }[] }[], templateName: string) => void;
}

const WorkoutTemplates = ({ onStartFromTemplate }: Props) => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [view, setView] = useState<"list" | "create" | "edit">("list");
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [templateExercises, setTemplateExercises] = useState<TemplateExercise[]>([]);
  const [showLibrary, setShowLibrary] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadTemplates();
  }, [user]);

  const loadTemplates = async () => {
    if (!user) return;
    setLoading(true);
    const { data: tmpl } = await (supabase as any)
      .from("workout_templates")
      .select("id, name, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (!tmpl) { setLoading(false); return; }

    const templateIds = tmpl.map((t: any) => t.id);
    const { data: exercises } = templateIds.length > 0
      ? await (supabase as any)
          .from("workout_template_exercises")
          .select("id, template_id, exercise_name, muscle_group, sort_order, default_sets, default_reps, default_weight")
          .in("template_id", templateIds)
          .order("sort_order", { ascending: true })
      : { data: [] };

    const result: Template[] = tmpl.map((t: any) => ({
      ...t,
      exercises: (exercises || []).filter((e: any) => e.template_id === t.id),
    }));
    setTemplates(result);
    setLoading(false);
  };

  const saveTemplate = async () => {
    if (!user || !templateName.trim() || templateExercises.length === 0) return;

    if (editingTemplate) {
      await (supabase as any).from("workout_templates").update({ name: templateName.trim() }).eq("id", editingTemplate.id);
      await (supabase as any).from("workout_template_exercises").delete().eq("template_id", editingTemplate.id);
      const rows = templateExercises.map((ex, i) => ({
        template_id: editingTemplate.id,
        exercise_name: ex.exercise_name,
        muscle_group: ex.muscle_group,
        sort_order: i,
        default_sets: ex.default_sets,
        default_reps: ex.default_reps,
        default_weight: ex.default_weight,
      }));
      await (supabase as any).from("workout_template_exercises").insert(rows);
      toast({ title: t.templates.templateUpdated });
    } else {
      const { data: tmpl } = await (supabase as any)
        .from("workout_templates")
        .insert({ user_id: user.id, name: templateName.trim() })
        .select("id")
        .single();
      if (!tmpl) return;

      const rows = templateExercises.map((ex, i) => ({
        template_id: tmpl.id,
        exercise_name: ex.exercise_name,
        muscle_group: ex.muscle_group,
        sort_order: i,
        default_sets: ex.default_sets,
        default_reps: ex.default_reps,
        default_weight: ex.default_weight,
      }));
      await (supabase as any).from("workout_template_exercises").insert(rows);
      toast({ title: t.templates.templateSaved });
    }

    setTemplateName("");
    setTemplateExercises([]);
    setEditingTemplate(null);
    setView("list");
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
      .insert({ user_id: user.id, name: `${template.name} (${t.templates.copy})` })
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
    }));
    await (supabase as any).from("workout_template_exercises").insert(rows);
    toast({ title: t.templates.templateDuplicated });
    await loadTemplates();
  };

  const startFromTemplate = (template: Template) => {
    const exercises = template.exercises.map((ex) => ({
      name: ex.exercise_name,
      muscleGroup: ex.muscle_group,
      sets: Array.from({ length: ex.default_sets }, () => ({
        weight: ex.default_weight > 0 ? ex.default_weight : ("" as number | ""),
        reps: ex.default_reps > 0 ? ex.default_reps : ("" as number | ""),
        rest_time: null,
      })),
    }));
    onStartFromTemplate(exercises, template.name);
  };

  const addExerciseToTemplate = (name: string, group: string) => {
    setTemplateExercises((prev) => [
      ...prev,
      { exercise_name: name, muscle_group: group, sort_order: prev.length, default_sets: 3, default_reps: 10, default_weight: 0 },
    ]);
    setShowLibrary(false);
  };

  const MUSCLE_GROUP_KEYS: Record<string, string> = {
    "Legs & Glutes": "legsGlutes", "Back": "back", "Chest": "chest",
    "Shoulders": "shoulders", "Arms": "arms", "Core": "core",
  };

  if (showLibrary) {
    return <ExerciseLibrary onBack={() => setShowLibrary(false)} onSelect={addExerciseToTemplate} selectable />;
  }

  if (view === "create" || view === "edit") {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => { setView("list"); setEditingTemplate(null); setTemplateName(""); setTemplateExercises([]); }}>
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

        {templateExercises.map((ex, i) => (
          <Card key={i}>
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
                      value={ex.default_sets}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 1;
                        setTemplateExercises((prev) => prev.map((x, j) => j === i ? { ...x, default_sets: val } : x));
                      }}
                      className="h-7 w-14 text-xs text-center"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">{t.workouts.reps}:</span>
                    <Input
                      type="number"
                      value={ex.default_reps}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        setTemplateExercises((prev) => prev.map((x, j) => j === i ? { ...x, default_reps: val } : x));
                      }}
                      className="h-7 w-14 text-xs text-center"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">{t.common.kg}:</span>
                    <Input
                      type="number"
                      value={ex.default_weight || ""}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setTemplateExercises((prev) => prev.map((x, j) => j === i ? { ...x, default_weight: val } : x));
                      }}
                      className="h-7 w-14 text-xs text-center"
                    />
                  </div>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setTemplateExercises((prev) => prev.filter((_, j) => j !== i))}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </CardContent>
          </Card>
        ))}

        <Button variant="outline" className="w-full" onClick={() => setShowLibrary(true)}>
          <Plus className="h-4 w-4 mr-2" /> {t.workouts.addExercise}
        </Button>

        <Button className="w-full" onClick={saveTemplate} disabled={!templateName.trim() || templateExercises.length === 0}>
          {view === "edit" ? t.templates.updateTemplate : t.templates.saveTemplate}
        </Button>

        {view === "create" && templateExercises.length > 0 && templateName.trim() && (
          <Button variant="outline" className="w-full" onClick={async () => {
            await saveTemplate();
          }}>
            <Play className="h-4 w-4 mr-2" /> {t.templates.saveAndStart}
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
        <Button variant="outline" size="sm" onClick={() => { setView("create"); setTemplateName(""); setTemplateExercises([]); }}>
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

      {templates.map((tmpl) => (
        <Card key={tmpl.id} className="overflow-hidden">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="font-display font-semibold truncate">{tmpl.name}</p>
                <p className="text-xs text-muted-foreground">
                  {tmpl.exercises.length} {t.workouts.exercises}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                  setEditingTemplate(tmpl);
                  setTemplateName(tmpl.name);
                  setTemplateExercises(tmpl.exercises);
                  setView("edit");
                }}>
                  <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => duplicateTemplate(tmpl)}>
                  <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteTemplate(tmpl.id)}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            </div>
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
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default WorkoutTemplates;
