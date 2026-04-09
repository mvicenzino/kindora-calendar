# Family Calendar Application

## Overview
A modern calendar application for families and caregivers, featuring a "liquid glass" UI design. It enables families, trusted caregivers, and healthcare providers to coordinate schedules, medical appointments, and care needs. The application targets use cases such as family coordination, eldercare management, trusted provider access, medical tracking, and financial reminders. It uses a full-stack TypeScript architecture with React on the frontend and Express on the backend, offering real-time calendar views, event management, and flexible access controls. The project aims to provide comprehensive tools for managing complex family and caregiving logistics, highlighted by a "sandwich generation" demo mode.

## User Preferences
Preferred communication style: Simple, everyday language.

## Business Documentation
- **KINDORA_BUSINESS_PLAN.md**: Comprehensive investor-ready business plan covering Executive Summary, Problem Statement, Solution, Market Analysis (TAM/SAM/SOM), Competitive Analysis, Product Roadmap, Business Model, Go-to-Market Strategy, Operations Plan, 3-Year Financial Projections, Risk Analysis, and Exit Strategy.

## System Architecture
### Frontend
Built with React 18, TypeScript, and Vite, utilizing Wouter for routing and TanStack Query for server state management. The UI is designed with shadcn/ui (New York style) based on Radix UI primitives and styled with Tailwind CSS. A custom "Liquid Glass" design system incorporates frosted effects, layered depth, and specific typography (Inter, Space Grotesk). State management uses React hooks, with React Hook Form and Zod for form handling. The design is responsive and accessibility-focused.

### Backend
An Express.js application with TypeScript providing a REST API. It uses HTTP-only session-based authentication and resource-based routing. Drizzle ORM handles type-safe database operations, supporting a multi-tier storage implementation: `DemoAwareStorage` routes demo users to `MemStorage` (in-memory) and authenticated users to `DrizzleStorage` (PostgreSQL). Zod is used for shared schema validation.

### Data Storage and Core Features
The application utilizes PostgreSQL for persistent data storage. A `DemoAwareStorage` wrapper intelligently routes demo users to in-memory storage and real users to PostgreSQL, ensuring data isolation. Drizzle Kit manages PostgreSQL migrations.

