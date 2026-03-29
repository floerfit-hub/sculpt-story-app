

## Nutrition Section Enhancement

### Overview
Add meal history, meal type labels, gallery upload, and rename the tab.

### 1. DB Migration: Add `meal_type` column to `food_logs`

```sql
ALTER TABLE public.food_logs ADD COLUMN meal_type text NOT NULL DEFAULT 'snack';
```

No new table needed — `food_logs` already exists with proper RLS.

### 2. Update `NutritionTracker.tsx`

**Add meal type auto-detection** based on scan time:
- 05:00–