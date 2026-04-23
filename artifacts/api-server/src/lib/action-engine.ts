/**
 * Score-Based Logic Layer — Action Engine
 *
 * Maps lead score → segment → automated actions.
 * Handles scheduling (working hours), idempotency, and action logging.
 * Triggers AI-generated outreach content for Hot and Warm leads.
 */

import { db, leadActionsTable, leadsTable, leadActivitiesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import type { Lead } from "@workspace/db";
import {
  generateTelegramMessage,
  generateWarmEmail,
  generateNurtureEmail,
  generateSDRTalkingPoints,
} from "./ai-outreach";
import { getSegment } from "./lead-scoring";
import { sendGmail } from "./gmail-sender";
import {
  sendTelegram,
  formatHotLeadNotification,
  formatSDRNotification,
} from "./telegram-sender";

// ─── Working Hours (Mon–Sat, 09:00–20:00 local) ─────────────────────────────

function isWorkingHours(now: Date = new Date()): boolean {
  const day = now.getDay(); // 0=Sun, 6=Sat
  const hour = now.getHours();
  return day >= 1 && day <= 6 && hour >= 9 && hour < 20;
}

/**
 * Get the next working-day scheduled slot.
 * Hot → 10:00 AM, Warm → 11:00 AM
 */
function getNextWorkingSlot(priority: "hot" | "warm", from: Date = new Date()): Date {
  const scheduleHour = priority === "hot" ? 10 : 11;
  const next = new Date(from);
  next.setSeconds(0);
  next.setMilliseconds(0);
  next.setMinutes(0);
  next.setHours(scheduleHour);

  // Move to tomorrow if already past today's slot or outside Mon-Sat
  do {
    next.setDate(next.getDate() + 1);
  } while (next.getDay() === 0); // skip Sundays

  return next;
}

// ─── Round-Robin Assignment ────────────────────────────────────────────────

const SDR_TEAM = ["sdr-1@nexpoint.io", "sdr-2@nexpoint.io", "sdr-3@nexpoint.io"];
let rrIndex = 0;
function getNextSDR(): string {
  const assignee = SDR_TEAM[rrIndex % SDR_TEAM.length];
  rrIndex++;
  return assignee;
}

// ─── Idempotency ──────────────────────────────────────────────────────────

/** Build a unique key so the same action is never triggered twice for the same lead+segment. */
function makeIdempotencyKey(leadId: number, actionType: string, segment: string): string {
  return `lead:${leadId}:${segment}:${actionType}`;
}

async function actionAlreadyTriggered(key: string): Promise<boolean> {
  const [existing] = await db
    .select({ id: leadActionsTable.id })
    .from(leadActionsTable)
    .where(eq(leadActionsTable.idempotencyKey, key));
  return Boolean(existing);
}

// ─── Action Creators ──────────────────────────────────────────────────────

async function logAction(params: {
  leadId: number;
  actionType: string;
  segment: string;
  status: string;
  scheduledAt?: Date | null;
  executedAt?: Date | null;
  messageContent?: string | null;
  metadata?: Record<string, unknown>;
  idempotencyKey: string;
}) {
  await db
    .insert(leadActionsTable)
    .values({
      leadId: params.leadId,
      actionType: params.actionType,
      segment: params.segment,
      status: params.status,
      scheduledAt: params.scheduledAt ?? null,
      executedAt: params.executedAt ?? null,
      messageContent: params.messageContent ?? null,
      metadata: params.metadata ?? {},
      idempotencyKey: params.idempotencyKey,
    })
    .onConflictDoNothing(); // Idempotency guard — silently skip duplicate inserts
}

async function updateActionStatus(
  idempotencyKey: string,
  status: "delivered" | "failed",
  extra?: Record<string, unknown>
) {
  await db
    .update(leadActionsTable)
    .set({
      status,
      executedAt: status === "delivered" ? new Date() : undefined,
      ...(extra ? { metadata: extra } : {}),
    })
    .where(eq(leadActionsTable.idempotencyKey, idempotencyKey));
}

// ─── Segment Action Handlers ──────────────────────────────────────────────

async function triggerHotActions(lead: Lead): Promise<string[]> {
  const triggered: string[] = [];
  const segment = "hot";
  const now = new Date();

  // 1. Immediate Sales Call Task
  const callKey = makeIdempotencyKey(lead.id, "immediate_sales_call", segment);
  if (!(await actionAlreadyTriggered(callKey))) {
    const inHours = isWorkingHours(now);
    const scheduledAt = inHours ? now : getNextWorkingSlot("hot", now);
    const assignee = getNextSDR();

    await logAction({
      leadId: lead.id,
      actionType: "immediate_sales_call",
      segment,
      status: inHours ? "pending" : "scheduled",
      scheduledAt,
      executedAt: null,
      idempotencyKey: callKey,
      metadata: {
        priority: "high",
        assignedTo: assignee,
        leadName: lead.fullName,
        company: lead.companyName,
        role: lead.jobTitle,
        totalScore: lead.totalScore,
        intentScore: lead.intentScore,
        fitScore: lead.fitScore,
        source: lead.leadSource,
        capturedAt: lead.createdAt,
        scheduledTime: scheduledAt.toISOString(),
        withinWorkingHours: inHours,
      },
    });
    triggered.push("immediate_sales_call");
  }

  // 2. Telegram Outreach (notify SDR group with AI-personalized message)
  const tgKey = makeIdempotencyKey(lead.id, "telegram_outreach", segment);
  if (!(await actionAlreadyTriggered(tgKey))) {
    const msg = await generateTelegramMessage(lead);
    await logAction({
      leadId: lead.id,
      actionType: "telegram_outreach",
      segment,
      status: "pending",
      scheduledAt: null,
      executedAt: null,
      messageContent: msg.content,
      idempotencyKey: tgKey,
      metadata: {
        messageSource: msg.source,
        leadName: lead.fullName,
        company: lead.companyName,
        role: lead.jobTitle,
      },
    });

    // Fire Telegram notification to SDR group
    const notification = formatHotLeadNotification({
      leadName: lead.fullName ?? "Unknown",
      company: lead.companyName ?? "",
      role: lead.jobTitle ?? "",
      score: lead.totalScore ?? 0,
      aiMessage: msg.content,
    });
    const tgResult = await sendTelegram({ text: notification });
    await updateActionStatus(
      tgKey,
      tgResult.success ? "delivered" : "failed",
      tgResult.success
        ? { messageSource: msg.source, leadName: lead.fullName, company: lead.companyName, role: lead.jobTitle, deliveredAt: new Date().toISOString(), telegramMessageId: tgResult.messageId }
        : { messageSource: msg.source, leadName: lead.fullName, company: lead.companyName, role: lead.jobTitle, error: tgResult.error }
    );

    triggered.push("telegram_outreach");
  }

  return triggered;
}

async function triggerWarmActions(lead: Lead): Promise<string[]> {
  const triggered: string[] = [];
  const segment = "warm";
  const now = new Date();

  // 1. Email Outreach — deliver via Gmail
  const emailKey = makeIdempotencyKey(lead.id, "email_outreach", segment);
  if (!(await actionAlreadyTriggered(emailKey))) {
    const email = await generateWarmEmail(lead);
    await logAction({
      leadId: lead.id,
      actionType: "email_outreach",
      segment,
      status: "pending",
      scheduledAt: null,
      executedAt: null,
      messageContent: `Subject: ${email.subject}\n\n${email.body}`,
      idempotencyKey: emailKey,
      metadata: {
        subject: email.subject,
        emailSource: email.source,
        sentTo: lead.email,
        leadName: lead.fullName,
        company: lead.companyName,
      },
    });

    if (lead.email) {
      const gmailResult = await sendGmail({
        to: lead.email,
        subject: email.subject,
        body: email.body,
      });
      await updateActionStatus(
        emailKey,
        gmailResult.success ? "delivered" : "failed",
        gmailResult.success
          ? { deliveredAt: new Date().toISOString(), gmailMessageId: gmailResult.messageId }
          : { error: gmailResult.error }
      );
    }

    triggered.push("email_outreach");
  }

  // 2. SDR Follow-Up Task (SLA: 24h, medium priority)
  const sdrKey = makeIdempotencyKey(lead.id, "sdr_followup", segment);
  if (!(await actionAlreadyTriggered(sdrKey))) {
    const inHours = isWorkingHours(now);
    const scheduledAt = inHours ? now : getNextWorkingSlot("warm", now);
    const assignee = getNextSDR();
    const talkingPoints = await generateSDRTalkingPoints(lead);

    await logAction({
      leadId: lead.id,
      actionType: "sdr_followup",
      segment,
      status: inHours ? "pending" : "scheduled",
      scheduledAt,
      executedAt: null,
      messageContent: talkingPoints,
      idempotencyKey: sdrKey,
      metadata: {
        priority: "medium",
        sla: "24h",
        assignedTo: assignee,
        leadName: lead.fullName,
        company: lead.companyName,
        role: lead.jobTitle,
        emailAlreadySent: true,
        scheduledTime: scheduledAt.toISOString(),
        withinWorkingHours: inHours,
      },
    });

    // Notify assigned SDR via Telegram
    const sdrNotification = formatSDRNotification({
      leadName: lead.fullName ?? "Unknown",
      company: lead.companyName ?? "",
      role: lead.jobTitle ?? "",
      assignedTo: assignee,
      talkingPoints,
    });
    await sendTelegram({ text: sdrNotification });

    triggered.push("sdr_followup");
  }

  return triggered;
}

async function triggerNurtureActions(lead: Lead): Promise<string[]> {
  const triggered: string[] = [];
  const segment = "nurture";
  const now = new Date();

  // 1. Drip email — Day 0 (intro)
  const steps = ["day0", "day3", "day7", "day14"] as const;
  for (const step of steps) {
    const actionType = `drip_email_${step}` as const;
    const key = makeIdempotencyKey(lead.id, actionType, segment);
    if (!(await actionAlreadyTriggered(key))) {
      // Only queue Day 0 immediately; later steps are scheduled
      if (step === "day0") {
        const email = await generateNurtureEmail(lead, step);
        await logAction({
          leadId: lead.id,
          actionType,
          segment,
          status: "pending",
          executedAt: null,
          messageContent: `Subject: ${email.subject}\n\n${email.body}`,
          idempotencyKey: key,
          metadata: { subject: email.subject, emailSource: email.source, step, sentTo: lead.email },
        });

        // Deliver via Gmail
        if (lead.email) {
          const gmailResult = await sendGmail({
            to: lead.email,
            subject: email.subject,
            body: email.body,
          });
          await updateActionStatus(
            key,
            gmailResult.success ? "delivered" : "failed",
            gmailResult.success
              ? { subject: email.subject, emailSource: email.source, step, sentTo: lead.email, deliveredAt: new Date().toISOString(), gmailMessageId: gmailResult.messageId }
              : { subject: email.subject, emailSource: email.source, step, sentTo: lead.email, error: gmailResult.error }
          );
        }

        triggered.push(actionType);
      } else {
        const dayOffset = step === "day3" ? 3 : step === "day7" ? 7 : 14;
        const scheduledAt = new Date(now.getTime() + dayOffset * 24 * 60 * 60 * 1000);
        await logAction({
          leadId: lead.id,
          actionType,
          segment,
          status: "scheduled",
          scheduledAt,
          idempotencyKey: key,
          metadata: { step, scheduledTime: scheduledAt.toISOString() },
        });
        triggered.push(actionType);
      }
      break; // Only insert the first un-triggered step per call
    }
  }

  // 2. Retargeting Trigger
  const rtKey = makeIdempotencyKey(lead.id, "retargeting_trigger", segment);
  if (!(await actionAlreadyTriggered(rtKey))) {
    await logAction({
      leadId: lead.id,
      actionType: "retargeting_trigger",
      segment,
      status: "success",
      executedAt: now,
      idempotencyKey: rtKey,
      metadata: {
        channels: ["linkedin", "google"],
        objective: "reinforce_awareness",
        audienceTag: `nexpoint_nurture_${lead.id}`,
        leadName: lead.fullName,
        industry: lead.industry,
      },
    });
    triggered.push("retargeting_trigger");
  }

  return triggered;
}

async function triggerColdActions(lead: Lead): Promise<string[]> {
  const triggered: string[] = [];
  const segment = "cold";
  const now = new Date();

  // 1. Cold Drip (low-frequency, every 2-3 weeks)
  const dripKey = makeIdempotencyKey(lead.id, "cold_drip", segment);
  if (!(await actionAlreadyTriggered(dripKey))) {
    const scheduledAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    await logAction({
      leadId: lead.id,
      actionType: "cold_drip",
      segment,
      status: "scheduled",
      scheduledAt,
      idempotencyKey: dripKey,
      metadata: {
        frequency: "biweekly",
        contentType: "thought_leadership",
        aggressiveCTA: false,
        scheduledTime: scheduledAt.toISOString(),
      },
    });
    triggered.push("cold_drip");
  }

  // 2. Periodic Re-evaluation
  const reEvalKey = makeIdempotencyKey(lead.id, "periodic_reeval", segment);
  if (!(await actionAlreadyTriggered(reEvalKey))) {
    const scheduledAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    await logAction({
      leadId: lead.id,
      actionType: "periodic_reeval",
      segment,
      status: "scheduled",
      scheduledAt,
      idempotencyKey: reEvalKey,
      metadata: {
        reEvalInterval: "14_days",
        triggerConditions: ["new_activity", "data_enrichment"],
        suppressionThreshold: "90_days_no_engagement",
        scheduledTime: scheduledAt.toISOString(),
      },
    });
    triggered.push("periodic_reeval");
  }

  return triggered;
}

// ─── Public API ───────────────────────────────────────────────────────────

export interface ActionEngineResult {
  score: number;
  segment: string;
  actions_triggered: string[];
  next_action: string;
  scheduled_time: string | null;
  status: "success" | "pending";
}

const NEXT_ACTIONS: Record<string, string> = {
  hot: "Sales call assigned — follow up within 1 hour",
  warm: "SDR to follow up within 24 hours",
  nurture: "Day 3 email scheduled — monitor engagement",
  cold: "Re-evaluation scheduled in 14 days",
};

/**
 * Core entry point: given a lead ID, look up the current score + segment,
 * trigger the appropriate workflow, and return the structured result.
 */
export async function triggerActionsForLead(leadId: number): Promise<ActionEngineResult> {
  const [lead] = await db.select().from(leadsTable).where(eq(leadsTable.id, leadId));
  if (!lead) throw new Error(`Lead ${leadId} not found`);

  const score = lead.totalScore ?? 0;
  const segment = (lead.segment ?? getSegment(score)).toLowerCase();

  let actionsTriggered: string[] = [];

  if (segment === "hot") {
    actionsTriggered = await triggerHotActions(lead);
  } else if (segment === "warm") {
    actionsTriggered = await triggerWarmActions(lead);
  } else if (segment === "nurture") {
    actionsTriggered = await triggerNurtureActions(lead);
  } else {
    actionsTriggered = await triggerColdActions(lead);
  }

  // Determine next scheduled action
  const scheduledActions = await db
    .select()
    .from(leadActionsTable)
    .where(
      and(
        eq(leadActionsTable.leadId, leadId),
        eq(leadActionsTable.status, "scheduled")
      )
    );

  const nextScheduled = scheduledActions
    .filter((a) => a.scheduledAt)
    .sort((a, b) => new Date(a.scheduledAt!).getTime() - new Date(b.scheduledAt!).getTime())[0];

  return {
    score,
    segment,
    actions_triggered: actionsTriggered,
    next_action: NEXT_ACTIONS[segment] ?? "Monitor engagement",
    scheduled_time: nextScheduled?.scheduledAt?.toISOString() ?? null,
    status: actionsTriggered.length > 0 ? "success" : "pending",
  };
}
