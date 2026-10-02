# AGENTS.md

# CivicGuard AI — AI-Based Municipal Grievance Portal

## 1. Project Overview

Build a production-ready AI-Based Municipal Grievance Portal called **CivicGuard AI**.

CivicGuard AI is an intelligent municipal grievance management platform where citizens can report civic problems and municipal authorities can classify, prioritize, assign, track, resolve, and analyze complaints efficiently.

Citizens can report:

- Roads and potholes
- Garbage accumulation
- Drainage and sewage
- Streetlight failures
- Water supply problems
- Sanitation issues
- Public infrastructure damage
- Fallen trees
- Flooding
- Road obstructions
- Other municipal problems

Citizens can submit:

- Complaint text
- One or more photos
- Supporting documents
- GPS location

The system combines:

**Complaint Text + Image + GPS + Existing Complaints + AI**

The major innovation is identifying when multiple citizens are reporting the same real-world municipal problem.

Example:

Citizen A:
"There is a large pothole near the main road."

Citizen B:
"Big pothole on the main road is causing accidents."

If both complaints have similar text, similar images, nearby GPS coordinates, the same category, and a relevant time relationship, the system should identify them as possible related/duplicate complaints.

Never delete either complaint. Preserve both citizen reports and allow authorized officers/admins to link them to the same underlying issue.

---

## 2. Main Goals

The application must provide:

1. Citizen registration and login
2. Citizen profile management
3. Complaint registration
4. Photo/document upload
5. GPS-based complaint location
6. AI complaint classification
7. AI department classification
8. AI priority detection
9. AI image analysis
10. AI sentiment analysis
11. AI complaint summarization
12. AI duplicate/related complaint detection
13. GPS-based nearby complaint detection
14. Automatic department assignment
15. Officer dashboard
16. Admin dashboard
17. Citizen complaint tracking
18. AI chatbot
19. Notifications
20. Analytics and reports
21. Complaint hotspot mapping
22. Feedback and ratings

---

# 3. Core Innovation

Position CivicGuard AI as a:

**Multimodal + GPS-Aware AI Municipal Grievance Platform**

Conceptually:

```text
Complaint Text
      +
Uploaded Image
      +
GPS Location
      +
Existing Complaints
      +
AI Classification
      +
AI Priority Detection
      +
Sentiment Analysis
      +
Semantic Similarity
      ↓
Intelligent Municipal Grievance Management
```

The most important differentiating capability is:

**Detecting when multiple citizens are reporting the same real-world municipal problem using complaint text, uploaded images, GPS proximity, and category similarity.**

---

# 4. Required Technology Stack

## Frontend

Use:

- Next.js 15+
- React 19+
- TypeScript
- Next.js App Router
- Tailwind CSS
- shadcn/ui
- Lucide React
- Recharts
- Leaflet
- React Leaflet

The UI must be:

- Responsive
- Mobile-friendly
- Accessible
- Professional
- Modern
- Easy for non-technical citizens to use

Support:

- Desktop
- Tablet
- Mobile

## Backend

Use Next.js as the full-stack application/backend.

Use appropriate:

- Next.js Route Handlers
- Server Components
- Server Actions where appropriate
- TypeScript
- Zod

Do not create a separate Express backend unless there is a strong technical reason.

Keep the architecture simple.

## Database

Use:

- MongoDB Atlas
- Mongoose

MongoDB Atlas is the primary and only application database.

Do not use:

- PostgreSQL
- MySQL
- SQLite
- Firebase

Use MongoDB geospatial capabilities for GPS-based complaint searching.

Use a `2dsphere` index for complaint locations.

## AI

Use:

**Google Gemini `gemini-2.5-flash`**

This is the primary AI model.

Use Gemini for:

- Complaint classification
- Department classification
- Priority detection
- Complaint summarization
- Sentiment analysis
- AI chatbot

Use complaint text with Gemini. Send uploaded images to the private Kaggle-trained `ml-service` described in `ml-service/README.md`.

All Gemini API calls must happen server-side.

Never expose the Gemini API key to the browser.

## Authentication

Use:

**Auth.js / NextAuth.js**

Support:

- CITIZEN
- OFFICER
- ADMIN

## Validation

Use:

**Zod**

