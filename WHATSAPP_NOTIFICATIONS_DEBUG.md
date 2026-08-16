# WhatsApp Notifications - Diagnostic Report

## 🔴 Why Notifications Are Not Being Sent

### **Issue #1: CitizenId Linkage Missing (CRITICAL)**
The main problem is that notifications only work if the `citizenId` is linked in the WhatsAppUser record.

**Flow that fails:**
1. Citizen files complaint via web form → Creates complaint with `citizen: userId`
2. Officer updates complaint status → Calls `queueWhatsAppNotification()`
3. Notification service searches: `WhatsAppUser.find({ citizenId: event.citizenId })`
4. **Result: EMPTY** - No WhatsAppUser record exists with this link
5. Notification is never sent ❌

**Why:** The citizen logged in via email/password, not WhatsApp, so they have NO WhatsAppUser record in the database.

---

### **Issue #2: Data Model Mismatch**
```typescript
// Route tries to send notification with:
queueWhatsAppNotification({
  type: "COMPLAINT_ASSIGNED",
  citizenId: citizenId as any,  // ← From User._id (web citizen)
  complaintNumber: complaint.complaintNumber,
  // ...
});

// But service searches for:
const whatsappUsers = await WhatsAppUser.find({
  citizenId: event.citizenId  // ← Looking for THIS relationship
  // But this link doesn't exist!
});
```

---

### **Issue #3: Phone Number Not Being Used as Fallback**
The notification service only searches by `citizenId`, but should also support phone number matching for citizens who registered via WhatsApp.

---

## ✅ Solutions to Implement

### **Solution 1: Link CitizenId When Registering via WhatsApp (Immediate)**

When a WhatsApp user completes the complaint registration flow:

```typescript
// In app/api/whatsapp/webhook/route.ts - createComplaintFromWhatsApp()

// Before: Try to find user by phone
let userId: string | undefined;
if (whatsappUser.citizenId) {
  userId = whatsappUser.citizenId;
} else {
  const user = await User.findOne({ phone: whatsappUser.phoneNumber });
  if (user) {
    userId = user._id;
    whatsappUser.citizenId = user._id;  // ← LINK IT!
  }
}

// After creating complaint:
// Add this to link the complaint:
whatsappUser.linkedComplaints.push({
  complaintId: complaint._id,
  linkedAt: new Date(),
});
whatsappUser.citizenId = complaint.citizen;  // ← ENSURE LINK EXISTS!
```

---

### **Solution 2: Support Phone Number Matching (Recommended)**

Modify `lib/whatsapp-notifications.ts` to search by phone number if citizenId is not found:

```typescript
export async function sendNotificationToWhatsApp(
  event: NotificationEvent
): Promise<boolean> {
  try {
    await connectToDatabase();

    // Find WhatsApp user(s) - try multiple strategies
    let whatsappUsers = await WhatsAppUser.find({
      citizenId: event.citizenId,
      notificationsEnabled: true,
    });

    // If not found by citizenId, try finding citizen's phone and match
    if (whatsappUsers.length === 0) {
      const citizen = await User.findById(event.citizenId);
      if (citizen?.phone) {
        whatsappUsers = await WhatsAppUser.find({
          phoneNumber: citizen.phone,
          notificationsEnabled: true,
        });
      }
    }

    if (whatsappUsers.length === 0) {
      console.warn(
        `No WhatsApp user found for citizen ${event.citizenId}, complaint ${event.complaintNumber}`
      );
      return false;
    }

    // ... rest of function
  }
}
```

---

### **Solution 3: Add Logging & Debugging (For Now)**

Add comprehensive logging to trace why notifications aren't being sent:

```typescript
// In lib/whatsapp-notifications.ts - sendNotificationToWhatsApp()

export async function sendNotificationToWhatsApp(
  event: NotificationEvent
): Promise<boolean> {
  try {
    await connectToDatabase();

    console.log(`[WhatsApp] Processing notification:`, {
      type: event.type,
      complaintNumber: event.complaintNumber,
      citizenId: event.citizenId,
    });

    const whatsappUsers = await WhatsAppUser.find({
      citizenId: event.citizenId,
      notificationsEnabled: true,
    });

    console.log(`[WhatsApp] Found ${whatsappUsers.length} WhatsApp users for citizen`, {
      citizenId: event.citizenId,
      users: whatsappUsers.map(u => ({ phone: u.phoneNumber, id: u._id })),
    });

    if (whatsappUsers.length === 0) {
      console.warn(
        `[WhatsApp] ⚠️ No WhatsApp users linked to citizen ${event.citizenId}`
      );
      return false;
    }

    // ... rest
  }
}
```

