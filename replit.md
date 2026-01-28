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
- **Event Management**: Events with completion tracking, recurring event support (daily, weekly, monthly, yearly patterns, with end conditions), and threaded `eventNotes`.
- **Messaging Systems**: Legacy `messages` for event-specific communication and global `familyMessages` for real-time family coordination with threading.
- **Caregiver & Medical Management**: `medications` with `medicationLogs` for tracking administration, `caregiverPayRates` and `caregiverTimeEntries` for time tracking and automated pay calculation.
- **Care Documentation Vault**: Secure storage for `careDocuments` (medical, insurance, legal) with role-based access and presigned URL uploads.
- **Automated Weekly Summaries**: Cozi-style weekly digest emails of calendar events, configurable by family owners/members and opt-in for users.

### Navigation
A two-tier sticky navigation system featuring a `Header` (Kindora logo, FamilySelector, Messages, Memories, Search, Profile) and a `ViewSwitcherBar` (Day/Week/Month/Timeline views) for intuitive content access.

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