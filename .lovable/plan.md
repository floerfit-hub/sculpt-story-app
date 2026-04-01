

## ExerciseDB API Integration for Exercise Animations

### Current State
- `exercises` table has `animation_url` and `thumbnail_url` columns (already exist)
- Storage bucket `exercise-animations` exists and is public
- No `name_en` column on `exercises` table — all names are in Ukrainian
- **`EXERCISE_DB_KEY` secret is NOT configured** — needs to be added before proceeding

### Blocker: Missing API Key

The `EXERCISE_DB_KEY` secret must be added first. I'll request it from you before writing any code.

### Plan

#### 1. DB Migration — Add `name_en` column
```sql
ALTER TABLE public.exercises ADD COLUMN name_en text;
```
This column will store the English name used to search ExerciseDB.

#### 2. Edge Function: `sync-exercise-animation`
Create `supabase/functions/sync-exercise-animation/index.ts` that:
- Accepts `{ exercise_id, search_name }` via POST
- Calls ExerciseDB API (`https://exercisedb.p.rapidapi.com/exercises/name/{name}`) using `EXERCISE_DB_KEY` as `X-RapidAPI-Key`
- Downloads the GIF from the first matching result
- Uploads it to `exercise-animations` bucket as `{exercise_id}.gif`
- Updates `exercises.animation_url` with the public URL
- Returns success/failure

#### 3. UI — "Sync Animation" button
In `ExerciseLibrary.tsx`, when viewing an exercise detail or in admin/edit mode, add a button that:
- Opens an input to specify the English search name (pre-filled from `name_en` if available)
- Calls the edge function