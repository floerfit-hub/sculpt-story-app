

## Localized PWA Install Button with Platform-Specific Behavior

### What changes

Rewrite `InstallPrompt.tsx` into a fully localized, platform-aware install component that uses the existing i18n system and shows contextual UI based on Android vs iOS.

### 1. Add i18n strings for install modal

**Files:** `src/i18n/en.ts`, `src/i18n/uk.ts`

Add a new `install` section with:
- `title` — "Install the App" / "Встанови додаток"
- `step1` — 'Tap "Share" (arrow icon)' / 'Натисни "Поширити" (іконка ↑)'
- `step2` — 'Select "Add to Home Screen"' / 'Обери "На початковий екран"'
- `step3` — 'Tap "Add"' / 'Натисни "Додати"'
- `gotIt` — "Got it" / "Зрозуміло"
- `installButton` — "Install App" / "Встановити додаток"
- `androidDesc` — "Install for quick access and offline use" / "Встановіть для швидкого доступу та офлайн-режиму"

### 2. Rewrite `src/components/InstallPrompt.tsx`

- Use `useTranslation()` for all text
- Detect platform: Android (has `beforeinstallprompt`) vs iOS (Safari UA check)
- Detect standalone mode — if already installed, hide entirely
- Check `localStorage` key `install-prompt-dismissed` — if set, hide
- **Show timing**: only show after first workout — check `localStorage` for `workoutCompleted` flag (set this flag in `StartWorkout.tsx` when a workout is saved)

**Android behavior:**
- Capture `beforeinstallprompt` event
- Button click triggers native install prompt
- On accept, mark `install-prompt-dismissed` in localStorage

**iOS behavior (modal):**
- Button click opens a centered Dialog/modal
- Shows 3 steps with large icons (Share icon, plus-square icon, check icon)
- Localized step text from i18n
- "Got it" button closes modal and sets `install-prompt-dismissed` in localStorage

**UI:**
- Minimal card at bottom of screen (current position is fine)
- Clean white bg, emerald accent for install button
- Dismiss (X) button saves state to localStorage

### 3. Set workout completion flag

**File:** `src/components/workout/StartWorkout.tsx`

After successful workout save, add:
```typescript
localStorage.setItem("workoutCompleted", "true");
```

### 4. Keep Profile install button

The existing install trigger in `Profile.tsx` stays as-is — it's a manual "Install App" option in settings.

### Files to modify
- `src/i18n/en.ts` — add `install` section
- `src/i18n/uk.ts` — add `install` section  
- `src/components/InstallPrompt.tsx` — full rewrite with i18n, iOS modal, conditional display
- `src/components/workout/StartWorkout.tsx` — set `workoutCompleted` flag on save