for:

- API request validation
- Form validation
- Complaint validation
- File metadata validation
- AI response validation where practical

## Maps/GPS

Use:

- Browser Geolocation API
- Leaflet
- React Leaflet
- MongoDB `2dsphere`

## Charts

Use:

**Recharts**

## File Storage

Use an appropriate object/file storage provider.

Recommended:

**Cloudinary for images**

Store file metadata and URLs in MongoDB rather than unnecessarily storing large binaries in MongoDB.

## Deployment

Target:

- Vercel
- MongoDB Atlas
- Configured external file storage
- Gemini API

## Version Control

Use:

- Git
- GitHub

---

# 5. Gemini Configuration

Use environment variables:

```env
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-2.5-flash
```

The primary model must be:

```text
gemini-2.5-flash
```

Never hardcode the API key.

Never commit `.env` or `.env.local`.

Additional environment variables may include:

```env
MONGODB_URI=...
AUTH_SECRET=...
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

Only intentionally browser-exposed values may use the `NEXT_PUBLIC_` prefix.

---

# 6. Login Dashboard

Use the following provided image as the main visual/design asset for the login dashboard:

https://www.image2url.com/r2/default/images/1786601327650-eb649f61-d88a-42bf-b44e-969dae950d25.jpg

The image must be prominently incorporated into the login page.

Do not replace it with a generic stock image.

Do not redesign the image itself.

Preferred desktop concept:

```text
+----------------------+----------------------+
|                      |                      |
|   CivicGuard AI      |   Provided Image     |
|                      |                      |
|   Login Form         |                      |
|   Email              |                      |
|   Password           |                      |
|   Login              |                      |
|                      |                      |
+----------------------+----------------------+
```

The exact layout is up to the coding agent.

Requirements:

- Use the provided image.
- Preserve image quality.
- Preserve aspect ratio.
- Make the page responsive.
- Make the form easy to use on mobile.
- Ensure sufficient contrast.
- Include CivicGuard AI branding.
- Keep the design professional and civic/government appropriate.
- Do not place important controls over visually busy parts of the image.
- On mobile, reposition/reduce the image appropriately.

The image can be downloaded and stored as an application asset if needed for reliable deployment.

---

# 7. Authentication and Authorization

Support:

## Citizen

Citizens can:

- Register
- Login
- Manage profile
- Submit complaints
- View their own complaints
- Track complaints
- Give feedback

## Officer

Officers can:

- View assigned complaints
- View complaint details
- Update status
- Add resolution remarks
- View images
- View GPS
- View AI analysis
- View possible duplicates
- Resolve complaints
- Escalate complaints
- Correct AI classifications where authorized

## Admin

Admins can:

- Manage citizens
- Manage officers
- Manage departments
- Manage categories
- Manage complaints
- Assign officers
- View analytics
- Configure duplicate detection
- Monitor critical complaints

Never trust role information supplied by the browser. Verify authorization server-side.

---

# 8. Complaint Categories

Support categories such as:

- Road Damage
- Garbage
- Drainage
- Sewage
- Streetlight
- Water Supply
- Sanitation
- Flooding
- Infrastructure
- Public Safety
- Other

The system should allow admins to manage categories and department mappings.

---

# 9. Complaint Registration

Citizens must be able to submit:

- Description
- Photos
- Documents
- GPS location
- Address/location
- Other relevant information

The complaint submission flow should be simple:

```text
Describe Problem
      ↓
Upload Photo
      ↓
Capture GPS
      ↓
AI Analysis
      ↓
Nearby Complaint Search
      ↓
Duplicate Detection
      ↓
Department Assignment
      ↓
Submit
      ↓
