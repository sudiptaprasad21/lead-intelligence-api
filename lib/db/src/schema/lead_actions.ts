import { pgTable, text, serial, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { leadsTable } from "./leads";

export const leadActionsTable = pgTable("lead_actions", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id").notNull().references(() => leadsTable.id),
  actionType: text("action_type").notNull(),
  segment: text("segment").notNull(),
  status: text("status").notNull().default("pending"),
  scheduledAt: timestamp("scheduled_at"),
  executedAt: timestamp("executed_at"),
  messageContent: text("message_content"),
  idempotencyKey: text("idempotency_key").notNull().unique(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type LeadAction = typeof leadActionsTable.$inferSelect;
export type InsertLeadAction = typeof leadActionsTable.$inferInsert;
