# Calendora - Family Calendar Application

## Overview
Calendora is a modern family calendar web application designed to help families manage and share events with a distinctive "liquid glass" UI. It offers Day, Week, Month, and Timeline views, inspired by contemporary OS designs for an elegant and tactile user experience. The application uses a full-stack TypeScript architecture with React on the frontend and Express on the backend, focusing on event management, family coordination, and in-app messaging.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture
### Frontend
- **Framework:** React 18 with TypeScript, Vite for bundling.
- **Routing:** Wouter for client-side navigation.
- **State Management:** TanStack Query for server state (caching, synchronization), React hooks for local UI state, React Hook Form with Zod for form management.
- **UI/UX:** "Liquid Glass" design aesthetic, including frosted glass effects, layered depth, custom spacing, and typography (Inter, Space Grotesk). Utilizes shadcn/ui (New York style) built on Radix UI primitives and Tailwind CSS for styling.
- **Design Principles:** Component co-location, responsive design (mobile breakpoint at 768px), accessibility-first with Radix UI.

### Backend
- **Framework:** Express.js with TypeScript for a REST API.
- **API Design:** RESTful endpoints for family members, events, and messages under an `/api` namespace, with standardized error responses and request/response logging.
- **Data Layer:** Drizzle ORM for type-safe database operations. Features a `IStorage` interface with a `MemStorage` (in-memory) implementation, allowing for easy transition to PostgreSQL. Zod for schema validation.
- **Architecture:** Storage abstraction, shared schemas between client and server via `@shared`, separation of concerns (routes, storage), and Zod validation at the API boundary.

### Data Storage Solutions
- **Database Schema:** Designed around three entities: Family Members (UUID, name, color, avatar), Events (UUID, title, description, timestamps, member association, color inheritance), and Messages (UUID, event association, sender, recipient, content, formatting, timestamp).
- **Migration:** Drizzle Kit for PostgreSQL migrations, with schema source in `/shared/schema.ts`.
- **Current Implementation:** In-memory storage with sample data seeding, configured for PostgreSQL readiness via `@neondatabase/serverless`.

### Feature Specifications
- **Calendar Views:**
    - **Day View:** Events by time, "Sometime Today" section, mini event cards.
    - **Week View:** 2-column grid, week navigation, clickable day headers.
    - **Month View:** Grid with event indicators, upcoming events section, month navigation.
    - **Timeline View:** Vertical scrolling, alternating event cards, date markers, member avatars, chronological display of all events.
- **Event Management:**
    - **Creation & Editing:** Modal-based, form validation (Zod), title, description, time, member, "Sometime Today" toggle. Start time defaults to current system time (rounded to nearest 15 minutes).
    - **Detail View:** Displays full event details, includes "Love Note" section for messaging, edit/delete options.
    - **Deletion:** Confirmation and automatic cache invalidation.
    - **Event Notifications:** Animated notification dialog appears when events are within 10 minutes of starting. Features calming notification sound (Web Audio API), blue-purple gradient design with animated bell icon, dismissible with "Got it" button. Monitors all events every 30 seconds, tracks notified events to prevent duplicates.
- **Messages Feature (Love Notes):**
    - **In-App Messaging:** Personalized messages related to events.
    - **Recipient Selection:** Choose family member (excluding self), visual selector, auto-selection, success toasts.
    - **Formatting:** 10 love emojis, bold/italic text, live preview.
    - **Love Note Bubbles:** Events with messages display a liquid glass bubble showing the emoji and truncated message preview. Bubbles appear in all calendar views (Day, Week, Month, Timeline) with consistent styling (backdrop-blur-xl, bg-white/20, border-white/30) and hover/active interactions. Clicking opens the full message in a popup modal.
    - **Messages Modal:** Accessible via header icon, displays messages grouped by event with formatting, scrollable, liquid glass design. Messages are deleted with their parent event.
- **Family Member Management:** Unique color coding, initials on events, color-coded avatars, member creation via modal.
- **Navigation & UX:** Seamless view switching, date navigation, smooth transitions.

## External Dependencies
- **UI Libraries:** Radix UI (accessible primitives), Lucide React (icons), date-fns (date manipulation), class-variance-authority (CVA) (styling), embla-carousel-react (carousel).
- **Development Tools:** Replit-specific plugins, ESBuild, TSX.
- **Styling & Design:** Tailwind CSS, PostCSS, Autoprefixer, Google Fonts (Inter, Space Grotesk).
- **Backend Dependencies:** `@neondatabase/serverless` (PostgreSQL client), `connect-pg-simple` (PostgreSQL session store), Drizzle ORM, Drizzle Zod.
- **Validation & Type Safety:** Zod (runtime validation), TypeScript (compile-time safety), Drizzle Zod (Zod schema generation from DB schema).