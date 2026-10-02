# CivicGuard AI — Process Documentation

## Access control

Citizen, officer, and administrator permissions are determined from the server-side Auth.js session. Browser-provided roles, ownership, assignments, routing, and AI results are never authorization inputs. State-changing routes validate their origin, schema, session, role, and ownership; public-facing errors do not disclose internal exceptions.

## Email-and-password sign-in

Registration accepts a username, mobile number, email address, password, and matching confirmation. Email is trimmed and lowercased before lookup and has a unique database index; mobile remains unique contact data. Passwords are bcrypt hashed. Auth.js uses an HTTP-only, `SameSite=Lax` cookie, adds `Secure` in production, and has an eight-hour session lifetime. Authentication requests and registration are rate limited.

## Complaint creation and analysis

The citizen submits validated text, optional address/location, and pre-authorized upload identifiers. The API saves the complaint and returns promptly, then runs analysis and duplicate detection after the response.

The work-type pipeline is:

```text
validated complaint → normalized text → cached local TF-IDF model
  → accepted prediction → centralized department mapping
  → low confidence/error only: Gemini 3.8 Flash JSON fallback (up to 3 attempts for transient 429/5xx)
  → Zod validation → centralized department mapping
```

The model artifact is loaded once at FastAPI startup. Its validation-selected threshold and prediction metadata are stored with the complaint. Image classification is optional and runs only server-to-server; image transport/model failures are ignored so valid text classification can still complete.

Priority is currently deterministic: explicit immediate hazards (for example, a live wire or collapse) become CRITICAL; selected high-impact terms such as flooding, injury, or a blocked road become HIGH; other reports default to MEDIUM. The complaint summary is normalized text truncated to 300 characters. Sentiment is a bounded keyword classification, not an independent Gemini sentiment model.

## Attachments and privacy

Only JPEG, PNG, and PDF files of at most 10 MB are accepted. Signature checks reject mismatched content. Files are outside the public directory locally and require owner/assigned-officer/admin authorization to retrieve. Local storage is development-only; production requires Cloudinary or another durable private object-storage integration.

## Duplicate reports, assignment, and notifications

GPS-enabled reports are compared with up to 15 reports from the previous 90 days inside the configured radius. A weighted score combines text (40%), image findings (15%), proximity (25%), category (10%), and time (10%). Reports are flagged rather than deleted. Successful routing assigns the least-loaded active officer in the selected department; the officer must accept before changing the complaint lifecycle. Notification failures cannot undo a saved complaint. The portal uses in-app notifications only.

## Operational checks

Run TypeScript, build, ML regression, and dependency audit checks before deployment. Configure durable uploads, a shared rate-limit store for multi-instance deployments, and a private/token-protected ML service. Rotate any credentials that were ever exposed outside secret storage.