Track
```

The complaint must still be saved even if AI is temporarily unavailable.

---

# 10. GPS Requirements

GPS is a core feature.

Use the browser Geolocation API.

Capture:

- Latitude
- Longitude
- Accuracy

Store the location as GeoJSON:

```json
{
  "type": "Point",
  "coordinates": [longitude, latitude]
}
```

Important:

**GeoJSON coordinates are `[longitude, latitude]`, not `[latitude, longitude]`.**

If GPS permission is denied:

- Do not block complaint submission.
- Allow manual location selection.
- Allow address/location entry.

Do not silently access the user's location.

Do not expose citizen GPS information publicly.

---

# 11. MongoDB Geospatial Search

Create a MongoDB `2dsphere` index on complaint locations.

Use geospatial queries to find nearby complaints.

Example:

```javascript
{
  location: {
    $near: {
      $geometry: {
        type: "Point",
        coordinates: [longitude, latitude]
      },
      $maxDistance: 100
    }
  }
}
```

The distance threshold must be configurable.

Possible values:

- 25m
- 50m
- 100m
- 250m
- 500m

A reasonable default can be 100m.

Do not hardcode this throughout the application.

---

# 12. AI Complaint Classification

Use Gemini `gemini-2.5-flash`.

Examples:

```text
"Street light is not working"
→ Electrical Department

"Garbage has not been collected"
→ Sanitation Department

"Large pothole on the road"
→ Roads Department

"No water supply for two days"
→ Water Supply Department

"Sewage water is entering houses"
→ Drainage/Sanitation Department
```

Store:

- Category
- Department
- Confidence
- Concise reason

Authorized officers should be able to correct incorrect AI classifications.

---

# 13. AI Priority Detection

Gemini must determine:

- LOW
- MEDIUM
- HIGH
- CRITICAL

Analyze:

- Complaint text
- Uploaded image
- Category
- Severity
- Public safety impact
- Existing related complaints
- Location context

Example:

```text
"Sewage water has entered several houses."

→ CRITICAL
```

Example output:

```json
{
  "priority": "CRITICAL",
  "reason": "Sewage overflow is affecting residential properties."
}
```

Sentiment must not be the sole factor determining priority.

Use deterministic application rules where appropriate for obvious safety-critical situations.

---

# 14. AI Image Analysis

When an image is uploaded, analyze:

**Image**

Use the private Kaggle-trained image model. Gemini may analyze the complaint text separately, but uploaded image bytes must not be sent to Gemini.

Possible detections:

- Potholes
- Garbage accumulation
- Sewage overflow
- Flooding
- Water leakage
- Broken streetlights
- Fallen trees
- Road obstruction
- Infrastructure damage
- Other visible civic problems

Example:

```text
Image:
Road covered with sewage water

Text:
"Sewage water has entered our street."

AI:
Category → Sewage/Drainage
Priority → High/Critical
Department → Sanitation/Drainage
```

AI image analysis is a prediction and must not be treated as guaranteed truth.

Authorized officers should be able to review/correct the result.

---

# 15. AI Sentiment Analysis

Use Gemini to identify:

- Neutral
- Frustrated
- Angry
- Urgent
- Positive

Example:

```text
"We have complained five times and nobody has fixed the streetlight."

→ FRUSTRATED
```

Sentiment can support prioritization but cannot independently determine priority.

---

# 16. AI Complaint Summary

Gemini should generate a concise complaint summary for officers.

Example:

```text
Original:
"There is a huge pothole near the college gate and many bikes are almost falling..."

Summary:
"Large pothole near college gate creating a traffic safety hazard."
```

Do not expose internal chain-of-thought.

Only store/display concise summaries and explanations.

---

# 17. Structured Gemini Output

Prefer structured JSON responses.

Example:

```json
{
  "category": "Road Damage",
  "department": "Roads",
  "priority": "HIGH",
  "sentiment": "FRUSTRATED",
  "summary": "Large pothole creating a potential traffic hazard.",
  "confidence": 0.93,
  "reason": "The complaint text and uploaded image indicate significant road damage."
}
```

Validate Gemini and image-model output before storing it.

If Gemini returns invalid/incomplete output:

1. Do not crash.
2. Keep the complaint.
3. Mark AI analysis as failed/pending.
4. Allow retry.

---

# 18. Duplicate Complaint Detection

Duplicate/related complaint detection is a core CivicGuard AI feature.

Combine:

- Text similarity
- Image similarity
- GPS proximity
- Category similarity
- Time relationship

Conceptually:

```text
New Complaint
      ↓
GPS Search
      ↓
Find Nearby Complaints
      ↓
Text Similarity
      +
Image Similarity
      +
GPS Proximity
      +
Category Similarity
      +
Time
      ↓
