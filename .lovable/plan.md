

## Exercise Photos: Delete, Gallery, and In-Workout Management

### What changes

**1. Exercise Library — delete photo & gallery upload**

In `ExerciseLibrary.tsx`:
- Remove `capture="environment"` from both file inputs (add form line 244, edit form line 308) so users can choose from gallery
- Add a "Delete photo" button next to the photo preview in the edit form — clears `image_url` from `custom_exercises` table and deletes the file from `exercise-images` storage bucket
- Add a "Delete photo" button in the add form when a preview exists

**2. Built-in exercises — allow replacing default photos**

- When viewing a built-in exercise in the exercise list (lines 412-430), add a small camera/edit icon overlay on the exercise thumbnail
- Tapping it opens file picker (gallery), uploads to `exercise-images` bucket under a path like `{userId}/builtin-{exerciseName}.jpg`
- Store the custom override URL in a local state map and also persist it in a new or existing mechanism (use `custom_exercises` table with a flag, or a simpler approach: store overrides in `localStorage` keyed by exercise name)
- Better approach: use the `exercise-images` storage bucket with a convention `{userId}/override-{exerciseName}.jpg` and check for its existence. On upload, the override takes priority over the static import from `exerciseImages.ts`
- Simplest reliable approach: add a state `overrideImages: Record<string, string>` loaded from localStorage on mount. When user uploads a replacement, save to storage bucket and update localStorage. Display override image if available, otherwise fall back to `EXERCISE_IMAGES[name]`.

**3. During workout recording — photo per exercise**

In `StartWorkout.tsx`:
- Add a small camera button next to each exercise name in the workout card (line 670 area)
- Tapping opens file picker (gallery), uploads compressed image to `exercise-images` bucket
- Show thumbnail next to exercise name if photo exists
- Use `EXERCISE_IMAGES` map + custom exercise `image_url` + override images to display existing photos
- Allow deleting photo with a tap-to-remove or X button on the thumbnail

### Technical details

**Files to modify:**
- `src/components/workout/ExerciseLibrary.tsx` — remove `capture` attrs, add delete photo buttons, add override photo for built-in exercises
- `src/components/workout/StartWorkout.tsx` — add photo upload/delete UI per exercise during workout
- `src/data/exerciseImages.ts` — no changes needed, used as fallback

**Photo delete logic:**
```typescript
// Delete from storage
await supabase.storage.from("exercise-images").remove([`${userId}/${exerciseId}.jpg`]);
// Clear from DB
await supabase.from("custom_exercises").update({ image_url: null }).eq("id", exerciseId);
```

**Override built-in photos:**
- Store in localStorage: `exercise-photo-overrides` → `Record<string, string>`
- Upload to `exercise-images/{userId}/override-{encodedName}.jpg`
- On load, check localStorage for overrides before falling back to `EXERCISE_IMAGES`

**Workout recording photos:**
- Reuse the `uploadExerciseImage` function (or a similar one) in `StartWorkout.tsx`
- Add `image?: string` field to `WorkoutExercise` interface
- Display small thumbnail (h-10 w-10) in the exercise card header

