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
2. Start the ML service in Docker from the project directory:

   ```powershell
   docker compose --env-file .env.local up --build -d ml-service
   ```

   The image trains and packages the text work-type model from the checked-in dataset during build. Set `ML_WORK_TYPE_MODEL_URL=http://127.0.0.1:8000/classify-work-type` and `ML_IMAGE_MODEL_URL=http://127.0.0.1:8000/predict` in `.env.local`. The image-classification model is optional; to enable it, put `municipal-image-model.keras` and its matching `municipal-image-model.classes.json` in `ml-service/image-models/`. The container is only published on localhost. Set `ML_SERVICE_TOKEN` in `.env.local` to protect requests between the app and service. Gemini 3.8 Flash (`GEMINI_API_KEY`, `GEMINI_MODEL`) is the validated fallback for uncertain predictions, voice analysis, and the optional assistant.
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

Stop the ML container with `docker compose stop ml-service`. Rebuild it after changing the ML source or training data with `docker compose --env-file .env.local up --build -d ml-service`.

## Quality checks

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
Push-Location ml-service; python -m unittest test_text_model.py -v; Pop-Location
```

The image-classification endpoint requires a separately trained `ml-service/artifacts/municipal-image-model.keras` and matching `.classes.json`. Those image artifacts are not included in this repository. Without them, `/health` reports `image_model: not_loaded` and `/predict` returns 503; text analysis continues without image observations. See [presentation.md](presentation.md) for architecture, algorithms, role/API boundaries, model evaluation, test results, limitations, and demo walkthrough.

## Deployment

### Render free web service

1. In Render, create a **Blueprint** for this repository and select `render.yaml`. It builds the Next.js app with `npm ci --include=dev && npm run build` and starts it with `npm start` on the free web-service plan.
2. When prompted, provide `MONGODB_URI` for a MongoDB Atlas database. Render generates `AUTH_SECRET` for you. Allow the deployed service to connect to Atlas using an appropriate network-access rule and a least-privilege database user.
3. Add `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` in the Render service environment to keep complaint uploads persistent. The local ML service is not deployed by this blueprint; configure externally hosted `ML_WORK_TYPE_MODEL_URL` and `ML_IMAGE_MODEL_URL` only if you deploy that service separately. `GEMINI_API_KEY` is optional and enables AI fallback/chat features.

Render's free web service can spin down after inactivity, so the first request after idle may be slow. Its local filesystem is ephemeral; do not rely on it for uploaded files or other persistent data. Never commit `.env.local` or production secrets.
