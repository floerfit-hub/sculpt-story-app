

## Scalable Exercise Library Upgrade

### Overview
Extend the `exercises` table with new metadata fields, add sub-group categorization, and create an import system that safely merges new exercises without breaking existing data. The user will then provide exercise lists group-by-group for import.

### 1. Database Migration — New columns on `exercises`

```sql
ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS normalized_name text,
  ADD COLUMN IF NOT EXISTS aliases text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS is_deprecated boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS equipment text,
  ADD COLUMN IF NOT EXISTS difficulty text,
  ADD COLUMN IF NOT EXISTS exercise_type text,
  ADD COLUMN IF NOT EXISTS sub_group text,
  ADD COLUMN IF NOT EXISTS animation_url text,
  ADD COLUMN IF NOT EXISTS thumbnail_url text;

-- Backfill normalized_name for existing exercises
UPDATE public.exercises
SET normalized_name = lower(regexp_replace(name, '[^a-zA-Zа-яА-ЯіІїЇєЄґҐ0-9 ]', '', 'g'))
WHERE normalized_name IS NULL;

-- Create index for fast duplicate checking
CREATE INDEX IF NOT EXISTS idx_exercises_normalized_name ON public.exercises (normalized_name);
CREATE INDEX IF NOT EXISTS idx_exercises_muscle_group ON public.exercises (muscle_group);
```

No existing rows are deleted or have their `id` changed.

### 2. Create import edge function `import-exercises`

A backend function that accepts an array of exercise strings in format:
`"Name | Muscle Group | Equipment | Difficulty | Type"`

Logic per entry:
1. Parse the 5 fields
2. Compute `normalized_name` = lowercase, strip special chars, collapse spaces
3. Query `exercises` for matching `normalized_name` AND `muscle_group`
4. If match found → update `name` (if different), append old name to `aliases`, increment `version`
5. If no match → insert new row with all fields
6. Auto-determine `sub_group` based on `equipment`, `exercise_type`, and `muscle_group` rules:
   - Legs: Сідниці / Квадрицепс / Задня поверхня / Тренажери / Вільна вага
   - Others: Вільна вага / Тренажери / Ізоляція / Базові

The function uses `SECURITY DEFINER` SQL or service role key to bypass admin-only INSERT policy.

### 3. Update `ExerciseLibrary.tsx` — sub-group display

- Fetch exercises from DB instead of static `EXERCISES` array (or merge both)
- Add `sub_group` filter tabs within each muscle group
- Filter out `is_deprecated = true` from selection lists
- Keep deprecated exercises visible in workout history

### 4. Update `exerciseLibrary.ts` — keep as fallback

- Keep the static list as offline fallback
- Primary source becomes the `exercises` table
- Add `equipment`, `sub_group` to the `Exercise` interface

### 5. Workout history — no changes needed

- `workout_sets` references `exercise_id` which never changes
- Exercise name displayed from `exercises.name` (which may update but ID stays)
- `resolve_exercise_id` function already handles name→ID resolution

### 6. Custom exercises — untouched

- `custom_exercises` table and logic remain completely separate
- No merging with global library

### Files to modify
- **Migration** — add columns, backfill, indexes
- `supabase/functions/import-exercises/index.ts` — new edge function for batch import
- `src/data/exerciseLibrary.ts` — extend `Exercise` interface with new fields
- `src/components/workout/ExerciseLibrary.tsx` — fetch from DB, add sub-group filtering, hide deprecated

### Import workflow (after implementation)
User sends exercise lists per muscle group → call `import-exercises` edge function → exercises are safely upserted → UI reflects new entries automatically.

