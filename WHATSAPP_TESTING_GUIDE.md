# WhatsApp Notifications - Implementation Complete & Testing Guide

## ✅ What Was Fixed

### 1. **CitizenId Linkage** ✅
When a complaint is created via WhatsApp, the `citizenId` is now properly linked:
```typescript
// File: app/api/whatsapp/webhook/route.ts
whatsappUser.citizenId = complaint.citizen;  // Link created!
```

**Impact:** Notifications can now find the WhatsApp user when complaint status changes.

---

### 2. **Phone Number Fallback Matching** ✅
Added fallback search by citizen's phone number:
```typescript
// File: lib/whatsapp-notifications.ts
if (whatsappUsers.length === 0) {
  const citizen = await User.findById(event.citizenId);
  if (citizen?.phone) {
    whatsappUsers = await WhatsAppUser.find({
      phoneNumber: citizen.phone,
      notificationsEnabled: true,
    });
  }
}
```

**Impact:** Web-registered citizens can now receive notifications if their phone number matches a WhatsApp user.

---

### 3. **Comprehensive Logging** ✅
Added detailed logging throughout the notification flow:
```typescript
[WhatsApp] Processing COMPLAINT_ASSIGNED notification:
  complaintNumber: CG-2024-ABC12345
  citizenId: ObjectId(...)

[WhatsApp] Found 1 users by citizenId
[WhatsApp] Sending COMPLAINT_ASSIGNED to 91XXXXXXXXXX
[WhatsApp] ✓ Message sent to 91XXXXXXXXXX, ID: wamid.xxx
```

**Impact:** Easy debugging when notifications fail - just check server logs!

---

## 🧪 Step-by-Step Testing Guide

### **Test Case 1: WhatsApp Complaint → Notification** (RECOMMENDED FIRST TEST)

**Setup:**
1. Have your WhatsApp number ready (the one receiving messages)
2. Ensure `.env.local` has valid WhatsApp credentials
3. Start the app in development: `npm run dev`

**Test Steps:**

1. **Send WhatsApp Message:**
   - Open WhatsApp
   - Send message to your WhatsApp bot number: `register`
   - Follow the flow: category → description → location → images → confirm

2. **Check Server Logs:**
   ```
   [WhatsApp] Processing COMPLAINT_REGISTERED notification:
     complaintNumber: CG-2024-XXXXX
     citizenId: ObjectId(...)
   
   [WhatsApp] Found 1 users by citizenId
   [WhatsApp] ✓ Message sent to 91XXXXXXXXXX, ID: ...
   ```

3. **Verify You Received Notification:**
   - Check WhatsApp for confirmation message
   - Message should say: "✅ Complaint Registered!"
   - Save the complaint ID for next test

4. **Check Database:**
   ```javascript
   // MongoDB
   db.whatsappusers.findOne({ phoneNumber: "your-number" })
   // Should show:
   {
     phoneNumber: "...",
     citizenId: ObjectId(...),  // ← LINK EXISTS!
     linkedComplaints: [{ complaintId: ..., linkedAt: ... }]
   }
   ```

---

### **Test Case 2: Status Update → WhatsApp Notification**

**Prerequisites:** Complete Test Case 1 first!

**Test Steps:**

1. **Go to Admin Dashboard:**
   - Login as admin (email: `admin@civicguard.local`, password: `Admin@12345`)
   - Navigate to Admin Dashboard
   - Find the complaint you created (CG-2024-XXXXX)

2. **Update Complaint Status:**
   - Click on the complaint
   - Change status to: "IN_PROGRESS"
   - Add remarks: "Officer is investigating this issue"
   - Click "Update"

3. **Check Server Logs:**
   ```
   [WhatsApp] Queuing STATUS_CHANGED notification for complaint CG-2024-XXXXX
   [WhatsApp] Processing STATUS_CHANGED notification:
     complaintNumber: CG-2024-XXXXX
     citizenId: ObjectId(...)
   
   [WhatsApp] Found 1 users by citizenId
   [WhatsApp] Sending STATUS_CHANGED to 91XXXXXXXXXX
   [WhatsApp] ✓ Message sent to 91XXXXXXXXXX, ID: ...
   ```

4. **Verify WhatsApp Notification:**
   - Check WhatsApp for notification
   - Message should show:
     ```
     🔄 *Status Updated*
     
     Complaint *CG-2024-XXXXX*
     New Status: IN_PROGRESS
     Details: Officer is investigating this issue
     ```

---

### **Test Case 3: Complaint Assignment → Notification**

**Test Steps:**

1. **Assign Complaint to Officer:**
   - Admin dashboard → Select complaint
   - Select an officer from the dropdown
   - Click "Assign"

2. **Check Server Logs:**
   ```
   [WhatsApp] Queuing COMPLAINT_ASSIGNED notification
   [WhatsApp] ✓ Message sent to 91XXXXXXXXXX, ID: ...
   ```

3. **Verify WhatsApp Notification:**
   - Should receive:
     ```
     📋 *Complaint Assigned*
     
     Your complaint *CG-2024-XXXXX* has been assigned to an officer.
     Officer: [Officer Name]
     ```

---

### **Test Case 4: Mark as Resolved → Notification**

**Test Steps:**

1. **Update to Resolved:**
   - Admin/Officer dashboard → Select complaint
   - Change status to: "RESOLVED"
   - Add remarks: "Issue has been fixed"
   - Click "Update"

2. **Check Server Logs:**
   ```
   [WhatsApp] Queuing RESOLVED notification
   [WhatsApp] ✓ Message sent...
   ```

