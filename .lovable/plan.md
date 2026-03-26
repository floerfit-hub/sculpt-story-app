

## Plan

### 1. Profile photo from gallery

The current file input has `capture="environment"` which forces camera on mobile. Remove this attribute so the browser shows the standard picker (gallery + camera).

**File:** `src/pages/Profile.tsx` line 332
- Remove `capture="environment"` from the `<input>` element

### 2. Conditional quick actions (Add Exercise & Finish Workout only during active workout)

Currently "Add Exercise" always shows in the quick actions menu. It should only appear when a workout is actively being recorded.

**Approach:** Check `sessionStorage.getItem("workout-view") === "start"` (or `"edit"`) AND the current route is `/workouts` to determine if a workout is in progress. Conditionally include "Add Exercise" (and a "Finish Workout" action if it exists) only when active.

**File:** `src/components/AppLayout.tsx`
- Read `location.pathname` (already available) and `sessionStorage.getItem("workout-view")` 
- Wrap the "Add Exercise" action in a conditional: only include when on `/workouts` and view is `"start"` or `"edit"`
- Same for any "Finish Workout" action — only show during active recording

### Files to modify
- `src/pages/Profile.tsx` — remove `capture` attribute
- `src/components/AppLayout.tsx` — conditional quick actions

