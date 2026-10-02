# CivicGuard AI — Project Objectives

## What Does It Solve?

CivicGuard AI solves the **municipal complaint management problem** by providing a structured, transparent, and AI-assisted platform for citizens to report civic issues and for municipal authorities to track, route, and resolve them efficiently.

---

## Core Problems Addressed

### 1. **Fragmented Complaint Channels**
- **Before**: Citizens report issues through phone calls, emails, social media, walk-ins, or paper forms — no central tracking.
- **After**: Single digital portal (`/register` → submit complaint) with unique tracking numbers (CG-YYYY-XXXXXXXX).

### 2. **Lack of Visibility & Accountability**
- **Before**: Citizens don't know complaint status; officers lack clear assignments; admins have no analytics.
- **After**: 
  - Citizens track their own complaints in real-time
  - Officers see only assigned work with clear status workflow
  - Admins monitor all municipal records with analytics

### 3. **Slow, Manual Triage & Routing**
- **Before**: Complaints sit in queues; manual categorization; wrong department assignments.
- **After**: A local calibrated text classifier suggests one of seven work types; Gemini 3.8 Flash is a validated fallback for low-confidence or unavailable local inference. Central routing maps the result to a category and department. Deterministic safety rules set priority, a bounded keyword pass estimates sentiment, and eligible officers can be assigned by workload.

### 4. **Duplicate & Related Complaints Unnoticed**
- **Before**: Multiple citizens report same issue; departments work in silos.
- **After**: MongoDB `2dsphere` + weighted scoring detects related complaints:
  - Text similarity (40%)
  - Image findings (15%)
  - GPS proximity (25%)
  - Category match (10%)
  - Time relationship (10%)
  - Flagged for review — never auto-deleted

### 5. **No Feedback Loop**
- **Before**: Complaints "resolved" with no citizen confirmation.
- **After**: Citizens rate 1–5 stars + comment after resolution; reopen option.

### 6. **Data Loss Risk from External Failures**
- **Before**: Email/AI downtime loses reports.
- **After**: Complaint persisted **first** (MongoDB), then optional AI/email/notification run asynchronously. Failures logged, never roll back the report.

---

## Key Objectives

| Objective | How It's Achieved |
|-----------|-------------------|
| **Citizen empowerment** | Self-service registration, submission, tracking, feedback |
| **Officer efficiency** | Clear assignments, status workflow, evidence upload |
| **Admin oversight** | Role-based access, department management, analytics |
| **Intelligent routing** | Local-first text model, Gemini fallback, centralized department mapping, deterministic safety rules |
| **Duplicate detection** | Geo + semantic similarity scoring (configurable thresholds) |
| **Auditability** | Full history log with actor/timestamp on every change |
| **Resilience** | Core persistence before optional services; graceful degradation |
| **Privacy** | Role-enforced access; citizen data only to authorized users |

---

## System Roles & Boundaries

| Role | Can Access |
|------|------------|
| **Citizen** | Only their own complaints |
| **Officer** | Only assigned complaints |
| **Admin** | All municipal records |
| **System** | Notifications, AI analysis, duplicate detection — **never replaces human decisions** |

---

## Success Metrics

- ✅ Complaint submitted → persisted in < 2s (AI async)
- ✅ AI analysis completes → routes to correct department
- ✅ Related complaints flagged → review signal (not auto-action)
- ✅ Officer accepts → updates status → resolves with evidence
- ✅ Citizen receives notification → provides feedback
- ✅ Full audit trail preserved for every state change

---

## Non-Goals (Explicitly Out of Scope)

- ❌ Automated complaint rejection or deletion
- ❌ AI making final resolution decisions
- ❌ Replacing human judgment with sentiment-only priority
- ❌ Cross-municipality data sharing
- ❌ Real-time chat or emergency dispatch

---

## Related Documents

- [PROCESS_DOCUMENTATION.md](PROCESS_DOCUMENTATION.md) — Detailed workflows
- [PROJECT_GUIDE.md](PROJECT_GUIDE.md) — Installation & day-to-day usage
- `.env.example` — Required configuration variables