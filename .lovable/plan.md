

## Fix Gallery Scan + Add Food Component Breakdown

### Problem 1: Gallery scan doesn't update circles
After scanning from gallery and confirming, the circles don't fill. The likely cause: `confirmScan` calls `fetchData()` which re-queries today's logs, but the component's `todayStr` filter uses local timezone while `created_at` in Supabase is UTC. A meal added late evening in UTC+2/+3 may fall outside the `todayStr` range. Additionally, `confirmScan` doesn't optimistically update `logs` state — it relies solely on the refetch.

**Fix in `NutritionTracker.tsx`:**
- After successful insert in `confirmScan`, optimistically prepend the new entry to `logs` state immediately (don't wait for refetch)
- Also fix the date filter in `fetchData` to use ISO start/end of day with timezone awareness

### Problem 2: Break food into editable components

**Edge function (`analyze-meal/index.ts`):**
Update the system prompt to return components:
```json
{
  "food_name": "Борщ з м'ясом",
  "total_weight_g": 350,
  "components": [
    { "name": "Буряк", "weight_g": 80, "kcal": 34, "protein": 1.3, "fat": 0.1, "carbs": 7.6 },
    { "name": "Картопля", "weight_g": 60, "kcal": 46, "protein": 1.2, "fat": 0.1, "carbs": 10.5 },
    ...
  ],
  "kcal": 280, "protein": 18, "fat": 12, "carbs": 25,
  "coach_advice": "..."
}
```

**NutritionTracker.tsx — new pending scan UI:**
- `pendingScan` state gets a `components` array and `total_weight_g`
- Show each component as a row with:
  - name
  - editable weight input (g)
  - calculated kcal/protein/fat/carbs (proportional to weight change)
- When user changes a component's weight → recalculate that component's macros proportionally → update totals
- Add "+" button to add a custom component (name + weight + macros)
- Add "×" button to remove a component
- Total kcal/protein/fat/carbs shown as sum of all components
- Meal type selector and confirm/cancel buttons remain

**Saving:** When confirmed, save the total (sum of components) to `food_logs`. The component breakdown is informational during editing only — no extra DB table needed.

### Files to modify
- `supabase/functions/analyze-meal/index.ts` — update prompt to return components array
- `src/components/dashboard/NutritionTracker.tsx` — fix optimistic update after confirm, add component editing UI with weight adjustments and add/remove

