# Configuration Modes Testing Guide

## Test 1: Zero Config Mode (Default) ✅

**Environment:**
- No `.env.local` file (or empty file)
- Defaults: `AUTH_PROVIDER=none`, `STORAGE_PROVIDER=memory`

**Test Steps:**
```bash
# Make sure no .env.local exists
rm .env.local 2>/dev/null || true

# Start dev server
npm run dev
```

**Expected Behavior:**
1. App starts without errors
2. No login required - you're automatically "signed in" as anonymous
3. "Start building" button works immediately (no auth modal)
4. Can create workflows in the workflow builder
5. Workflows are stored in browser memory
6. Refreshing the page will lose all workflows (in-memory storage)
7. No UserButton in header (anonymous mode)

**Verification Checklist:**
- [ ] App loads at http://localhost:3000
- [ ] No authentication required
- [ ] Can access workflow builder
- [ ] Can create/edit workflows
- [ ] Workflows disappear on page refresh

---

## Test 2: Firebase Mode

**Environment:**
Create `.env.local` with:
```bash
NEXT_PUBLIC_AUTH_PROVIDER=firebase
NEXT_PUBLIC_STORAGE_PROVIDER=firebase

# Get these from Firebase Console (https://console.firebase.google.com/)
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id

# Optional: For agent functionality
ANTHROPIC_API_KEY=sk-ant-xxx
```

**Firebase Setup Required:**
1. Create Firebase project at https://console.firebase.google.com/
2. Enable Google Authentication: Authentication → Sign-in method → Google → Enable
3. Create Firestore database: Firestore Database → Create database → Start in test mode
4. Copy config values from Project Settings → General → Your apps → Web app config

**Test Steps:**
```bash
# Create .env.local with Firebase config
# Restart dev server
npm run dev
```

**Expected Behavior:**
1. App starts without errors
2. "Sign In" button appears in header
3. Clicking "Sign In" opens Google Sign-In popup
4. After signing in, Google avatar appears in header
5. Workflows are saved to Firestore
6. Workflows persist after page refresh
7. Signing out and back in shows same workflows

**Verification Checklist:**
- [ ] App loads at http://localhost:3000
- [ ] Sign In button visible when not authenticated
- [ ] Google Sign-In popup works
- [ ] User avatar appears after sign in
- [ ] Can create/edit workflows
- [ ] Workflows persist after page refresh
- [ ] Can sign out via avatar button
- [ ] Workflows are in Firestore (check Firebase Console)

---

## Test 3: Clerk + Convex Mode (Production)

**Environment:**
Create `.env.local` with:
```bash
NEXT_PUBLIC_AUTH_PROVIDER=clerk
NEXT_PUBLIC_STORAGE_PROVIDER=convex

# Clerk credentials
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx

# Convex deployment URL
NEXT_PUBLIC_CONVEX_URL=https://xxx.convex.cloud

# Optional: For agent functionality
ANTHROPIC_API_KEY=sk-ant-xxx
```

**Setup Required:**
1. Clerk account at https://clerk.com/
2. Convex deployment at https://www.convex.dev/
3. Configure Clerk with Convex: https://docs.convex.dev/auth/clerk

**Test Steps:**
```bash
# Create .env.local with Clerk + Convex config
# Start both Convex and Next.js
npm run dev:all
```

**Expected Behavior:**
1. Both Convex and Next.js start without errors
2. Clerk sign-in modal appears when clicking "Sign In"
3. After signing in, Clerk UserButton appears in header
4. Workflows are saved to Convex
5. Workflows persist after page refresh
6. Real-time sync works (open in two tabs, changes sync)

**Verification Checklist:**
- [ ] Both servers start successfully
- [ ] Clerk sign-in modal works
- [ ] Clerk UserButton appears after sign in
- [ ] Can create/edit workflows
- [ ] Workflows persist after page refresh
- [ ] Workflows are in Convex (check dashboard)
- [ ] Real-time sync works across tabs

---

## Quick Smoke Test (No Firebase/Clerk Setup)

If you don't have Firebase or Clerk set up yet, you can still verify the implementation works:

```bash
# Test 1: Zero config (default)
rm .env.local 2>/dev/null || true
npm run dev
# Visit http://localhost:3000 - should work immediately

# Test 2: Verify auth context is working
# Open browser console, should see no errors
# Should see workflow builder without login
```

**Console Checks:**
- No errors about missing auth provider
- No errors about missing storage provider
- App renders successfully
- Can navigate to workflow builder

---

## Troubleshooting

### Issue: "useAuthContext must be used inside AuthProvider"
**Solution:** Check that `app/layout.tsx` properly wraps with `<AuthProvider>`

### Issue: Firebase errors in console
**Solution:**
- Verify all `NEXT_PUBLIC_FIREBASE_*` vars are set in `.env.local`
- Check Firebase project has Auth and Firestore enabled
- Verify API key is correct

### Issue: Clerk not showing up
**Solution:**
- Verify `NEXT_PUBLIC_AUTH_PROVIDER=clerk` is set
- Check Clerk keys are correct
- Ensure Convex URL is set (required for Clerk mode)

### Issue: Storage not persisting
**Solution:**
- Zero config mode uses memory storage (intentional - data is ephemeral)
- For persistence, use Firebase or Convex mode

---

## Implementation Verification

All files created/modified:
- ✅ `lib/auth/` - Auth abstraction (5 files)
- ✅ `lib/storage/` - Storage abstraction (5 files)
- ✅ `lib/firebase/config.ts` - Firebase initialization
- ✅ `components/providers/AuthProvider.tsx` - React Context provider
- ✅ `app/layout.tsx` - Conditional provider wrapping
- ✅ `app/page.tsx` - Uses auth context
- ✅ `hooks/useWorkflow.ts` - Uses storage abstraction
- ✅ `app/api/workflows/route.ts` - Graceful degradation
- ✅ `.env.example` - Complete documentation
- ✅ `README.md` - Configuration guide

**Zero TypeScript errors in new code** ✅
