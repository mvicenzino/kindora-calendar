# Family Calendar Application

## Overview

A modern family calendar web application featuring a distinctive "liquid glass" UI design aesthetic. The application allows families to create, manage, and share events across family members with an elegant, tactile interface inspired by modern OS design languages (macOS, iOS, Windows 11 Fluent Design).

The application uses a full-stack TypeScript architecture with React on the frontend and Express on the backend, featuring real-time calendar views, event management, and family member coordination.

### Demo Mode

The application includes a fully-functional demo mode that allows users to experience the app without signing in:

- **Sample Data Seeding**: Each demo session is pre-populated with 4 family members (Sarah, Michael, Emma, Lucas) and 12 realistic events spanning past memories, today's activities, and upcoming plans
- **Full Functionality**: Demo users can create, edit, and delete events and family members just like real users
- **Non-Persistent Storage**: Demo data is stored in-memory only and does not persist to the database. Each demo session is isolated and temporary
- **Session Isolation**: Each demo login creates a unique user ID (`demo-${timestamp}-${random}`), ensuring complete data isolation between different demo sessions

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System**
- **React 18** with TypeScript for component-based UI development
- **Vite** as the build tool and development server
- **Wouter** for client-side routing (lightweight React Router alternative)
- **TanStack Query (React Query)** for server state management, caching, and data synchronization

**UI Component System**
- **shadcn/ui** component library (New York style variant) built on Radix UI primitives
- **Tailwind CSS** for utility-first styling with custom design tokens
- **Custom Design System**: "Liquid Glass" aesthetic featuring:
  - Frosted glass effects with backdrop blur
  - Layered depth using elevation shadows
  - Spatial relationships through sophisticated spacing
  - Typography: Inter (primary) and Space Grotesk (accent/calendar numbers)
  - Custom CSS variables for theming (light/dark mode support)

**State Management Strategy**
- Server state: TanStack Query with optimistic updates
- Local UI state: React hooks (useState, useEffect)
- Form state: React Hook Form with Zod validation
- No global state management library (keeping state local where possible)

**Key Design Decisions**
- Path aliases configured for clean imports (`@/`, `@shared/`)
- Component co-location: Each feature has its own example component for isolation
- Responsive design with mobile breakpoint at 768px
- Accessibility-first approach using Radix UI primitives

### Backend Architecture

**Server Framework**
- **Express.js** with TypeScript for REST API
- **HTTP-only session-based approach** (infrastructure in place via connect-pg-simple)
- Middleware stack: JSON parsing, URL encoding, custom request logging

**API Design**
- RESTful endpoints following resource-based routing
- Routes organized in `/api` namespace:
  - `/api/family-members` - CRUD operations for family members
  - `/api/events` - CRUD operations for calendar events
- Standardized error responses with appropriate HTTP status codes
- Request/response logging with duration tracking

**Data Layer Strategy**
- **Drizzle ORM** for type-safe database operations
- Database-agnostic schema definitions (currently configured for PostgreSQL)
- **Multi-Tier Storage Implementation**:
  - `IStorage` interface defining data operations contract
  - `DemoAwareStorage` wrapper routing demo users to in-memory storage, real users to database
  - `MemStorage` class providing non-persistent in-memory storage for demo users
  - `DrizzleStorage` class providing persistent PostgreSQL storage for authenticated users
  - Demo user detection via userId prefix (`demo-`)
- Schema validation using Zod with drizzle-zod integration

**Key Architectural Decisions**
- Storage abstraction pattern allows easy transition from in-memory to persistent database
- Schema shared between client and server via `@shared` namespace
- Separation of concerns: routes handle HTTP, storage handles data
- Validation at the API boundary using Zod schemas

### Data Storage Solutions

**Database Schema Design**
Two primary entities with clean separation of concerns:

1. **Family Members Table**
   - Unique identifier (UUID primary key)
   - Name, color coding for visual identification
   - Optional avatar support for personalization
   - No cascading deletes (events retain member references)

