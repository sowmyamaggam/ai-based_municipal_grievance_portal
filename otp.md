 # Task: Implement Firebase Phone OTP Authentication in Next.js

## Goal
Add mobile number + OTP (SMS) based login to this Next.js (App Router) project using Firebase Phone Authentication. No custom backend OTP logic is needed — Firebase handles OTP generation, SMS delivery, and verification client-side.

## Prerequisites (already done — do not redo)
- Firebase project created (`college-project`)
- Phone sign-in provider enabled in Firebase Authentication
- Firebase Web App registered, config values available below

## Steps to implement

### 1. Install dependency
Run:
```bash
npm install firebase
```

### 2. Create `lib/firebase.js`
Create the file with this exact content:

```js
import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyBkMJdLxAjZx0PEo12bFRPEmVdwhNZffYQ",
  authDomain: "college-project-a7abc.firebaseapp.com",
  projectId: "college-project-a7abc",
  storageBucket: "college-project-a7abc.firebasestorage.app",
  messagingSenderId: "504107234143",
  appId: "1:504107234143:web:b05569a25ebca33b1efcea",
  measurementId: "G-T3HDTNR0Q8"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);
```

### 3. Create `app/login/page.jsx`
A client component with a two-step form: phone number entry, then OTP entry using a **segmented 6-box OTP input** (not a single plain text field).

Requirements:
- Use `'use client'` directive.
- Use `RecaptchaVerifier` and `signInWithPhoneNumber` from `firebase/auth`.
- Import `auth` from `@/lib/firebase`.
- State: `phone`, `otpDigits` (array of 6 strings, one per box), `step` (`'phone' | 'otp'`), `loading`, `error`. Use a `useRef` array (`inputRefs`) to hold references to each of the 6 OTP box inputs, and a `useRef` (`confirmationResult`) to hold the Firebase confirmation result.
- `setupRecaptcha()`: create an invisible `RecaptchaVerifier` attached to a `div#recaptcha-container`, only once (guard with `window.recaptchaVerifier`).
- Phone input: digits-only (strip non-digits on change), `maxLength=10`, "Send OTP" button disabled unless exactly 10 digits entered.
- `sendOtp()`: prepend `+91` to the entered phone number, call `signInWithPhoneNumber(auth, fullPhone, window.recaptchaVerifier)`, store the result in `confirmationResult.current`, move to `step = 'otp'`, and auto-focus the first OTP box. Catch and display errors.
- OTP boxes: 6 individual single-character inputs (`inputMode="numeric"`, `maxLength={1}`) laid out in a row with small gaps.
  - `handleOtpChange(index, value)`: digits-only, update that box, auto-advance focus to the next box on entry, and when the last (6th) box is filled and all 6 digits are present, auto-call `verifyOtp()` with the joined string — no manual button click required at that point.
  - `handleKeyDown(index, e)`: on Backspace in an empty box, move focus to the previous box.
  - `handlePaste(e)`: on paste, extract digits only from clipboard, take the first 6, fill all boxes, focus the last box, and auto-verify if exactly 6 digits were pasted.
- `verifyOtp(otpValue)`: call `.confirm(otpValue)` on `confirmationResult.current`. On success, redirect to `/dashboard` using `useRouter()` from `next/navigation`. On failure, show "Invalid OTP", clear all 6 boxes, and refocus the first box.
- Below the OTP boxes: a "Verify OTP" button (disabled while loading or while any box is empty — this is a fallback for users who don't trigger auto-submit) and a "Change number" text-button that resets back to `step = 'phone'` and clears the OTP boxes.
- Show the phone number under the "Enter OTP" heading so the user can confirm where the OTP was sent (e.g. "Sent to +91 XXXXXXXXXX").
- Error message in red if `error` is set.
- Styling: centered container (~340px max-width), rounded inputs/buttons, OTP boxes ~44x52px, centered text, disabled-state button color distinct from active. Inline styles are fine.

### 4. Create `app/dashboard/page.jsx`
A simple placeholder page shown after successful login:

```jsx
export default function Dashboard() {
  return <h1 style={{ textAlign: 'center', marginTop: 100 }}>Logged in successfully! 🎉</h1>;
}
```

### 5. Verify routing
Confirm this is an App Router project (`app/` directory exists at project root, not `pages/`). If the project uses the Pages Router instead, adapt `app/login/page.jsx` → `pages/login.jsx` and `app/dashboard/page.jsx` → `pages/dashboard.jsx`, and use `next/router` instead of `next/navigation` for the `useRouter` import.

### 6. Run and verify
```bash
npm run dev
```
- Visit `http://localhost:3000/login`.
- Enter a 10-digit Indian mobile number (no country code, no leading zero — the code prepends `+91`).
- Click "Send OTP" — a real SMS should arrive (Firebase Spark/free plan allows up to 10 SMS/day per project).
- Enter the received OTP and click "Verify OTP".
- Should redirect to `/dashboard` and show the success message.

## Optional but recommended: Test phone number (for demos without real SMS)
In the Firebase Console → Authentication → Sign-in method → Phone → "Phone numbers for testing", add a test number (e.g. `+91 9999999999`) with a fixed code (e.g. `123456`). Using that number + that OTP in the app logs in instantly without sending a real SMS — useful for a college project demo/viva where SMS delivery reliability isn't guaranteed.

## Notes / constraints
- Do not implement a custom backend OTP API route — Firebase handles this entirely client-side; no server-side `/api/auth/*` routes are needed for this flow.
- Do not use MSG91 — DLT registration (India) makes it impractical for a college project; Firebase Phone Auth was chosen specifically to avoid that requirement.
- The Firebase web config values above are not secret keys and can remain in client-side code as-is.
- `localhost` is authorized by default in Firebase for reCAPTCHA/testing; no extra domain whitelisting should be needed for local development.