import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, leadsTable, leadActivitiesTable, leadActionsTable } from "@workspace/db";
import {
  UpsertLeadBody,
  GetLeadParams,
} from "@workspace/api-zod";
import { calculateLeadScore } from "../lib/lead-scoring";
import { triggerActionsForLead } from "../lib/action-engine";

const router: IRouter = Router();

/**
 * POST /leads — Create or update a lead (upsert by email)
 * If lead exists, update metadata, updated_at, and source fields.
 * Recalculate lead score after upsert.
 */
router.post("/leads", async (req, res): Promise<void> => {
  const parsed = UpsertLeadBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.message }, "Invalid upsert lead request");
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const body = parsed.data;

  // Normalize email
  const email = body.email.toLowerCase().trim();

  // Check for existing lead
  const [existing] = await db
    .select()
    .from(leadsTable)
    .where(eq(leadsTable.email, email));

  let lead;

  if (existing) {
    // UPSERT: update existing lead — never create a duplicate
    req.log.info({ leadId: existing.id, email }, "Updating existing lead");

    const updateData: Partial<typeof leadsTable.$inferInsert> = {
      updatedAt: new Date(),
      lastActivityAt: new Date(),
    };

    // Update profile fields if new data is present and not already set
    if (body.full_name) updateData.fullName = body.full_name;
    if (body.company_name) updateData.companyName = body.company_name;
    if (body.job_title && !existing.jobTitle) updateData.jobTitle = body.job_title;
    if (body.company_size && !existing.companySize) updateData.companySize = body.company_size;
    if (body.industry && !existing.industry) updateData.industry = body.industry;
    if (body.campaign) updateData.campaign = body.campaign;
    if (body.form_type) updateData.formType = body.form_type;
    if (body.referral_source && !existing.referralSource) updateData.referralSource = body.referral_source;
    if (body.marketing_challenge && !existing.marketingChallenge) updateData.marketingChallenge = body.marketing_challenge;

    // Update lead source if provided and not set
    if (body.source && !existing.leadSource) {
      updateData.leadSource = body.source;
    }

    // Merge metadata
    const existingMeta = (existing.metadata as Record<string, unknown>) ?? {};
    const newMeta = {
      ...existingMeta,
      lastFormType: body.form_type,
      lastSubmittedAt: new Date().toISOString(),
    };
    updateData.metadata = newMeta;

    [lead] = await db
      .update(leadsTable)
      .set(updateData)
      .where(eq(leadsTable.id, existing.id))
      .returning();
  } else {
    // INSERT: new lead
    req.log.info({ email }, "Creating new lead");

    const insertData: typeof leadsTable.$inferInsert = {
      email,
      fullName: body.full_name,
      companyName: body.company_name,
      jobTitle: body.job_title ?? null,
      companySize: body.company_size ?? null,
      industry: body.industry ?? null,
      source: "website_visit",
      leadSource: body.source ?? null,
      campaign: body.campaign ?? null,
      formType: body.form_type ?? null,
      referralSource: body.referral_source ?? null,
      marketingChallenge: body.marketing_challenge ?? null,
      lastActivityAt: new Date(),
      metadata: {
        firstFormType: body.form_type,
        createdAt: new Date().toISOString(),
      },
    };

    [lead] = await db.insert(leadsTable).values(insertData).returning();
  }

  // Recalculate score using all activities for this lead
  const activities = await db
    .select()
    .from(leadActivitiesTable)
    .where(eq(leadActivitiesTable.leadId, lead.id));

  const scores = calculateLeadScore(lead, activities);

  [lead] = await db
    .update(leadsTable)
    .set(scores)
    .where(eq(leadsTable.id, lead.id))
    .returning();

  req.log.info(
    { leadId: lead.id, totalScore: scores.totalScore, segment: scores.segment },
    "Lead upserted and scored"
  );

  // Fire the action engine asynchronously — do NOT await so the response is fast
  triggerActionsForLead(lead.id).then((result) => {
    req.log.info(
      { leadId: lead.id, actionsTriggered: result.actions_triggered, segment: result.segment },
      "Action engine completed"
    );
  }).catch((err) => {
    req.log.warn({ leadId: lead.id, err: String(err) }, "Action engine error — non-blocking");
  });

  res.status(200).json(lead);
});

/**
 * GET /leads — List all leads, ordered by total score descending
 */
router.get("/leads", async (req, res): Promise<void> => {
  const leads = await db
    .select()
    .from(leadsTable)
    .orderBy(leadsTable.totalScore);

  req.log.info({ count: leads.length }, "Listed leads");
  res.json(leads.reverse()); // highest score first
});

/**
 * GET /leads/:id — Get a single lead by ID
 */
router.get("/leads/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetLeadParams.safeParse({ id: raw });
  if (!params.success) {
    res.status(400).json({ error: "Invalid lead ID" });
    return;
  }

  const [lead] = await db
    .select()
    .from(leadsTable)
    .where(eq(leadsTable.id, params.data.id));

  if (!lead) {
    res.status(404).json({ error: "Lead not found" });
    return;
  }

  res.json(lead);
});

/**
 * GET /leads/:id/activities — Get all activities for a lead
 */
router.get("/leads/:id/activities", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid lead ID" });
    return;
  }

  const [lead] = await db
    .select()
    .from(leadsTable)
    .where(eq(leadsTable.id, id));

  if (!lead) {
    res.status(404).json({ error: "Lead not found" });
    return;
  }

  const activities = await db
    .select()
    .from(leadActivitiesTable)
    .where(eq(leadActivitiesTable.leadId, id))
    .orderBy(leadActivitiesTable.createdAt);

  res.json(activities.reverse());
});

/**
 * GET /leads/:id/actions — Get all action logs for a lead
 */
router.get("/leads/:id/actions", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid lead ID" });
    return;
  }

  const [lead] = await db.select().from(leadsTable).where(eq(leadsTable.id, id));
  if (!lead) {
    res.status(404).json({ error: "Lead not found" });
    return;
  }

  const actions = await db
    .select()
    .from(leadActionsTable)
    .where(eq(leadActionsTable.leadId, id))
    .orderBy(leadActionsTable.createdAt);

  res.json(actions.reverse());
});

/**
 * POST /leads/:id/trigger-actions — Manually trigger the action engine for a lead
 */
router.post("/leads/:id/trigger-actions", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid lead ID" });
    return;
  }

  try {
    const result = await triggerActionsForLead(id);
    req.log.info({ leadId: id, result }, "Actions manually triggered");
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    req.log.error({ leadId: id, err: message }, "Failed to trigger actions");
    res.status(500).json({ error: message });
  }
});

export default router;
