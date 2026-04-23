import { Router } from "express";
import crypto from "crypto";
import { db, leadsTable, leadActionsTable } from "@workspace/db";
import { ReplitConnectors } from "@replit/connectors-sdk";
import { eq, gte, and } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";

// ─── Workflow SLA Definitions ─────────────────────────────────────────────
// null = no SLA (scheduled future drip / cold). Measured in minutes from createdAt.
const ACTION_SLA_MINS: Record<string, number | null> = {
  immediate_sales_call: 60,
  telegram_outreach:    60,
  whatsapp_outreach:    60,
  email_outreach:       30,
  sdr_followup:         1440,
  drip_email_day0:      60,
  drip_email_day3:      null,
  drip_email_day7:      null,
  drip_email_day14:     null,
  retargeting_trigger:  120,
  cold_drip:            null,
  periodic_reeval:      null,
};

const ACTION_LABELS: Record<string, string> = {
  immediate_sales_call: "Sales Call",
  telegram_outreach:    "Telegram",
  whatsapp_outreach:    "WhatsApp (legacy)",
  email_outreach:       "Email Outreach",
  sdr_followup:         "SDR Follow-Up",
  drip_email_day0:      "Drip Day 0",
  drip_email_day3:      "Drip Day 3",
  drip_email_day7:      "Drip Day 7",
  drip_email_day14:     "Drip Day 14",
  retargeting_trigger:  "Retargeting",
  cold_drip:            "Cold Drip",
  periodic_reeval:      "Re-Evaluation",
};

// The user's existing Google Workbook to write the Workflow Health sheet into
const WORKFLOW_SHEET_ID = "1mE5u20YienuuUYiihyLIrKiQT0oTtt0TwJCpX3YGLe0";
const WORKFLOW_TAB_NAME = "Workflow Health";

const router = Router();

function makeToken(username: string, password: string): string {
  const secret = process.env.SESSION_SECRET ?? "fallback-secret";
  return crypto
    .createHmac("sha256", secret)
    .update(`${username}:${password}`)
    .digest("hex");
}

function verifyToken(token: string): boolean {
  const username = process.env.ADMIN_USERNAME ?? "admin";
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return false;
  const expected = makeToken(username, password);
  return crypto.timingSafeEqual(Buffer.from(token, "hex"), Buffer.from(expected, "hex"));
}

