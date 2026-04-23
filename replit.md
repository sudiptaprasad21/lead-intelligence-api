# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Artifacts

### Nexpoint Landing Page (`artifacts/nexpoint`)
- **Type**: react-vite
- **Preview path**: `/`
- **Description**: B2B landing page for Nexpoint — an AI-powered unified digital marketing platform
- **Pages**:
  - `/` — Home page (hero, about, features, trial form, demo form, testimonials, contact)
  - `/pricing` — Pricing page (Trial, Starter $89/mo, Unlimited $249/mo with monthly/annual toggle)
  - `/events` — Events page (2 recorded podcasts, 1 upcoming event with registration form)
- **Features**:
  - Light/dark theme toggle (next-themes + localStorage)
  - All forms use react-hook-form + zod validation
  - Framer-motion scroll animations
  - **All forms wired to backend API**: `POST /api/leads` (upsert) + `POST /api/activities` (tracking)
  - Shared `useLeadCapture` hook at `src/hooks/use-lead-capture.ts`
  - Nexpoint logo from attached_assets/

### API Server (`artifacts/api-server`)
- **Type**: api
- **Preview path**: `/api`
- **Description**: Express backend with lead capture, B2B lead scoring, and activity tracking

#### Endpoints
- `GET /api/health` — Health check
- `POST /api/leads` — Upsert lead by email (create or update). Returns lead with computed score.
- `GET /api/leads` — List all leads, sorted by score descending
- `GET /api/leads/:id` — Get single lead by ID
- `POST /api/activities` — Track a lead activity (requires lead to exist first). Triggers score recalc.
- `GET /api/leads/:id/activities` — Get all activities for a lead

#### Lead Scoring Model (0–100)
- **Intent (0–40)**: activity signals — form submissions (25), page visits (20), contact clicks (30)
- **Fit (0–30)**: company size, industry (target: tech/marketing/e-commerce/finance), job title (C-level/VP/Director = +10)
- **Behavior (0–20)**: visit frequency, form completions
- **Source (0–10)**: channel quality (direct=10, referral=8, event=8, organic=7, paid=5)
- **Time decay**: -10 pts after 3 days, -20 after 7 days, 0 after 14 days
- **Segments**: hot (80+), warm (60–79), nurture (40–59), cold (<40)

#### Activity Types Tracked
`demo_page_visit`, `pricing_page_visit`, `event_page_visit`, `contact_sales_click`, `demo_form_started`, `demo_form_submitted`, `trial_form_submitted`, `event_registration_submitted`, `whatsapp_click`, `email_click`

## Database Schema

### `leads` table
- `id` (serial PK), `email` (unique), `full_name`, `company_name`, `job_title`, `company_size`, `industry`
- `source`, `lead_source`, `campaign`, `form_type`, `referral_source`, `marketing_challenge`
- `intent_score`, `fit_score`, `behavior_score`, `source_score`, `total_score`, `segment`
- `last_activity_at`, `metadata` (JSONB), `created_at`, `updated_at`

### `lead_activities` table
- `id` (serial PK), `lead_id` (FK → leads), `activity_type`, `status`, `metadata` (JSONB), `created_at`

## Known Gaps / Backlog

### Form Data Gaps (by design — forms have been scoped to UX simplicity)
- **Home Trial form**: Missing `job_title`, `industry`, `referral_source` fields (captured in Events form)
- **Home Demo form**: Missing `industry`, `referral_source` (captured in Events form)
- **Pricing modal**: Missing `company_size`, `job_title`, `industry`, `referral_source` — minimal form by design

### Scoring Considerations
- Contact section links (email/phone) are anchor tags, not tracked (would need JS onClick handlers)
- Pricing page visit not auto-tracked as an activity (requires an anonymous session concept)
- No session concept for anonymous visitors (only named leads are tracked)
