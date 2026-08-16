# CivicGuard AI — Advanced Features

## Project Context

CivicGuard AI is an AI-powered municipal grievance management platform designed to allow citizens to submit complaints and help municipal administrators efficiently manage, prioritize, assign, track, and resolve those complaints.

The project uses:

* **Frontend:** Next.js
* **Backend:** Next.js server-side APIs / API routes
* **Database:** MongoDB Atlas
* **AI:** Google Gemini `gemini-2.5-flash`
* **Maps:** Interactive map with geolocation and heatmap support
* **Messaging:** Meta WhatsApp Business Platform
* **Voice:** Speech-to-Text
* **Authentication:** Role-based authentication for citizens, officers, and administrators

The following features must be implemented as production-ready modules and integrated into the existing application without breaking existing functionality.

---

# 1. WhatsApp Integration

Integrate CivicGuard AI with the **Meta WhatsApp Business Platform** so citizens can interact with the grievance system through WhatsApp.

## Citizen Capabilities

Citizens should be able to:

* Start a conversation with the CivicGuard WhatsApp number.
* Register a new complaint.
* Provide complaint description.
* Provide complaint category.
* Share their location when supported.
* Upload/send complaint images through WhatsApp.
* Receive a generated complaint ID.
* Check the status of an existing complaint.
* Request complaint details using the complaint ID.
* Receive updates about their complaint.

## Complaint Registration Flow

Example:

```text
Citizen
   ↓
WhatsApp Message
   ↓
CivicGuard WhatsApp Webhook
   ↓
Validate User
   ↓
Collect Complaint Information
   ↓
AI Classification
   ↓
Create Complaint in MongoDB
   ↓
Generate Complaint ID
   ↓
Send Confirmation through WhatsApp
```

## WhatsApp Webhook

Implement a secure webhook endpoint for receiving WhatsApp events.

The webhook should:

* Verify Meta webhook requests.
* Receive incoming WhatsApp messages.
* Identify the sender.
* Process text messages.
* Handle image/media messages where supported.
* Handle location messages where supported.
* Connect messages to existing citizen accounts where possible.
* Store relevant conversation information.
* Trigger the appropriate complaint workflow.

Do not expose Meta access tokens or secrets in frontend code.

Store sensitive configuration in environment variables.

Example environment variables:

```env
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_BUSINESS_ACCOUNT_ID=
WHATSAPP_VERIFY_TOKEN=
WHATSAPP_APP_SECRET=
```

Do not hardcode these values.

---

# 2. WhatsApp Notifications

Implement automatic WhatsApp notifications for important complaint events.

Citizens should receive notifications when:

* Complaint is successfully registered.
* Complaint ID is generated.
* Complaint is assigned to an officer.
* Complaint status changes.
* Officer adds an update.
* Complaint requires additional information.
* Complaint is resolved.
* Complaint is reopened.
* Complaint approaches its SLA deadline.
* Complaint exceeds its SLA deadline.

## Example Notification Flow

```text
Complaint Updated
       ↓
Backend Event
       ↓
Check Citizen WhatsApp Availability
       ↓
Generate Notification
       ↓
WhatsApp Business API
       ↓
Citizen Receives Notification
```

Notifications should contain useful information such as:

* Complaint ID
* Current status
* Category
* Important update
* Timestamp
* Next action where applicable

Avoid sending unnecessary notifications.

Respect WhatsApp messaging/template requirements.

Provide proper error handling when WhatsApp delivery fails.

The complaint operation itself must not fail simply because a WhatsApp notification could not be delivered.

---

# 3. Live Complaint Heatmap

Implement an interactive complaint heatmap for administrators.

The heatmap should visually represent the geographical concentration of complaints.

## Requirements

Display complaints based on their geographic coordinates.

Each complaint should be associated with:

* Latitude
* Longitude
* Category
* Priority
* Status
* Created date
* Area/location

## Heatmap Capabilities

Administrators should be able to:

