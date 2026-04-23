import { Router } from "express";
import crypto from "crypto";
import { db, leadsTable } from "@workspace/db";
// @replit/connectors-sdk — Google Sheets integration
import { ReplitConnectors } from "@replit/connectors-sdk";

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

export default router;
