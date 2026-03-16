import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "@/i18n";
import { useAuth } from "@/hooks/useAuth";

import { supabase } from "@/integrations/supabase/client";
import { MUSCLE_GROUPS, getExercisesByGroup, type MuscleGroup } from "@/data/exerciseLibrary";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
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

    // Insert into custom_exercises for user-specific management
    const { data, error } = await supabase
      .from("custom_exercises")
      .insert({ user_id: user.id, exercise_name: newName.trim(), muscle_group: newGroup })
      .select("id, exercise_name, muscle_group")
      .single();

    if (error) {
      toast({ title: t.workouts.errorSaving, variant: "destructive" });
      return;
    }

    // Also ensure it exists in the master exercises table for relational lookups
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

  // Custom exercises view
  if (activeGroup === "custom") {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setActiveGroup(null)}><ArrowLeft className="h-5 w-5" /></Button>
          <h2 className="text-xl font-display font-bold">{t.workouts.customExercises}</h2>
        </div>

        {customExercises.length === 0 && !showAddForm && (
          <p className="py-8 text-center text-muted-foreground">{t.workouts.noExercises}</p>
        )}

        <div className="grid gap-2">
          {customExercises.map((ex) => (
            <Card key={ex.id} className={`${selectable ? "cursor-pointer active:scale-[0.98]" : ""} transition-transform`}>
              <CardContent className="flex items-center justify-between p-4">
                <div
                  className="flex-1"
                  onClick={() => selectable && onSelect?.(ex.exercise_name, ex.muscle_group)}
                >
                  <span className="font-medium">{ex.exercise_name}</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    ({getGroupLabel(ex.muscle_group as MuscleGroup) || ex.muscle_group})
                  </span>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => deleteCustomExercise(ex.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {showAddForm ? (
          <Card>
            <CardContent className="p-4 space-y-3">
              <Input
                placeholder={t.workouts.customExerciseName}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                maxLength={100}
              />
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
        ) : (
          <Button variant="outline" className="w-full" onClick={() => setShowAddForm(true)}>
            <Plus className="h-4 w-4 mr-2" /> {t.workouts.addCustomExercise}
          </Button>
        )}
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

        {/* Inline add custom exercise form */}
        {showAddForm && newGroup === activeGroup && (
          <Card className="border-primary/20">
            <CardContent className="p-4 space-y-3">
              <Input
                placeholder={t.workouts.customExerciseName}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                maxLength={100}
                autoFocus
              />
              <div className="flex gap-2">
                <Button className="flex-1" onClick={addCustomExercise} disabled={!newName.trim()}>
                  {t.workouts.add}
                </Button>
                <Button variant="outline" onClick={() => { setShowAddForm(false); setNewName(""); setNewGroup(""); }}>
                  {t.workouts.cancel}
                </Button>
              </div>
            </CardContent>
          </Card>
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
          {customInGroup.map((ex) => (
            <Card key={ex.id} className={`${selectable ? "cursor-pointer active:scale-[0.98]" : ""} transition-transform border-primary/20`}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex-1" onClick={() => selectable && onSelect?.(ex.exercise_name, ex.muscle_group)}>
                  <span className="font-medium">{ex.exercise_name}</span>
                  <span className="ml-2 text-[10px] rounded-full bg-primary/10 text-primary px-2 py-0.5">{t.workouts.customExercises}</span>
                </div>
                {selectable && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Add exercise button at the bottom */}
        {!showAddForm && (
          <Button variant="outline" className="w-full border-dashed" onClick={() => { setShowAddForm(true); setNewGroup(activeGroup); }}>
            <Plus className="h-4 w-4 mr-2" /> {t.workouts.addCustomExercise}
          </Button>
        )}
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
