/**
 * AI Outreach Generator
 * Uses OpenAI (via Replit AI proxy) to create personalized B2B outreach messages.
 * Falls back to curated templates when AI is unavailable.
 */

import { openai } from "@workspace/integrations-openai-ai-server";
import type { Lead } from "@workspace/db";

export interface TelegramMessage {
  content: string;
  source: "ai" | "template";
}

export interface EmailMessage {
  subject: string;
  body: string;
  source: "ai" | "template";
}

export interface NurtureEmail {
  subject: string;
  body: string;
  source: "ai" | "template";
}

function buildLeadContext(lead: Partial<Lead>): string {
  const parts: string[] = [];
  if (lead.fullName) parts.push(`Name: ${lead.fullName}`);
  if (lead.jobTitle) parts.push(`Title: ${lead.jobTitle}`);
  if (lead.companyName) parts.push(`Company: ${lead.companyName}`);
  if (lead.industry) parts.push(`Industry: ${lead.industry}`);
  if (lead.companySize) parts.push(`Company Size: ${lead.companySize} employees`);
  if (lead.marketingChallenge) parts.push(`Challenge: ${lead.marketingChallenge}`);
  return parts.join(" | ");
}

function getFirstName(lead: Partial<Lead>): string {
  return lead.fullName?.split(" ")[0] ?? "there";
}

/** Generate a 2-4 line Telegram message for a Hot lead (immediate, action-driven) */
export async function generateTelegramMessage(lead: Partial<Lead>): Promise<TelegramMessage> {
  try {
    const firstName = getFirstName(lead);
    const context = buildLeadContext(lead);

    const prompt = `You are a B2B sales outreach specialist for Nexpoint — an AI-powered unified digital marketing platform that helps companies consolidate their marketing channels, automate campaigns, and track ROI in real-time.

Write a short Telegram outreach message to a HOT lead (high buying intent).

Lead context: ${context}

Requirements:
- Exactly 2-4 lines
- Personalized to their role/industry
- Action-driven with a clear next step (book a 15-min call)
- Professional but conversational tone
- NO generic phrases like "hope this finds you well"
- Reference a specific pain point relevant to their role/industry
- End with a soft CTA

Output ONLY the message text, no labels or explanations.`;

    const response = await openai.chat.completions.create({
      model: "gpt-5.1",
      max_completion_tokens: 200,
      messages: [
        { role: "system", content: "You write concise, personalized B2B outreach messages. Output only the message." },
        { role: "user", content: prompt },
      ],
    });

    const content = response.choices[0]?.message?.content?.trim();
    if (!content) {
      console.warn("[AI Outreach] WhatsApp: empty response. choices:", JSON.stringify(response.choices?.slice(0,1)));
      throw new Error("Empty AI response");
    }

    return { content, source: "ai" };
  } catch (err) {
    console.warn("[AI Outreach] Telegram generation failed, using template:", (err as Error).message ?? err);
    const firstName = getFirstName(lead);
    const role = lead.jobTitle ?? "your team";
    const company = lead.companyName ?? "your company";
    const content = `Hi ${firstName}! 👋 I noticed ${company} might benefit from Nexpoint's unified marketing platform — we help teams like ${role} consolidate campaigns and track ROI in one place.\n\nWould love to show you a quick 15-min demo. When's a good time this week?`;
    return { content, source: "template" };
  }
}

