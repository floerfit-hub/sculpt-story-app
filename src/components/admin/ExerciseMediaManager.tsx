import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Upload, Link, Check, X, Loader2, Film, Image as ImageIcon } from "lucide-react";

interface DbExercise {
  id: string;
  name: string;
  muscle_group: string;
  gif_url: string | null;
  is_deprecated: boolean;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

const getFullGifUrl = (gifUrl: string | null): string | null => {
  if (!gifUrl) return null;
  if (gifUrl.startsWith("http")) return gifUrl;
  return `${SUPABASE_URL}/storage/v1/object/public/exercise-gifs/${gifUrl}`;
};

const ExerciseMediaManager = () => {
  const { toast } = useToast();
  const [exercises, setExercises] = useState<DbExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "with" | "without">("all");
  const [uploading, setUploading] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState<{ id: string; value: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [targetExerciseId, setTargetExerciseId] = useState<string | null>(null);

  const fetchExercises = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("exercises")
      .select("id, name, muscle_group, gif_url, is_deprecated" as any)
      .eq("is_deprecated", false)
      .order("muscle_group")
      .order("name");
    if (data) setExercises(data as any);
    setLoading(false);
  };

  useEffect(() => { fetchExercises(); }, []);

  const handleFileUpload = async (exerciseId: string, file: File) => {
    setUploading(exerciseId);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "gif";
      const fileName = `${exerciseId}.${ext}`;
      
      const { error: uploadError } = await supabase.storage
        .from("exercise-gifs")
        .upload(fileName, file, { upsert: true, contentType: file.type });

      if (uploadError) throw uploadError;

      // Update gif_url column with just the filename
      const { error: updateError } = await supabase
        .from("exercises")
        .update({ gif_url: fileName } as any)
        .eq("id", exerciseId);

      if (updateError) throw updateError;

      setExercises(prev => prev.map(e => e.id === exerciseId ? { ...e, gif_url: fileName } : e));
      toast({ title: "Медіа завантажено ✅" });
    } catch (err: any) {
      toast({ title: "Помилка завантаження", description: err.message, variant: "destructive" });
    } finally {
      setUploading(null);
      setTargetExerciseId(null);
    }
  };

  const handleUrlSave = async (exerciseId: string, url: string) => {
    setUploading(exerciseId);
    try {
      const { error } = await supabase
        .from("exercises")
        .update({ gif_url: url } as any)
        .eq("id", exerciseId);

      if (error) throw error;

      setExercises(prev => prev.map(e => e.id === exerciseId ? { ...e, gif_url: url } : e));
      toast({ title: "Посилання збережено ✅" });
      setUrlInput(null);
    } catch (err: any) {
      toast({ title: "Помилка", description: err.message, variant: "destructive" });
    } finally {
      setUploading(null);
    }
  };

  const q = search.toLowerCase();
  const filtered = exercises.filter(e => {
    if (q && !e.name.toLowerCase().includes(q)) return false;
    if (filter === "with" && !e.gif_url) return false;
    if (filter === "without" && e.gif_url) return false;
    return true;
  });

  const withMedia = exercises.filter(e => e.gif_url).length;
  const withoutMedia = exercises.length - withMedia;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="flex gap-2 flex-wrap">
        <Badge variant="secondary" className="text-xs">
          Всього: {exercises.length}
        </Badge>
        <Badge className="bg-green-500/20 text-green-600 border-green-500/30 text-xs">
          <Film className="h-3 w-3 mr-1" /> З медіа: {withMedia}
        </Badge>
        <Badge className="bg-orange-500/20 text-orange-600 border-orange-500/30 text-xs">
          Без медіа: {withoutMedia}
        </Badge>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Пошук вправ..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {(["all", "without", "with"] as const).map(f => (
          <Button
            key={f}
            variant={filter === f ? "default" : "outline"}
            size="sm"
            className="h-8 text-xs"
            onClick={() => setFilter(f)}
          >
            {f === "all" ? "Всі" : f === "without" ? "Без медіа" : "З медіа"}
          </Button>
        ))}
      </div>

      {/* Exercise list */}
      <div className="grid gap-2 max-h-[60vh] overflow-y-auto">
        {filtered.map(ex => {
          const fullUrl = getFullGifUrl(ex.gif_url);
          const isUrlMode = urlInput?.id === ex.id;

          return (
            <Card key={ex.id} className="overflow-hidden">
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  {/* Preview */}
                  <div className="h-14 w-14 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                    {fullUrl ? (
                      <img
                        src={fullUrl}
                        alt={ex.name}
                        className="h-full w-full object-contain"
                        loading="lazy"
                      />
                    ) : (
                      <ImageIcon className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{ex.name}</p>
                    <p className="text-xs text-muted-foreground">{ex.muscle_group}</p>
                    {ex.gif_url && (
                      <p className="text-[10px] text-green-600 truncate">✅ {ex.gif_url}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {uploading === ex.id ? (
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    ) : (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 touch-manipulation"
                          title="Завантажити файл"
                          onClick={() => {
                            setTargetExerciseId(ex.id);
                            fileRef.current?.click();
                          }}
                        >
                          <Upload className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 touch-manipulation"
                          title="Вставити посилання"
                          onClick={() => setUrlInput({ id: ex.id, value: ex.gif_url?.startsWith("http") ? ex.gif_url : "" })}
                        >
                          <Link className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* URL input mode */}
                {isUrlMode && (
                  <div className="flex gap-2 mt-2">
                    <Input
                      placeholder="https://example.com/video.mp4"
                      value={urlInput.value}
                      onChange={(e) => setUrlInput({ ...urlInput, value: e.target.value })}
                      className="text-xs h-9"
                      autoFocus
                    />
                    <Button
                      size="icon"
                      className="h-9 w-9 shrink-0"
                      disabled={!urlInput.value.trim()}
                      onClick={() => handleUrlSave(ex.id, urlInput.value.trim())}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 shrink-0"
                      onClick={() => setUrlInput(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <p className="py-8 text-center text-muted-foreground">Нічого не знайдено</p>
      )}

      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        accept="image/gif,video/mp4,video/webm,image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && targetExerciseId) {
            handleFileUpload(targetExerciseId, file);
          }
          if (e.target) e.target.value = "";
        }}
      />
    </div>
  );
};

export default ExerciseMediaManager;
