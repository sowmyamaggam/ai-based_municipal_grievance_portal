/**
 * WhatsApp Notifications Service
 * Sends notifications to citizens via WhatsApp for complaint events
 */

import { connectToDatabase } from "@/lib/db";
import { WhatsAppUser } from "@/models/WhatsAppUser";
import { User } from "@/models/User";
import { sendWhatsAppMessage } from "@/lib/whatsapp";
import { Types } from "mongoose";

interface NotificationEvent {
  type:
    | "COMPLAINT_REGISTERED"
    | "COMPLAINT_ASSIGNED"
    | "STATUS_CHANGED"
    | "OFFICER_UPDATE"
    | "REQUIRES_INFO"
    | "RESOLVED"
    | "REOPENED"
    | "APPROACHING_SLA"
    | "EXCEEDED_SLA";
  complaintId: Types.ObjectId;
  complaintNumber: string;
  citizenId: Types.ObjectId;
  data?: Record<string, any>;
}

export async function sendNotificationToWhatsApp(
  event: NotificationEvent
): Promise<boolean> {
  try {
    await connectToDatabase();

    console.log(`[WhatsApp] Processing ${event.type} notification:`, {
      complaintNumber: event.complaintNumber,
      citizenId: event.citizenId,
    });

    // Find WhatsApp user(s) linked to this citizen
    let whatsappUsers = await WhatsAppUser.find({
      citizenId: event.citizenId,
      notificationsEnabled: true,
    });

    console.log(
      `[WhatsApp] Found ${whatsappUsers.length} users by citizenId`,
      event.citizenId
    );

    // If not found by citizenId, try finding by citizen's phone number
    if (whatsappUsers.length === 0) {
      const citizen = await User.findById(event.citizenId);
      if (citizen?.phone) {
        console.log(
          `[WhatsApp] Trying phone number fallback:`,
          citizen.phone
        );
        whatsappUsers = await WhatsAppUser.find({
          phoneNumber: citizen.phone,
          notificationsEnabled: true,
        });
        console.log(
          `[WhatsApp] Found ${whatsappUsers.length} users by phone number`
        );
      }
    }

    if (whatsappUsers.length === 0) {
      console.warn(
        `[WhatsApp] ⚠️ No WhatsApp users found for citizen ${event.citizenId}, complaint ${event.complaintNumber}`
      );
      return false;
    }

    let message = "";

    switch (event.type) {
      case "COMPLAINT_REGISTERED":
        message =
          `✅ *Complaint Registered*\n\n` +
          `Your complaint *${event.complaintNumber}* has been successfully registered.\n` +
          `An administrator will review it shortly and you'll receive updates via WhatsApp.\n\n` +
          `Type /status ${event.complaintNumber} to check the status anytime.`;
        break;

      case "COMPLAINT_ASSIGNED":
        message =
          `📋 *Complaint Assigned*\n\n` +
          `Your complaint *${event.complaintNumber}* has been assigned to an officer.\n` +
          `${event.data?.officerName ? `Officer: ${event.data.officerName}` : ""}\n\n` +
          `We'll keep you updated on progress.`;
        break;

      case "STATUS_CHANGED":
        message =
          `🔄 *Status Updated*\n\n` +
          `Complaint *${event.complaintNumber}*\n` +
          `New Status: ${event.data?.newStatus || "Updated"}\n` +
          `${event.data?.remarks ? `Details: ${event.data.remarks}` : ""}\n\n` +
          `Check full details: /status ${event.complaintNumber}`;
        break;

      case "OFFICER_UPDATE":
        message =
          `💬 *Officer Update*\n\n` +
          `Complaint *${event.complaintNumber}*\n` +
          `${event.data?.update || "Your complaint has been updated."}\n\n` +
          `Type /status ${event.complaintNumber} for more details.`;
        break;

      case "REQUIRES_INFO":
        message =
          `❓ *Additional Information Needed*\n\n` +
          `Complaint *${event.complaintNumber}*\n` +
          `${event.data?.infoRequested || "We need more information to process your complaint."}\n\n` +
          `Please reply with the requested details or contact support.`;
        break;

      case "RESOLVED":
        message =
          `✔️ *Complaint Resolved*\n\n` +
          `Complaint *${event.complaintNumber}* has been resolved.\n` +
          `${event.data?.resolution || "Thank you for reporting this issue."}\n\n` +
          `Would you like to provide feedback? Reply with 'feedback' followed by your rating (1-5).`;
        break;

      case "REOPENED":
        message =
          `🔄 *Complaint Reopened*\n\n` +
          `Complaint *${event.complaintNumber}* has been reopened for further action.\n` +
          `${event.data?.reason || "We're continuing to work on this issue."}\n\n` +
          `Updates will be sent shortly.`;
        break;

      case "APPROACHING_SLA":
        message =
          `⏰ *SLA Approaching*\n\n` +
          `Complaint *${event.complaintNumber}*\n` +
          `This complaint is approaching its resolution deadline.\n\n` +
          `Status: ${event.data?.currentStatus || "In Progress"}\n` +
          `${event.data?.hoursRemaining ? `Hours Remaining: ${event.data.hoursRemaining}` : ""}`;
        break;

      case "EXCEEDED_SLA":
        message =
          `⚠️ *SLA Exceeded*\n\n` +
          `Complaint *${event.complaintNumber}*\n` +
          `This complaint has exceeded its expected resolution time.\n\n` +
          `Priority has been escalated. We apologize for the delay and are working to resolve this urgently.`;
        break;

      default:
        return false;
    }

    // Send to all linked WhatsApp users
    let sent = false;
    for (const whatsappUser of whatsappUsers) {
      try {
        console.log(
          `[WhatsApp] Sending ${event.type} to ${whatsappUser.phoneNumber}`
        );
        const result = await sendWhatsAppMessage({
          phoneNumber: whatsappUser.phoneNumber,
          message,
        });

        if (result.success) {
          console.log(
            `[WhatsApp] ✓ Message sent to ${whatsappUser.phoneNumber}, ID: ${result.messageId}`
          );
          // Record in message history
          if (!whatsappUser.messageHistory) whatsappUser.messageHistory = [];
          whatsappUser.messageHistory.push({
            direction: "OUTBOUND",
            messageType: "TEXT",
            content: message,
            messageId: result.messageId,
            status: "SENT",
            timestamp: new Date(),
          });
          await whatsappUser.save();
          sent = true;
        } else {
          console.error(
            `[WhatsApp] ✗ Failed to send to ${whatsappUser.phoneNumber}:`,
            result.error
          );
        }
      } catch (error) {
        console.error(
          `[WhatsApp] Exception sending to ${whatsappUser.phoneNumber}:`,
          error
        );
      }
    }

    if (!sent) {
      console.warn(
        `[WhatsApp] ⚠️ No successful sends for complaint ${event.complaintNumber}`
      );
    }

    return sent;
  } catch (error) {
    console.error(
      `[WhatsApp] Error sending WhatsApp notification for ${event.complaintNumber}:`,
      error
    );
    return false;
  }
}