/** Generate a personalized email for a Warm lead (value prop + demo CTA) */
export async function generateWarmEmail(lead: Partial<Lead>): Promise<EmailMessage> {
  try {
    const firstName = getFirstName(lead);
    const context = buildLeadContext(lead);

    const prompt = `You are a B2B email copywriter for Nexpoint — an AI-powered unified digital marketing platform that consolidates all marketing channels, automates campaigns with AI, and delivers real-time ROI tracking for B2B companies.

Write a personalized outreach email for a WARM lead (showed interest but hasn't committed).

Lead context: ${context}

Requirements:
- Subject line: compelling, specific to their industry/role (max 60 chars)
- Body: 3-4 short paragraphs
  1. Personalized opener acknowledging their role/industry challenge
  2. Specific value prop of Nexpoint relevant to their situation
  3. Social proof or outcome metric (e.g., "clients see 40% reduction in CAC")
  4. Clear CTA: book a 20-min demo with a demo link placeholder [DEMO_LINK]
- Professional B2B tone
- No fluff or filler sentences

Output format (exactly):
SUBJECT: [subject line here]
BODY:
[email body here]`;

    const response = await openai.chat.completions.create({
      model: "gpt-5.1",
      max_completion_tokens: 400,
      messages: [
        { role: "system", content: "You write high-converting B2B sales emails. Follow the exact output format." },
        { role: "user", content: prompt },
      ],
    });
    console.warn("[AI Outreach] Warm email raw:", JSON.stringify(response.choices[0]?.message?.content?.slice(0,100)));

    const raw = response.choices[0]?.message?.content?.trim() ?? "";

    // Flexible parsing — handles SUBJECT:/Subject:/subject: and BODY:/Body:/body:
    const subjectMatch = raw.match(/^(?:SUBJECT|Subject|subject):\s*(.+)$/m);
    const bodyMatch = raw.match(/^(?:BODY|Body|body):\s*([\s\S]+)$/m);

    if (subjectMatch && bodyMatch) {
      return {
        subject: subjectMatch[1].trim(),
        body: bodyMatch[1].trim(),
        source: "ai",
      };
    }

    // Fallback: treat first line as subject, rest as body
    const lines = raw.split("\n").map(l => l.trim()).filter(Boolean);
    if (lines.length >= 2) {
      const subject = lines[0].replace(/^(subject|re|fw)[:\s]*/i, "").trim();
      const body = lines.slice(1).join("\n").trim();
      return { subject, body, source: "ai" };
    }

    throw new Error("Could not parse AI email response");
  } catch (err) {
    console.warn("[AI Outreach] Warm email generation failed, using template:", (err as Error).message ?? err);
    const firstName = getFirstName(lead);
    const company = lead.companyName ?? "your company";
    const industry = lead.industry ?? "your industry";
    return {
      subject: `How ${company} can unify marketing & cut CAC with Nexpoint`,
      body: `Hi ${firstName},\n\nI came across ${company} and noticed you're operating in ${industry} — a space where fragmented marketing stacks are eating into margins.\n\nNexpoint brings all your channels (paid, organic, CRM, email) into one AI-powered dashboard. Our clients typically see a 35-40% reduction in customer acquisition cost within the first 90 days.\n\nI'd love to walk you through a quick 20-minute demo tailored to ${industry}. You can book directly here: [DEMO_LINK]\n\nLooking forward to connecting.\n\nBest,\nThe Nexpoint Team`,
      source: "template",
    };
  }
}

