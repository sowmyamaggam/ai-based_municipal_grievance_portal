# AI-based Municipal Grievance Portal

AI-based Municipal Grievance Portal is a production-oriented municipal grievance platform built with Next.js App Router, MongoDB/Mongoose, email-and-password Auth.js credentials, a locally served ML work-type classifier, Gemini 3.8 Flash fallback/chat, Cloudinary, Leaflet, and Recharts.

## What is implemented

- Citizen registration, sign-in, private dashboard, GPS-aware report submission, uploads, tracking, feedback, and an account-aware assistant.
- Officer workflows for assigned reports: review uploaded evidence and protected location, correct AI suggestions, update lifecycle status, add resolution remarks, escalate, and retry AI analysis.
- Admin operations dashboard with live category/status/priority trends, department metrics, satisfaction, hotspot mapping, and officer assignment.
- Server-side Zod validation and authorization on every private API. Browser-provided roles, priorities, assignments, and AI results are never trusted.
- MongoDB `2dsphere` complaint index and configurable GPS radius (`DUPLICATE_DISTANCE_METERS`, default 100 m).
- ML-first work-type classification for seven municipal work types: Road, Drainage, Garbage, Streetlight, Water, Sanitation, and Other. Gemini 3.8 Flash is used when local confidence is below the calibrated threshold or local inference is unavailable.
- Duplicate scoring combines lexical similarity, ML image findings, GPS distance, category, and time. Reports are only flagged and never deleted.
- Complaint records are written before asynchronous analysis. Image inference is optional; an unavailable image model does not prevent text classification and routing.

## Setup

1. Copy `.env.example` to `.env.local` and set at least `MONGODB_URI` and `AUTH_SECRET`.
2. Start the local ML service and set `ML_WORK_TYPE_MODEL_URL` to its `/classify-work-type` endpoint. The checked-in text-model artifact supports work-type inference. Gemini 3.8 Flash (`GEMINI_API_KEY`, `GEMINI_MODEL`) is the validated fallback for uncertain predictions, voice analysis, and the optional assistant.
3. Add Cloudinary values for persistent uploads. Without them, development stores files under `private-uploads` and serves them only through an authenticated route. Production requires Cloudinary (or another durable object-storage integration).
4. Create the first administrator (the included local `.env.local` has development-only bootstrap values):

   ```powershell
   $env:SEED_ADMIN_PHONE="+919876543210"
   $env:SEED_ADMIN_EMAIL="admin@gmail.com"
   $env:SEED_ADMIN_PASSWORD="admin123"
   npm.cmd run seed
   ```

5. Start the app:

   ```powershell
   npm.cmd run dev
   ```

Citizen accounts are created from `/register` using username, mobile number, email, password, and password confirmation. Sign-in uses email and password. An administrator can create, assign to departments, activate, and deactivate officer accounts from **City overview → Officer management**. Roles are always enforced server-side.

## Quality checks

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
Push-Location ml-service; python -m unittest test_text_model.py -v; Pop-Location
```

The image-classification endpoint requires a separately trained `ml-service/artifacts/municipal-image-model.keras` and matching `.classes.json`. Those image artifacts are not included in this repository. Without them, `/health` reports `image_model: not_loaded` and `/predict` returns 503; text analysis continues without image observations. See [presentation.md](presentation.md) for architecture, algorithms, role/API boundaries, model evaluation, test results, limitations, and demo walkthrough.

## Deployment

Deploy to Vercel and configure the same environment values there. Use MongoDB Atlas network access controls, a strong `AUTH_SECRET`, Cloudinary upload restrictions, and least-privilege service credentials. Never commit `.env.local`.
