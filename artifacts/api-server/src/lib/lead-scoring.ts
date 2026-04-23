/**
 * B2B Lead Scoring Engine — v1
 * Based on scoring model: b2b_lead_scoring_v1
 *
 * Total Score (0–100) = Intent (40) + Fit (30) + Behavior (20) + Source (10)
 */

import type { Lead } from "@workspace/db";

// Activity types that map to intent signals
export const ACTIVITY_INTENT_POINTS: Record<string, number> = {
  contact_sales_click: 30,
  whatsapp_click: 30,               // same as contact_sales_click
  demo_form_submitted: 25,
  trial_form_submitted: 25,         // form completion = strong intent
  event_registration_submitted: 25, // high-commitment event sign-up = strong intent
  demo_page_visit: 20,
  pricing_page_visit: 20,
  demo_form_started: 15,
  event_page_visit: 10,
  email_click: 10,
};

// Source channel → source score
const SOURCE_SCORES: Record<string, number> = {
  direct: 10,
  referral: 8,
  event: 8,
  organic: 7,
  paid: 5,
  cold_list: 2,
  website_visit: 7,           // treat organic/direct website visits as organic
};

// Referral source strings → channel mapping
function mapReferralSourceToChannel(referralSource: string | null | undefined): string {
  if (!referralSource) return "direct";
  const s = referralSource.toLowerCase();
  if (s.includes("linkedin") || s.includes("social media")) return "paid";
  if (s.includes("google")) return "organic";
  if (s.includes("referral")) return "referral";
  if (s.includes("events") || s.includes("event")) return "event";
  return "direct";
}

/**
 * Compute the FIT score (0–30) based on lead profile attributes.
 */
export function computeFitScore(lead: Partial<Lead>): number {
  let score = 0;

  // Company size: 51-500 is ICP sweet spot (+10)
  if (lead.companySize) {
    if (["51-200", "201-500"].includes(lead.companySize)) {
      score += 10;
    } else if (["11-50"].includes(lead.companySize)) {
      score += 5;  // partial ICP fit
    } else if (["500+"].includes(lead.companySize)) {
      score += 8;  // enterprise — still valuable
    } else {
      // 1-10: possible non-ICP mismatch
      score -= 5;
    }
  }

  // Industry: target segments for a B2B marketing platform
  const targetIndustries = [
    "technology",
    "marketing agency",
    "e-commerce",
    "finance",
  ];
  if (lead.industry && targetIndustries.some((i) => lead.industry!.toLowerCase().includes(i))) {
    score += 10;
  } else if (lead.industry) {
    score += 5;  // partial fit for other industries
  }

  // Job role: decision maker = Director+ → use job_title
  if (lead.jobTitle) {
    const title = lead.jobTitle.toLowerCase();
    const isDecisionMaker =
      ["cmo", "ceo", "cto", "vp", "vice president", "director", "head of", "chief", "owner", "founder", "partner"].some(
        (t) => title.includes(t)
      );
    if (isDecisionMaker) {
      score += 10;
    } else {
      score += 3; // non-decision-maker: partial credit
    }
  }

  // Geography: assume target market = US/global (no geography data captured, skip or give +5 default)
  score += 5;

  // Cap at 30
  return Math.max(0, Math.min(30, score));
}

/**
 * Compute the SOURCE score (0–10) based on lead source channel.
 */
export function computeSourceScore(lead: Partial<Lead>): number {
  // leadSource is the mapped channel; referralSource is the raw "how did you hear" value
  const channel = lead.leadSource || mapReferralSourceToChannel(lead.referralSource);
  const score = SOURCE_SCORES[channel.toLowerCase()] ?? 5;
  return Math.min(10, score);
}

/**
 * Compute the INTENT score (0–40) from a list of activity records.
 */
export function computeIntentScore(
  activities: Array<{ activityType: string; status: string }>
): number {
  let score = 0;

  // Aggregate unique signals (only count each signal once, pick highest)
  const seen = new Set<string>();

  // Sort by points descending so we process highest-value signals first
  const sorted = [...activities].sort((a, b) => {
    const pa = ACTIVITY_INTENT_POINTS[a.activityType] ?? 0;
    const pb = ACTIVITY_INTENT_POINTS[b.activityType] ?? 0;
    return pb - pa;
  });

  for (const act of sorted) {
    if (!seen.has(act.activityType)) {
      seen.add(act.activityType);
      score += ACTIVITY_INTENT_POINTS[act.activityType] ?? 0;
    }
  }

  return Math.min(40, score);
}

/**
 * Compute the BEHAVIOR score (0–20).
 * We approximate behavior from activities since we don't have session/time-on-site data.
 */
export function computeBehaviorScore(
  activities: Array<{ activityType: string; createdAt: Date }>
): number {
  let score = 0;

  // Count unique sessions (approximated as unique activity days in last 7 days)
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const recentDays = new Set(
    activities
      .filter((a) => new Date(a.createdAt) >= sevenDaysAgo)
      .map((a) => new Date(a.createdAt).toDateString())
  );
  if (recentDays.size >= 3) {
    score += 10;
  } else if (recentDays.size >= 2) {
    score += 5;
  }

  // Proxy: many activities => likely spent >5 min on site
  if (activities.length >= 3) {
    score += 5;
  }

  // Content download / form completions proxy
  const hasCompletion = activities.some((a) =>
    ["demo_form_submitted", "trial_form_submitted", "event_registration_submitted"].includes(
      a.activityType
    )
  );
  if (hasCompletion) {
    score += 5;
  }

  return Math.min(20, score);
}

/**
 * Apply time decay based on days since last activity.
 */
export function applyTimeDecay(score: number, lastActivityAt: Date | null | undefined): number {
  if (!lastActivityAt) return score;

  const now = new Date();
  const daysSinceActivity = Math.floor(
    (now.getTime() - new Date(lastActivityAt).getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysSinceActivity >= 14) {
    return 0;  // reset to cold
  } else if (daysSinceActivity >= 7) {
    return Math.max(0, score - 20);
  } else if (daysSinceActivity >= 3) {
    return Math.max(0, score - 10);
  }

  return score;
}

/**
 * Determine segment from total score.
 */
export function getSegment(totalScore: number): string {
  if (totalScore >= 80) return "hot";
  if (totalScore >= 60) return "warm";
  if (totalScore >= 40) return "nurture";
  return "cold";
}

/**
 * Full score calculation combining all components.
 */
export function calculateLeadScore(
  lead: Partial<Lead>,
  activities: Array<{ activityType: string; status: string; createdAt: Date }>
): {
  intentScore: number;
  fitScore: number;
  behaviorScore: number;
  sourceScore: number;
  totalScore: number;
  segment: string;
} {
  const intentScore = computeIntentScore(activities);
  const fitScore = computeFitScore(lead);
  const behaviorScore = computeBehaviorScore(activities);
  const sourceScore = computeSourceScore(lead);

  const rawTotal = intentScore + fitScore + behaviorScore + sourceScore;
  const totalScore = applyTimeDecay(rawTotal, lead.lastActivityAt);
  const segment = getSegment(totalScore);

  return { intentScore, fitScore, behaviorScore, sourceScore, totalScore, segment };
}
