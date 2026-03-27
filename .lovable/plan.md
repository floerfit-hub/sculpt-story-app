

## Plan: Three Fixes

### 1. Remove small camera icon overlay from exercise photos — tap photo directly to upload

**File:** `src/components/workout/ExerciseLibrary.tsx` (lines 480-503)

Remove the small floating camera button (`<button>` with `absolute -bottom-1 -right-1`). Instead, make the entire image container (or the placeholder when no image) clickable to trigger the file input. The existing `img` and the placeholder `div` with Camera icon both become the upload trigger.

Same approach for custom exercise cards if they have a similar small camera button.

### 2. "Workout" quick action opens the workouts hub (not directly start)

**File:** `src/components/AppLayout.tsx` (line 36)

Change the Workout quick action from `sessionStorage.setItem("workout-view", "start")` to `sessionStorage.setItem("workout-view", "hub")` — so tapping "Workout" opens the full workouts menu with all options (start, library, history, charts).

### 3. Fix "Save Goals" not persisting — refresh profile after save

**File:** `src/pages/Profile.tsx` (lines 476-488)

The save works in the DB, but the `profile` object from `useAuth()` never refreshes, so the `useEffect` on line 152 resets local state to old values. Fix: after the `supabase.from("profiles").update(...)` call, also update the local profile state. Two options:
- Re-fetch profile from DB and update context
- Simpler: since `useAuth` doesn't expose a `setProfile`, manually prevent the `useEffect` from overwriting by checking if save just occurred

Best approach: export a `refreshProfile` function from `useAuth` hook. After saving goals, call `refreshProfile()` to sync the context. Then the `useEffect` will have the correct values.

**File:** `src/hooks/useAuth.tsx`
- Add a `refreshProfile` function that re-fetches the profile from `profiles` table and calls `setProfile`
- Export it from the context

**File:** `src/pages/Profile.tsx`
- Import `refreshProfile` from `useAuth()`
- Call `await refreshProfile()` after the update query succeeds

### Files to modify
- `src/components/workout/ExerciseLibrary.tsx` — remove camera overlay, make image area clickable
- `src/components/AppLayout.tsx` — change workout action to open hub
- `src/hooks/useAuth.tsx` — add `refreshProfile` to context
- `src/pages/Profile.tsx` — call `refreshProfile` after saving goals