Duplicate Probability
```

---

# 19. Hybrid Duplicate Detection

Do not rely only on Gemini.

Use:

### Gemini

For:

- Semantic understanding
- Image understanding
- Complaint context
- Visual analysis

### Embeddings

For:

- Semantic text similarity
- Complaint similarity

### MongoDB

For:

- Nearby complaint search
- GPS proximity
- Geospatial indexing

### Application Logic

Combine signals into the final duplicate score.

Example signals:

```text
Text similarity       0.92
Image similarity      0.88
GPS proximity         0.97
Category similarity   1.00
Time similarity       0.85
```

The final duplicate score should be calculated by application logic rather than blindly trusting an AI-generated score.

Thresholds should be configurable.

---

# 20. Duplicate Detection Example

Citizen A:

```text
"There is a large pothole near the main road."
```

Location:

```text
14.442600, 79.986500
```

Citizen B:

```text
"Big pothole on the main road is causing accidents."
```

Location:

```text
14.442640, 79.986520
```

If text, images, category, and location are highly similar:

```json
{
  "possibleDuplicate": true,
  "duplicateScore": 0.91,
  "matchedComplaintIds": ["CMP-1024"]
}
```

Show a suitable warning such as:

**Possible Related Complaint**

Do not make the citizen unable to submit the complaint.

---

# 21. Duplicate Complaint Rule

Never:

- Automatically delete duplicate complaints.
- Automatically reject duplicate complaints.
- Hide citizen reports.

Multiple citizens reporting the same issue is valuable.

Instead:

```text
Possible Duplicate
      ↓
Related Complaint
      ↓
Officer/Admin Review
      ↓
Link Reports
      ↓
Track Underlying Issue
```

Preserve each original citizen complaint.

---

# 22. Automatic Department Assignment

Workflow:

```text
Complaint
   ↓
AI Classification
   ↓
Category
   ↓
Department
   ↓
Officer Assignment
```

Mappings should be configurable.

Examples:

```text
Road Damage → Roads Department
Garbage → Sanitation Department
Streetlight → Electrical Department
Water Supply → Water Department
Sewage → Drainage/Sanitation Department
```

---

# 23. Complaint Lifecycle

Primary lifecycle:

```text
SUBMITTED
   ↓
ASSIGNED
   ↓
IN_PROGRESS
   ↓
RESOLVED
   ↓
CLOSED
```

Also support:

- REOPENED
- REJECTED
- DUPLICATE
- ESCALATED

Every important status change must be recorded in complaint history.

---

# 24. Complaint History

Track:

- Status changes
- Officer assignments
- Department changes
- Priority changes
- Category corrections
- AI analysis
- Resolution remarks
- Citizen feedback

History events should contain appropriate:

- Timestamp
- Actor
- Action
- Previous value
- New value
- Remarks

---

# 25. Citizen Dashboard

Show:

- Total complaints
- Active complaints
- Resolved complaints
- Recent complaints
- Status
- Priority
- Department
- Notifications

Complaint details should show:

- Description
- Images
- Documents where appropriate
- Category
- Priority
- Department
- Location
- Timeline
- Status
- Resolution
- Feedback

Citizens can only access their own private complaint information.

---

# 26. Officer Dashboard

Show:

- Assigned complaints
- Critical complaints
- Pending complaints
- In-progress complaints
- Possible duplicates
- Nearby complaints
- Map
- Complaint images
- AI analysis

Allow officers to:

- Update status
- Add remarks
- Upload resolution evidence
- Escalate
- Correct AI classification
- Correct priority where authorized

---

# 27. Admin Dashboard

Show:

- Total complaints
- Pending complaints
- Resolved complaints
- Critical complaints
- Department statistics
- Category statistics
- Complaint trends
- Complaint hotspots
- Duplicate complaints
- Average resolution time
- Officer performance
- Citizen satisfaction

---

# 28. Map

Use:

- Leaflet
- React Leaflet

Display complaint locations on a map.

Markers can show:

- Complaint ID
- Category
- Priority
- Status

Use appropriate visual indicators for priority/status.

Do not expose unnecessary citizen personal information.

---

# 29. Complaint Hotspots

Use GPS data to identify recurring problem areas.

Examples:

- Garbage hotspot
- Road damage hotspot
- Sewage hotspot
- Water supply hotspot
- Streetlight hotspot

Use MongoDB aggregation where appropriate.

This should help administrators identify recurring municipal problems and allocate resources.

---

# 30. Analytics

Use Recharts.

Display:

- Total complaints
- Complaints by category
- Complaints by department
- Priority distribution
- Status distribution
- Monthly trends
- Average resolution time
- Duplicate complaints
- Reopened complaints
- Citizen ratings
- Department performance

Use GPS data for map-based hotspot analytics.

---

# 31. AI Chatbot

Use:

**gemini-2.5-flash**

The chatbot should answer:

- How do I register a complaint?
- Which department handles garbage?
- What is the status of my complaint?
- Where is my complaint?
- What happens after I submit a complaint?

For complaint-specific questions:

```text
User
 ↓
