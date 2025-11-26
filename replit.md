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

The database schema includes `Family Members` and `Events` tables, linked by foreign keys, with color inheritance from members to events for visual consistency. **Drizzle Kit** manages PostgreSQL migrations, with schema definitions in `/shared/schema.ts`. The system supports in-memory storage for demos and is configured for PostgreSQL for persistent data.

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