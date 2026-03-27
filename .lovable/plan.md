

## Sync Calculator Results to Profile for Nutrition Tracker

### Problem

The `NutritionTracker` component already reads personal goals from the `profiles` table (`daily_calories`, `daily_protein`, `daily_fat`, `daily_carbs`). However, the Calculator page only saves results to `localStorage` — it never writes them to the database. So the nutrition rings always show the default fallback values (2000/150/65/250) unless the user manually edits goals in Profile settings.

### Fix

**File: `src/pages/Calculator.tsx`** (lines 137-145)

In the `handleCalculate` function, after computing results, save them to the user's profile in the database:

```typescript
const handleCalculate = async () => {
  const res = calculate(form, t);
  setResults(res);
  // existing localStorage saves...
  
  // NEW: sync to Supabase profile
  if (user) {
    await supabase.from("profiles").update({
      daily_calories: res.calories,
      daily_protein: res.protein,
      daily_fat: res.fat,
      daily_carbs: res.carbs,
    }).eq("user_id", user.id);
  }
};
```

This requires importing `useAuth` and `supabase` in Calculator.tsx (supabase is likely already available, useAuth needs to be added).

No database migration needed — the `daily_calories`, `daily_protein`, `daily_fat`, `daily_carbs` columns already exist on the `profiles` table.

No changes needed in `NutritionTracker.tsx` — it already reads these fields correctly.

### Files to modify
- `src/pages/Calculator.tsx` — import `useAuth`, get `user`, save results to `profiles` table on calculate

