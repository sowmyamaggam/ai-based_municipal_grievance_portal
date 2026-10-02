# CivicGuard AI — Project Guide

## Start the project

1. Copy `.env.example` to `.env.local` and configure `MONGODB_URI` and `AUTH_SECRET`.
2. Train the local work-type model and run the private ML service:

   ```powershell
   cd ml-service
   python build_dataset.py
   python train_text.py
   uvicorn main:app --host 127.0.0.1 --port 8000
   ```

3. Set `ML_WORK_TYPE_MODEL_URL=http://127.0.0.1:8000/classify-work-type`. Use the same non-empty `ML_SERVICE_TOKEN` in the Next.js app and ML service when the service is reachable outside localhost.
4. Seed the first administrator:

   ```powershell
   $env:SEED_ADMIN_PHONE="+919876543210"
   $env:SEED_ADMIN_PASSWORD="choose-a-secure-password"
   npm.cmd run seed
   ```

5. Start the portal with `npm.cmd run dev`.

## Accounts and roles

All accounts sign in using an email address and password. Citizen registration collects a username, mobile number, email address, and password. Administrators provide an email address when creating officer accounts; configure `SEED_ADMIN_EMAIL` when seeding the administrator. Server-side role and ownership checks limit citizens to their reports, officers to assigned work, and administrators to municipal-wide management.

## Complaint workflow

1. A citizen submits a description, optional address/GPS, and JPEG, PNG, or PDF evidence.
2. Uploads are type/signature/size checked, stored privately, and served through an authorized route. Cloudinary is required in production.
3. The complaint is persisted immediately; ML analysis, duplicate checks, routing, and in-app notifications proceed in the background.
4. The local text model selects Road, Drainage, Garbage, Streetlight, Water, Sanitation, or Other. A low-confidence or unavailable model invokes a schema-validated Gemini fallback.
5. Centralized work-type routing selects the appropriate department and can auto-assign an eligible officer. Officers and administrators retain final control.

## Important environment variables

| Variable | Purpose |
| --- | --- |
| `MONGODB_URI` | MongoDB connection |
| `AUTH_SECRET` | Auth.js session signing |
| `ML_WORK_TYPE_MODEL_URL` | Private local work-type endpoint |
| `ML_IMAGE_MODEL_URL` | Optional private image classifier endpoint |
| `ML_SERVICE_TOKEN` | Shared secret for a remotely reachable ML service |
| `GEMINI_API_KEY` | Fallback classification and chatbot credential |
| `GEMINI_MODEL` | Gemini model override; default `gemini-3.8-flash` |
| Cloudinary variables | Durable production upload storage |

## Quality checks

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
cd ml-service; python -m unittest test_text_model.py
```