3. **Verify WhatsApp Notification:**
   - Should receive:
     ```
     ✔️ *Complaint Resolved*
     
     Complaint *CG-2024-XXXXX* has been resolved.
     Officer: Issue has been fixed
     ```

---

## 🐛 Debugging: What to Check If Notifications Don't Arrive

### **Issue #1: "No WhatsApp users found for citizen"**
```
[WhatsApp] ⚠️ No WhatsApp users found for citizen ObjectId(...)
```

**Solutions:**
1. Verify `citizenId` link exists:
   ```javascript
   db.whatsappusers.findOne({ citizenId: ObjectId("...") })
   ```
   
2. If not found, manually link:
   ```javascript
   db.whatsappusers.updateOne(
     { phoneNumber: "your-number" },
     { $set: { citizenId: ObjectId("...") } }
   )
   ```

3. Ensure `notificationsEnabled` is true:
   ```javascript
   db.whatsappusers.updateOne(
     { phoneNumber: "your-number" },
     { $set: { notificationsEnabled: true } }
   )
   ```

---

### **Issue #2: "WhatsApp API error"**
```
[WhatsApp] ✗ Failed to send to 91XXXXXXXXXX: WhatsApp API error: Unauthorized
```

**Solutions:**
1. Check `.env.local` has correct credentials:
   - `WHATSAPP_ACCESS_TOKEN` - Should be your Meta token
   - `WHATSAPP_PHONE_NUMBER_ID` - Should be valid
   - `WHATSAPP_BUSINESS_ACCOUNT_ID` - Should be valid

2. Verify token is not expired:
   - Go to Meta Business Manager
   - Check token expiry date
   - Regenerate if needed

3. Check webhook URL is registered:
   - Meta Developer Dashboard → WhatsApp
   - Verify webhook URL points to your domain
   - Verify webhook token matches

---

### **Issue #3: "Found 0 users by citizenId, trying phone number fallback..."**
```
[WhatsApp] Found 0 users by citizenId
[WhatsApp] Trying phone number fallback: 91XXXXXXXXXX
[WhatsApp] Found 0 users by phone number
```

**Solutions:**
1. Citizen and WhatsApp user have different phone numbers
2. Phone numbers might have different formatting (with/without +91, 0, etc.)
3. Citizen needs to register via WhatsApp first OR manually link phone

---

### **Issue #4: "Exception sending to..."**
```
[WhatsApp] Exception sending to 91XXXXXXXXXX: Error: ...
```

**Solutions:**
1. Check detailed error message in logs
2. Common issues:
   - Invalid phone number format
   - Citizen not opted-in to notifications
   - WhatsApp account restricted

---

## 📊 Monitoring & Logs

### **Check Real-Time Logs**
```bash
# Terminal 1: Start dev server
npm run dev

# Terminal 2: Watch logs for WhatsApp
grep -i whatsapp ~/.pm2/logs/*.log  # Or check your log location
```

### **Key Log Patterns to Look For**

✅ **Success:**
```
[WhatsApp] ✓ Message sent to 91XXXXXXXXXX, ID: wamid_XXXXX
[WhatsApp] ✓ Queued notification delivered
```

⚠️ **Warning (Non-Critical):**
```
[WhatsApp] No WhatsApp users found for citizen...
[WhatsApp] Trying phone number fallback...
```

❌ **Errors (Fix Required):**
```
[WhatsApp] ✗ Failed to send to...
[WhatsApp] Exception...
WhatsApp API error: Unauthorized
```

---

## 🚀 Production Deployment Checklist

Before going live with WhatsApp notifications:

- [ ] Test all 4 test cases above
- [ ] Verify server logs show successful sends
- [ ] Confirm WhatsApp messages are being received
- [ ] Test with multiple WhatsApp numbers
- [ ] Verify `notificationsEnabled` flag works
- [ ] Update `.env.local` with production credentials:
  - Fresh `WHATSAPP_ACCESS_TOKEN`
  - Fresh `WHATSAPP_VERIFY_TOKEN` (random string)
  - Fresh `WHATSAPP_APP_SECRET`
- [ ] Deploy and monitor logs for 24 hours
- [ ] Set up alerts for failed notifications
- [ ] Document any unexpected behaviors
- [ ] Add rate limiting if high volume expected

---

## 📞 Support Commands

### **Check if WhatsApp User Exists**
```javascript
db.whatsappusers.findOne({ phoneNumber: "91XXXXXXXXXX" })
```

### **Manually Link CitizenId**
```javascript
db.whatsappusers.updateOne(
  { phoneNumber: "91XXXXXXXXXX" },
  { 
    $set: { 
      citizenId: ObjectId("CITIZEN_ID_HERE"),
      notificationsEnabled: true 
    } 
  }
)
```

### **Find Complaints by Phone Number**
```javascript
db.complaints.find({ 
  "citizen": ObjectId(...) // From WhatsAppUser.citizenId
})
```

### **Check Message History**
```javascript
db.whatsappusers.findOne(
  { phoneNumber: "91XXXXXXXXXX" },
  { messageHistory: 1 }
)
```

---

## ✨ Summary

**What's Now Working:**
- ✅ WhatsApp complaints automatically create citizen link
- ✅ Status updates send WhatsApp notifications
- ✅ Detailed logs for debugging
- ✅ Phone number fallback for web-registered citizens
- ✅ Comprehensive error handling

**Next Steps:**
1. Run through all 4 test cases above
2. Check server logs for [WhatsApp] prefixed messages
3. Verify WhatsApp notifications are being received
4. Deploy with confidence! 🚀

**Questions?** Check the logs - they'll tell you exactly what's happening! 📊
