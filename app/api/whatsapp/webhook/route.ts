import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { WhatsAppUser } from "@/models/WhatsAppUser";
import { Complaint } from "@/models/Complaint";
import { User } from "@/models/User";
import { sendWhatsAppMessage } from "@/lib/whatsapp";

interface WhatsAppMessage {
  from: string;
  id: string;
  timestamp: string;
  text?: { body: string };
  image?: { id: string; mime_type: string };
  location?: { latitude: number; longitude: number };
  type: string;
}

interface WhatsAppWebhookEvent {
  entry: Array<{
    changes: Array<{
      value: {
        messaging_product: string;
        messages?: WhatsAppMessage[];
        statuses?: Array<{ id: string; status: string; timestamp: string; recipient_id: string }>;
      };
    }>;
  }>;
}

// Webhook verification endpoint
export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;

  if (!verifyToken) {
    console.error("WHATSAPP_VERIFY_TOKEN not configured");
    return new NextResponse("Forbidden", { status: 403 });
  }

  if (mode === "subscribe" && token === verifyToken) {
    console.log("✓ WhatsApp webhook verified");
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse("Forbidden", { status: 403 });
}

// Webhook message receiver
export async function POST(request: Request) {
  try {
    const signature = request.headers.get("x-hub-signature-256") || "";
    const rawBody = await request.text();

    if (process.env.WHATSAPP_APP_SECRET) {
      const appSecret = process.env.WHATSAPP_APP_SECRET;
      const expectedSignature = `sha256=${require("node:crypto")
        .createHmac("sha256", appSecret)
        .update(rawBody, "utf8")
        .digest("hex")}`;

      if (!signature || !require("node:crypto").timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const data = JSON.parse(rawBody) as WhatsAppWebhookEvent;

    if (!data.entry?.[0]?.changes?.[0]?.value) {
      return NextResponse.json({ received: true });
    }

    const value = data.entry[0].changes[0].value;

    // Process incoming messages
    if (value.messages) {
      for (const message of value.messages) {
        await handleIncomingMessage(message);
      }
    }

    // Process message status updates
    if (value.statuses) {
      for (const status of value.statuses) {
        await updateMessageStatus(status.id, status.status);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("WhatsApp webhook error:", error);
    return NextResponse.json({ received: true }, { status: 200 });
  }
}

async function handleIncomingMessage(message: WhatsAppMessage) {
  const phoneNumber = message.from;
  const timestamp = new Date(parseInt(message.timestamp) * 1000);

  await connectToDatabase();

  try {
    // Find or create WhatsApp user
    let whatsappUser = await WhatsAppUser.findOne({ phoneNumber });
    if (!whatsappUser) {
      whatsappUser = await WhatsAppUser.create({
        phoneNumber,
        conversationState: {
          step: "INITIAL",
          createdAt: new Date(),
          lastMessageAt: timestamp,
        },
      });
    }

    // Update last interaction
    whatsappUser.lastSeenAt = timestamp;

    // Process message based on type
    if (message.type === "text" && message.text?.body) {
      await handleTextMessage(whatsappUser, message.text.body, message.id, timestamp);
    } else if (message.type === "image" && message.image?.id) {
      await handleImageMessage(whatsappUser, message.image.id, message.id, timestamp);
    } else if (message.type === "location" && message.location) {
      await handleLocationMessage(whatsappUser, message.location, message.id, timestamp);
    }

    await whatsappUser.save();
  } catch (error) {
    console.error(`Error handling WhatsApp message from ${phoneNumber}:`, error);
  }
}

async function handleTextMessage(
  whatsappUser: any,
  text: string,
  messageId: string,
  timestamp: Date
) {
  const input = text.toLowerCase().trim();

  // Record in message history
  if (!whatsappUser.messageHistory) whatsappUser.messageHistory = [];
  whatsappUser.messageHistory.push({
    direction: "INBOUND",
    messageType: "TEXT",
    content: text,
    messageId,
    status: "DELIVERED",
    timestamp,
  });

  // Handle conversation states
  if (
    input === "register" ||
    input === "new complaint" ||
    input.startsWith("/register")
  ) {
    whatsappUser.conversationState = {
      step: "ASK_CATEGORY",
      data: {},
      createdAt: new Date(),
      lastMessageAt: timestamp,
    };

    const response =
      "Hello! I'll help you register a complaint. Please select a category:\n\n" +
      "1. Roads\n2. Water Supply\n3. Garbage/Sanitation\n4. Street Lights\n5. Drainage\n6. Public Safety\n7. Electricity\n8. Environment\n9. Other";

    await sendWhatsAppMessage({
      phoneNumber: whatsappUser.phoneNumber,
      message: response,
    });
  } else if (input === "status" || input.startsWith("/status")) {
    // Check complaint status
    await handleComplaintStatusQuery(whatsappUser, text);
  } else if (whatsappUser.conversationState?.step === "ASK_CATEGORY") {
    // Map category response
    const categoryMap: Record<string, string> = {
      "1": "Roads",
      "2": "Water Supply",
      "3": "Garbage/Sanitation",
      "4": "Street Lights",
      "5": "Drainage",
      "6": "Public Safety",
      "7": "Electricity",
      "8": "Environment",
      "9": "Other",
    };

    const category = categoryMap[input] || input;
    if (whatsappUser.conversationState.data) {
      whatsappUser.conversationState.data.category = category;
    }
    whatsappUser.conversationState.step = "ASK_DESCRIPTION";

    await sendWhatsAppMessage({
      phoneNumber: whatsappUser.phoneNumber,
      message: `Great! You selected "${category}". Now, please describe the issue in detail (at least 20 characters):`,
    });
  } else if (whatsappUser.conversationState?.step === "ASK_DESCRIPTION") {
    // Validate description length
    if (text.length < 20) {
      await sendWhatsAppMessage({
        phoneNumber: whatsappUser.phoneNumber,
        message:
          "The description is too short. Please provide at least 20 characters describing the issue:",
      });
    } else {
      if (whatsappUser.conversationState.data) {
        whatsappUser.conversationState.data.description = text;
      }
      whatsappUser.conversationState.step = "ASK_LOCATION";

      await sendWhatsAppMessage({
        phoneNumber: whatsappUser.phoneNumber,
        message:
          "Thanks! You can now share your location (we'll use it to pinpoint the issue) or type 'skip' to continue without location:",
      });
    }
  } else if (whatsappUser.conversationState?.step === "ASK_LOCATION") {
    if (input === "skip") {
      whatsappUser.conversationState.step = "ASK_IMAGES";

      await sendWhatsAppMessage({
        phoneNumber: whatsappUser.phoneNumber,
        message:
          "Okay! You can now share images of the issue (send one image at a time) or type 'confirm' when done:",
      });
    } else {
      // Waiting for location message
      await sendWhatsAppMessage({
        phoneNumber: whatsappUser.phoneNumber,
        message:
          "Please share your location using WhatsApp's location feature, or type 'skip' to continue without it:",
      });
    }
  } else if (whatsappUser.conversationState?.step === "ASK_IMAGES") {
    if (input === "confirm") {
      // Create complaint
      await createComplaintFromWhatsApp(whatsappUser);
    } else {
      await sendWhatsAppMessage({
        phoneNumber: whatsappUser.phoneNumber,
        message:
          "I'm waiting for images. Please send image files or type 'confirm' when done:",
      });
    }
  } else {
    // Default: offer menu
    const helpText =
      "Hello! I'm CivicGuard AI. What would you like to do?\n\n" +
      "• Type 'register' or 'new complaint' to file a new complaint\n" +
      "• Type 'status' followed by your Complaint ID to check status\n" +
      "• Type 'help' for more options";

    await sendWhatsAppMessage({
      phoneNumber: whatsappUser.phoneNumber,
      message: helpText,
    });
  }
}

async function handleImageMessage(
  whatsappUser: any,
  imageId: string,
  messageId: string,
  timestamp: Date
) {
  if (!whatsappUser.messageHistory) whatsappUser.messageHistory = [];
  whatsappUser.messageHistory.push({
    direction: "INBOUND",
    messageType: "IMAGE",
    mediaUrl: imageId,
    messageId,
    status: "DELIVERED",
    timestamp,
  });

  if (whatsappUser.conversationState?.step === "ASK_IMAGES") {
    if (!whatsappUser.conversationState.data) {
      whatsappUser.conversationState.data = {};
    }
    if (!whatsappUser.conversationState.data.images) {
      whatsappUser.conversationState.data.images = [];
    }

    whatsappUser.conversationState.data.images.push(imageId);

    await sendWhatsAppMessage({
      phoneNumber: whatsappUser.phoneNumber,
      message: `Image received (${whatsappUser.conversationState.data.images.length}). Send more images or type 'confirm' to submit:`,
    });
  }
}

async function handleLocationMessage(
  whatsappUser: any,
  location: { latitude: number; longitude: number },
  messageId: string,
  timestamp: Date
) {
  if (!whatsappUser.messageHistory) whatsappUser.messageHistory = [];
  whatsappUser.messageHistory.push({
    direction: "INBOUND",
    messageType: "LOCATION",
    messageId,
    status: "DELIVERED",
    timestamp,
  });

  if (whatsappUser.conversationState?.step === "ASK_LOCATION") {
    if (whatsappUser.conversationState.data) {
      whatsappUser.conversationState.data.location = {
        latitude: location.latitude,
        longitude: location.longitude,
      };
    }

    whatsappUser.conversationState.step = "ASK_IMAGES";

    await sendWhatsAppMessage({
      phoneNumber: whatsappUser.phoneNumber,
      message:
        "Perfect! Location received. Now you can share images of the issue (send one image at a time) or type 'confirm' when done:",
    });
  }
}

async function handleComplaintStatusQuery(whatsappUser: any, query: string) {
  const complaintId = query.replace(/\/status\s*/i, "").trim();

  if (!complaintId) {
    await sendWhatsAppMessage({
      phoneNumber: whatsappUser.phoneNumber,
      message:
        "Please provide your Complaint ID. Example: /status CG-2024-ABC12345",
    });
    return;
  }

  try {
    const complaint = await Complaint.findOne({
      complaintNumber: complaintId,
    })
      .populate("citizen", "name email")
      .populate("assignedOfficer", "name department")
      .lean();

    if (!complaint) {
      await sendWhatsAppMessage({
        phoneNumber: whatsappUser.phoneNumber,
        message: `No complaint found with ID "${complaintId}". Please check the ID and try again.`,
      });
      return;
    }

    const statusMessage =
      `📋 *Complaint Status*\n\n` +
      `*ID:* ${complaint.complaintNumber}\n` +
      `*Category:* ${complaint.category}\n` +
      `*Status:* ${complaint.status}\n` +
      `*Priority:* ${complaint.priority}\n` +
      `*Filed:* ${new Date(complaint.createdAt).toLocaleDateString()}\n` +
      (complaint.assignedOfficer
        ? `*Assigned To:* ${complaint.assignedOfficer.name} (${complaint.assignedOfficer.department})\n`
        : "") +
      (complaint.resolutionRemarks
        ? `*Latest Update:* ${complaint.resolutionRemarks.substring(0, 100)}...\n`
        : "");

    await sendWhatsAppMessage({
      phoneNumber: whatsappUser.phoneNumber,
      message: statusMessage,
    });
  } catch (error) {
    console.error("Error checking complaint status:", error);
    await sendWhatsAppMessage({
      phoneNumber: whatsappUser.phoneNumber,
      message: "Sorry, I couldn't retrieve your complaint status. Please try again later.",
    });
  }
}

async function createComplaintFromWhatsApp(whatsappUser: any) {
  try {
    const data = whatsappUser.conversationState?.data;
    if (!data?.description || !data?.category) {
      await sendWhatsAppMessage({
        phoneNumber: whatsappUser.phoneNumber,
        message:
          "Error: Missing required information. Please start over with 'register'.",
      });
      return;
    }

    // Analyze complaint with AI (optional)
    let aiAnalysis: any = {
      category: data.category,
      priority: "MEDIUM",
      sentiment: "NEUTRAL",
      summary: data.description.substring(0, 300),
      confidence: 0.7,
      reason: "WhatsApp complaint",
    };

    // AI analysis is optional for WhatsApp - don't call it here
    // It will be called automatically after complaint is created

    // Create complaint in database
    const complaintNumber = `CG-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

    let userId: string | undefined;
    if (whatsappUser.citizenId) {
      userId = whatsappUser.citizenId;
    } else {
      // Try to find existing citizen by phone or create a temp complaint
      const user = await User.findOne({ phone: whatsappUser.phoneNumber });
      if (user) {
        userId = user._id;
        whatsappUser.citizenId = user._id;
      }
    }

    if (!userId) {
      // Create complaint without citizen link - will require manual linking
      userId = new (require("mongoose").Types.ObjectId)();
    }

    const complaint = await Complaint.create({
      complaintNumber,
      citizen: userId,
      description: data.description,
      category: aiAnalysis.category || data.category,
      priority: aiAnalysis.priority || "MEDIUM",
      location: data.location
        ? {
            type: "Point",
            coordinates: [data.location.longitude, data.location.latitude],
          }
        : undefined,
      ai: {
        status: "COMPLETED",
        ...aiAnalysis,
      },
      history: [
        {
          action: "COMPLAINT_SUBMITTED",
          actorName: "WhatsApp",
          newValue: "SUBMITTED",
          remarks: "Complaint submitted via WhatsApp",
          createdAt: new Date(),
        },
      ],
    });

    // Link complaint to WhatsApp user AND link citizenId for notifications
    whatsappUser.linkedComplaints.push({
      complaintId: complaint._id,
      linkedAt: new Date(),
    });
    
    // CRITICAL: Link the WhatsApp user to the citizen account so notifications work
    whatsappUser.citizenId = complaint.citizen;

    // Send confirmation
    const confirmationMessage =
      `✅ *Complaint Registered!*\n\n` +
      `*ID:* ${complaint.complaintNumber}\n` +
      `*Category:* ${complaint.category}\n` +
      `*Priority:* ${complaint.priority}\n\n` +
      `Your complaint has been filed. An administrator will review it shortly. ` +
      `Save this ID for future status checks using /status ${complaint.complaintNumber}`;

    await sendWhatsAppMessage({
      phoneNumber: whatsappUser.phoneNumber,
      message: confirmationMessage,
    });

    // Reset conversation state
    whatsappUser.conversationState = {
      step: "INITIAL",
      createdAt: new Date(),
      lastMessageAt: new Date(),
    };
  } catch (error) {
    console.error("Error creating complaint from WhatsApp:", error);
    await sendWhatsAppMessage({
      phoneNumber: whatsappUser.phoneNumber,
      message:
        "Sorry, I encountered an error while filing your complaint. Please try again or contact support.",
    });
  }
}

async function updateMessageStatus(messageId: string, status: string) {
  try {
    await connectToDatabase();
    await WhatsAppUser.updateOne(
      { "messageHistory.messageId": messageId },
      { $set: { "messageHistory.$.status": status } }
    );
  } catch (error) {
    console.error("Error updating message status:", error);
  }
}
