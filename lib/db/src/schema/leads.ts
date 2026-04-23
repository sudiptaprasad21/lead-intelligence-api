import {
  pgTable,
  text,
  serial,
  integer,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const leadsTable = pgTable("leads", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  fullName: text("full_name").notNull(),
  companyName: text("company_name").notNull(),
  jobTitle: text("job_title"),
  companySize: text("company_size"),
  industry: text("industry"),
  // Always "website_visit" for this landing page
  source: text("source").notNull().default("website_visit"),
  // Channel: direct, referral, event, organic, paid, cold_list
  leadSource: text("lead_source"),
  // Which form submitted: free_trial, demo_request, event_registration, contact
  campaign: text("campaign"),
  formType: text("form_type"),
  // How they heard about Nexpoint (LinkedIn, Google, Referral, etc.)
  referralSource: text("referral_source"),
  marketingChallenge: text("marketing_challenge"),
  // Flexible metadata JSON for extra fields
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  // Lead scores (computed, stored for fast queries)
  intentScore: integer("intent_score").notNull().default(0),
  fitScore: integer("fit_score").notNull().default(0),
  behaviorScore: integer("behavior_score").notNull().default(0),
  sourceScore: integer("source_score").notNull().default(0),
  totalScore: integer("total_score").notNull().default(0),
  // hot (SQL 80-100), warm (MQL 60-79), nurture (40-59), cold (<40)
  segment: text("segment").notNull().default("cold"),
  lastActivityAt: timestamp("last_activity_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertLeadSchema = createInsertSchema(leadsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  intentScore: true,
  fitScore: true,
  behaviorScore: true,
  sourceScore: true,
  totalScore: true,
  segment: true,
});

export type InsertLead = z.infer<typeof insertLeadSchema>;
export type Lead = typeof leadsTable.$inferSelect;
