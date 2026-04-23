/**
 * Telegram Sender — delivers messages via the Telegram Bot API.
 * Requires TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID environment secrets.
 *
 * TELEGRAM_BOT_TOKEN : token from @BotFather
 * TELEGRAM_CHAT_ID   : group/channel chat id where SDR notifications go
 *                       (e.g. "-1001234567890" for a supergroup)
 */

export interface TelegramResult {
  success: boolean;
  messageId?: number;
  error?: string;
}

export async function sendTelegram(params: {
  text: string;
  chatId?: string;
}): Promise<TelegramResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = params.chatId ?? process.env.TELEGRAM_CHAT_ID;

  if (!token) {
    return { success: false, error: "TELEGRAM_BOT_TOKEN not configured" };
  }
  if (!chatId) {
    return { success: false, error: "TELEGRAM_CHAT_ID not configured" };
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: params.text,
        parse_mode: "HTML",
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn(`[Telegram] Send failed: ${res.status} ${errText}`);
      return { success: false, error: `Telegram API error: ${res.status}` };
    }

    const data = (await res.json()) as { ok: boolean; result?: { message_id?: number } };
    if (!data.ok) {
      return { success: false, error: "Telegram returned ok=false" };
    }

    console.info(`[Telegram] Message sent — id: ${data.result?.message_id}`);
    return { success: true, messageId: data.result?.message_id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[Telegram] Delivery exception: ${msg}`);
    return { success: false, error: msg };
  }
}

/** Format a hot lead notification for the SDR Telegram group */
export function formatHotLeadNotification(params: {
  leadName: string;
  company: string;
  role: string;
  score: number;
  aiMessage: string;
}): string {
  return [
    `🔥 <b>HOT LEAD — Action Required</b>`,
    ``,
    `<b>Name:</b> ${params.leadName}`,
    `<b>Company:</b> ${params.company}`,
    `<b>Role:</b> ${params.role}`,
    `<b>Score:</b> ${params.score}/100`,
    ``,
    `<b>Suggested Telegram message:</b>`,
    `<i>${params.aiMessage}</i>`,
    ``,
    `📌 Contact within the hour for best conversion.`,
  ].join("\n");
}

/** Format an SDR follow-up notification for the Telegram group */
export function formatSDRNotification(params: {
  leadName: string;
  company: string;
  role: string;
  assignedTo: string;
  talkingPoints: string;
}): string {
  return [
    `📬 <b>SDR Follow-Up Task</b>`,
    ``,
    `<b>Assigned to:</b> ${params.assignedTo}`,
    `<b>Lead:</b> ${params.leadName} @ ${params.company}`,
    `<b>Role:</b> ${params.role}`,
    ``,
    `<b>Talking Points:</b>`,
    params.talkingPoints || `• Ask about current marketing stack\n• Explore attribution gaps\n• Qualify decision-maker`,
  ].join("\n");
}