function authMiddleware(req: any, res: any, next: any) {
  const auth = req.headers.authorization ?? "";
  if (!auth.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const token = auth.slice(7);
  if (!verifyToken(token)) {
    res.status(401).json({ error: "Invalid token" });
    return;
  }
  next();
}

router.post("/admin/login", async (req, res) => {
  const { username, password } = req.body ?? {};
  const expectedUsername = process.env.ADMIN_USERNAME ?? "admin";
  const expectedPassword = process.env.ADMIN_PASSWORD;

  if (!expectedPassword) {
    res.status(503).json({ error: "Admin credentials not configured. Set ADMIN_PASSWORD environment variable." });
    return;
  }

  if (username !== expectedUsername || password !== expectedPassword) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const token = makeToken(username, password);
  res.json({ token, username });
});

router.get("/admin/stats", authMiddleware, async (_req, res) => {
  const allLeads = await db.select().from(leadsTable);

  const segmentCounts = allLeads.reduce<Record<string, number>>((acc, l) => {
    acc[l.segment] = (acc[l.segment] ?? 0) + 1;
    return acc;
  }, {});

  const industryCounts = allLeads.reduce<Record<string, number>>((acc, l) => {
    const key = l.industry ?? "Unknown";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  const sourceCounts = allLeads.reduce<Record<string, number>>((acc, l) => {
    const key = l.referralSource ?? l.leadSource ?? "Direct";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  const formTypeCounts = allLeads.reduce<Record<string, number>>((acc, l) => {
    const key = l.formType ?? "Unknown";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  const avgTotal = allLeads.length > 0
    ? Math.round(allLeads.reduce((s, l) => s + (l.totalScore ?? 0), 0) / allLeads.length)
    : 0;
  const avgIntent = allLeads.length > 0
    ? Math.round(allLeads.reduce((s, l) => s + (l.intentScore ?? 0), 0) / allLeads.length)
    : 0;
  const avgFit = allLeads.length > 0
    ? Math.round(allLeads.reduce((s, l) => s + (l.fitScore ?? 0), 0) / allLeads.length)
    : 0;

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentLeads = allLeads.filter(l => new Date(l.createdAt) >= sevenDaysAgo).length;

  const scoreDistribution = [
    { range: "0–20", count: allLeads.filter(l => (l.totalScore ?? 0) <= 20).length },
    { range: "21–40", count: allLeads.filter(l => (l.totalScore ?? 0) > 20 && (l.totalScore ?? 0) <= 40).length },
    { range: "41–60", count: allLeads.filter(l => (l.totalScore ?? 0) > 40 && (l.totalScore ?? 0) <= 60).length },
    { range: "61–80", count: allLeads.filter(l => (l.totalScore ?? 0) > 60 && (l.totalScore ?? 0) <= 80).length },
    { range: "81–100", count: allLeads.filter(l => (l.totalScore ?? 0) > 80).length },
  ];

  res.json({
    total: allLeads.length,
    recent_7d: recentLeads,
    avg_total_score: avgTotal,
    avg_intent_score: avgIntent,
    avg_fit_score: avgFit,
    segment_counts: segmentCounts,
    industry_counts: industryCounts,
    source_counts: sourceCounts,
    form_type_counts: formTypeCounts,
    score_distribution: scoreDistribution,
  });
});

// Store spreadsheet ID in memory (persists for lifetime of the server process)
let cachedSpreadsheetId: string | null = null;

function ctaLabel(formType: string | null | undefined, campaign: string | null | undefined): string {
  if (campaign?.startsWith("pricing_")) return "Pricing Modal";
  if (campaign?.includes("homepage_trial")) return "Trial Form";
  if (campaign?.includes("homepage_demo")) return "Demo Form";
  if (campaign?.includes("summit") || campaign?.includes("event") || campaign?.includes("growth_summit")) return "Event Form";
  if (formType === "free_trial") return "Trial Form";
  if (formType === "demo_request") return "Demo Form";
  if (formType === "event_registration") return "Event Form";
  return formType ?? "—";
}

// POST /admin/sheets/sync — creates or refreshes the Google Sheet with all lead data
router.post("/admin/sheets/sync", authMiddleware, async (_req, res) => {
  const connectors = new ReplitConnectors();

  const allLeads = await db.select().from(leadsTable);

  const headers = [
    "ID", "Full Name", "Email", "Company", "Job Title",
    "Company Size", "Industry", "Lead Source", "CTA Source", "Campaign",
    "Marketing Challenge", "Segment", "Total Score",
    "Intent (0-40)", "Fit (0-30)", "Behavior (0-20)", "Source (0-10)",
    "Last Activity", "Captured On",
  ];

  const rows = allLeads.map(l => [
    String(l.id),
    l.fullName,
    l.email,
    l.companyName,
    l.jobTitle ?? "",
    l.companySize ?? "",
    l.industry ?? "",
    l.referralSource ?? l.leadSource ?? "",
    ctaLabel(l.formType, l.campaign),
    l.campaign ?? "",
    l.marketingChallenge ?? "",
    l.segment,
    String(l.totalScore ?? 0),
    String(l.intentScore ?? 0),
    String(l.fitScore ?? 0),
    String(l.behaviorScore ?? 0),
    String(l.sourceScore ?? 0),
    l.lastActivityAt ? new Date(l.lastActivityAt).toLocaleDateString("en-US") : "",
    new Date(l.createdAt).toLocaleDateString("en-US"),
  ]);

  try {
    // Create a new spreadsheet if we don't have one yet
    if (!cachedSpreadsheetId) {
      const createRes = await connectors.proxy("google-sheet", "/v4/spreadsheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          properties: { title: "Nexpoint Leads — Live Data" },
          sheets: [{
            properties: { title: "Leads" },
          }],
        }),
      });
      const sheet = await createRes.json() as any;
      cachedSpreadsheetId = sheet.spreadsheetId;
    }

    const spreadsheetId = cachedSpreadsheetId!;

    // Clear the sheet first
    await connectors.proxy("google-sheet", `/v4/spreadsheets/${spreadsheetId}/values/Leads:clear`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    // Write headers + all rows
    const values = [headers, ...rows];
    await connectors.proxy("google-sheet", `/v4/spreadsheets/${spreadsheetId}/values/Leads!A1:append?valueInputOption=RAW&insertDataOption=OVERWRITE`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ values }),
    });

    // Bold the header row and set column widths
    await connectors.proxy("google-sheet", `/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: [
          {
            repeatCell: {
              range: { sheetId: 0, startRowIndex: 0, endRowIndex: 1 },
              cell: {
                userEnteredFormat: {
                  textFormat: { bold: true },
                  backgroundColor: { red: 0.13, green: 0.17, blue: 0.29 },
                  horizontalAlignment: "CENTER",
                },
              },
              fields: "userEnteredFormat(textFormat,backgroundColor,horizontalAlignment)",
            },
          },
          {
            autoResizeDimensions: {
              dimensions: { sheetId: 0, dimension: "COLUMNS", startIndex: 0, endIndex: headers.length },
            },
          },
          {
            updateSheetProperties: {
              properties: { sheetId: 0, gridProperties: { frozenRowCount: 1 } },
              fields: "gridProperties.frozenRowCount",
            },
          },
        ],
      }),
    });

    const sheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
    res.json({ success: true, spreadsheetId, url: sheetUrl, rowCount: rows.length });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "Sheets sync failed" });
  }
});

// GET /admin/sheets/info — returns the current sheet URL if it exists
router.get("/admin/sheets/info", authMiddleware, async (_req, res) => {
  if (!cachedSpreadsheetId) {
    res.json({ exists: false });
    return;
  }
  res.json({
    exists: true,
    url: `https://docs.google.com/spreadsheets/d/${cachedSpreadsheetId}`,
    spreadsheetId: cachedSpreadsheetId,
  });
});

// ─── Workflow Health ───────────────────────────────────────────────────────

function buildWorkflowHealth(actions: any[], now: Date) {
  const enriched = actions.map((a: any) => {
    const slaMins = ACTION_SLA_MINS[a.actionType] ?? null;
    const ageMins = Math.round((now.getTime() - new Date(a.createdAt).getTime()) / 60000);
    const isActionable = a.status === "pending" || a.status === "failed";
    const overdue = isActionable && slaMins !== null && ageMins > slaMins;
    return { ...a, slaMins, ageMins, overdue, overdueByMins: overdue ? ageMins - slaMins! : 0 };
  });

  const total     = enriched.length;
  const delivered = enriched.filter(a => a.status === "delivered" || a.status === "success").length;
  const pending   = enriched.filter(a => a.status === "pending").length;
  const scheduled = enriched.filter(a => a.status === "scheduled").length;
  const failed    = enriched.filter(a => a.status === "failed").length;
  const overdue   = enriched.filter(a => a.overdue).length;
  const actionable = total - scheduled;
  const healthScore = actionable > 0 ? Math.max(0, Math.round((delivered / actionable) * 100)) : 100;

  const typeMap: Record<string, any> = {};
  for (const a of enriched) {
    if (!typeMap[a.actionType]) {
      typeMap[a.actionType] = {
        actionType: a.actionType, label: ACTION_LABELS[a.actionType] ?? a.actionType,
        total: 0, delivered: 0, pending: 0, scheduled: 0, failed: 0, overdue: 0,
      };
    }
    typeMap[a.actionType].total++;
    if (a.status === "delivered" || a.status === "success") typeMap[a.actionType].delivered++;
    else if (a.status === "pending") typeMap[a.actionType].pending++;
    else if (a.status === "scheduled") typeMap[a.actionType].scheduled++;
    else if (a.status === "failed") typeMap[a.actionType].failed++;
    if (a.overdue) typeMap[a.actionType].overdue++;
  }

  const pendingActions = enriched
    .filter(a => a.status === "pending" || a.status === "failed")
    .sort((a, b) => {
      if (a.overdue && !b.overdue) return -1;
      if (!a.overdue && b.overdue) return 1;
      return b.ageMins - a.ageMins;
    })
    .map(a => ({
      id: a.id, leadId: a.leadId, leadName: a.leadName, email: a.email,
      companyName: a.companyName, jobTitle: a.jobTitle,
      actionType: a.actionType, label: ACTION_LABELS[a.actionType] ?? a.actionType,
      segment: a.segment, status: a.status,
      createdAt: a.createdAt, scheduledAt: a.scheduledAt,
      slaMins: a.slaMins, ageMins: a.ageMins, overdue: a.overdue, overdueByMins: a.overdueByMins,
    }));

  return {
    summary: { total, delivered, pending, scheduled, failed, overdue, healthScore },
    byType: Object.values(typeMap).sort((a: any, b: any) => b.total - a.total),
    pendingActions,
    generatedAt: now.toISOString(),
  };
}

// GET /admin/workflow-health — live SLA-tracked action metrics
router.get("/admin/workflow-health", authMiddleware, async (_req, res) => {
  try {
    const actions = await db
      .select({
        id: leadActionsTable.id, leadId: leadActionsTable.leadId,
        actionType: leadActionsTable.actionType, segment: leadActionsTable.segment,
        status: leadActionsTable.status, scheduledAt: leadActionsTable.scheduledAt,
        executedAt: leadActionsTable.executedAt, createdAt: leadActionsTable.createdAt,
        leadName: leadsTable.fullName, email: leadsTable.email,
        companyName: leadsTable.companyName, jobTitle: leadsTable.jobTitle,
      })
      .from(leadActionsTable)
      .leftJoin(leadsTable, eq(leadActionsTable.leadId, leadsTable.id));

    res.json(buildWorkflowHealth(actions, new Date()));
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "Failed to fetch workflow health" });
  }
});

