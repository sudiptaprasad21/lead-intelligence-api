/**
 * Gmail Sender — delivers emails via the Google Mail connector (Replit OAuth).
 * Falls back gracefully if the connector is not yet authorized.
 */
import { ReplitConnectors } from "@replit/connectors-sdk";

export interface GmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Encode a header value using RFC 2047 Base64 encoded-word syntax so that
 * non-ASCII characters (curly quotes, em-dashes, etc.) are not garbled by
 * mail clients that interpret raw bytes as Latin-1.
 */
function encodeHeaderWord(value: string): string {
  const encoded = Buffer.from(value, "utf8").toString("base64");
  return `=?UTF-8?B?${encoded}?=`;
}

function buildRFC2822(params: { to: string; subject: string; body: string }): string {
  const raw = [
    `To: ${params.to}`,
    `Subject: ${encodeHeaderWord(params.subject)}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/plain; charset=UTF-8`,
    `Content-Transfer-Encoding: base64`,
    ``,
    Buffer.from(params.body, "utf8").toString("base64"),
  ].join("\r\n");
  return Buffer.from(raw).toString("base64url");
}

export async function sendGmail(params: {
  to: string;
  subject: string;
  body: string;
}): Promise<GmailResult> {
  try {
    const connectors = new ReplitConnectors();
    const raw = buildRFC2822(params);

    const res = await connectors.proxy("google-mail", "/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ raw }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn(`[Gmail] Send failed: ${res.status} ${errText}`);
      return { success: false, error: `Gmail API error: ${res.status}` };
    }

    const data = (await res.json()) as { id?: string };
    console.info(`[Gmail] Sent to ${params.to} — messageId: ${data.id}`);
    return { success: true, messageId: data.id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[Gmail] Delivery exception: ${msg}`);
    return { success: false, error: msg };
  }
}
