# Family Calendar Application

## Overview

A modern calendar application for families and caregivers, featuring a "liquid glass" UI design. It enables families, trusted caregivers, and healthcare providers to coordinate schedules, medical appointments, and care needs. The application targets use cases such as family coordination, eldercare management, trusted provider access, medical tracking, and financial reminders. It uses a full-stack TypeScript architecture with React on the frontend and Express on the backend, offering real-time calendar views, event management, and flexible access controls. A "sandwich generation" demo mode highlights capabilities for users managing both children's and aging parents' schedules.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

The frontend is built with **React 18** and TypeScript, using **Vite** for development and bundling, and **Wouter** for client-side routing. **TanStack Query** manages server state, caching, and synchronization. The UI leverages **shadcn/ui** (New York style) built on Radix UI primitives, styled with **Tailwind CSS**. A custom "Liquid Glass" design system incorporates frosted glass effects, layered depth, sophisticated spacing, and specific typography (Inter, Space Grotesk). State management primarily uses React hooks, with React Hook Form and Zod for forms. The design is responsive and accessibility-focused.

### Backend Architecture

The backend is an **Express.js** application with TypeScript, providing a REST API. It uses an HTTP-only session-based approach and follows resource-based routing for endpoints like `/api/family-members` and `/api/events`. **Drizzle ORM** provides type-safe database operations, supporting a multi-tier storage implementation: `DemoAwareStorage` routes demo users to `MemStorage` (in-memory) and authenticated users to `DrizzleStorage` (PostgreSQL). Zod is used for schema validation at the API boundary, shared between client and server via a `@shared` namespace.

### Data Storage Solutions

The database schema includes the following tables, all stored in PostgreSQL:
- **users** - Authenticated user accounts
- **sessions** - Session management for authentication
- **families** - Family calendar groups with invite codes
- **family_memberships** - Links users to families with roles (owner/member/caregiver)
- **family_members** - Calendar members (people on the calendar)
- **events** - Calendar events with completion tracking
- **event_notes** - Threaded notes on events with `parentNoteId` for replies
- **messages** - Legacy event-specific messages
- **family_messages** - Global family messaging with threading
- **medications** - Medication schedules for care recipients
- **medication_logs** - Logs of medication administration (given/skipped/refused)
- **caregiver_pay_rates** - Hourly rates per caregiver per family
- **caregiver_time_entries** - Time tracking with automatic pay calculation

**Storage Architecture:**
- `DemoAwareStorage` wrapper intelligently routes data:
  - **Demo users** (ID starts with "demo-") → `MemStorage` (in-memory, ephemeral)
  - **Real users** → `DrizzleStorage` (PostgreSQL, persistent)
- This design ensures demo data doesn't pollute the production database while real users have full data persistence
- **Drizzle Kit** manages PostgreSQL migrations via `npm run db:push`
- Schema definitions in `/shared/schema.ts` with Zod validation schemas

### Event Notes Feature

The application includes a threaded notes system for events:
- **Schema**: `eventNotes` table with `parentNoteId` for threading, `authorUserId` for author tracking
- **API Routes**: GET/POST/DELETE endpoints at `/api/events/:eventId/notes`
- **Frontend**: `EventNotesSection` component integrated into both `FlipCardEventDetails` and `EventDetailsDialog`
- **Features**: Add notes, reply to notes (threaded), delete own notes, view author info with timestamps
- **Demo Data**: Sample notes in both family and eldercare calendars showcasing coordination between family members and caregivers

### Recurring Events

The application supports creating repeating events with flexible recurrence patterns:

- **Schema**: `events` table includes recurrence fields:
  - `recurrenceRule`: text enum ('daily', 'weekly', 'biweekly', 'monthly', 'yearly')
  - `recurrenceEndDate`: timestamp for "end on date" condition
  - `recurrenceCount`: integer for "after X occurrences" condition
  - `recurringEventId`: links all instances in a series to the first event
- **Frontend**: `EventModal.tsx` with modern recurrence UI featuring:
  - Dropdown selector for repeat frequency (Does not repeat, Daily, Weekly, Biweekly, Monthly, Yearly)
  - End condition controls (Never, After X occurrences, On specific date)
  - Recurrence UI only shown for new event creation (not when editing existing events)