// POST /admin/sheets/workflow-health-sync — writes Workflow Health tab to the user's workbook
router.post("/admin/sheets/workflow-health-sync", authMiddleware, async (_req, res) => {
  try {
    const connectors = new ReplitConnectors();
    const now = new Date();

    const actions = await db
      .select({
        id: leadActionsTable.id, leadId: leadActionsTable.leadId,
        actionType: leadActionsTable.actionType, segment: leadActionsTable.segment,
        status: leadActionsTable.status, scheduledAt: leadActionsTable.scheduledAt,
        executedAt: leadActionsTable.executedAt, createdAt: leadActionsTable.createdAt,
        leadName: leadsTable.fullName, email: leadsTable.email,
        companyName: leadsTable.companyName, jobTitle: leadsTable.jobTitle,
      })
      .from(leadActionsTable)
      .leftJoin(leadsTable, eq(leadActionsTable.leadId, leadsTable.id));

    const health = buildWorkflowHealth(actions, now);
    const { summary, byType, pendingActions } = health;

    // Ensure "Workflow Health" tab exists — add if missing
    const sheetListRes = await connectors.proxy(
      "google-sheet",
      `/v4/spreadsheets/${WORKFLOW_SHEET_ID}?fields=sheets.properties`,
    );
    const sheetList = await sheetListRes.json() as any;
    const existingSheet = sheetList.sheets?.find((s: any) => s.properties?.title === WORKFLOW_TAB_NAME);
    let tabSheetId: number;

    if (!existingSheet) {
      const addRes = await connectors.proxy("google-sheet", `/v4/spreadsheets/${WORKFLOW_SHEET_ID}:batchUpdate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requests: [{ addSheet: { properties: { title: WORKFLOW_TAB_NAME } } }] }),
      });
      const addData = await addRes.json() as any;
      tabSheetId = addData.replies?.[0]?.addSheet?.properties?.sheetId ?? 1;
    } else {
      tabSheetId = existingSheet.properties.sheetId;
    }

    // Clear the tab
    await connectors.proxy("google-sheet", `/v4/spreadsheets/${WORKFLOW_SHEET_ID}/values/${encodeURIComponent(WORKFLOW_TAB_NAME)}:clear`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    function fmtAge(mins: number) {
      if (mins < 60) return `${mins}m`;
      if (mins < 1440) return `${Math.round(mins / 60)}h`;
      return `${Math.round(mins / 1440)}d`;
    }

    // Build sheet data
    const rows: string[][] = [
      // Title
      ["NEXPOINT — WORKFLOW HEALTH MONITOR"],
      [`Last synced: ${now.toLocaleString("en-US")}`, "", "", "", "", "", ""],
      [""],
      // Summary section
      ["📊 SUMMARY", ""],
      ["Metric", "Value"],
      ["Total Actions", String(summary.total)],
      ["Delivered / Success", String(summary.delivered)],
      ["Pending", String(summary.pending)],
      ["Scheduled (future)", String(summary.scheduled)],
      ["Failed", String(summary.failed)],
      ["Overdue (past SLA)", String(summary.overdue)],
      ["Workflow Health Score", `${summary.healthScore}%`],
      [""],
      // Action type breakdown
      ["📋 ACTION TYPE BREAKDOWN", ""],
      ["Action Type", "Total", "Delivered", "Pending", "Scheduled", "Failed", "Overdue"],
      ...byType.map((t: any) => [
        t.label, String(t.total), String(t.delivered),
        String(t.pending), String(t.scheduled), String(t.failed), String(t.overdue),
      ]),
      [""],
      // Pending / overdue table
      [`⚠️ PENDING & OVERDUE ACTIONS (${pendingActions.length})`, ""],
      ["Lead Name", "Company", "Role", "Segment", "Action", "Status", "Age", "SLA", "Overdue?", "Overdue By", "Created At", "Email"],
      ...pendingActions.map((a: any) => [
        a.leadName ?? "—", a.companyName ?? "—", a.jobTitle ?? "—",
        a.segment, a.label, a.status.toUpperCase(),
        fmtAge(a.ageMins),
        a.slaMins ? fmtAge(a.slaMins) : "N/A",
        a.overdue ? "YES" : "No",
        a.overdue ? fmtAge(a.overdueByMins) : "—",
        new Date(a.createdAt).toLocaleString("en-US"),
        a.email ?? "—",
      ]),
    ];

    await connectors.proxy(
      "google-sheet",
      `/v4/spreadsheets/${WORKFLOW_SHEET_ID}/values/${encodeURIComponent(WORKFLOW_TAB_NAME)}!A1:append?valueInputOption=RAW&insertDataOption=OVERWRITE`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values: rows }),
      }
    );

    // Format: bold headers, freeze row 1, colour overdue rows red
    const dataStartRow = rows.findIndex(r => r[0] === "Lead Name");
    const overdueRows = pendingActions
      .map((a: any, i: number) => ({ idx: dataStartRow + 1 + i, overdue: a.overdue }))
      .filter((r: any) => r.overdue);

    const formatRequests: any[] = [
      // Bold row 1 (title) — soft indigo with dark purple text
      {
        repeatCell: {
          range: { sheetId: tabSheetId, startRowIndex: 0, endRowIndex: 1 },
          cell: {
            userEnteredFormat: {
              textFormat: { bold: true, fontSize: 13, foregroundColor: { red: 0.18, green: 0.13, blue: 0.42 } },
              backgroundColor: { red: 0.84, green: 0.82, blue: 0.97 },
            },
          },
          fields: "userEnteredFormat(textFormat,backgroundColor)",
        },
      },
      // Freeze top 2 rows
      { updateSheetProperties: { properties: { sheetId: tabSheetId, gridProperties: { frozenRowCount: 2 } }, fields: "gridProperties.frozenRowCount" } },
      // Auto-resize all columns
      { autoResizeDimensions: { dimensions: { sheetId: tabSheetId, dimension: "COLUMNS", startIndex: 0, endIndex: 12 } } },
    ];

    // Section header rows (rows with "📊", "📋", "⚠️") — very light lavender with muted purple text
    rows.forEach((row, idx) => {
      if (row[0]?.match(/^[📊📋⚠️]/u)) {
        formatRequests.push({
          repeatCell: {
            range: { sheetId: tabSheetId, startRowIndex: idx, endRowIndex: idx + 1 },
            cell: {
              userEnteredFormat: {
                textFormat: { bold: true, foregroundColor: { red: 0.30, green: 0.25, blue: 0.58 } },
                backgroundColor: { red: 0.92, green: 0.91, blue: 0.99 },
              },
            },
            fields: "userEnteredFormat(textFormat,backgroundColor)",
          },
        });
      }
    });

    // Light coral background + dark red text for overdue action rows
    for (const { idx } of overdueRows) {
      formatRequests.push({
        repeatCell: {
          range: { sheetId: tabSheetId, startRowIndex: idx, endRowIndex: idx + 1 },
          cell: {
            userEnteredFormat: {
              backgroundColor: { red: 1.0, green: 0.88, blue: 0.88 },
              textFormat: { foregroundColor: { red: 0.65, green: 0.12, blue: 0.12 }, bold: true },
            },
          },
          fields: "userEnteredFormat(backgroundColor,textFormat)",
        },
      });
    }

    await connectors.proxy("google-sheet", `/v4/spreadsheets/${WORKFLOW_SHEET_ID}:batchUpdate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requests: formatRequests }),
    });

    res.json({
      success: true,
      url: `https://docs.google.com/spreadsheets/d/${WORKFLOW_SHEET_ID}`,
      summary,
      syncedAt: now.toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "Workflow health sync failed" });
  }
});

