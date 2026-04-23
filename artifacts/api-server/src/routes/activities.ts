import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, leadsTable, leadActivitiesTable } from "@workspace/db";
import { TrackActivityBody } from "@workspace/api-zod";
import { calculateLeadScore } from "../lib/lead-scoring";

const router: IRouter = Router();

/**
 * POST /activities — Track a lead activity (click or form submission)
 *
 * Looks up the lead by email. If the lead doesn't exist, returns 404
 * (callers should first POST /leads to create the record).
 * Records the activity, then recalculates and persists the lead score.
 */
router.post("/activities", async (req, res): Promise<void> => {
  const parsed = TrackActivityBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.message }, "Invalid track activity request");
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { email, activity_type, status, metadata } = parsed.data;
  const normalizedEmail = email.toLowerCase().trim();

  // Find the lead
  const [lead] = await db
    .select()
    .from(leadsTable)
    .where(eq(leadsTable.email, normalizedEmail));

  if (!lead) {
    req.log.warn({ email: normalizedEmail }, "Lead not found for activity tracking");
    res.status(404).json({ error: "Lead not found. Create the lead first via POST /leads." });
    return;
  }

  // Insert the activity record
  const [activity] = await db
    .insert(leadActivitiesTable)
    .values({
      leadId: lead.id,
      activityType: activity_type,
      status,
      metadata: (metadata as Record<string, unknown>) ?? null,
    })
    .returning();

  // Fetch all activities for this lead to recalculate score
  const allActivities = await db
    .select()
    .from(leadActivitiesTable)
    .where(eq(leadActivitiesTable.leadId, lead.id));

  const scores = calculateLeadScore(
    { ...lead, lastActivityAt: new Date() },
    allActivities
  );

  // Update lead with new scores and last activity timestamp
  const [updatedLead] = await db
    .update(leadsTable)
    .set({
      ...scores,
      lastActivityAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(leadsTable.id, lead.id))
    .returning();

  req.log.info(
    {
      leadId: lead.id,
      activityType: activity_type,
      status,
      totalScore: scores.totalScore,
      segment: scores.segment,
    },
    "Activity tracked and lead score updated"
  );

  res.json({ activity, lead: updatedLead });
});

export default router;