Authentication
 ↓
Verify Complaint Ownership
 ↓
Retrieve Complaint from MongoDB
 ↓
Provide only authorized context to Gemini
 ↓
Generate Response
```

Never reveal another citizen's private information.

The chatbot must not bypass authorization.

---

# 32. Notifications

Notify citizens when:

- Complaint is registered
- AI analysis completes
- Officer is assigned
- Status changes
- Complaint is resolved
- Complaint is closed
- Complaint is reopened

Design the system so future integrations with email/SMS/push can be added without major rewrites.

---

# 33. Feedback and Rating

After resolution allow citizens to submit:

- Rating from 1–5
- Written feedback

Store feedback in MongoDB.

Use feedback for:

- Citizen satisfaction
- Department performance
- Service quality monitoring

---

# 34. File Uploads

Support:

- JPG
- JPEG
- PNG
- PDF

Validate:

- File type
- File size
- Metadata
- Upload errors

Do not store large binary files unnecessarily in MongoDB.

Use appropriate external object storage.

Recommended:

**Cloudinary for images.**

Store:

- URL
- Filename
- File type
- Metadata

in MongoDB.

---

# 35. API Requirements

Use Next.js Route Handlers and/or Server Actions as appropriate.

Support operations for:

- Authentication
- Complaints
- AI analysis
- Duplicate detection
- Departments
- Officers
- Notifications
- Analytics
- Feedback

Validate all incoming data.

Never trust client-provided:

- User roles
- Complaint ownership
- Priority
- Department
- AI results

---

# 36. Error Handling

Handle:

- Gemini API failures
- MongoDB failures
- Upload failures
- Invalid images
- Invalid documents
- GPS permission denial
- Network failures
- Authentication errors
- Invalid AI output

AI failure must never cause the loss of a complaint.

Preferred workflow:

```text
Complaint Submitted
      ↓
AI Analysis Pending/Failed
      ↓
Complaint remains stored
      ↓
Retry AI analysis
```

---

# 37. Privacy and Security

Protect:

- Citizen identity
- Contact information
- GPS information
- Uploaded documents
- Complaint details
- Authentication data

Never:

- Expose API keys
- Expose MongoDB credentials
- Expose private citizen data publicly
- Trust client-provided roles
- Trust client-provided AI results
- Allow unauthorized complaint access

GPS should only be visible to authorized users.

---

# 38. UI/UX

The application should feel like a professional civic/government service.

Use:

- Clean layouts
- Clear typography
- Responsive cards
- Accessible forms
- Status badges
- Priority indicators
- Maps
- Charts
- Loading states
- Error states
- Empty states
- Toasts/alerts where appropriate

Avoid:

- Excessive animations
- Overly complicated interfaces
- Unnecessary gradients
- Generic dashboard templates
- Unnecessary components

The complaint submission workflow should be extremely easy for citizens.

---

# 39. Architecture Freedom

**Do NOT prescribe a directory structure.**

The coding agent must independently decide:

- Directory organization
- File organization
- Component organization
- API organization
- Server/client boundaries
- Database abstraction
- AI service abstraction
- Authentication implementation
- State management
- Utility organization

This document defines:

- What the application must do
- Required technologies
- Required behavior
- Feature requirements

It does NOT dictate exact file structure.

Avoid unnecessary:

- Folders
- Abstractions
- Services
- Microservices
- Dependencies

Use modern Next.js best practices.

---

# 40. Engineering Principles

The implementation must:

- Use TypeScript.
- Use Next.js App Router.
- Use MongoDB Atlas.
- Use Mongoose.
- Use Gemini `gemini-2.5-flash`.
- Use Tailwind CSS.
- Use shadcn/ui.
- Use Zod.
- Use Leaflet.
- Use Recharts.
- Use reusable components.
- Keep AI calls server-side.
- Keep database operations server-side.
- Use MongoDB geospatial indexing.
- Validate AI responses.
- Store AI confidence.
- Allow human overrides.
- Make duplicate thresholds configurable.
- Handle failures gracefully.
- Avoid unnecessary complexity.
- Build real functionality instead of mock-only features.

---

# 41. AI Failure Handling

If Gemini is unavailable, rate-limited, or returns invalid output:

The complaint must still be successfully submitted.

Example:

```text
Complaint submitted successfully.