/** Generate a light-touch nurture email for Nurture leads (educational, industry-specific) */
export async function generateNurtureEmail(
  lead: Partial<Lead>,
  step: "day0" | "day3" | "day7" | "day14"
): Promise<NurtureEmail> {
  const stepConfig = {
    day0: { goal: "introduce Nexpoint and establish credibility", tone: "educational, no hard sell", cta: "read our intro guide" },
    day3: { goal: "share value/educational content on solving their core challenge", tone: "helpful, thought-leadership", cta: "download a relevant resource" },
    day7: { goal: "share a relevant case study or proof of results", tone: "evidence-based, confident", cta: "see the full case study" },
    day14: { goal: "soft demo invite — they've had time to digest content", tone: "conversational, easy ask", cta: "book a 15-min exploratory call" },
  };

  const config = stepConfig[step];
  try {
    const firstName = getFirstName(lead);
    const context = buildLeadContext(lead);

    const prompt = `Write a nurture email (step ${step}) for a B2B lead who showed interest in Nexpoint (AI-powered unified marketing platform).

Lead context: ${context}
Email goal: ${config.goal}
Tone: ${config.tone}
CTA: ${config.cta}

Requirements:
- Subject: industry-relevant, curiosity-driven (max 55 chars)
- Body: 2-3 short paragraphs, conversational, no aggressive sales language
- Light personalization to their industry

Output format:
SUBJECT: [subject]
BODY:
[body]`;

    const response = await openai.chat.completions.create({
      model: "gpt-5.1",
      max_completion_tokens: 350,
      messages: [
        { role: "system", content: "You write B2B nurture email sequences. Output only in the specified format." },
        { role: "user", content: prompt },
      ],
    });

    const raw = response.choices[0]?.message?.content?.trim() ?? "";
    const subjectMatch = raw.match(/^(?:SUBJECT|Subject|subject):\s*(.+)$/m);
    const bodyMatch = raw.match(/^(?:BODY|Body|body):\s*([\s\S]+)$/m);

    if (subjectMatch && bodyMatch) {
      return { subject: subjectMatch[1].trim(), body: bodyMatch[1].trim(), source: "ai" };
    }

    // Fallback: first line = subject, rest = body
    const lines = raw.split("\n").map(l => l.trim()).filter(Boolean);
    if (lines.length >= 2) {
      const subject = lines[0].replace(/^(subject|re|fw)[:\s]*/i, "").trim();
      const body = lines.slice(1).join("\n").trim();
      return { subject, body, source: "ai" };
    }

    throw new Error("Parse error");
  } catch {
    const firstName = getFirstName(lead);
    const fallbacks = {
      day0: {
        subject: "The unified marketing stack most B2B teams wish they'd built earlier",
        body: `Hi ${firstName},\n\nMost marketing teams we talk to are managing 6-8 tools just to run their campaigns — and none of them talk to each other.\n\nNexpoint was built to fix that. One platform, all channels, real-time data.\n\nHere's a quick overview of how it works: [GUIDE_LINK]`,
      },
      day3: {
        subject: "3 things holding back B2B marketing ROI in 2025",
        body: `Hi ${firstName},\n\nWe've been thinking about the challenges modern B2B marketers face — and three patterns keep coming up: attribution gaps, tool sprawl, and delayed insights.\n\nThis guide breaks down how leading teams are solving each: [RESOURCE_LINK]\n\nHope it's useful for you and the team.`,
      },
      day7: {
        subject: "How a SaaS company cut CAC by 38% in 60 days",
        body: `Hi ${firstName},\n\nOne of our clients — a 200-person SaaS team — was spending heavily across LinkedIn, Google, and email with no single view of what was working.\n\nWith Nexpoint, they unified everything and cut CAC by 38% in the first two months.\n\nFull story here: [CASE_STUDY_LINK]`,
      },
      day14: {
        subject: "Quick question for you",
        body: `Hi ${firstName},\n\nI've shared a few resources over the past couple of weeks — hope some of it was useful.\n\nIf you're open to it, I'd love to get on a 15-minute call just to understand where your team is today — no pitch, just a conversation.\n\nYou can pick a time that works here: [DEMO_LINK]`,
      },
    };
    const fb = fallbacks[step];
    return { ...fb, source: "template" };
  }
}

/** Generate talking points for an SDR follow-up on a Warm lead */
export async function generateSDRTalkingPoints(lead: Partial<Lead>): Promise<string> {
  try {
    const context = buildLeadContext(lead);
    const response = await openai.chat.completions.create({
      model: "gpt-5.1",
      max_completion_tokens: 250,
      messages: [
        {
          role: "user",
          content: `Generate 3-4 bullet-point talking points for an SDR follow-up call with this B2B lead.

Lead context: ${context}
Product: Nexpoint (AI-powered unified digital marketing platform)

Focus on:
- Their specific pain point based on role/industry
- Relevant Nexpoint value props
- Suggested qualifying questions

Output as bullet points only, no headers.`,
        },
      ],
    });
    return response.choices[0]?.message?.content?.trim() ?? getDefaultTalkingPoints(lead);
  } catch {
    return getDefaultTalkingPoints(lead);
  }
}

function getDefaultTalkingPoints(lead: Partial<Lead>): string {
  const company = lead.companyName ?? "their company";
  const industry = lead.industry ?? "their sector";
  return `• Ask about their current marketing stack — how many tools are they managing today?\n• Explore attribution gaps: can they tie spend across channels to actual pipeline?\n• Highlight Nexpoint's AI automation for ${industry} use cases\n• Qualifying question: who owns the final decision on marketing tooling at ${company}?`;
}
