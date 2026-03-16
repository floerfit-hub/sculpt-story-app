# FitTrack — Mobile App Distribution Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Local Setup](#local-setup)
3. [Building for iOS](#building-for-ios)
4. [Building for Android](#building-for-android)
5. [In-App Purchases](#in-app-purchases)
6. [Push Notifications](#push-notifications)
7. [App Store Metadata](#app-store-metadata)
8. [Privacy Policy & Permissions](#privacy-policy--permissions)
9. [Testing Checklist](#testing-checklist)
10. [Publishing](#publishing)
11. [Update Workflow](#update-workflow)

---

## Prerequisites

- **macOS** with Xcode 15+ (for iOS builds)
- **Android Studio** (for Android builds)
- **Node.js 18+** and **npm**
- Apple Developer Account ($99/year) — https://developer.apple.com
- Google Play Developer Account ($25 one-time) — https://play.google.com/console

---

## Local Setup

### 1. Export to GitHub
In Lovable, click **Export to GitHub** to transfer the project to your own GitHub repo.

### 2. Clone and install
```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
cd YOUR_REPO
npm install
```

### 3. Build the web app
```bash
npm run build
```

### 4. Add native platforms
```bash
npx cap add ios
npx cap add android
```

### 5. Sync web → native
```bash
npx cap sync
```

### 6. Switch to local builds (for production)
In `capacitor.config.ts`, **remove or comment out** the `server` block:
```ts
// server: {
//   url: '...',
//   cleartext: true,
// },
```
Then run `npx cap sync` again. This ensures the app uses the bundled `dist/` files instead of the remote URL.

---

## Building for iOS

### Open in Xcode
```bash
npx cap open ios
```

### Configure in Xcode
1. **Signing & Capabilities** → Select your Apple Developer Team
2. **Bundle Identifier** → `app.lovable.8c96f438ee81487e8e374afd5a5a19a4` (or change to your own, e.g., `com.floer.fittrack`)
3. **Display Name** → `FitTrack`
4. **App Icons** → Use `public/app-icon-1024.png` (drag into asset catalog)
5. **Deployment Target** → iOS 15.0+

### Add capabilities
- **Push Notifications** (Signing & Capabilities → + Capability)
- **In-App Purchase** (Signing & Capabilities → + Capability)
- **Background Modes** → Remote notifications

### Build
1. Select a real device or simulator
2. **Product → Archive** for App Store submission
3. **Distribute App** → App Store Connect

### Generate .ipa
- Archive → Distribute App → Ad Hoc (for testing) or App Store Connect

---

## Building for Android

### Open in Android Studio
```bash
npx cap open android
```

### Configure
1. **app/build.gradle** → `applicationId` = `"app.lovable.8c96f438ee81487e8e374afd5a5a19a4"` (or your own)
2. **App Name** in `strings.xml` → `FitTrack`
3. **App Icons** → Use Android Studio's **Image Asset** tool with `public/app-icon-1024.png`
4. **Min SDK** → 23 (Android 6.0)

### Build signed APK/AAB
1. **Build → Generate Signed Bundle / APK**
2. Create a keystore (keep it safe — you need it for every update!)
3. Select **Android App Bundle (.aab)** for Play Store
4. Build release variant

---

## In-App Purchases

### Recommended: RevenueCat
For cross-platform subscription management, use [RevenueCat](https://www.revenuecat.com/):

```bash
npm install @revenuecat/purchases-capacitor
npx cap sync
```

### Setup Steps

#### 1. Create RevenueCat account
- https://app.revenuecat.com
- Create a project "FitTrack"

#### 2. Configure in App Store Connect (iOS)
1. **My Apps → FitTrack → Subscriptions**
2. Create subscription group: "FitTrack Premium"
3. Add product:
   - **Product ID**: `fittrack_premium_monthly`
   - **Price**: $1.00/month
   - **Product ID**: `fittrack_premium_yearly`  
   - **Price**: $10.00/year

#### 3. Configure in Google Play Console (Android)
1. **Monetize → Subscriptions**
2. Create subscription:
   - **Product ID**: `fittrack_premium_monthly` — $1.00/month
   - **Product ID**: `fittrack_premium_yearly` — $10.00/year

#### 4. Connect stores to RevenueCat
- Add Apple App Store credentials (shared secret from App Store Connect)
- Add Google Play credentials (service account JSON)

#### 5. Integrate in your app
Create `src/lib/purchases.ts`:
```typescript
import { Capacitor } from '@capacitor/core';
import Purchases from '@revenuecat/purchases-capacitor';

export const initPurchases = async () => {
  if (!Capacitor.isNativePlatform()) return;
  
  await Purchases.configure({
    apiKey: 'YOUR_REVENUECAT_API_KEY', // Different for iOS vs Android
  });
};

export const getOfferings = async () => {
  const offerings = await Purchases.getOfferings();
  return offerings.current;
};

export const purchasePackage = async (pkg: any) => {
  const result = await Purchases.purchasePackage({ aPackage: pkg });
  return result.customerInfo;
};

export const checkSubscription = async () => {
  const info = await Purchases.getCustomerInfo();
  return info.customerInfo.entitlements.active['premium'] !== undefined;
};

export const restorePurchases = async () => {
  const info = await Purchases.restorePurchases();
  return info.customerInfo;
};
```

#### 6. Sync with backend
After a purchase, update the subscription in your backend:
```typescript
const syncSubscription = async (isActive: boolean, plan: string) => {
  await supabase.from('subscriptions').update({
    plan: isActive ? plan : 'free',
    status: isActive ? 'active' : 'expired',
  }).eq('user_id', user.id);
};
```

---

## Push Notifications

### iOS Setup
1. Create **APNs Key** in Apple Developer Portal → Keys
2. Upload to your push notification service (e.g., Firebase or OneSignal)

### Android Setup
1. Add Firebase to your Android project
2. Download `google-services.json` → place in `android/app/`

### In your app
```typescript
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';

export const initPushNotifications = async () => {
  if (!Capacitor.isNativePlatform()) return;

  const permission = await PushNotifications.requestPermissions();
  if (permission.receive === 'granted') {
    await PushNotifications.register();
  }

  PushNotifications.addListener('registration', (token) => {
    // Send token to your backend to store for this user
    console.log('Push registration token:', token.value);
  });

  PushNotifications.addListener('pushNotificationReceived', (notification) => {
    console.log('Push received:', notification);
  });
};
```

---

## App Store Metadata

### App Name
**FitTrack — Workout Tracker**

### Short Description (80 chars)
> Track workouts, monitor body progress & get AI-powered fitness insights.

### Full Description

```
FitTrack is your all-in-one fitness companion designed to help you track workouts, monitor body composition, and reach your goals faster.

🏋️ WORKOUT TRACKING
• Log exercises with sets, reps, and weight
• Built-in exercise library with 50+ exercises
• Rest timer with customizable intervals
• Track workout duration and volume

📊 PROGRESS ANALYTICS
• Visual progress charts for weight and body measurements
• Track body fat, waist, chest, arms, and more
• Photo progress with side-by-side comparison
• Personal records tracking

💪 RECOVERY & READINESS
• Muscle recovery heatmap shows when you're ready to train again
• CNS fatigue monitoring
• Science-based recovery recommendations
• Morning check-in for daily readiness score

🤖 AI-POWERED INSIGHTS (Premium)
• Personalized workout recommendations
• Smart training insights based on your data
• Fitness score calculation
• Body composition analysis

📱 FEATURES
• Dark mode by default
• Works offline
• Cloud sync — never lose your data
• Available in English and Ukrainian
• Leaderboards to compete with friends

Start your fitness journey with FitTrack today!
```

### Keywords (Apple — 100 chars max)
```
workout,tracker,fitness,gym,exercise,body,weight,progress,recovery,muscles,training,log
```

### Category
- **Primary**: Health & Fitness
- **Secondary**: Lifestyle

### Content Rating
- **Apple**: 4+ (no objectionable content)
- **Google**: Everyone

---

## Privacy Policy & Permissions

### Data Collected
| Data Type | Purpose | Shared? |
|-----------|---------|---------|
| Workout data | App functionality | No |
| Body measurements | Progress tracking | No |
| Email address | Authentication | No |
| Subscription status | Premium features | No |
| Photos (optional) | Progress photos | No |

### Required Permissions
| Permission | Platform | Reason |
|------------|----------|--------|
| Camera | iOS/Android | Progress photos |
| Photo Library | iOS/Android | Save/upload progress photos |
| Push Notifications | iOS/Android | Workout reminders |
| Network | iOS/Android | Cloud sync |

### Privacy Policy URL
Use your existing privacy policy page: `https://floer-fittrack-pro.lovable.app/privacy`

### App Privacy (Apple)
In App Store Connect → App Privacy:
- **Data Used to Track You**: None
- **Data Linked to You**: Email, Fitness Data, Body Measurements
- **Data Not Linked to You**: Diagnostics

---

## Testing Checklist

### Functional Tests
- [ ] User registration and login
- [ ] Workout creation, exercise logging, completion
- [ ] Body measurements entry
- [ ] Photo upload and viewing
- [ ] Progress charts rendering
- [ ] Subscription purchase flow
- [ ] Subscription restoration
- [ ] Premium features gated for free users
- [ ] Premium features unlocked for paid users
- [ ] Push notification registration
- [ ] Offline mode — app loads without network
- [ ] Data syncs when network returns
- [ ] Dark mode renders correctly
- [ ] Light mode renders correctly

### Performance Tests
- [ ] App launches in < 3 seconds
- [ ] Smooth scrolling on exercise lists
- [ ] Charts render without lag
- [ ] No memory leaks on long sessions

### Device Tests
- [ ] iPhone SE (small screen)
- [ ] iPhone 15 Pro (standard)
- [ ] iPhone 15 Pro Max (large)
- [ ] iPad (if supporting tablets)
- [ ] Android small (360px width)
- [ ] Android medium (390px width)
- [ ] Android large (412px width)

### Store Review Guidelines
- [ ] No placeholder content
- [ ] All links work (privacy, terms)
- [ ] No crashes on launch
- [ ] Login/signup works without issues
- [ ] In-app purchases work correctly
- [ ] "Restore Purchases" button exists
- [ ] App description matches functionality
- [ ] Screenshots show actual app (not mockups)

---

## Publishing

### Apple App Store
1. Go to https://appstoreconnect.apple.com
2. **My Apps → + → New App**
3. Fill in app info, screenshots, description
4. Upload build from Xcode (Product → Archive → Distribute)
5. Submit for review (typically 24-48 hours)

### Google Play Store
1. Go to https://play.google.com/console
2. **Create App → Fill details**
3. Upload .aab file from Android Studio
4. Complete store listing, content rating, pricing
5. Submit for review (typically 1-3 days)

### Required Screenshots
Generate from the running app on simulators:

| Device | Size | Count |
|--------|------|-------|
| iPhone 6.7" | 1290 × 2796 | 3-10 |
| iPhone 6.5" | 1284 × 2778 | 3-10 |
| iPhone 5.5" | 1242 × 2208 | 3-10 |
| iPad 12.9" | 2048 × 2732 | 3-10 (if supporting iPad) |
| Android Phone | 1080 × 1920+ | 3-8 |

**Suggested screenshots:**
1. Dashboard with fitness score and recovery map
2. Active workout with exercise logging
3. Progress charts showing weight trend
4. Body measurements panel
5. Exercise library

---

## Update Workflow

### For code changes made in Lovable:
1. Git pull latest changes
2. `npm install` (if dependencies changed)
3. `npm run build`
4. `npx cap sync`
5. Open in Xcode/Android Studio
6. Increment version number
7. Archive and submit

### For production builds:
Remember to remove the `server` block from `capacitor.config.ts` so the app uses local bundled files.

### Version numbering
- **iOS**: CFBundleShortVersionString (e.g., 1.0.0) + CFBundleVersion (build number)
- **Android**: versionName (e.g., 1.0.0) + versionCode (integer, increment each release)

---

## Data Backup

User data is automatically backed up via the cloud database. The architecture ensures:
- All workout data, measurements, and photos are stored server-side
- Users can log in on any device and access their data
- No local-only data that could be lost

For additional safety, consider setting up periodic database exports via the Lovable Cloud dashboard.
