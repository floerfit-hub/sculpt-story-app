import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, Trash2, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface Review {
  id: string;
  user_id: string;
  rating: number;
  feedback: string | null;
  workout_id: string | null;
  created_at: string;
}

const AdminReviewsTab = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const fetchReviews = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("app_reviews")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) {
      setReviews(data);
      const userIds = [...new Set(data.map((r) => r.user_id))];
      if (userIds.length > 0) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", userIds);
        if (profs) {
          const map: Record<string, string> = {};
          profs.forEach((p) => { map[p.user_id] = p.full_name || "Анонім"; });
          setProfiles(map);
        }
      }
    }
    setLoading(false);
  };

  useEffect(() => { fetchReviews(); }, []);

  const handleDelete = async (id: string) => {
    await supabase.from("app_reviews").delete().eq("id", id);
    setReviews((prev) => prev.filter((r) => r.id !== id));
    toast({ title: "Відгук видалено" });
  };

  const avgRating = reviews.length > 0
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : "—";

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>Всього: <strong className="text-foreground">{reviews.length}</strong></span>
        <span>Середня оцінка: <strong className="text-foreground">{avgRating}</strong> ⭐</span>
      </div>

      {reviews.length === 0 && (
        <p className="text-center text-muted-foreground py-8">Відгуків поки немає</p>
      )}

      {reviews.map((review) => (
        <Card key={review.id}>
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">{profiles[review.user_id] || "Анонім"}</span>
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className={`h-3.5 w-3.5 ${s <= review.rating ? "text-yellow-400 fill-yellow-400" : "text-muted"}`} />
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{format(new Date(review.created_at), "dd.MM.yyyy")}</span>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(review.id)}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            </div>
            {review.feedback && (
              <p className="text-sm text-muted-foreground">{review.feedback}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default AdminReviewsTab;
