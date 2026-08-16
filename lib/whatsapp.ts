/**
 * WhatsApp Business Platform Integration
 * Handles sending messages to WhatsApp users
 */

import { createHmac, timingSafeEqual } from "node:crypto";

const WHATSAPP_API_VERSION = "v20.0";
const WHATSAPP_API_URL = `https://graph.facebook.com/${WHATSAPP_API_VERSION}`;

interface WhatsAppMessagePayload {
  messaging_product: "whatsapp";
  to: string;
  type: "text" | "image" | "document" | "template";
  text?: { body: string };
  image?: { link: string };
  document?: { link: string };
  template?: {
    name: string;
    language: { code: string };
    components?: Array<{
      type: string;
      parameters?: Array<{ type: string; text?: string }>;
    }>;
  };
}

export interface WhatsAppSendOptions {
  phoneNumber: string;
  message?: string;
  templateName?: string;
  templateParams?: string[];
}

async function validateWebhookRequest(signature: string, body: string): Promise<boolean> {
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;

  if (!appSecret || !verifyToken) {
    console.warn("WhatsApp webhook validation skipped: missing credentials");
    return false;
  }

  const expectedSignature = `sha256=${createHmac("sha256", appSecret)
    .update(body, "utf8")
    .digest("hex")}`;

  if (!signature || !expectedSignature) {
    return false;
  }

  try {
    const actual = Buffer.from(signature, "utf8");
    const expected = Buffer.from(expectedSignature, "utf8");
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export async function sendWhatsAppMessage(options: WhatsAppSendOptions): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!accessToken || !phoneNumberId) {
    console.warn("WhatsApp messaging disabled: missing API credentials");
    return { success: false, error: "WhatsApp not configured" };
  }

  const payload: WhatsAppMessagePayload = {
    messaging_product: "whatsapp",
    to: options.phoneNumber,
    type: options.templateName ? "template" : "text",
  };

  if (options.message) {
    payload.text = { body: options.message };
  }

  if (options.templateName && options.templateParams) {
    payload.type = "template";
    payload.template = {
      name: options.templateName,
      language: { code: "en_US" },
      components: [
        {
          type: "body",
          parameters: options.templateParams.map((text) => ({ type: "text", text })),
        },
      ],
    };
  }

  try {
    const response = await fetch(`${WHATSAPP_API_URL}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("WhatsApp API error:", error);
      return { success: false, error: `WhatsApp API error: ${response.statusText}` };
    }

    const data = (await response.json()) as { messages?: Array<{ id: string }> };
    const messageId = data.messages?.[0]?.id;

    return { success: true, messageId };
  } catch (error) {
    console.error("WhatsApp send error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function validateWebhook(
  signature: string,
  body: string
): Promise<{ valid: boolean; mode?: string }> {
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;

  if (!verifyToken) {
    return { valid: false };
  }

  const isValid = await validateWebhookRequest(signature, body);
  return { valid: isValid, mode: "subscribe" };
}
