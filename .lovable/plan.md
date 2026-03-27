

## Security Hardening & Pro-Only Custom Exercises

### Current Issues Identified

1. **`exercises` table**: INSERT policy uses `WITH CHECK (true)` — anyone authenticated can insert global exercises
2. **`fitness_stats` table**: SELECT policy uses `USING (true)` for leaderboard — exposes all users' stats
3. **`subscriptions` table**: Users have direct UPDATE access — can self-assign Pro status from client
4. **`custom_exercises` table**: No Pro-subscription check on INSERT — any user can create custom exercises
5. **Client-side subscription management**: `usePremium.tsx` has `activateMockPremium`, `activateMockTrial`, `cancelSubscription` that directly update the `subscriptions` table — must be removed or moved to backend

### Plan

#### 1. Database Migration — Fix RLS Policies

**A) `exercises` table (global library)**
- DROP the `Authenticated can insert exercises` policy (WITH CHECK true)
- ADD admin-only INSERT: `has_role(auth.uid(), 'admin')`
- ADD admin-only UPDATE and DELETE policies
- Keep existing SELECT for all authenticated users (this is the shared library — read-only is correct)

**B) `custom_exercises` table — Pro-only INSERT**
- DROP existing INSERT policy
- ADD new INSERT policy with check:
  ```sql
  user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM subscriptions s
    WHERE s.user_id = auth.uid()
      AND s.plan != 'free'
      AND s.status IN ('active', 'trialing')
  )
  ```
- Keep existing SELECT, UPDATE, DELETE policies (already scoped to `user_id = auth.uid()`)

**C) `subscriptions` table — remove user UPDATE**
- DROP `Users can update own subscription` policy
- Keep SELECT (users can view their own)
- Keep INSERT (created by trigger on signup)
- Admin UPDATE policy: `has_role(auth.uid(), 'admin')`
- This means only admins and backend (service role) can modify subscriptions

**D) `fitness_stats` table — fix leaderboard SELECT**
- DROP `Authenticated can read fitness_stats for leaderboard` (USING true)
- The `Users can view own fitness stats` policy already exists — keep it
- If leaderboard needs other users' stats, create a security definer function instead

**E) `exercises` table — remove open INSERT**
- Already covered in (A)

#### 2. Code Changes — Remove Client-Side Subscription Writes

**File: `src/hooks/usePremium.tsx`**
- Remove `activateMockPremium`, `activateMockTrial`, `cancelSubscription` functions
- These will fail anyway after RLS change
- Replace with read-only subscription state + a `refresh` function
- For actual subscription activation, this should go through Paddle/Stripe webhook or admin panel

**File: `src/components/subscription/Paywall.tsx`**
- Remove direct calls to `activateMockPremium` / `activateMockTrial`
- Replace with Paddle checkout redirect (or placeholder showing "Coming soon via payment")
- Keep the UI layout, just change the button action

**File: `src/pages/Pricing.tsx`**
- Same — remove `activateMockPremium` call, replace with payment flow redirect

**File: `src/components/subscription/SubscriptionManager.tsx`**
- Remove `cancelSubscription` direct call if present
- Replace with a message to contact support or use the payment provider's portal

#### 3. Code Changes — Pro Gate on Custom Exercise Creation

**File: `src/components/workout/ExerciseLibrary.tsx`**
- Import `usePremium` hook
- Wrap "Add custom exercise" button with Pro check
- If not Pro, show a toast or paywall prompt instead of the add form
- The DB policy is the real guard; this is UX-level gating

#### 4. Admin Panel — Keep Subscription Management

**File: `src/pages/AdminPanel.tsx`**
- Ensure admin subscription updates use service role or the admin RLS policy
- The admin UPDATE policy on subscriptions will allow this

#### 5. Password Protection

- Use `cloud--configure_auth` tool to enable leaked password protection (HIBP check)
- Set minimum password length to 8+ characters

### Files to modify
- **Database migration**: Fix RLS on `exercises`, `custom_exercises`, `subscriptions`, `fitness_stats`
- `src/hooks/usePremium.tsx` — remove write functions
- `src/components/subscription/Paywall.tsx` — remove mock activation
- `src/pages/Pricing.tsx` — remove mock activation
- `src/components/subscription/SubscriptionManager.tsx` — remove cancel direct call
- `src/components/workout/ExerciseLibrary.tsx` — add Pro gate on custom exercise creation
- Auth config — enable HIBP password check

### Important Notes
- After removing client-side subscription writes, the only ways to change subscriptions will be: admin panel (admin role) or backend/webhook (service role)
- The `handle_new_user` trigger uses SECURITY DEFINER so it can still insert the initial free subscription
- Leaderboard functionality may need a security definer function if cross-user stat reads are required

