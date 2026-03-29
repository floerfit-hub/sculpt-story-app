

## Sync Nutrition Goals Between Tracker and Plan

### Problem
`NutritionTracker` reads goals from `profiles` table (which still has defaults 2000/150/65/250 for users who calculated before the DB sync was added). `NutritionSummary` reads from `localStorage` which has the correct values (3207/176/80/446). They show different numbers.

### Fix

**File: `src/components/dashboard/NutritionTracker.tsx`** (~line 90-97)

In `fetchData`, after reading profile data, also check `localStorage` for `nutrition_results` as a secondary source. If profile values are still at defaults AND localStorage has calculated values, use the localStorage values instead. Then write them back to the profile so future loads use DB values directly.

```typescript
// After profileRes check:
if (profileRes.data) {
  const p = profileRes.data as any;
  let goals = {
    daily_calories: p.daily_calories ?? 2000,
    daily_protein: p.daily_protein ?? 150,
    daily_fat: p.daily_fat ?? 65,
    daily_carbs: p.daily_carbs ?? 250,
  };
  
  // If profile has defaults, check localStorage for calculator results
  try {
    const saved = localStorage.getItem("nutrition_results");
    if (saved) {
      const calc = JSON.parse(saved);
      if (calc.calories && goals.daily_calories === 2000) {
        goals = {
          daily_calories: calc.calories,
          daily_protein: calc.protein,
          daily_fat: calc.fat,
          daily_carbs: calc.carbs,
        };
        // Sync localStorage values to profile
        supabase.from("profiles").update({
          daily_calories: calc.calories,
          daily_protein: calc.protein,
          daily_fat: calc.fat,
          daily_carbs: calc.carbs,
        }).eq("user_id", user.id);
      }
    }
  } catch {}
  
  setGoals(goals);
}
```

This is a one-time migration: once the values are synced to the profile, subsequent loads will use DB values directly.

### Files to modify
- `src/components/dashboard/NutritionTracker.tsx` — add localStorage fallback + auto-sync to profile

