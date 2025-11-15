# Family Calendar - Liquid Glass UI Design Guidelines

## Design Approach

**Selected Approach:** Custom Liquid Glass Aesthetic inspired by modern OS interfaces (macOS, iOS, Windows 11 fluent design)

**Core Principle:** Create a distinctive calendar experience that feels tactile, layered, and premium through frosted glass effects, depth, and sophisticated spatial relationships.

## Typography System

**Font Selection:**
- Primary: Inter (via Google Fonts) - Clean, modern, excellent readability
- Accent: Space Grotesk (for calendar dates/numbers) - Geometric, distinctive

**Hierarchy:**
- Calendar Month/Year: text-4xl, font-bold, tracking-tight
- Event Titles: text-base, font-semibold
- Event Times: text-sm, font-medium
- Body Text: text-sm, font-normal
- Micro Text (labels): text-xs, font-medium, uppercase, tracking-wide

## Layout & Spacing System

**Spacing Primitives:** Use Tailwind units of 2, 4, 6, 8, 12, 16, 20, 24
- Component padding: p-6 to p-8
- Section gaps: gap-6 to gap-8
- Micro spacing: space-2, space-4
- Generous breathing room between calendar cells: gap-2

**Grid Structure:**
- Main calendar grid: 7 columns (days of week)
- Sidebar: Fixed 320px width with family member list and quick actions
- Content area: Flexible, min-width to prevent cramping

## Core Components

### Navigation Header
- Frosted glass background with backdrop-blur-xl
- Shadow-lg for depth separation
- Month/year selector with smooth transitions
- View switcher (Month/Week/Day) as pill-shaped button group
- Quick action buttons (Today, Add Event) with glass morphism treatment

### Calendar Grid
**Month View:**
- 7-column grid with equal-width cells
- Each day cell: Rounded corners (rounded-2xl), subtle border
- Current day: Emphasized with ring treatment (ring-2)
- Event indicators: Small pill badges (max 3 visible, "+X more" for overflow)
- Hover state: Lift effect with shadow-md transition

**Week/Day Views:**
- Hourly timeline on left (text-xs, reduced opacity)
- Event blocks with rounded-xl, glass effect backdrop
- Drag-and-drop visual feedback with scale and opacity changes

### Event Cards/Modals
**Event Display:**
- Rounded-3xl container with glass morphism
- Header with event title and family member avatar
- Time display with clock icon
- Description area with prose formatting
- Action buttons (Edit, Delete) with subtle glass backgrounds

**Event Creation Modal:**
- Centered overlay with backdrop-blur-2xl on background
- Large rounded-3xl card (max-w-2xl)
- Form fields with frosted input backgrounds
- Family member selector with avatar chips
- Date/time picker with custom glass-styled controls

### Family Member Sidebar
- Fixed position, frosted glass background
- Member list with circular avatars (w-12 h-12)
- Color indicator rings around avatars
- Filter toggles with smooth scale transitions
- Add member button at bottom

### Event Filtering
- Horizontal chip list when sidebar collapsed
- Clickable avatar badges with glass effect
- Active state: Solid background with glow
- Batch selection support with checkboxes

## Liquid Glass Effects Implementation

**Primary Glass Treatment:**
- Background: Translucent with blur (backdrop-blur-xl to backdrop-blur-3xl)
- Borders: Subtle light borders (border with reduced opacity)
- Shadows: Layered shadows for depth (shadow-lg, shadow-xl)
- Overlays: Multiple backdrop layers for depth perception

**Depth Hierarchy:**
- Background layer: Base application surface
- Mid layer: Calendar grid and main content (backdrop-blur-lg)
- Floating layer: Event cards, modals (backdrop-blur-2xl, shadow-2xl)
- Top layer: Dropdowns, tooltips (backdrop-blur-3xl)

## Interaction Patterns

**Hover States:**
- Scale transformations (scale-105 for buttons, scale-102 for cards)
- Shadow elevation changes (from shadow-md to shadow-xl)
- Opacity shifts for glass layers
- Smooth transitions (transition-all duration-300)

**Active States:**
- Slight scale down (scale-98)
- Increased shadow depth
- No background color changes (maintain glass effect)

**Animations:**
- Modal entrance: Fade + scale from 0.95 to 1
- Calendar view transitions: Slide with fade
- Event creation: Smooth expand animation
- Loading states: Pulsing glass shimmer effect

## Responsive Behavior

**Desktop (lg and above):**
- Sidebar visible by default
- Calendar grid: Full 7-column display
- Event modals: max-w-2xl centered

**Tablet (md):**
- Collapsible sidebar with toggle
- Calendar grid maintained
- Reduced spacing (p-4 instead of p-6)

**Mobile (base to sm):**
- Hidden sidebar, accessible via overlay
- Single day cards in vertical stack for month view
- Full-width event modals
- Bottom navigation bar for quick actions

## Component Specifications

**Buttons:**
- Rounded-xl for primary actions
- Rounded-full for icon-only buttons
- Glass background with backdrop-blur-md
- Padding: px-6 py-3 for text buttons, p-3 for icon buttons
- Border with subtle opacity

**Form Inputs:**
- Rounded-xl with glass background
- Placeholder with reduced opacity
- Focus: Ring treatment (ring-2) with glow effect
- Padding: px-4 py-3

**Avatars:**
- Circular (rounded-full)
- Sizes: w-8 h-8 (small), w-12 h-12 (standard), w-16 h-16 (large)
- Ring borders for selection states

**Event Badges:**
- Rounded-full for pill shape
- Text-xs with px-3 py-1 padding
- Glass background with member's assigned treatment
- Truncate long text with ellipsis

## Accessibility

- Maintain WCAG AA contrast ratios despite glass effects
- Keyboard navigation for all calendar interactions
- Screen reader announcements for date changes
- Focus indicators with visible ring treatment
- Skip links for calendar navigation

## Visual Enhancements

- Subtle gradient overlays on glass surfaces for dimension
- Micro-interactions on all clickable elements
- Smooth view transitions between month/week/day modes
- Event drag preview with ghost effect
- Loading skeletons with pulsing glass shimmer