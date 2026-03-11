import { useState } from "react";
import { MUSCLE_GROUPS, getExercisesByGroup, type MuscleGroup } from "@/data/exerciseLibrary";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, ChevronRight } from "lucide-react";

interface Props {
  onBack: () => void;
  onSelect?: (name: string, group: string) => void;
  selectable?: boolean;
}

const MUSCLE_EMOJIS: Record<MuscleGroup, string> = {
  "Legs & Glutes": "🦵",
  "Back": "🔙",
  "Chest": "💪",
  "Shoulders": "🏋️",
  "Arms": "💪",
  "Core": "🧱",
};

const ExerciseLibrary = ({ onBack, onSelect, selectable }: Props) => {
  const [activeGroup, setActiveGroup] = useState<MuscleGroup | null>(null);

  if (activeGroup) {
    const exercises = getExercisesByGroup(activeGroup);
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setActiveGroup(null)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h2 className="text-xl font-display font-bold">{activeGroup}</h2>
        </div>
        <div className="grid gap-2">
          {exercises.map((ex) => (
            <Card
              key={ex.name}
              className={`${selectable ? "cursor-pointer active:scale-[0.98]" : ""} transition-transform`}
              onClick={() => selectable && onSelect?.(ex.name, ex.muscleGroup)}
            >
              <CardContent className="flex items-center justify-between p-4">
                <span className="font-medium">{ex.name}</span>
                {selectable && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-xl font-display font-bold">Exercise Library</h2>
      </div>
      <div className="grid gap-2">
        {MUSCLE_GROUPS.map((group) => (
          <Card
            key={group}
            className="cursor-pointer active:scale-[0.98] transition-transform"
            onClick={() => setActiveGroup(group)}
          >
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{MUSCLE_EMOJIS[group]}</span>
                <div>
                  <p className="font-display font-semibold">{group}</p>
                  <p className="text-sm text-muted-foreground">
                    {getExercisesByGroup(group).length} exercises
                  </p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ExerciseLibrary;