AI analysis is currently pending.
```

Store an AI status such as:

- PENDING
- PROCESSING
- COMPLETED
- FAILED

Allow authorized users/system processes to retry failed AI analysis.

---

# 42. AI Pipeline

The overall pipeline should conceptually work as:

```text
Citizen
   ↓
Complaint Text
   +
Image
   +
GPS
   ↓
Gemini 2.5 Flash
   ↓
Classification
   ↓
Image Analysis
   ↓
Priority
   ↓
Sentiment
   ↓
Summary
   ↓
MongoDB Nearby Complaint Search
   ↓
Text Similarity
   ↓
Image Similarity
   ↓
Category Similarity
   ↓
Time Comparison
   ↓
Duplicate Score
   ↓
Department Assignment
   ↓
Officer
   ↓
Resolution
```

---

# 43. Final Tech Stack Summary

| Layer | Technology |
|---|---|
| Framework | Next.js 15+ |
| Frontend | React 19+ |
| Language | TypeScript |
| Architecture | Next.js App Router |
| Styling | Tailwind CSS |
| Components | shadcn/ui |
| Icons | Lucide React |
| Backend | Next.js Route Handlers / Server Actions |
| Database | MongoDB Atlas |
| ODM | Mongoose |
| Validation | Zod |
| Authentication | Auth.js / NextAuth.js |
| Primary AI | Google Gemini `gemini-2.5-flash` |
| AI Vision | Gemini `gemini-2.5-flash` |
| AI Chatbot | Gemini `gemini-2.5-flash` |
| Semantic Similarity | Embeddings |
| Maps | Leaflet |
| React Maps | React Leaflet |
| GPS | Browser Geolocation API |
| Geospatial Search | MongoDB 2dsphere |
| Charts | Recharts |
| Image Storage | Cloudinary or equivalent |
| Deployment | Vercel |
| Version Control | Git + GitHub |

Core required stack:

**Next.js + TypeScript + MongoDB Atlas + Mongoose + Gemini `gemini-2.5-flash` + GPS + Multimodal AI + Duplicate Detection**

---

# 44. Final End-to-End Acceptance Criteria

The application is complete only when the following workflow works:

```text
Citizen Registration
        ↓
Login
        ↓
Citizen Dashboard
        ↓
Submit Complaint
        ↓
Complaint Text
        +
Photo
        +
GPS
        ↓
Gemini 2.5 Flash
        ↓
AI Classification
        ↓
AI Image Analysis
        ↓
AI Priority Detection
        ↓
AI Sentiment
        ↓
MongoDB Nearby Complaint Search
        ↓
Text/Image Similarity
        ↓
Duplicate Detection
        ↓
Department Assignment
        ↓
Officer Dashboard
        ↓
Officer Reviews Complaint
        ↓
Status Updates
        ↓
Resolution
        ↓
Citizen Notification
        ↓
Citizen Feedback
        ↓
Admin Analytics
        ↓
Complaint Hotspot Analysis
```

The final application must be a functional, production-oriented system rather than a static frontend mockup.

The key innovation must be demonstrable:

**CivicGuard AI uses Gemini `gemini-2.5-flash` multimodal AI together with MongoDB geospatial search to analyze municipal complaints, understand uploaded images, determine priority, classify complaints, and identify potentially duplicate reports of the same real-world problem using text, image, and GPS information.**
