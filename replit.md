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
  - No backend — frontend-only app
  - Nexpoint logo from attached_assets/

### API Server (`artifacts/api-server`)
- **Type**: api
- **Preview path**: `/api`
- **Description**: Shared Express backend (currently minimal, health check endpoint only)