/**
 * Queue a notification to be sent to a WhatsApp user
 * Useful for async operations where you don't want to block the main flow
 */
export async function queueWhatsAppNotification(
  event: NotificationEvent
): Promise<boolean> {
  // In production, use a proper job queue like Bull, RabbitMQ, or AWS SQS
  // For now, send immediately but log if it fails
  try {
    console.log(
      `[WhatsApp] Queuing ${event.type} notification for complaint ${event.complaintNumber}`
    );
    const result = await sendNotificationToWhatsApp(event);
    if (result) {
      console.log(
        `[WhatsApp] ✓ Queued notification delivered for ${event.complaintNumber}`
      );
    } else {
      console.warn(
        `[WhatsApp] ⚠️ Queued notification failed (will retry later): ${event.complaintNumber}`
      );
    }
    return result;
  } catch (error) {
    console.error(
      `[WhatsApp] Exception queuing notification for complaint ${event.complaintNumber}:`,
      error
    );
    return false;
  }
}

/**
 * Send WhatsApp notification after complaint creation
 */
export async function notifyComplaintRegistered(complaintId: string, complaintNumber: string, citizenId: string) {
  return sendNotificationToWhatsApp({
    type: "COMPLAINT_REGISTERED",
    complaintId: new Types.ObjectId(complaintId),
    complaintNumber,
    citizenId: new Types.ObjectId(citizenId),
  });
}

/**
 * Send WhatsApp notification when complaint status changes
 */
export async function notifyStatusChanged(
  complaintId: string,
  complaintNumber: string,
  citizenId: string,
  newStatus: string,
  remarks?: string
) {
  return sendNotificationToWhatsApp({
    type: "STATUS_CHANGED",
    complaintId: new Types.ObjectId(complaintId),
    complaintNumber,
    citizenId: new Types.ObjectId(citizenId),
    data: { newStatus, remarks },
  });
}

/**
 * Send WhatsApp notification when complaint is assigned
 */
export async function notifyComplaintAssigned(
  complaintId: string,
  complaintNumber: string,
  citizenId: string,
  officerName?: string
) {
  return sendNotificationToWhatsApp({
    type: "COMPLAINT_ASSIGNED",
    complaintId: new Types.ObjectId(complaintId),
    complaintNumber,
    citizenId: new Types.ObjectId(citizenId),
    data: { officerName },
  });
}

/**
 * Send WhatsApp notification when complaint is resolved
 */
export async function notifyComplaintResolved(
  complaintId: string,
  complaintNumber: string,
  citizenId: string,
  resolution?: string
) {
  return sendNotificationToWhatsApp({
    type: "RESOLVED",
    complaintId: new Types.ObjectId(complaintId),
    complaintNumber,
    citizenId: new Types.ObjectId(citizenId),
    data: { resolution },
  });
}
