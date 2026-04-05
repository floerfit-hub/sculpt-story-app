import { useState, useEffect, useRef } from "react";
import { useTranslation } from "@/i18n";
import { useAuth } from "@/hooks/useAuth";
import { usePremium } from "@/hooks/usePremium";

import { supabase } from "@/integrations/supabase/client";
import { MUSCLE_GROUPS, EXERCISES, getExercisesByGroup, type MuscleGroup, type Exercise } from "@/data/exerciseLibrary";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ChevronRight, Plus, Trash2, Pencil, Check, X, Camera, RefreshCw, Search } from "lucide-react";
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
  image_url?: string | null;
}

interface DbExercise {
  id: string;
  name: string;
  muscle_group: string;
  sub_group?: string | null;
  equipment?: string | null;
  is_deprecated?: boolean;
  animation_url?: string | null;
  name_en?: string | null;
}

const ExerciseLibrary = ({ onBack, onSelect, selectable }: Props) => {
  const { t, lang } = useTranslation();
  const { user } = useAuth();
  const { isPremium } = usePremium();
  const { toast } = useToast();
  const [activeGroup, setActiveGroup] = useState<MuscleGroup | "custom" | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSubGroup, setActiveSubGroup] = useState<string | null>(null);
  const [customExercises, setCustomExercises] = useState<CustomExercise[]>([]);
  const [dbExercises, setDbExercises] = useState<DbExercise[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newGroup, setNewGroup] = useState<MuscleGroup | "">("");
  const [newImageFile, setNewImageFile] = useState<File | null>(null);
  const [newImagePreview, setNewImagePreview] = useState<string | null>(null);
  const addImageRef = useRef<HTMLInputElement>(null);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editGroup, setEditGroup] = useState<MuscleGroup | "">("");
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const editImageRef = useRef<HTMLInputElement>(null);
  const builtInImageRef = useRef<HTMLInputElement>(null);
  const [overrideImages, setOverrideImages] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem("exercise-photo-overrides") || "{}"); } catch { return {}; }
  });
  const [syncingExerciseId, setSyncingExerciseId] = useState<string | null>(null);
  const [syncSearchName, setSyncSearchName] = useState("");
  const [showSyncInput, setShowSyncInput] = useState<string | null>(null);

  // Fetch exercises from DB
  useEffect(() => {
    const loadDbExercises = async () => {
      const { data } = await supabase
        .from("exercises")
        .select("id, name, muscle_group, sub_group, equipment, is_deprecated, animation_url, name_en" as any)
        .order("name");
      if (data) setDbExercises(data as any);
    };
    loadDbExercises();
  }, []);

  // Map English UI groups to Ukrainian DB muscle_group values
  const DB_GROUP_MAP: Record<MuscleGroup, string[]> = {
    "Legs & Glutes": ["Ноги"],
    "Back": ["Спина"],
    "Chest": ["Грудні"],
    "Shoulders": ["Плечі"],
    "Arms": ["Біцепс", "Трицепс", "Передпліччя"],
    "Core": ["Кор"],
  };

  // Get exercises for a group — prefer DB, fallback to static
  const getGroupExercises = (group: MuscleGroup): { name: string; muscleGroup: string; subGroup?: string | null; dbId?: string; animationUrl?: string | null; nameEn?: string | null }[] => {
    const dbGroups = DB_GROUP_MAP[group];
    const fromDb = dbExercises.filter(e => dbGroups.includes(e.muscle_group) && !e.is_deprecated);
    if (fromDb.length > 0) {
      return fromDb.map(e => ({ name: e.name, muscleGroup: e.muscle_group, subGroup: e.sub_group, dbId: e.id, animationUrl: e.animation_url, nameEn: e.name_en }));
    }
    return getExercisesByGroup(group).map(e => ({ name: e.name, muscleGroup: e.muscleGroup, subGroup: undefined }));
  };

  // Get unique sub-groups for a muscle group
  const getSubGroups = (group: MuscleGroup): string[] => {
    const exercises = getGroupExercises(group);
    const subs = new Set<string>();
    exercises.forEach(e => { if (e.subGroup) subs.add(e.subGroup); });
    return Array.from(subs);
  };

  const uploadOverrideImage = async (file: File, exerciseName: string) => {
    if (!user) return;
    try {
      const img = new Image();
      const reader = new FileReader();
      reader.onload = () => { img.src = reader.result as string; };
      reader.readAsDataURL(file);
      await new Promise<void>((resolve) => { img.onload = () => resolve(); });
      const size = Math.min(img.width, img.height);
      const sx = (img.width - size) / 2;
      const sy = (img.height - size) / 2;
      const canvas = document.createElement("canvas");
      canvas.width = 256; canvas.height = 256;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, sx, sy, size, size, 0, 0, 256, 256);
      const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.8));
      const encoded = encodeURIComponent(exerciseName);
      const filePath = `${user.id}/override-${encoded}.jpg`;
      await supabase.storage.from("exercise-images").upload(filePath, blob, { upsert: true, contentType: "image/jpeg" });
      const { data: urlData } = supabase.storage.from("exercise-images").getPublicUrl(filePath);
      const url = urlData.publicUrl + "?t=" + Date.now();
      setOverrideImages(prev => {
        const next = { ...prev, [exerciseName]: url };
        localStorage.setItem("exercise-photo-overrides", JSON.stringify(next));
        return next;
      });
      toast({ title: lang === "uk" ? "Фото оновлено" : "Photo updated" });
    } catch {
      toast({ title: lang === "uk" ? "Помилка завантаження" : "Upload error", variant: "destructive" });
    }
  };

  const deleteOverrideImage = async (exerciseName: string) => {
    if (!user) return;
    const encoded = encodeURIComponent(exerciseName);
    await supabase.storage.from("exercise-images").remove([`${user.id}/override-${encoded}.jpg`]);
    setOverrideImages(prev => {
      const next = { ...prev };
      delete next[exerciseName];
      localStorage.setItem("exercise-photo-overrides", JSON.stringify(next));
      return next;
    });
    toast({ title: lang === "uk" ? "Фото видалено" : "Photo deleted" });
  };
  const syncAnimation = async (exerciseId: string, searchName: string) => {
    if (!searchName.trim()) {
      toast({ title: lang === "uk" ? "Введіть назву англійською" : "Enter English name", variant: "destructive" });
      return;
    }
    setSyncingExerciseId(exerciseId);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(`https://${projectId}.supabase.co/functions/v1/sync-exercise-animation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exercise_id: exerciseId, search_name: searchName.trim() }),
      });
      const result = await res.json();
      if (!res.ok) {
        toast({ title: lang === "uk" ? "Помилка синхронізації" : "Sync error", description: result.error, variant: "destructive" });
      } else {
        toast({ title: lang === "uk" ? "Анімацію завантажено" : "Animation synced", description: result.matched_name });
        setDbExercises(prev => prev.map(e => e.id === exerciseId ? { ...e, animation_url: result.animation_url, name_en: searchName.trim() } : e));
        setShowSyncInput(null);
        setSyncSearchName("");
      }
    } catch (err: any) {
      toast({ title: lang === "uk" ? "Помилка" : "Error", description: err.message, variant: "destructive" });
    } finally {
      setSyncingExerciseId(null);
    }
  };

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("custom_exercises")
        .select("id, exercise_name, muscle_group, image_url" as any)
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });
      if (data) setCustomExercises(data as any);
    };
    load();
  }, [user]);

  const getGroupLabel = (group: MuscleGroup) => {
    const key = MUSCLE_GROUP_KEYS[group] as keyof typeof t.muscleGroups;
    return t.muscleGroups[key];
  };

  const uploadExerciseImage = async (file: File, exerciseId: string): Promise<string | null> => {
    if (!user) return null;
    try {
      const img = new Image();
      const reader = new FileReader();
      reader.onload = () => { img.src = reader.result as string; };
      reader.readAsDataURL(file);
      await new Promise<void>((resolve) => { img.onload = () => resolve(); });
      const size = Math.min(img.width, img.height);
      const sx = (img.width - size) / 2;
      const sy = (img.height - size) / 2;
      const canvas = document.createElement("canvas");
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, sx, sy, size, size, 0, 0, 256, 256);
      const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.8));
      const filePath = `${user.id}/${exerciseId}.jpg`;
      await supabase.storage.from("exercise-images").upload(filePath, blob, { upsert: true, contentType: "image/jpeg" });
      const { data: urlData } = supabase.storage.from("exercise-images").getPublicUrl(filePath);
      return urlData.publicUrl + "?t=" + Date.now();
    } catch {
      return null;
    }
  };

  const addCustomExercise = async () => {
    if (!user || !newName.trim() || !newGroup) return;

    let imageUrl: string | null = null;

    const { data, error } = await supabase
      .from("custom_exercises")
      .insert({ user_id: user.id, exercise_name: newName.trim(), muscle_group: newGroup } as any)
      .select("id, exercise_name, muscle_group" as any)
      .single();

    if (error) {
      toast({ title: t.workouts.errorSaving, variant: "destructive" });
      return;
    }


    if (data && newImageFile) {
      imageUrl = await uploadExerciseImage(newImageFile, (data as any).id);
      if (imageUrl) {
        await supabase.from("custom_exercises").update({ image_url: imageUrl } as any).eq("id", (data as any).id);
      }
    }

    if (data) {
      setCustomExercises((prev) => [...prev, { ...(data as any), image_url: imageUrl }]);
      toast({ title: t.workouts.customExerciseAdded });
      setNewName("");
      setNewGroup("");
      setNewImageFile(null);
      setNewImagePreview(null);
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
    setEditImagePreview(ex.image_url || null);
    setEditImageFile(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditGroup("");
    setEditImageFile(null);
    setEditImagePreview(null);
  };

  const saveEdit = async () => {
    if (!editingId || !editName.trim() || !editGroup) return;
    
    let imageUrl = editImagePreview;
    if (editImageFile) {
      imageUrl = await uploadExerciseImage(editImageFile, editingId);
    }

    const updateData: any = { exercise_name: editName.trim(), muscle_group: editGroup };
    if (editImageFile && imageUrl) updateData.image_url = imageUrl;

    const { error } = await supabase
      .from("custom_exercises")
      .update(updateData)
      .eq("id", editingId);

    if (error) {
      toast({ title: t.workouts.errorSaving, variant: "destructive" });
      return;
    }

    setCustomExercises((prev) =>
      prev.map((e) => e.id === editingId ? { ...e, exercise_name: editName.trim(), muscle_group: editGroup, image_url: imageUrl } : e)
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
        {/* Photo upload */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => addImageRef.current?.click()}
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-primary/30 bg-accent/50 overflow-hidden"
          >
            {newImagePreview ? (
              <img src={newImagePreview} alt="" className="h-full w-full object-cover" />
            ) : (
              <Camera className="h-5 w-5 text-muted-foreground" />
            )}
          </button>
          <p className="text-xs text-muted-foreground">{lang === "uk" ? "Додати фото вправи" : "Add exercise photo"}</p>
          <input
            ref={addImageRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                setNewImageFile(file);
                const reader = new FileReader();
                reader.onload = () => setNewImagePreview(reader.result as string);
                reader.readAsDataURL(file);
              }
            }}
          />
          {newImagePreview && (
            <Button variant="ghost" size="sm" className="text-destructive text-xs h-7" onClick={() => { setNewImageFile(null); setNewImagePreview(null); }}>
              <Trash2 className="h-3 w-3 mr-1" /> {lang === "uk" ? "Видалити фото" : "Delete photo"}
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          <Button className="flex-1" onClick={addCustomExercise} disabled={!newName.trim() || !newGroup}>
            {t.workouts.add}
          </Button>
          <Button variant="outline" onClick={() => { setShowAddForm(false); setNewName(""); setNewGroup(""); setNewImageFile(null); setNewImagePreview(null); }}>
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
            {/* Photo upload for edit */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => editImageRef.current?.click()}
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-primary/30 bg-accent/50 overflow-hidden"
              >
                {editImagePreview ? (
                  <img src={editImagePreview} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Camera className="h-5 w-5 text-muted-foreground" />
                )}
              </button>
              <p className="text-xs text-muted-foreground">{lang === "uk" ? "Змінити фото" : "Change photo"}</p>
              <input
                ref={editImageRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setEditImageFile(file);
                    const reader = new FileReader();
                    reader.onload = () => setEditImagePreview(reader.result as string);
                    reader.readAsDataURL(file);
                  }
                }}
              />
              {editImagePreview && (
                <Button variant="ghost" size="sm" className="text-destructive text-xs h-7" onClick={async () => {
                  if (editingId && user) {
                    await supabase.storage.from("exercise-images").remove([`${user.id}/${editingId}.jpg`]);
                    await supabase.from("custom_exercises").update({ image_url: null } as any).eq("id", editingId);
                    setCustomExercises(prev => prev.map(e => e.id === editingId ? { ...e, image_url: null } : e));
                  }
                  setEditImageFile(null);
                  setEditImagePreview(null);
                }}>
                  <Trash2 className="h-3 w-3 mr-1" /> {lang === "uk" ? "Видалити фото" : "Delete photo"}
                </Button>
              )}
            </div>
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
        <CardContent className="flex items-center gap-3 p-3">
          {ex.image_url && (
            <img
              src={ex.image_url}
              alt={ex.exercise_name}
              className="h-14 w-14 rounded-lg object-cover shrink-0 bg-muted"
              loading="lazy"
            />
          )}
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
          <Button variant="outline" className="w-full" onClick={() => {
            if (!isPremium) {
              toast({ title: lang === "uk" ? "Доступно лише для Pro" : "Pro feature only", description: lang === "uk" ? "Оновіть до Pro, щоб створювати власні вправи" : "Upgrade to Pro to create custom exercises" });
              return;
            }
            setShowAddForm(true);
          }}>
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
    const groupExercises = getGroupExercises(activeGroup);
    const subGroups = getSubGroups(activeGroup);
    const q = searchQuery.toLowerCase();
    const searchFiltered = q
      ? groupExercises
          .filter(ex => {
            const translated = t.exerciseNames[ex.name] || ex.name;
            return ex.name.toLowerCase().includes(q) || translated.toLowerCase().includes(q);
          })
          .sort((a, b) => {
            const aName = (t.exerciseNames[a.name] || a.name).toLowerCase();
            const bName = (t.exerciseNames[b.name] || b.name).toLowerCase();
            const aStarts = aName.startsWith(q) || a.name.toLowerCase().startsWith(q);
            const bStarts = bName.startsWith(q) || b.name.toLowerCase().startsWith(q);
            if (aStarts && !bStarts) return -1;
            if (!aStarts && bStarts) return 1;
            const aIdx = Math.min(aName.indexOf(q), a.name.toLowerCase().indexOf(q) >= 0 ? a.name.toLowerCase().indexOf(q) : 999);
            const bIdx = Math.min(bName.indexOf(q), b.name.toLowerCase().indexOf(q) >= 0 ? b.name.toLowerCase().indexOf(q) : 999);
            return aIdx - bIdx;
          })
      : groupExercises;
    const filteredExercises = activeSubGroup
      ? searchFiltered.filter(e => e.subGroup === activeSubGroup)
      : searchFiltered;

    // Custom exercises for this group
    const dbGroups = DB_GROUP_MAP[activeGroup];
    const groupCustomExercises = customExercises.filter(ce => dbGroups.includes(ce.muscle_group) || ce.muscle_group === activeGroup);
    const filteredCustom = q
      ? groupCustomExercises.filter(ce => ce.exercise_name.toLowerCase().includes(q))
      : groupCustomExercises;

    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => { setActiveGroup(null); setActiveSubGroup(null); setSearchQuery(""); }}><ArrowLeft className="h-5 w-5" /></Button>
          <h2 className="text-xl font-display font-bold flex-1">{getGroupLabel(activeGroup)}</h2>
        </div>

        {/* Search bar inside group */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={lang === "uk" ? "Пошук вправ..." : "Search exercises..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Sub-group filter tabs */}
        {subGroups.length > 0 && !q && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            <Button
              variant={activeSubGroup === null ? "default" : "outline"}
              size="sm"
              className="shrink-0 h-8 text-xs"
              onClick={() => setActiveSubGroup(null)}
            >
              {lang === "uk" ? "Всі" : "All"}
            </Button>
            {subGroups.map(sub => (
              <Button
                key={sub}
                variant={activeSubGroup === sub ? "default" : "outline"}
                size="sm"
                className="shrink-0 h-8 text-xs"
                onClick={() => setActiveSubGroup(sub)}
              >
                {sub}
              </Button>
            ))}
          </div>
        )}

        <div className="grid gap-2">
          {filteredExercises.map((ex) => {
            const override = overrideImages[ex.name];
            const img = ex.animationUrl || override || EXERCISE_IMAGES[ex.name];
            const isSyncing = syncingExerciseId === ex.dbId;
            return (
              <div key={ex.name} className="space-y-1">
                <Card className={`${selectable ? "cursor-pointer active:scale-[0.98]" : ""} transition-transform overflow-hidden`}>
                  <CardContent className="flex items-center gap-3 p-3">
                    <div
                      className="relative shrink-0 cursor-pointer"
                      onClick={(e) => { e.stopPropagation(); builtInImageRef.current?.setAttribute("data-exercise", ex.name); builtInImageRef.current?.click(); }}
                    >
                      {img ? (
                        <img
                          src={img}
                          alt={t.exerciseNames[ex.name] || ex.name}
                          className="h-14 w-14 rounded-lg object-contain bg-muted hover:opacity-80 transition-opacity"
                          loading="lazy"
                        />
                      ) : (
                        <div className="h-14 w-14 rounded-lg bg-muted flex items-center justify-center hover:bg-muted/70 transition-colors">
                          <Camera className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0" onClick={() => selectable && onSelect?.(ex.name, ex.muscleGroup)}>
                      <span className="font-medium">{t.exerciseNames[ex.name] || ex.name}</span>
                      {ex.subGroup && (
                        <p className="text-xs text-muted-foreground">{ex.subGroup}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {ex.dbId && !ex.animationUrl && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => {
                          e.stopPropagation();
                          setShowSyncInput(showSyncInput === ex.dbId ? null : ex.dbId!);
                          setSyncSearchName(ex.nameEn || "");
                        }}>
                          <RefreshCw className={`h-3.5 w-3.5 text-muted-foreground ${isSyncing ? "animate-spin" : ""}`} />
                        </Button>
                      )}
                      {override && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); deleteOverrideImage(ex.name); }}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      )}
                      {selectable && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                    </div>
                  </CardContent>
                </Card>
                {showSyncInput === ex.dbId && (
                  <div className="flex gap-2 px-2">
                    <Input
                      placeholder="English name (e.g. barbell squat)"
                      value={syncSearchName}
                      onChange={(e) => setSyncSearchName(e.target.value)}
                      className="h-9 text-xs"
                    />
                    <Button size="sm" className="h-9 shrink-0" disabled={isSyncing} onClick={() => syncAnimation(ex.dbId!, syncSearchName)}>
                      {isSyncing ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : (lang === "uk" ? "Синхр." : "Sync")}
                    </Button>
                  </div>
                )}
              </div>
            );
          })}

          {/* Custom exercises at the bottom of this group */}
          {filteredCustom.length > 0 && (
            <>
              <div className="pt-2 pb-1">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">
                  {lang === "uk" ? "Мої вправи" : "My Exercises"}
                </h4>
              </div>
              {filteredCustom.map(ex => renderCustomExerciseCard(ex, false))}
            </>
          )}

          {/* Add custom exercise button at the bottom of each group */}
          <div className="pt-2">
            {showAddForm ? (
              renderAddForm(activeGroup)
            ) : (
              <Button variant="outline" className="w-full touch-manipulation" onClick={() => {
                if (!isPremium) {
                  toast({ title: lang === "uk" ? "Доступно лише для Pro" : "Pro feature only", description: lang === "uk" ? "Оновіть до Pro, щоб створювати власні вправи" : "Upgrade to Pro to create custom exercises" });
                  return;
                }
                const dbGroups2 = DB_GROUP_MAP[activeGroup];
                setNewGroup(dbGroups2[0] as any || activeGroup);
                setShowAddForm(true);
              }}>
                <Plus className="h-4 w-4 mr-2" /> {t.workouts.addCustomExercise}
              </Button>
            )}
          </div>
        </div>

        {filteredExercises.length === 0 && filteredCustom.length === 0 && (
          <p className="py-8 text-center text-muted-foreground">{t.workouts.noExercises}</p>
        )}

        {/* Hidden file input for built-in exercise photo override */}
        <input
          ref={builtInImageRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            const name = builtInImageRef.current?.getAttribute("data-exercise");
            if (file && name) uploadOverrideImage(file, name);
            if (e.target) e.target.value = "";
          }}
        />
      </div>
    );
  }

  // Helper: get custom exercises matching a muscle group
  const getCustomExercisesForGroup = (group: MuscleGroup): CustomExercise[] => {
    const dbGroups = DB_GROUP_MAP[group];
    return customExercises.filter(ce => dbGroups.includes(ce.muscle_group) || ce.muscle_group === group);
  };

  // Muscle group list with separate sections
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-5 w-5" /></Button>
        <h2 className="text-xl font-display font-bold">{t.exerciseLib.title}</h2>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={lang === "uk" ? "Пошук вправ..." : "Search exercises..."}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* If searching — show flat results */}
      {searchQuery.trim() ? (
        <div className="space-y-2">
          <div className="grid gap-2">
            {(() => {
              const q = searchQuery.toLowerCase();
              const results: { name: string; muscleGroup: string; subGroup?: string | null; dbId?: string; animationUrl?: string | null; nameEn?: string | null }[] = [];
              MUSCLE_GROUPS.forEach(group => {
                getGroupExercises(group).forEach(ex => {
                  const translated = t.exerciseNames[ex.name] || ex.name;
                  if (ex.name.toLowerCase().includes(q) || translated.toLowerCase().includes(q)) {
                    results.push(ex);
                  }
                });
              });
              // Sort by word position priority
              results.sort((a, b) => {
                const aName = (t.exerciseNames[a.name] || a.name).toLowerCase();
                const bName = (t.exerciseNames[b.name] || b.name).toLowerCase();
                const aStarts = aName.startsWith(q) || a.name.toLowerCase().startsWith(q);
                const bStarts = bName.startsWith(q) || b.name.toLowerCase().startsWith(q);
                if (aStarts && !bStarts) return -1;
                if (!aStarts && bStarts) return 1;
                const aIdx = Math.min(
                  aName.indexOf(q) >= 0 ? aName.indexOf(q) : 999,
                  a.name.toLowerCase().indexOf(q) >= 0 ? a.name.toLowerCase().indexOf(q) : 999
                );
                const bIdx = Math.min(
                  bName.indexOf(q) >= 0 ? bName.indexOf(q) : 999,
                  b.name.toLowerCase().indexOf(q) >= 0 ? b.name.toLowerCase().indexOf(q) : 999
                );
                return aIdx - bIdx;
              });
              // Sort custom exercises by priority too
              const customResults = customExercises
                .filter(ce => ce.exercise_name.toLowerCase().includes(q))
                .sort((a, b) => {
                  const aIdx = a.exercise_name.toLowerCase().indexOf(q);
                  const bIdx = b.exercise_name.toLowerCase().indexOf(q);
                  return aIdx - bIdx;
              if (results.length === 0 && customResults.length === 0) {
                return <p className="py-8 text-center text-muted-foreground">{t.workouts.noExercises}</p>;
              }
              return (
                <>
                  {customResults.map(ex => renderCustomExerciseCard(ex, true))}
                  {results.map(ex => {
                    const override = overrideImages[ex.name];
                    const img = ex.animationUrl || override || EXERCISE_IMAGES[ex.name];
                    return (
                      <Card key={ex.name} className={`${selectable ? "cursor-pointer active:scale-[0.98]" : ""} transition-transform`}>
                        <CardContent className="flex items-center gap-3 p-3">
                          {img ? (
                            <img src={img} alt={t.exerciseNames[ex.name] || ex.name} className="h-12 w-12 rounded-lg object-contain bg-muted" loading="lazy" />
                          ) : (
                            <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center"><Camera className="h-4 w-4 text-muted-foreground" /></div>
                          )}
                          <div className="flex-1 min-w-0" onClick={() => selectable && onSelect?.(ex.name, ex.muscleGroup)}>
                            <span className="font-medium">{t.exerciseNames[ex.name] || ex.name}</span>
                            <p className="text-xs text-muted-foreground">{ex.muscleGroup}{ex.subGroup ? ` · ${ex.subGroup}` : ""}</p>
                          </div>
                          {selectable && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                        </CardContent>
                      </Card>
                    );
                  })}
                </>
              );
            })()}
          </div>
        </div>
      ) : (
        <>
          {/* Section 1: Exercise Library */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide px-1">
              {lang === "uk" ? "Бібліотека вправ" : "Exercise Library"}
            </h3>
            <div className="grid gap-2">
              {MUSCLE_GROUPS.map((group) => {
                const totalCount = getGroupExercises(group).length;
                const customCount = getCustomExercisesForGroup(group).length;
                return (
                  <Card key={group} className="cursor-pointer active:scale-[0.98] transition-transform" onClick={() => { setActiveGroup(group); setSearchQuery(""); }}>
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{MUSCLE_EMOJIS[group]}</span>
                        <div>
                          <p className="font-display font-semibold">{getGroupLabel(group)}</p>
                          <p className="text-sm text-muted-foreground">{totalCount + customCount} {t.workouts.exercises}</p>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Section 2: My Exercises */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide px-1">
              {lang === "uk" ? "Мої вправи" : "My Exercises"}
            </h3>
            <Card className="cursor-pointer active:scale-[0.98] transition-transform border-primary/20" onClick={() => { setActiveGroup("custom"); setSearchQuery(""); }}>
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
        </>
      )}
    </div>
  );
};

export default ExerciseLibrary;
