import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import type { Tables } from "@/integrations/supabase/types";

type ProgressEntry = Tables<"progress_entries">;

const Photos = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [entries, setEntries] = useState<ProgressEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [compareA, setCompareA] = useState<string | null>(null);
  const [compareB, setCompareB] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data } = await supabase
        .from("progress_entries").select("*").eq("user_id", user.id)
        .not("photo_urls", "is", null)
        .order("entry_date", { ascending: false });
      setEntries(data ?? []);
      setLoading(false);
    };
    fetch();
  }, [user]);

  const allPhotos = entries.flatMap((e) => (e.photo_urls || []).map((url) => ({ url, date: e.entry_date })));

  const handleSelect = (url: string) => {
    if (!compareA) { setCompareA(url); }
    else if (!compareB) { setCompareB(url); }
    else { setCompareA(url); setCompareB(null); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-display font-bold">{t.photos.title}</h1>

      {(compareA || compareB) && (
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg flex items-center justify-between">
              {t.photos.photoComparison}
              <button onClick={() => { setCompareA(null); setCompareB(null); }} className="text-sm text-muted-foreground hover:text-foreground font-body font-normal">
                {t.photos.clear}
              </button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="aspect-[3/4] overflow-hidden rounded-lg border bg-muted">
                {compareA ? <img src={compareA} alt="Before" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-muted-foreground text-sm">{t.photos.selectPhoto}</div>}
              </div>
              <div className="aspect-[3/4] overflow-hidden rounded-lg border bg-muted">
                {compareB ? <img src={compareB} alt="After" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-muted-foreground text-sm">{t.photos.selectPhoto}</div>}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {allPhotos.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground"><p>{t.photos.noPhotos}</p></div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">{t.photos.tapToCompare}</p>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
            {allPhotos.map((photo, i) => (
              <button key={i} onClick={() => handleSelect(photo.url)} className={`group relative aspect-[3/4] overflow-hidden rounded-lg border-2 transition-all ${photo.url === compareA || photo.url === compareB ? "border-primary ring-2 ring-primary/30" : "border-transparent hover:border-muted-foreground/30"}`}>
                <img src={photo.url} alt="" className="h-full w-full object-cover" />
                <div className="absolute bottom-0 left-0 right-0 bg-foreground/60 px-2 py-1 text-xs text-background">{format(new Date(photo.date), "MMM d")}</div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default Photos;