* View complaint density on a map.
* Zoom in and out.
* Pan around the map.
* Identify complaint hotspots.
* Filter complaints by category.
* Filter by priority.
* Filter by status.
* Filter by date range.
* View individual complaint markers.
* Click a marker to view basic complaint information.

## Example Categories

* Roads
* Water Supply
* Garbage/Sanitation
* Street Lights
* Drainage
* Public Safety
* Electricity
* Environment
* Other

## Heatmap Visualization

Use higher intensity areas to represent a greater concentration of complaints.

The system should not expose unnecessary personal information on the public map.

Administrators should have access to appropriate complaint details based on their role.

## Location Handling

When a citizen provides location:

```text
Location
   ↓
Validate Coordinates
   ↓
Store Latitude/Longitude
   ↓
Associate with Complaint
   ↓
Display on Admin Map
```

If location is unavailable, the complaint should still be accepted.

Do not make location mandatory unless the existing application explicitly requires it.

---

# 4. Voice Complaint Registration

Allow citizens to register complaints using their voice.

The feature should support voice input and convert speech into structured complaint information.

## Voice Flow

```text
Citizen Speaks
      ↓
Audio Input
      ↓
Speech-to-Text
      ↓
Transcribed Text
      ↓
AI Processing
      ↓
Extract Complaint Information
      ↓
Citizen Confirmation
      ↓
Create Complaint
```

## Voice Features

The system should:

* Provide a microphone button.
* Record voice input.
* Convert speech to text.
* Display the generated transcript.
* Allow citizens to review/edit the transcript.
* Detect complaint category using AI.
* Detect complaint priority where appropriate.
* Extract relevant information.
* Ask for confirmation before final submission.

Support:

* English
* Telugu

The implementation should be designed so additional languages can be added later.

## AI Processing

Use the existing Gemini integration where appropriate.

The AI may extract structured information such as:

```json
{
  "description": "There is a large amount of garbage near the main road",
  "category": "Garbage/Sanitation",
  "priority": "Medium",
  "locationDescription": "Near the main road"
}
```

Do not automatically submit a complaint based solely on uncertain AI interpretation.

The citizen should be able to confirm or modify the extracted information before submission.

If speech-to-text fails, provide a clear fallback to normal text complaint registration.

---

# 5. Complaint Timeline Visualization

Implement a visual timeline for every complaint.

The timeline should show the complete lifecycle of a complaint.

## Example

```text
Complaint Registered
        ↓
AI Classified
        ↓
Complaint Reviewed
        ↓
Assigned to Officer
        ↓
Officer Accepted
        ↓
Investigation Started
        ↓
Action Taken
        ↓
Resolved
        ↓
Citizen Feedback
```

The actual timeline must be generated from real complaint events stored in MongoDB.

## Timeline Events

Possible events include:

* Complaint created
* Complaint classified
* Priority changed
* Complaint assigned
* Officer accepted
* Officer added comment
* Evidence uploaded
* Status changed
* Investigation started
* Action taken
* Complaint resolved
* Citizen provided feedback
* Complaint reopened
* Complaint closed

Each event should contain:

* Event type
* Date
* Time
* Status
* Description
* Actor/role where appropriate
* Relevant remarks
* Optional attachments/evidence

## Timeline UI

Use a clean vertical timeline.

Clearly distinguish:

* Completed events
* Current state
* Pending stages

The timeline should work on both desktop and mobile devices.

Citizens should see only information appropriate to their role.

Administrators and authorized officers may see additional internal information.

---

# Integration Requirements

All five features must integrate with the existing CivicGuard AI application.

Do not create isolated demo pages that are disconnected from the real application.

Use the existing:

* Authentication system
* MongoDB database
* Complaint model/schema
* User model
* Role system
* AI service
* API architecture
* UI components
* Design system

Before implementing anything, inspect the existing project and understand the current architecture.

Do not unnecessarily rewrite working functionality.

---

# Database Requirements

Extend the existing MongoDB schemas only when required.

Complaint records should support information required by the new features, including where applicable:

```text
complaintId
citizenId
description
category
priority
status
latitude
longitude
location
images
createdAt
updatedAt
assignedOfficer
timeline/events
```

WhatsApp-related information should be stored separately or in an appropriate existing user/communication model.

Do not store sensitive API credentials in MongoDB.

Use environment variables for secrets.

---

# AI Requirements

Use the project's existing Gemini integration.

Model:

```text
gemini-2.5-flash
```

Use AI only where it provides meaningful value, especially:

* Complaint classification
* Voice transcript understanding
* Category extraction
* Priority suggestions
* Structured complaint extraction

AI output must be validated before being stored in the database.

Do not allow malformed AI output to break complaint registration.

Use structured JSON responses where appropriate.

Provide fallback behavior when the AI service is unavailable.

---

# Security Requirements

Implement reasonable security without unnecessarily overengineering the project.

Requirements:

* Never expose API keys in frontend code.
* Store secrets in environment variables.
* Validate webhook requests.
* Validate uploaded files.
* Validate coordinates.
* Validate user permissions.
* Protect admin-only heatmap functionality.
* Prevent unauthorized access to complaints.
* Sanitize user-generated content.
* Do not expose private citizen information through public maps.
* Handle WhatsApp webhook authentication correctly.

---

# Error Handling

Every feature must have proper error handling.

Examples:

### WhatsApp failure

If WhatsApp is unavailable:

```text
Complaint creation → SUCCESS
WhatsApp notification → FAILED
```

The complaint must remain successfully stored.

### AI failure

If Gemini is unavailable:

```text
AI classification → FAILED
Fallback → Manual category selection
```

### Voice failure

If speech recognition fails:

```text
Voice recognition → FAILED
Fallback → Text complaint form
```

### Location failure

If GPS/location is unavailable:

```text
Location → UNAVAILABLE
Complaint → Still allowed
```

The user should always receive a clear and useful error message.

---

# UI/UX Requirements

Maintain a professional civic/government-style interface.

The UI should be:

* Clean
* Responsive
* Accessible
* Mobile-friendly
* Easy for non-technical citizens
* Consistent with the existing CivicGuard AI design

Use clear labels and meaningful icons.

Provide loading states for:

* Voice processing
* AI processing
* WhatsApp operations
* Map loading
* Timeline loading

Provide success and error notifications.

Do not introduce unnecessary UI complexity.

---

# Testing Requirements

Test each feature independently and as part of the complete application.

## WhatsApp

Test:

* Webhook verification
* Incoming messages
* Complaint registration
* Complaint status lookup
* Media handling
* Invalid messages
* Notification failures

## Heatmap

Test:

* Valid coordinates
* Missing coordinates
* Multiple complaints
* Category filtering
* Status filtering
* Date filtering
* Map interaction

## Voice

Test:

* English speech
* Telugu speech
* Clear speech
* Poor transcription
* AI extraction failure
* Manual correction
* Confirmation flow

## Timeline

Test:

* New complaint
* Status changes
* Officer assignment
* Resolution
* Reopening
* Multiple events
* Unauthorized access

---

# Important Development Rules

1. First inspect the existing project architecture.
2. Reuse existing components and APIs wherever possible.
3. Do not remove existing features.
4. Do not break existing authentication.
5. Do not replace MongoDB Atlas.
6. Do not replace Next.js.
7. Continue using Gemini `gemini-2.5-flash`.
8. Do not hardcode API credentials.
9. Do not create fake WhatsApp functionality when real integration can be implemented.
10. Keep external integrations configurable through environment variables.
11. Make features modular and maintainable.
12. Use proper loading, success, and error states.
13. Ensure mobile responsiveness.
14. Validate all AI-generated data before database insertion.
15. Keep citizen, officer, and administrator permissions separate.
16. Do not expose sensitive citizen information through the heatmap.
17. Preserve all existing functionality.
18. Before modifying a file, inspect its current implementation.
19. Avoid unnecessary dependency installation.
20. After implementation, test the complete application and fix integration issues.

 