2. **Events Table**
   - Unique identifier (UUID primary key)
   - Title, optional description
   - Start/end timestamps for scheduling
   - Member association via foreign key
   - Color inheritance from member (denormalized for performance)

**Migration Strategy**
- Drizzle Kit configured for PostgreSQL migrations
- Migration files output to `/migrations` directory
- Schema source in `/shared/schema.ts` for cross-boundary access
- `db:push` script for schema synchronization

**Current Implementation**
- In-memory storage with sample data seeding
- Ready for database provisioning (requires DATABASE_URL environment variable)
- Neon Serverless PostgreSQL driver installed and configured

### External Dependencies

**Third-Party UI Libraries**
- **Radix UI**: Comprehensive set of unstyled, accessible component primitives
  - Dialog, Dropdown, Popover, Select, Toast, and 20+ other components
  - Built-in accessibility (ARIA, keyboard navigation)
  - Composable API design
- **Lucide React**: Icon system for consistent visual language
- **date-fns**: Date manipulation and formatting (calendar calculations)
- **class-variance-authority (CVA)**: Type-safe variant styling system
- **embla-carousel-react**: Touch-enabled carousel component

**Development Tools**
- **Replit-specific plugins**: Runtime error overlay, development banner, cartographer for enhanced DX
- **ESBuild**: Production server bundling
- **TSX**: Development server with TypeScript execution

**Styling & Design**
- **Tailwind CSS** with PostCSS for processing
- **Autoprefixer**: Cross-browser CSS compatibility
- **Google Fonts**: Inter and Space Grotesk font families

**Backend Dependencies**
- **@neondatabase/serverless**: PostgreSQL client optimized for serverless environments
- **connect-pg-simple**: PostgreSQL session store for Express
- **Drizzle ORM + Drizzle Zod**: Type-safe database toolkit with validation

**Validation & Type Safety**
- **Zod**: Runtime type validation for API inputs
- **TypeScript**: Compile-time type safety across the stack
- **Drizzle Zod**: Automatic Zod schema generation from database schema

**Key Integration Points**
- All UI components follow shadcn/ui conventions for customization
- Database operations abstracted through storage interface
- Shared types between frontend and backend prevent drift
- Form validation uses Zod schemas derived from database schema

### Email Service Configuration

**Email Invite Feature**
- Family Settings page includes email invite functionality
- Users can send formatted invitation emails with invite codes
- Backend endpoint: `POST /api/family/send-invite`

**Email Service Setup Required**
The email invite feature requires an email service API key. To enable:

1. **Choose an email service:**
   - **Resend** (recommended for simplicity)
     - Set `RESEND_API_KEY` in environment variables
     - Set `EMAIL_FROM_ADDRESS` to an email from your verified domain (e.g., `invites@yourdomain.com`)
     - Note: Resend requires domain verification. You cannot use Gmail/personal emails.
   
   - **SendGrid** (works with any verified sender)
     - Set `SENDGRID_API_KEY` in environment variables
     - Optionally set `EMAIL_FROM_ADDRESS` (defaults to `mvicenzino@gmail.com`)
     - Verify your sender email in SendGrid dashboard

2. **Environment Variables:**
   - `RESEND_API_KEY` or `SENDGRID_API_KEY` - Your email service API key
   - `EMAIL_FROM_ADDRESS` - Sender email address (required for Resend, optional for SendGrid)

3. **Email template includes:**
   - Welcome message to Kindora Family with gradient header
   - Family name and large invite code display
   - Step-by-step join instructions
   - Direct link button to Family Settings: `https://your-app.repl.co/#/family-settings`
   - Both HTML and plain text versions

**Current Status**: Email UI is functional. Email sending works when API keys are configured. Without configuration, the endpoint returns a 501 error with detailed setup instructions and preview of what would be sent.