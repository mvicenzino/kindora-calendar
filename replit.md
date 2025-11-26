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

The database schema includes `Family Members`, `Events`, and `Event Notes` tables, linked by foreign keys. Event notes support threading via `parentNoteId` for replies, with `authorUserId` tracking who wrote each note. **Drizzle Kit** manages PostgreSQL migrations, with schema definitions in `/shared/schema.ts`. The system supports in-memory storage for demos and is configured for PostgreSQL for persistent data.

### Event Notes Feature

The application includes a threaded notes system for events:
- **Schema**: `eventNotes` table with `parentNoteId` for threading, `authorUserId` for author tracking
- **API Routes**: GET/POST/DELETE endpoints at `/api/events/:eventId/notes`
- **Frontend**: `EventNotesSection` component integrated into both `FlipCardEventDetails` and `EventDetailsDialog`
- **Features**: Add notes, reply to notes (threaded), delete own notes, view author info with timestamps
- **Demo Data**: Sample notes in both family and eldercare calendars showcasing coordination between family members and caregivers

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