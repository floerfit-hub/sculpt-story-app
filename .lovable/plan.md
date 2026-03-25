

## Dashboard Bento Grid Redesign

### What changes

**1. Dashboard layout (`src/pages/Dashboard.tsx`)**
- Replace `space-y-5` with `gap-12` (3rem) spacing between all sections
- Update header: "Hello, {name}! 💪" → `text-3xl font-bold`
- Add skeleton loading state using `Skeleton` components instead of the current spinner
- Wrap the panel rendering in a layout that uses bento-style grid for the Steps + Calories widgets

**2. FitnessScore centerpiece (`src/components/dashboard/FitnessScore.tsx`)**
- Make the circular gauge massive: increase `size` to ~220px, score number to `text-8xl font-black`
- Center the gauge as the hero element (full-width, centered)
- Move sub-score bars below the gauge
- XP progression bar: extract outside the card as a thin full-width emerald bar directly below

**3. New Bento widgets**
- Create two side-by-side `rounded-3xl` cards in a `grid grid-cols-2 gap-4` layout:
  - **Steps card**: Large step count in `text-5xl font-black`, label in `text-xs uppercase tracking-widest text-slate-400`. Data from localStorage or a placeholder.
  - **Calories card**: Same massive typography showing today's calories vs target.
- These replace or sit alongside the existing `NutritionTracker` widget

**4. Skeleton loading screens (`src/pages/Dashboard.tsx`)**
- When `loading === true`, render skeleton placeholders that mirror the final layout:
  - Large circle skeleton for Fit Score
  - Thin bar skeleton for XP
  - Two side-by-side rounded-3xl skeleton cards for bento widgets
  - Rectangular skeletons for other panels

### Files to modify
- `src/pages/Dashboard.tsx` — layout, header, loading skeletons, bento grid
- `src/components/dashboard/FitnessScore.tsx` — massive gauge, XP bar extraction
- Possibly `src/components/dashboard/NutritionTracker.tsx` — calories data for bento widget