**Key Features:**
- **User and Family Management**: Tables for users, sessions, families, and family memberships with roles (owner/member/caregiver).
- **Event Management**: Events with completion tracking, recurring event support via RFC 5545 RRULE strings (daily, weekly, biweekly, monthly, yearly patterns, with COUNT or UNTIL end conditions). RRULE parent events are stored once with `isRecurringParent=true` and `rrule` column; occurrences are expanded virtually on query with date-range filtering. Legacy pre-generated recurring events (using `recurrenceRule` column) remain backwards-compatible. Threaded `eventNotes` support.
- **Messaging Systems**: Legacy `messages` for event-specific communication and global `familyMessages` for real-time family coordination with threading.
- **Caregiver & Medical Management**: `medications` with `medicationLogs` for tracking administration, `caregiverPayRates` and `caregiverTimeEntries` for time tracking and automated pay calculation.
- **Care Documentation Vault**: Secure storage for `careDocuments` (medical, insurance, legal) with role-based access and presigned URL uploads.
- **Automated Weekly Summaries**: Cozi-style weekly digest emails of calendar events, configurable by family owners/members and opt-in for users.
- **Web Push Notifications (iPhone)**: Service worker at `/sw.js`, VAPID keys in env (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VITE_VAPID_PUBLIC_KEY`). `pushSubscriptions` table stores per-user subscriptions. Routes: `POST /api/push/subscribe`, `DELETE /api/push/subscribe`, `POST /api/push/test`. Opt-in card in AccountSettings Account tab. Requires iOS 16.4+ and PWA install (Add to Home Screen). Service worker registered in `main.tsx` early. Backend helper in `server/pushService.ts`. Frontend hook: `client/src/hooks/usePushNotifications.ts`.
- **Symptom Tracker**: Daily health log for complex chronic conditions (MCAS, tickborne illness, EDS, etc.). Per-family-member entries stored in `symptomEntries` table (date, energy level 1–10, overall severity 1–10, reaction flag, triggers array, notes) with normalized `symptomSystemRatings` rows for 7 body systems (skin, gi, cardio, respiratory, neuro, musculo, mood). Route: `/health`. 5 views: Log (entry list + hydration widget + create/edit/delete), Meds (medication list with add/AI import), Timeline (color-coded calendar heatmap), Trends (Recharts line + bar charts, trigger frequency), Reports (doctor visit summary with avg severity, good/bad day counts, system breakdown, anaphylaxis alerts). CRUD API: `POST/GET/PUT/DELETE /api/symptoms`. Frontend: `client/src/pages/Health.tsx`.
- **Hydration Tracker**: Per-family-member water intake tracking for today. `hydrationLogs` table (familyId, memberId, date, glassesCount, goalGlasses). Upserts via `POST /api/hydration`; reads via `GET /api/hydration?date=YYYY-MM-DD&familyId=`. Shared `HydrationTracker` component (`client/src/components/HydrationTracker.tsx`) with droplet icons and +/- buttons embedded in Health `/health` Log tab and CaregiverDashboard `/care`.
- **Medications in Health**: New "Meds" tab in Health page shows all active medications for the selected family member. Supports manual add (dialog with name/dosage/frequency/times/instructions) and AI import (paste text or upload photo/file → AI extract → preview → assign member). Reuses existing `/api/medications` CRUD and `/api/medications/import-ai` endpoints.
- **Google Calendar Sync**: One-way sync from Google Calendar → Kindora. OAuth 2.0 flow at `/api/google-calendar/connect` → `/api/google-calendar/callback` stores a refresh token per user in `googleCalendarConnections` table (userId unique, refreshToken, accessToken + expiry, selectedCalendarIds[], lastSyncedAt). Service in `server/googleCalendarSync.ts` fetches events -90d to +365d, deduplicates via `googleEventId` on the events table, assigns a distinct color per calendar. Frontend card in Settings → Import tab (via `ImportSchedule.tsx` → `GoogleCalendarSync` component): "Connect Google Calendar" button when disconnected; calendar checklist + "Sync Now" + "Disconnect" when connected. **Requires**: Google Calendar API enabled in GCP Console, and `https://kindora.ai/api/google-calendar/callback` added as authorized redirect URI.
- **Resources Section (Documents)**: The Documents page has two tabs — "Document Vault" (existing care documents) and "Resources" (8 interactive guides, checklists, templates, and assessments). Category filters: Eldercare, Parenting, Well-Being, Sandwich Generation. Type filters: Checklist, Assessment, Template, Guide. Resources: (1) Parenting Aging Parents Checklist (22 items, 4 sections), (2) When a Parent Can No Longer Live Alone (31 items, 4 sections), (3) After a Hospital Discharge (32 items, 5 sections), (4) Medicare vs. Medicaid Plain English Guide (accordion, 5 sections), (5) Family Meeting Agenda Template (fillable/printable), (6) Caregiver Burnout Self-Assessment (10 questions, scored 0–30), (7) ER vs. Urgent Care vs. Wait It Out Guide (4-tier triage reference), (8) Pediatric Medical Info Sheet (fillable/printable). All state persists to localStorage per family — no backend needed. Component: `client/src/components/ResourcesSection.tsx`.
- **AI Family Advisor (Kira)**: Chat-based AI counselor powered by OpenAI (via Replit AI Integrations, no API key needed). Specialized in sandwich generation challenges: child behavior (picky eating, potty training, biting, tantrums), eldercare (dementia, caregiver burnout, difficult conversations), and caregiver self-care. Per-user conversation history stored in `advisor_conversations` and `advisor_messages` tables. Streaming SSE responses. Route: `/advisor`. Backend: `server/advisorRoutes.ts`. **Personalized greeting system**: when user has a Kira profile, `POST /api/advisor/greet` streams a personalized opening message on each new session using names and context from their profile. The greeting is saved as the first assistant message in any conversation started from it (`priorGreeting` field on message send). **Kira Profile** (`/settings/kira` tab): three free-text fields (`advisorChildrenContext`, `advisorElderContext`, `advisorSelfContext`) stored on the `families` table; injected into system prompt on every message. **Kira Action Tools**: Kira can take real actions via OpenAI function calling. Two tools defined: `create_calendar_event` (creates a calendar event for the family with title, datetime, category, member assignment) and `log_health_note` (creates a symptom entry for a family member with notes, energy, severity). Tool results are streamed as SSE `tool` events to the frontend and rendered as inline action cards with links to view the created item. Tool metadata stored as JSON in `advisor_messages.metadata` column. The two-phase streaming approach: phase 1 collects tool calls while streaming; phase 2 executes tools and streams the narrative response. **Kira Side Panel**: Global slide-out panel accessible from any page. Trigger is a compact pill button ("Kira" + sparkle icon) in the top-right header, between ThemeToggle and profile icon. The pill pulses subtly when closed, becomes filled/active when open. Panel slides in from the right (400px wide). Features: full streaming chat, inline tool action cards, quick prompts on empty state, conversation history view (toggle via clock icon), new conversation button, open-full-page link. `KiraPanelContext` provides `openPanel(prefill?)` and `isOpen` across the entire app. Panel conversation persists across navigation via localStorage (`kira_panel_conv_id`). Auto-archives old conversations via dedicated history view. Files: `client/src/contexts/KiraPanelContext.tsx`, `client/src/components/KiraSidePanel.tsx`.

### Navigation
Sidebar navigation (`AppSidebar`) with links to: Calendar (`/`), Messages (`/messages`), Documents (`/documents`), Memories (`/memories`), Health (`/health`), Care (`/care`), Advisor (`/advisor`), Settings (`/settings`). The Settings page uses tabs for Account (subscription/billing), Family (members, invites, emergency bridge), and Import (AI schedule parser). Unified `Header` with FamilySelector, ThemeToggle, and profile actions. `ViewSwitcherBar` (Day/Week/Month/Timeline views) for calendar navigation.

## External Dependencies
### UI/Styling
- **Radix UI**: Unstyled, accessible component primitives.
- **Lucide React**: Icon system.
- **date-fns**: Date manipulation.
- **class-variance-authority (CVA)**: Type-safe variant styling.
- **embla-carousel-react**: Touch-enabled carousel.
- **Tailwind CSS**: Utility-first CSS framework.
- **Autoprefixer**: CSS vendor prefixing.
- **Google Fonts**: Inter and Space Grotesk.

### Backend/Database
- **@neondatabase/serverless**: PostgreSQL client.
- **connect-pg-simple**: PostgreSQL session store for Express.
- **Drizzle ORM + Drizzle Zod**: Type-safe database toolkit.

### Validation & Type Safety
- **Zod**: Runtime type validation.
- **TypeScript**: Compile-time type safety.

### Development Tools
- **Replit-specific plugins**: Error overlay, development banner, cartographer.
- **ESBuild**: Production server bundling.
- **TSX**: Development server with TypeScript execution.

### Integrations
- **Email Services**: Resend (recommended) or SendGrid for sending family invite codes and weekly summary emails. Configured via `RESEND_API_KEY`/`SENDGRID_API_KEY` and `EMAIL_FROM_ADDRESS` environment variables.
- **Stripe Payments**: Single-tier subscription billing via `stripe-replit-sync`. Product: Kindora Family Plan at $7/month with 14-day free trial. Dynamic price lookup via `getOrCreateFamilyPlanPrice()` (finds or creates $7/month price). Webhook route at `/api/stripe/webhook` (registered BEFORE express.json for raw body). Key files: `server/stripeClient.ts`, `server/webhookHandlers.ts`, `server/routes.ts` (checkout/subscription routes). Subscription fields on users table: `stripeCustomerId`, `stripeSubscriptionId`, `subscriptionTier`, `subscriptionStatus`. Account settings page at `/settings`.