// ─── Lead Insights (AI-generated, period-scoped) ──────────────────────────
router.get("/admin/insights", authMiddleware, async (req, res) => {
  const period = (req.query.period as string) || "weekly";
  const now = new Date();

  const msPerPeriod: Record<string, number> = {
    daily:   1 * 24 * 60 * 60 * 1000,
    weekly:  7 * 24 * 60 * 60 * 1000,
    monthly: 30 * 24 * 60 * 60 * 1000,
  };
  const windowMs = msPerPeriod[period] ?? msPerPeriod.weekly;
  const since = new Date(now.getTime() - windowMs);

  const allLeads = await db.select().from(leadsTable);
  const periodLeads = allLeads.filter(l => new Date(l.createdAt) >= since);
  const allActions = await db.select().from(leadActionsTable);
  const periodActions = allActions.filter(a => new Date(a.createdAt) >= since);

  const seg = (leads: typeof allLeads) =>
    leads.reduce<Record<string, number>>((acc, l) => { acc[l.segment] = (acc[l.segment] ?? 0) + 1; return acc; }, {});

  const deliveredActions = periodActions.filter(a => a.status === "delivered" || a.status === "success").length;
  const failedActions    = periodActions.filter(a => a.status === "failed").length;
  const hotLeads         = periodLeads.filter(l => l.segment === "hot");
  const warmLeads        = periodLeads.filter(l => l.segment === "warm");
  const avgScore         = periodLeads.length > 0
    ? Math.round(periodLeads.reduce((s, l) => s + (l.totalScore ?? 0), 0) / periodLeads.length)
    : 0;

  const topIndustries = Object.entries(
    periodLeads.reduce<Record<string, number>>((acc, l) => { const k = l.industry ?? "Unknown"; acc[k] = (acc[k] ?? 0) + 1; return acc; }, {})
  ).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([name, count]) => `${name} (${count})`).join(", ");

  const periodLabel = period === "daily" ? "last 24 hours" : period === "weekly" ? "last 7 days" : "last 30 days";

  const prompt = `You are an executive business intelligence analyst for Nexpoint, an AI-powered B2B digital marketing platform. 
Generate concise, EXECUTIVE-READY lead intelligence insights for the ${periodLabel}.

Pipeline data for the ${periodLabel}:
- New leads captured: ${periodLeads.length}
- Hot (SQL) leads: ${hotLeads.length}
- Warm (MQL) leads: ${warmLeads.length}
- Nurture leads: ${periodLeads.filter(l => l.segment === "nurture").length}
- Cold leads: ${periodLeads.filter(l => l.segment === "cold").length}
- Average lead score: ${avgScore}/100
- Top industries: ${topIndustries || "N/A"}
- Outreach actions delivered: ${deliveredActions}
- Outreach actions failed: ${failedActions}
- Total pipeline (all time): ${allLeads.length} leads | Segment breakdown: ${JSON.stringify(seg(allLeads))}

Generate exactly 5 bullet points. Each bullet must be:
1. Actionable — tell the reader what to DO
2. Specific — reference actual numbers from the data
3. Executive-ready — no jargon, crisp and direct
4. Oriented toward revenue impact or pipeline efficiency

Format: Return ONLY a JSON array of 5 strings (the bullet texts). No markdown, no explanation, just the JSON array.
Example: ["Bullet 1 text.", "Bullet 2 text.", ...]`;

  let bullets: string[] = [];
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-5.1",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 800,
    });
    const raw = completion.choices[0]?.message?.content?.trim() ?? "[]";
    const parsed = JSON.parse(raw.replace(/^```json\n?/, "").replace(/\n?```$/, ""));
    if (Array.isArray(parsed)) bullets = parsed.slice(0, 5);
  } catch {
    bullets = [
      `${periodLeads.length} new lead${periodLeads.length !== 1 ? "s" : ""} were captured in the ${periodLabel}.`,
      `${hotLeads.length} hot SQL lead${hotLeads.length !== 1 ? "s" : ""} require immediate sales follow-up — prioritise outreach within the hour.`,
      `${warmLeads.length} warm MQL lead${warmLeads.length !== 1 ? "s" : ""} are in the pipeline — schedule personalised email sequences within 24 hours.`,
      `Average lead score of ${avgScore}/100 indicates ${avgScore >= 60 ? "strong intent — focus on conversion" : avgScore >= 40 ? "moderate intent — nurture to upgrade score" : "early-stage intent — educate before selling"}.`,
      `${deliveredActions} outreach actions delivered with ${failedActions} failure${failedActions !== 1 ? "s" : ""} — review failed actions to prevent pipeline leakage.`,
    ];
  }

  res.json({
    period,
    periodLabel,
    bullets,
    summary: {
      newLeads: periodLeads.length,
      hot: hotLeads.length,
      warm: warmLeads.length,
      avgScore,
      deliveredActions,
      failedActions,
    },
    generatedAt: now.toISOString(),
  });
});

export default router;