- **Backend Logic**: `createRecurringEvents` helper function that:
  - Creates the first event with all metadata
  - Generates subsequent instances with proper date advancement
  - Links all instances via `recurringEventId`
  - Respects end conditions (count-based or date-based)
  - Safety cap of 2 years maximum and 500 occurrences limit
- **Design Notes**: 
  - Each recurring instance is stored as a separate event (allows individual editing)
  - Uses storage-normalized timestamps to prevent timezone drift

### Global Family Messaging

A real-time messaging system for family coordination with threading support:

- **Route**: `/messages` - Family Messages page
- **Schema**: `familyMessages` table with `familyId`, `authorUserId`, `content`, `parentMessageId` (for threading), and `createdAt`
- **API Routes**: 
  - GET `/api/family-messages?familyId=X` - Fetch all messages for a family
  - POST `/api/family-messages` - Send a new message (with optional parentMessageId for replies)
  - DELETE `/api/family-messages/:id?familyId=X` - Delete own messages
- **Frontend Components**: `Messages.tsx` with Messenger-style UI featuring:
  - Liquid glass design consistent with app theme
  - Date dividers for message grouping
  - Author avatars with role badges (owner, member, caregiver)
  - Real-time-like polling (10 second refresh)
  - Own message highlighting (blue bubbles)
  - Delete functionality for own messages
- **Role-Based Permissions**: All family roles (owner, member, caregiver) can view and send messages
- **Navigation**: Message icon in header (both mobile and desktop)
- **Demo Data**: 37 threaded messages across 8 conversation threads showcasing realistic family coordination:
  - **Your Family Calendar** (4 threads):
    1. Emergency pickup coordination - scrambling to cover when a meeting runs late
    2. Lucas's dinosaur birthday party planning - fossil dig, T-Rex costumes, bakery cake
    3. Emma's solar system school project - craft store runs and Saturn's glowing rings
    4. Daily afternoon schedule coordination - soccer practice, homework help
  - **Mom's Care Calendar** (4 threads):
    1. Sleep concerns - multi-day professional coordination adjusting medication timing
    2. PT milestone celebration - walking to mailbox independently
    3. Cardiology appointment prep - blood pressure logs, care handoff notes
    4. Sunday family dinner planning - three generations together

### Caregiver Dashboard & Medication Tracking

A dedicated caregiver portal with care-focused views and medication management:

- **Route**: `/care` - Caregiver Dashboard page
- **Schema**: `medications` table (name, dosage, frequency, scheduledTimes, instructions, memberId) and `medicationLogs` table (medicationId, administeredBy, scheduledTime, administeredAt, status, notes)
- **API Routes**: 
  - GET/POST `/api/medications` - List and create medications (owners/members only for create)
  - GET/PUT/DELETE `/api/medications/:id` - Medication CRUD (owners/members only for modify)
  - GET/POST `/api/medications/:id/logs` - View and log medication doses
  - GET `/api/medication-logs/today` - Today's medication log history
- **Frontend Components**: `CaregiverDashboard.tsx` with liquid glass design, featuring:
  - Today's Care summary with event count, medical appointments, pending/given meds
  - Medication Schedule card with dose logging buttons (Given, Skipped, Refused)
  - Today's Schedule showing all events for the selected family
  - Recent Activity feed showing medication log history
