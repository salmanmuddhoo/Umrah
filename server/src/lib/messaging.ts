import "server-only";
import { ApiError } from "./errors";
import type { Identifier } from "./identifier";

export type Channel = "email" | "whatsapp";
export const channelFor = (id: Identifier): Channel => (id.kind === "email" ? "email" : "whatsapp");

const MINUTES_VALID = 10;

async function post(url: string, token: string, body: unknown, what: string) {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (err) {
    console.error(`${what} request failed`, err);
    throw new ApiError(502, "We could not send your code. Please try again in a moment.");
  }
  if (!res.ok) {
    // Log the provider's answer for the operator; never show it to the user.
    console.error(`${what} rejected the message: ${res.status} ${await res.text().catch(() => "")}`);
    throw new ApiError(502, "We could not send your code. Please check the address or number and try again.");
  }
}

function sendEmail(to: string, code: string) {
  return post(
    "https://api.resend.com/emails",
    process.env.RESEND_API_KEY!,
    {
      from: process.env.EMAIL_FROM,
      to: [to],
      subject: `${code} is your My Ummah code`,
      text: `Your My Ummah verification code is ${code}.\n\nIt expires in ${MINUTES_VALID} minutes. If you did not ask for it, you can ignore this email.`,
    },
    "Resend",
  );
}

/** WhatsApp only lets businesses start a conversation with an approved template; this uses an authentication template. */
function sendWhatsApp(to: string, code: string) {
  const version = process.env.WHATSAPP_API_VERSION || "v22.0";
  return post(
    `https://graph.facebook.com/${version}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
    process.env.WHATSAPP_TOKEN!,
    {
      messaging_product: "whatsapp",
      to: to.replace(/^\+/, ""),
      type: "template",
      template: {
        name: process.env.WHATSAPP_TEMPLATE || "verification_code",
        language: { code: process.env.WHATSAPP_TEMPLATE_LANG || "en" },
        components: [
          { type: "body", parameters: [{ type: "text", text: code }] },
          { type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: code }] },
        ],
      },
    },
    "WhatsApp",
  );
}

export function isConfigured(channel: Channel) {
  return channel === "email"
    ? !!(process.env.RESEND_API_KEY && process.env.EMAIL_FROM)
    : !!(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

/**
 * Delivers a verification code. Returns `{ delivered: false }` when the channel
 * has no credentials in development, so the caller can hand the code straight
 * to the developer; in production that situation is an error instead.
 */
export async function sendVerificationCode(id: Identifier, code: string): Promise<{ delivered: boolean }> {
  const channel = channelFor(id);
  if (!isConfigured(channel)) {
    if (process.env.NODE_ENV === "production") {
      console.error(`Cannot send a verification code: the ${channel} channel is not configured.`);
      throw new ApiError(503, `Sign-in by ${channel === "email" ? "email" : "WhatsApp"} is not available right now. Please try the other option.`);
    }
    console.log(`[dev] verification code for ${id.value}: ${code}`);
    return { delivered: false };
  }
  await (channel === "email" ? sendEmail(id.value, code) : sendWhatsApp(id.value, code));
  return { delivered: true };
}
