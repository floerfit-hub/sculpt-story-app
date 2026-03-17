import { useState, useEffect } from "react";
import { useTranslation } from "@/i18n";
import { useAuth } from "@/hooks/useAuth";

import { supabase } from "@/integrations/supabase/client";
import { MUSCLE_GROUPS, getExercisesByGroup, type MuscleGroup } from "@/data/exerciseLibrary";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ChevronRight, Plus, Trash2, Pencil, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { EXERCISE_IMAGES } from "@/data/exerciseImages";

interface Props { onBack: () => void; onSelect?: (name: string, group: string) => void; selectable?: boolean }

const MUSCLE_EMOJIS: Record<MuscleGroup, string> = {
  "Legs & Glutes": "🦵", "Back": "🔙", "Chest": "💪", "Shoulders": "🏋️", "Arms": "💪", "Core": "🧱",
};

const MUSCLE_GROUP_KEYS: Record<MuscleGroup, string> = {
  "Legs & Glutes": "legsGlutes",
  "Back": "back",
  "Chest": "chest",
  "Shoulders": "shoulders",
  "Arms": "arms",
  "Core": "core",
};

interface CustomExercise {
  id: string;
  exercise_name: string;
  muscle_group: string;
}

const ExerciseLibrary = ({ onBack, onSelect, selectable }: Props) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeGroup, setActiveGroup] = useState<MuscleGroup | "custom" | null>(null);
  const [customExercises, setCustomExercises] = useState<CustomExercise[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newGroup, setNewGroup] = useState<MuscleGroup | "">("");

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editGroup, setEditGroup] = useState<MuscleGroup | "">("");

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("custom_exercises")
        .select("id, exercise_name, muscle_group")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });
      if (data) setCustomExercises(data);
    };
    load();
  }, [user]);

  const getGroupLabel = (group: MuscleGroup) => {
    const key = MUSCLE_GROUP_KEYS[group] as keyof typeof t.muscleGroups;
    return t.muscleGroups[key];
  };

  const addCustomExercise = async () => {
    if (!user || !newName.trim() || !newGroup) return;

    const { data, error } = await supabase
      .from("custom_exercises")
      .insert({ user_id: user.id, exercise_name: newName.trim(), muscle_group: newGroup })
      .select("id, exercise_name, muscle_group")
      .single();

    if (error) {
      toast({ title: t.workouts.errorSaving, variant: "destructive" });
      return;
    }

    await (supabase as any)
      .from("exercises")
      .insert({ name: newName.trim(), muscle_group: newGroup })
      .select("id")
      .single();

    if (data) {
      setCustomExercises((prev) => [...prev, data]);
      toast({ title: t.workouts.customExerciseAdded });
      setNewName("");
      setNewGroup("");
      setShowAddForm(false);
    }
  };

  const deleteCustomExercise = async (id: string) => {
    await supabase.from("custom_exercises").delete().eq("id", id);
    setCustomExercises((prev) => prev.filter((e) => e.id !== id));
    toast({ title: t.workouts.exerciseDeleted });
  };

  const startEdit = (ex: CustomExercise) => {
    setEditingId(ex.id);
    setEditName(ex.exercise_name);
    setEditGroup(ex.muscle_group as MuscleGroup);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditGroup("");
  };

  const saveEdit = async () => {
    if (!editingId || !editName.trim() || !editGroup) return;
    const { error } = await supabase
      .from("custom_exercises")
      .update({ exercise_name: editName.trim(), muscle_group: editGroup })
      .eq("id", editingId);

    if (error) {
      toast({ title: t.workouts.errorSaving, variant: "destructive" });
      return;
    }

    setCustomExercises((prev) =>
      prev.map((e) => e.id === editingId ? { ...e, exercise_name: editName.trim(), muscle_group: editGroup } : e)
    );
    toast({ title: t.workouts.exerciseUpdated });
    cancelEdit();
  };

  const renderAddForm = (presetGroup?: MuscleGroup) => (
    <Card className="border-primary/20">
      <CardContent className="p-4 space-y-3">
        <Input
          placeholder={t.workouts.customExerciseName}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          maxLength={100}
          autoFocus
        />
        {!presetGroup && (
          <Select value={newGroup} onValueChange={(v) => setNewGroup(v as MuscleGroup)}>
            <SelectTrigger>
              <SelectValue placeholder={t.workouts.selectMuscleGroup} />
            </SelectTrigger>
            <SelectContent>
              {MUSCLE_GROUPS.map((g) => (
                <SelectItem key={g} value={g}>{getGroupLabel(g)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {presetGroup && (
          <Select value={newGroup} onValueChange={(v) => setNewGroup(v as MuscleGroup)}>
            <SelectTrigger>
              <SelectValue placeholder={t.workouts.selectMuscleGroup} />
            </SelectTrigger>
            <SelectContent>
              {MUSCLE_GROUPS.map((g) => (
                <SelectItem key={g} value={g}>{getGroupLabel(g)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <div className="flex gap-2">
          <Button className="flex-1" onClick={addCustomExercise} disabled={!newName.trim() || !newGroup}>
            {t.workouts.add}
          </Button>
          <Button variant="outline" onClick={() => { setShowAddForm(false); setNewName(""); setNewGroup(""); }}>
            {t.workouts.cancel}
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderCustomExerciseCard = (ex: CustomExercise, showGroup = true) => {
    if (editingId === ex.id) {
      return (
        <Card key={ex.id} className="border-primary/20">
          <CardContent className="p-4 space-y-3">
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              maxLength={100}
              autoFocus
            />
            <Select value={editGroup} onValueChange={(v) => setEditGroup(v as MuscleGroup)}>
              <SelectTrigger>
                <SelectValue placeholder={t.workouts.selectMuscleGroup} />
              </SelectTrigger>
              <SelectContent>
                {MUSCLE_GROUPS.map((g) => (
                  <SelectItem key={g} value={g}>{getGroupLabel(g)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={saveEdit} disabled={!editName.trim() || !editGroup}>
                <Check className="h-4 w-4 mr-1" /> {t.workouts.saveExercise}
              </Button>
              <Button variant="outline" onClick={cancelEdit}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card key={ex.id} className={`${selectable ? "cursor-pointer active:scale-[0.98]" : ""} transition-transform border-primary/20`}>
        <CardContent className="flex items-center justify-between p-4">
          <div
            className="flex-1 min-w-0"
            onClick={() => selectable && onSelect?.(ex.exercise_name, ex.muscle_group)}
          >
            <span className="font-medium">{ex.exercise_name}</span>
            {showGroup && (
              <span className="text-xs text-muted-foreground ml-2">
                ({getGroupLabel(ex.muscle_group as MuscleGroup) || ex.muscle_group})
              </span>
            )}
            <span className="ml-2 text-[10px] rounded-full bg-primary/10 text-primary px-2 py-0.5">{t.workouts.customExercises}</span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(ex)}>
              <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteCustomExercise(ex.id)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
            {selectable && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          </div>
        </CardContent>
      </Card>
    );
  };

  // Custom exercises view
  if (activeGroup === "custom") {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setActiveGroup(null)}><ArrowLeft className="h-5 w-5" /></Button>
          <h2 className="text-xl font-display font-bold">{t.workouts.customExercises}</h2>
        </div>

        {/* Add button at top */}
        {showAddForm ? (
          renderAddForm()
        ) : (
          <Button variant="outline" className="w-full" onClick={() => setShowAddForm(true)}>
            <Plus className="h-4 w-4 mr-2" /> {t.workouts.addCustomExercise}
          </Button>
        )}

        {customExercises.length === 0 && !showAddForm && (
          <p className="py-8 text-center text-muted-foreground">{t.workouts.noExercises}</p>
        )}

        <div className="grid gap-2">
          {customExercises.map((ex) => renderCustomExerciseCard(ex, true))}
        </div>
      </div>
    );
  }

  // Exercise list for a built-in group
  if (activeGroup) {
    const builtIn = getExercisesByGroup(activeGroup);
    const customInGroup = customExercises.filter((e) => e.muscle_group === activeGroup);
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setActiveGroup(null)}><ArrowLeft className="h-5 w-5" /></Button>
          <h2 className="text-xl font-display font-bold flex-1">{getGroupLabel(activeGroup)}</h2>
        </div>

        {/* Add custom exercise button/form at top */}
        {showAddForm ? (
          renderAddForm(activeGroup)
        ) : (
          <Button variant="outline" className="w-full border-dashed" onClick={() => { setShowAddForm(true); setNewGroup(activeGroup); }}>
            <Plus className="h-4 w-4 mr-2" /> {t.workouts.addCustomExercise}
          </Button>
        )}

        <div className="grid gap-2">
          {builtIn.map((ex) => {
            const img = EXERCISE_IMAGES[ex.name];
            return (
              <Card key={ex.name} className={`${selectable ? "cursor-pointer active:scale-[0.98]" : ""} transition-transform overflow-hidden`} onClick={() => selectable && onSelect?.(ex.name, ex.muscleGroup)}>
                <CardContent className="flex items-center gap-3 p-3">
                  {img && (
                    <img
                      src={img}
                      alt={t.exerciseNames[ex.name] || ex.name}
                      className="h-14 w-14 rounded-lg object-contain shrink-0 bg-muted"
                      loading="lazy"
                    />
                  )}
                  <span className="font-medium flex-1">{t.exerciseNames[ex.name] || ex.name}</span>
                  {selectable && <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                </CardContent>
              </Card>
            );
          })}
          {customInGroup.map((ex) => renderCustomExerciseCard(ex, false))}
        </div>
      </div>
    );
  }

  // Muscle group list
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-5 w-5" /></Button>
        <h2 className="text-xl font-display font-bold">{t.exerciseLib.title}</h2>
      </div>
      <div className="grid gap-2">
        {MUSCLE_GROUPS.map((group) => {
          const customCount = customExercises.filter((e) => e.muscle_group === group).length;
          const totalCount = getExercisesByGroup(group).length + customCount;
          return (
            <Card key={group} className="cursor-pointer active:scale-[0.98] transition-transform" onClick={() => setActiveGroup(group)}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{MUSCLE_EMOJIS[group]}</span>
                  <div>
                    <p className="font-display font-semibold">{getGroupLabel(group)}</p>
                    <p className="text-sm text-muted-foreground">{totalCount} {t.workouts.exercises}</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>
          );
        })}
        <Card className="cursor-pointer active:scale-[0.98] transition-transform border-primary/20" onClick={() => setActiveGroup("custom")}>
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⭐</span>
              <div>
                <p className="font-display font-semibold">{t.workouts.customExercises}</p>
                <p className="text-sm text-muted-foreground">{customExercises.length} {t.workouts.exercises}</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ExerciseLibrary;
