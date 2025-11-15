# Calendora - Family Calendar Application

## Overview

Calendora is a modern family calendar web application featuring a distinctive "liquid glass" UI design aesthetic. The application allows families to create, manage, and share events across four distinct views: Day, Week, Month, and Timeline. The interface is inspired by modern OS design languages (macOS, iOS, Windows 11 Fluent Design), providing an elegant, tactile experience for managing family events.

The application uses a full-stack TypeScript architecture with React on the frontend and Express on the backend, featuring multiple calendar views, event management, and family member coordination.

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
  - `/api/messages` - Create and retrieve event-related messages
- Standardized error responses with appropriate HTTP status codes
- Request/response logging with duration tracking

**Data Layer Strategy**
- **Drizzle ORM** for type-safe database operations
- Database-agnostic schema definitions (currently configured for PostgreSQL)
- **Dual Storage Implementation**:
  - `IStorage` interface defining data operations contract
  - `MemStorage` class providing in-memory storage (current default)
  - Architecture allows swapping to PostgreSQL without API changes
- Schema validation using Zod with drizzle-zod integration

**Key Architectural Decisions**
- Storage abstraction pattern allows easy transition from in-memory to persistent database
- Schema shared between client and server via `@shared` namespace
- Separation of concerns: routes handle HTTP, storage handles data
- Validation at the API boundary using Zod schemas

### Data Storage Solutions

**Database Schema Design**
Three primary entities with clean separation of concerns:

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

3. **Messages Table** *(New - November 2025)*
   - Unique identifier (UUID primary key)
   - Event association via foreign key
   - Sender name for message attribution
   - Message content text
   - Timestamp (auto-generated on creation)
   - Automatic cleanup when parent event is deleted

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

## Current Features

### Calendar Views

**Day View**
- Displays all events for a selected day
- Dynamic title showing "Today" or day name with date
- Events organized by time
- Special "Sometime Today" section for events without specific times
- Mini event cards in 2-column grid for flexible-time events

**Week View**
- 2-column grid layout showing events across the week
- Week navigation with previous/next buttons
- Clickable day headers to jump to specific day in Day view
- Events grouped by day with timestamps

**Month View**
- Full calendar grid with day cells
- Visual indicators for days with events (colored backgrounds)
- Upcoming events section showing next 2 events
- Easy navigation through months

**Timeline View** *(Recently Added - November 2025)*
- Vertical scrolling timeline with center line gradient
- Events alternate left/right along the timeline for visual balance
- Date markers displayed on the center line
- Member avatars floating around event cards
- Event cards use a complementary 6-color palette that rotates
- Shows ALL events sorted chronologically (no date filtering)
- Smooth hover effects and transitions
- Same event interaction pattern as other views

### Event Management

**Event Creation & Editing**
- Modal-based event creation with form validation
- Fields: title, description (optional), start time, end time, family member
- Color automatically inherited from family member
- "Sometime Today" toggle for events without specific times (23:58-23:59)
- Form validation using Zod schemas

**Event Detail View**
- Click any event to view full details before editing
- Displays: title, description, date, time, member information
- Messaging section for event-related communication (functional with backend)
- Notes section for additional event context
- Edit button opens edit modal
- Proper state management (resets between events)

**Event Deletion**
- Delete events from edit modal
- Confirmation before deletion
- Automatic cache invalidation and UI update

### Messages Feature *(New - November 2025)*

**In-App Messaging with Love Note Formatting** *(Enhanced - November 2025)*
- Send personalized messages related to specific events
- Messages accessible via header icon
- **Love Note Features**:
  - Choose from 10 love emojis (❤️, 💕, 💖, 💝, 🌹, 💐, 🥰, 😍, 💗, 💓)
  - Bold and italic text formatting
  - Live preview while typing with formatting applied
- Messages modal displays all messages grouped by event
- Each message shows sender name, timestamp, content with formatting
- Emojis displayed prominently next to message text
- Bold and italic styles preserved and displayed
- Messages automatically deleted when parent event is deleted
- Real-time toast notifications on send success/failure
- Loading states during message sending

**Messages Modal**
- Opens via messages icon in header
- Shows empty state when no messages exist
- Messages organized by event with event title and date
- Liquid glass design consistent with app aesthetic
- Scrollable list for multiple messages
- Close via button or backdrop click

### Family Member Management

**Member Features**
- Each member has a unique color for visual identification
- Member initials displayed on events
- Color-coded avatars throughout the interface
- Create new members via dedicated modal

### Navigation & UX

**View Switching**
- Seamless toggle between Day, Week, Month, and Timeline views
- View toggle buttons available in all views
- Active view visually highlighted
- Date state preserved during view transitions

**Date Navigation**
- Week-level navigation in Week view
- Day-level navigation via clickable headers
- Month context maintained in Month view
- Smooth transitions between dates

### Design & Styling

**Liquid Glass Aesthetic**
- Frosted glass effects with backdrop blur
- Layered depth using custom elevation shadows
- Gradient backgrounds and borders
- Sophisticated spacing and typography
- Inter font for body text, Space Grotesk for accents
- Responsive design for mobile and desktop

**Interactive Elements**
- Hover effects with subtle scale transforms
- Active states with visual feedback
- Smooth transitions and animations
- Consistent button styling across views

## Recent Development History

### November 15, 2025 - Love Note Formatting Feature
- Enhanced messages with personalization options
- Added optional formatting fields to message schema: fontWeight, fontStyle, emoji
- Updated EventDetailView with "Send a Love Note" interface:
  - 10 love emoji selection buttons (❤️, 💕, 💖, 💝, 🌹, 💐, 🥰, 😍, 💗, 💓)
  - Bold and italic toggle buttons
  - Live preview of formatting in textarea
- Updated MessagesModal to render formatted messages with emoji and styles
- Storage layer properly handles optional formatting fields
- End-to-end testing confirmed formatting persists correctly
- Architect review passed with approval

### November 15, 2025 - Messages Feature Implementation
- Added messages table to database schema with eventId, senderName, content, createdAt
- Created API endpoints: GET /api/messages and POST /api/messages with validation
- Built MessagesModal component to display messages grouped by event
- Updated EventDetailView to save messages to backend with toast notifications
- Integrated messages icon in header to open MessagesModal
- Proper date handling and Dialog state management
- End-to-end testing completed successfully
- All functionality verified and working

### November 15, 2025 - Timeline View Implementation
- Created TimelineView component with vertical scrolling layout
- Implemented alternating left/right card positioning along center timeline
- Added Timeline button to all view toggles (Day, Week, Month)
- Updated Home.tsx to support Timeline view with proper data formatting
- End-to-end testing completed successfully
- Architect review passed with positive feedback