- **Role-Based Permissions**: Caregivers can view medications and log doses; owners/members can create, edit, and delete medications
- **Demo Data**: 5 sample medications for Dorothy (Mom's Care Calendar): Lisinopril, Metoprolol, Vitamin D3, Trazodone, Baby Aspirin with realistic dosages and schedules

### Navigation Architecture

The application uses a two-tier sticky navigation structure:

- **Header Row** (`Header.tsx`): 
  - Left: Kindora logo
  - Center: FamilySelector dropdown (only visible when user has 2+ families)
  - Right: Action buttons (Messages, Memories, Search, Profile menu)
  
- **View Switcher Bar** (`ViewSwitcherBar.tsx`):
  - Centered toggle group: Day / Week / Month / Timeline views
  - Animated sliding indicator for active view
  - Positioned directly below the header
  
- **Sticky Positioning**: Both components are wrapped in a single sticky container (`top-0 z-50` in Home.tsx) to remain visible while scrolling
- **Responsive Design**: Mobile-optimized with smaller buttons and truncated text

### Caregiver Time Tracking & Pay Calculation

A comprehensive time tracking system for caregivers to log hours and calculate pay:

- **Route**: Integrated into `/care` - Caregiver Dashboard
- **Schema**: 
  - `caregiverPayRates` table: `userId`, `familyId`, `hourlyRate` (decimal), `effectiveDate`, `createdAt`
  - `caregiverTimeEntries` table: `userId`, `familyId`, `date`, `hoursWorked`, `notes`, `payAmount` (calculated server-side), `createdAt`
- **API Routes**: 
  - GET/POST `/api/caregiver/pay-rate` - Get or set caregiver's hourly rate for a family
  - GET/POST `/api/caregiver/time-entries` - View and log time entries with automatic pay calculation
- **Frontend Components**: Time Tracking section in `CaregiverDashboard.tsx` featuring:
  - Set/Update hourly rate dialog with form validation
  - Log hours dialog with date picker, hours input, and optional notes
  - Real-time pay estimation before submission
  - Weekly summary: hours worked and pay earned this week
  - Total summary: all-time hours and total earnings
  - Recent entries list with date, hours, and pay displayed
- **Pay Calculation**: Server-side calculation (hours × hourly rate) prevents client-side tampering
- **Role-Based Permissions**: Only caregivers can access time tracking; each caregiver sees only their own entries
- **Demo Data**: Maya's hourly rate ($28/hr) pre-seeded in Mom's Care Calendar

## External Dependencies

### Third-Party UI Libraries

- **Radix UI**: Unstyled, accessible component primitives (Dialog, Dropdown, Popover, Select, Toast, etc.).
- **Lucide React**: Icon system.
- **date-fns**: Date manipulation and formatting.
- **class-variance-authority (CVA)**: Type-safe variant styling.
- **embla-carousel-react**: Touch-enabled carousel.

### Development Tools

- **Replit-specific plugins**: Error overlay, development banner, cartographer.
- **ESBuild**: Production server bundling.
- **TSX**: Development server with TypeScript execution.

### Styling & Design

- **Tailwind CSS** with PostCSS.
- **Autoprefixer**: Cross-browser CSS compatibility.
- **Google Fonts**: Inter and Space Grotesk.

### Backend Dependencies

- **@neondatabase/serverless**: PostgreSQL client.
- **connect-pg-simple**: PostgreSQL session store for Express.
- **Drizzle ORM + Drizzle Zod**: Type-safe database toolkit.

### Validation & Type Safety

- **Zod**: Runtime type validation.
- **TypeScript**: Compile-time type safety.
- **Drizzle Zod**: Automatic Zod schema generation.

### Email Service Configuration

The application integrates with email services to send family invite codes.
- **Supported Services**: Resend (recommended) or SendGrid.
- **Configuration**: Requires `RESEND_API_KEY` or `SENDGRID_API_KEY` and `EMAIL_FROM_ADDRESS` environment variables.
- **Features**: Allows users to send their family's invite code or forward any invite code to caregivers.

### Automated Weekly Summary Emails

A Cozi-style weekly digest system that automatically sends calendar summaries to family members:

- **Database Schema**:
  - `weekly_summary_schedules` - Family-level settings: `familyId`, `isEnabled`, `dayOfWeek` (0-6), `timeOfDay` (HH:MM), `timezone`, `lastSentAt`
  - `weekly_summary_preferences` - User-level opt-in: `userId`, `familyId`, `optedIn`
- **API Routes**:
  - GET/PUT `/api/weekly-summary-schedule` - Admin schedule configuration (owners/members only)
  - GET/PUT `/api/weekly-summary-preference` - User preference toggle
  - POST `/api/cron/weekly-summary` - Automated send endpoint (for Replit Cron or external scheduler)
  - POST `/api/send-weekly-summary` - Manual send (immediate)
- **Admin Configuration** (Family Settings page):
  - Toggle to enable/disable automated summaries
  - Day of week selector (Sunday-Saturday)
  - Time of day selector (6 AM - 8 PM)
  - Only visible to family owners and members
- **User Preferences** (Profile Menu > Settings):
  - Toggle to opt in/out of receiving automated weekly emails
  - Users are opted-in by default
  - Visible to all family roles
- **Cron Endpoint Security**: Optional `CRON_SECRET` environment variable for authentication via `X-Cron-Secret` header
- **Design Notes**:
  - Email feature disabled in demo mode with user-friendly toast message
  - Weekly summaries include events for the current week, organized by day
  - Each family member with an email receives their own personalized summary