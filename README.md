# AI-based Municipal Grievance Portal

AI-based Municipal Grievance Portal is a production-oriented municipal grievance platform built with Next.js App Router, MongoDB/Mongoose, Auth.js credentials, Gemini Flash, Cloudinary, Leaflet, and Recharts.

## What is implemented

- Citizen registration, sign-in, private dashboard, GPS-aware report submission, uploads, tracking, feedback, and an account-aware assistant.
- Officer workflows for assigned reports: review uploaded evidence and protected location, correct AI suggestions, update lifecycle status, add resolution remarks, escalate, and retry AI analysis.
- Admin operations dashboard with live category/status/priority trends, department metrics, satisfaction, hotspot mapping, and officer assignment.
- Server-side Zod validation and authorization on every private API. Browser-provided roles, priorities, assignments, and AI results are never trusted.
- MongoDB `2dsphere` complaint index and configurable GPS radius (`DUPLICATE_DISTANCE_METERS`, default 100 m).
- Hybrid duplicate scoring: semantic embedding where available (with lexical fallback), AI image findings, GPS distance, category, and time. Reports are only flagged and never deleted.
- Safe AI failure behavior. The complaint is written before analysis and remains usable when Gemini is unavailable or returns invalid structured output.

## Setup

1. Copy `.env.example` to `.env.local` and set at least `MONGODB_URI` and `AUTH_SECRET`.
2. Add `GEMINI_API_KEY` for AI classification, image analysis, summary, sentiment, embeddings, and chatbot. The primary model is the required `gemini-2.5-flash`; duplicate detection uses `gemini-embedding-001`. The server automatically falls back to `gemini-3.6-flash` when Google has retired 2.5 for an API key, so submissions remain safe and the AI features continue to work.
3. Add Cloudinary values for persistent uploads. Without them, development stores files locally under `public/uploads` and keeps only their URLs in MongoDB. Production requires Cloudinary (or another durable object-storage integration).
4. Create the first administrator (the included local `.env.local` has development-only bootstrap values):

   ```powershell
   $env:SEED_ADMIN_EMAIL="admin@example.gov"
   $env:SEED_ADMIN_PASSWORD="admin123"
   npm.cmd run seed
   ```

5. Start the app:

   ```powershell
   npm.cmd run dev
   ```

Citizen accounts are created from `/register`. An administrator can create, assign to departments, activate, and deactivate officer accounts from **City overview → Officer management**. Roles are always enforced server-side.

## Quality checks

```powershell
npm.cmd run typecheck
npm.cmd run build
```

## Deployment

Deploy to Vercel and configure the same environment values there. Use MongoDB Atlas network access controls, a strong `AUTH_SECRET`, Cloudinary upload restrictions, and least-privilege service credentials. Never commit `.env.local`.
