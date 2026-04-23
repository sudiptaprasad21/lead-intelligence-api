import { Router } from "express";
import crypto from "crypto";
import { db, leadsTable } from "@workspace/db";

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

export default router;