---

## 🎯 Test the Fix

### **Step 1: Test WhatsApp Complaint Registration**
```bash
# Use WhatsApp to send message to your number:
# Message: "register"
# Complete the flow (category → description → location → images → confirm)
# This will create a complaint AND link citizeId to phoneNumber
```

### **Step 2: Check Database**
```javascript
// In MongoDB:
db.whatsappusers.findOne({ phoneNumber: "your-number" })
// Should show:
// {
//   phoneNumber: "...",
//   citizenId: ObjectId(...),  // ← This link is KEY
//   linkedComplaints: [{ complaintId: ..., linkedAt: ... }],
//   notificationsEnabled: true
// }
```

### **Step 3: Update Complaint via Admin**
Go to admin dashboard and update the complaint status → should receive WhatsApp notification

---

## 📋 Implementation Checklist

- [ ] **Immediate**: Add citizenId link when WhatsApp complaint is created
  - File: `app/api/whatsapp/webhook/route.ts`
  - Function: `createComplaintFromWhatsApp()`
  - Change: Set `whatsappUser.citizenId = complaint.citizen;` before save

- [ ] **Short-term**: Implement phone number fallback matching
  - File: `lib/whatsapp-notifications.ts`
  - Function: `sendNotificationToWhatsApp()`
  - Add: Secondary search by citizen phone number

- [ ] **Testing**: Add comprehensive logging
  - File: `lib/whatsapp-notifications.ts`
  - Add: `console.log()` statements to trace execution

- [ ] **Verification**: Test end-to-end flow
  1. Register complaint via WhatsApp
  2. Check WhatsAppUser has citizenId linked
  3. Update complaint via admin panel
  4. Verify WhatsApp notification received

---

## 📊 Data Flow Comparison

### ❌ Current (Broken) Flow:
```
Web Citizen Files Complaint
    ↓
complaint.citizen = userId (from web session)
    ↓
Officer Updates Status
    ↓
queueWhatsAppNotification({ citizenId: userId })
    ↓
Find WhatsAppUser WHERE citizenId = userId
    ↓
❌ RESULT: Empty (citizen never used WhatsApp)
```

### ✅ Fixed Flow:
```
WhatsApp User Files Complaint
    ↓
Complaint.citizen = newUser._id
    ↓
WhatsAppUser.citizenId = complaint.citizen  ← LINK CREATED
    ↓
Officer Updates Status
    ↓
queueWhatsAppNotification({ citizenId: complaint.citizen })
    ↓
Find WhatsAppUser WHERE citizenId = complaint.citizen
    ↓
✅ RESULT: Found! Send notification
```

---

## 🔧 Quick Fix Code

Add this to `app/api/whatsapp/webhook/route.ts` in `createComplaintFromWhatsApp()` after creating the complaint:

```typescript
// AFTER: const complaint = await Complaint.create({...})

// Link the WhatsApp user to the citizen account
whatsappUser.citizenId = complaint.citizen;
whatsappUser.linkedComplaints.push({
  complaintId: complaint._id,
  linkedAt: new Date(),
});

// BEFORE: await whatsappUser.save();
```

This ensures that when an officer updates the complaint, notifications will find the linked WhatsApp user.

---

## 🚨 What's Currently Missing

- ❌ No error logs showing notification failures
- ❌ No database validation that citizenId is linked
- ❌ No fallback for web-registered citizens receiving WhatsApp notifications
- ❌ No monitoring dashboard for failed notifications
- ✅ WhatsApp API credentials are now correct
- ✅ Notification queuing system is in place
- ✅ Message templates are created

**Next step: Apply the fixes above to enable WhatsApp notifications! 🚀**
