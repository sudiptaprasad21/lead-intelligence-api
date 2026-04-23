/**
 * Shared hook for lead capture forms.
 * Handles: upsert lead + track activity in sequence.
 */
import { useUpsertLead, useTrackActivity } from "@workspace/api-client-react";

export type ActivityType =
  | "demo_page_visit"
  | "pricing_page_visit"
  | "event_page_visit"
  | "contact_sales_click"
  | "demo_form_started"
  | "demo_form_submitted"
  | "trial_form_submitted"
  | "event_registration_submitted"
  | "whatsapp_click"
  | "email_click";

export interface LeadData {
  email: string;
  full_name: string;
  company_name: string;
  job_title?: string | null;
  company_size?: string | null;
  industry?: string | null;
  source?: string | null;
  campaign?: string | null;
  form_type?: string | null;
  referral_source?: string | null;
  marketing_challenge?: string | null;
}

export function useLeadCapture() {
  const upsertLead = useUpsertLead();
  const trackActivity = useTrackActivity();

  const captureLead = async (
    leadData: LeadData,
    activityType: ActivityType,
    metadata?: Record<string, unknown>
  ) => {
    // 1. Upsert lead (create or update by email)
    const lead = await upsertLead.mutateAsync({ data: leadData });

    // 2. Track the activity
    await trackActivity.mutateAsync({
      data: {
        email: leadData.email,
        activity_type: activityType,
        status: "completed",
        metadata: metadata ?? {},
      },
    });

    return lead;
  };

  const trackPageVisit = async (email: string, activityType: ActivityType) => {
    try {
      await trackActivity.mutateAsync({
        data: {
          email,
          activity_type: activityType,
          status: "initiated",
          metadata: { page: activityType.replace("_visit", "").replace("_click", "") },
        },
      });
    } catch {
      // Silently ignore — lead may not exist yet for anonymous visits
    }
  };

  const trackClick = async (email: string, activityType: ActivityType) => {
    try {
      await trackActivity.mutateAsync({
        data: {
          email,
          activity_type: activityType,
          status: "initiated",
          metadata: { action: activityType },
        },
      });
    } catch {
      // Silently ignore
    }
  };

  return {
    captureLead,
    trackPageVisit,
    trackClick,
    isLoading: upsertLead.isPending || trackActivity.isPending,
  };
}
