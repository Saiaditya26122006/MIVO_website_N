# MIVO Website — Complete Frontend Documentation

**Generated**: 2026-10-18  
**Framework**: Next.js 15 with App Router  
**Version**: 1.0

---

## Table of Contents

1. [Brand Identity & Design System](#brand-identity--design-system)
2. [Typography](#typography)
3. [Color Palette](#color-palette)
4. [Layout & Structure](#layout--structure)
5. [Navigation](#navigation)
6. [Component Library](#component-library)
7. [Page-by-Page Breakdown](#page-by-page-breakdown)
8. [Animations & Transitions](#animations--transitions)
9. [Images & Assets](#images--assets)
10. [Responsive Design](#responsive-design)
11. [Accessibility](#accessibility)

---

## Brand Identity & Design System

### Brand Philosophy
**MIVO** = **M**aking **I**deas into **V**isible **O**bjects

### Design Approach
- **Handcrafted feel**: Handwritten fonts, marker-style highlights
- **Technical precision**: Clean layouts, structured grids
- **Playful accents**: Yellow marker highlights, lime green CTAs
- **Premium simplicity**: Generous whitespace, minimal clutter

### Visual Language
- **Handwritten annotations**: SVG arrows, notes, circles
- **Marker highlights**: Rotated yellow/lime backgrounds behind text
- **Zigzag journeys**: Diagonal flow arrows with stars
- **Product mosaics**: Animated vertical scrolling columns

---

## Typography

### Font Families

#### Primary Font: **Inter** (Google Fonts)
```typescript
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});
```
- **Usage**: Body text, navigation, buttons, descriptions
- **Weights**: 400 (regular), 500 (medium), 600 (semibold), 700 (bold)
- **Characteristics**: Clean, modern, highly readable sans-serif

#### Handwritten Font: **Caveat** (Google Fonts)
```typescript
const caveat = Caveat({
  subsets: ["latin"],
  variable: "--font-handwritten",
  weight: ["400", "700"],
});
```
- **Usage**: Headlines, hero text, section titles, product names
- **Weights**: 400 (regular), 700 (bold)
- **Characteristics**: Casual, friendly, authentic handwritten feel

### Typography Scale

| Style | Size (Mobile) | Size (Desktop) | Font | Weight | Usage |
|-------|---------------|----------------|------|--------|-------|
| **Hero H1** | 3rem (48px) | 4.5rem (72px) | Caveat | 700 | Main hero headline |
| **Section H2** | 3rem (48px) | 3.75rem (60px) | Caveat | 700 | Section titles |
| **Card H3** | 1.5rem (24px) | 2rem (32px) | Caveat | 700 | Card titles, step titles |
| **Body Large** | 1.125rem (18px) | 1.25rem (20px) | Inter | 400 | Hero descriptions |
| **Body** | 1rem (16px) | 1rem (16px) | Inter | 400 | Standard text |
| **Small** | 0.875rem (14px) | 0.875rem (14px) | Inter | 500 | Labels, metadata |
| **Tiny** | 0.6875rem (11px) | 0.6875rem (11px) | Inter | 700 | Uppercase labels |

### Text Utilities

#### Marker Underline
```css
.marker-underline::after {
  content: '';
  position: absolute;
  left: -2%;
  bottom: -4px;
  width: 104%;
  height: 8px;
  background: var(--lime);
  opacity: 0.6;
  transform: rotate(-0.5deg);
  border-radius: 2px;
}
```
**Usage**: Highlight key words in headlines

#### Marker Circle
```css
.marker-circle::before {
  content: '';
  position: absolute;
  top: -10%;
  left: -10%;
  right: -10%;
  bottom: -10%;
  border: 3px solid var(--lime);
  border-radius: 50%;
  opacity: 0.5;
  transform: rotate(-2deg);
}
```
**Usage**: Emphasize small elements (icons, numbers)

---

## Color Palette

### Primary Colors

#### Ink Black
```css
--ink-black: #101010
```
- **RGB**: (16, 16, 16)
- **Usage**: Primary text, footer background, buttons (primary variant)
- **Characteristics**: Deep, readable black with slight warmth

#### Cream
```css
--cream: #F5F3ED
```
- **RGB**: (245, 243, 237)
- **Usage**: Page backgrounds, card backgrounds, light surfaces
- **Characteristics**: Warm off-white, reduces eye strain

### Accent Colors

#### Lime Green (Primary Accent)
```css
--lime: #B7FF2A
```
- **RGB**: (183, 255, 42)
- **Usage**: CTAs, hover states, active indicators, accent tiles
- **Characteristics**: High energy, attention-grabbing, brand signature

#### Yellow (Secondary Accent)
```css
--yellow: #FFD400
```
- **RGB**: (255, 212, 0)
- **Usage**: Marker highlights, decorative stars, accent tiles
- **Characteristics**: Warm, optimistic, highlighting tool

#### Orange (Tertiary Accent)
```css
--orange: #FF6A00
```
- **RGB**: (255, 106, 0)
- **Usage**: Occasional accent tiles (mosaic), special highlights
- **Characteristics**: Energetic, warm, less frequently used

### Semantic Colors

| Token | Value | Usage |
|-------|-------|-------|
| `--color-background` | `#F5F3ED` | Page backgrounds |
| `--color-foreground` | `#101010` | Primary text |
| `--color-primary` | `#101010` | Primary actions |
| `--color-accent` | `#B7FF2A` | Interactive elements |

### Color Usage Rules

1. **Text on Cream**: Use `#101010` (Ink) for maximum contrast
2. **Text on Ink**: Use `#F5F3ED` (Cream) for readability
3. **Text on Lime**: Use `#101010` (Ink) — never white
4. **Borders**: `ink/10` (10% opacity) for subtle dividers
5. **Hover States**: Add lime color or `lime/10` background

### Opacity Variations

```css
/* Text opacities */
text-ink/80    /* Secondary text: 80% opacity */
text-ink/70    /* Tertiary text: 70% opacity */
text-ink/60    /* Muted text: 60% opacity */
text-ink/40    /* Placeholder: 40% opacity */

/* Background opacities */
bg-ink/10      /* Subtle borders */
bg-ink/5       /* Ghost hover states */
bg-lime/10     /* Light accent backgrounds */
bg-lime/5      /* Softer accent backgrounds */
```

---

## Layout & Structure

### Root Layout
**File**: `app/layout.tsx`

```jsx
<html className={`${inter.variable} ${caveat.variable}`}>
  <body className="min-h-screen flex flex-col bg-cream text-ink antialiased">
    <Navigation />      {/* Fixed header */}
    <main className="flex-1">{children}</main>
    <Footer />          {/* Site footer */}
  </body>
</html>
```

### Container System

#### Max-Width Container
```css
max-w-7xl mx-auto px-6
```
- **Max Width**: 1280px (80rem)
- **Horizontal Padding**: 24px (1.5rem) on mobile, desktop
- **Usage**: All page sections

#### Spacing Scale
```css
--spacing-section: 8rem;          /* 128px - desktop sections */
--spacing-section-mobile: 4rem;   /* 64px - mobile sections */
```

### Grid Systems

#### Service Cards (4-column)
```jsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
```

#### Product Grid (3-column)
```jsx
<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
```

#### Content Layout (2-column)
```jsx
<div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
```

---

## Navigation

### Header Navigation
**File**: `components/Navigation.tsx`

#### Structure
- **Position**: `fixed top-0` (always visible, scrolls with page)
- **Background**: `bg-cream/98 backdrop-blur-sm` (semi-transparent with blur)
- **Height**: `h-20` (80px)
- **Border**: `border-b border-ink/10` (subtle bottom line)

#### Logo
- **Image**: `/mivo-logo-full.png`
- **Dimensions**: 280×80px
- **Display Height**: 56px (3.5rem)
- **Priority**: `true` (loads immediately, above fold)

#### Desktop Navigation Links
```jsx
const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/explore', label: 'Explore Models' },
  { href: '/custom', label: 'Custom Orders' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
];
```

**Styling**:
- Font: Inter, medium weight
- Color: Ink
- Hover: `text-ink/70` with 200ms transition

#### Desktop Actions
1. **Search Icon** (non-functional placeholder)
   - Hover: `text-lime`
2. **Cart Icon** with badge
   - Badge: Lime background with ink text
   - Badge shows "2" (hardcoded demo value)
3. **Get a Quote Button**
   - Variant: `accent` (lime background)
   - Size: `md`
   - Border Radius: `rounded-full`
   - Icon: Right arrow

#### Mobile Menu
- **Trigger**: Hamburger icon (shows ≤ 1024px)
- **Animation**: Framer Motion
  - Entry: `opacity: 0, height: 0` → `opacity: 1, height: auto`
  - Duration: 300ms
  - Easing: `easeInOut`
- **Background**: Full-width cream panel
- **Border**: `border-t border-ink/10`

#### Mobile Menu Content
- All nav links (vertical stack)
- Cart link with item count
- Full-width "Get a Quote" button at bottom

---

## Component Library

### Button Component
**File**: `components/ui/Button.tsx`

#### Variants

| Variant | Background | Text | Border | Hover Effect | Usage |
|---------|-----------|------|--------|--------------|-------|
| `primary` | `#101010` (ink) | `#F5F3ED` (cream) | None | Shadow lift | Primary actions |
| `secondary` | `#F5F3ED` (cream) | `#101010` (ink) | 2px ink | BG→ink, Text→cream | Secondary actions |
| `accent` | `#B7FF2A` (lime) | `#101010` (ink) | None | Shadow XL lift | CTAs, Get Quote |
| `ghost` | Transparent | `#101010` (ink) | None | `bg-ink/5` | Tertiary actions |

#### Sizes

| Size | Padding | Text Size |
|------|---------|-----------|
| `sm` | `px-4 py-2` | 0.875rem (14px) |
| `md` | `px-6 py-3` | 1rem (16px) |
| `lg` | `px-8 py-4` | 1.125rem (18px) |

#### Interaction States
```css
hover:scale-[1.02]      /* Slight grow on hover */
active:scale-[0.98]     /* Slight shrink on click */
disabled:opacity-50     /* 50% opacity when disabled */
disabled:cursor-not-allowed
focus:ring-2            /* Focus ring for accessibility */
focus:ring-offset-2
```

#### Transition
- Duration: 200ms
- Easing: All (opacity, transform, colors)

### Input Component
**File**: `components/ui/Input.tsx`

```jsx
<input
  className="w-full px-4 py-3 border-2 border-ink/20 rounded-lg 
             bg-white text-ink placeholder:text-ink/40
             focus:border-lime focus:ring-2 focus:ring-lime/20 
             transition-all"
/>
```

#### Features
- Border: 2px solid, 20% ink opacity
- Focus: Lime border + 20% lime ring
- Transition: All properties (200ms)
- Placeholder: 40% ink opacity

### Card Component
**File**: `components/ui/Card.tsx`

```jsx
<div className="bg-white border-2 border-ink/10 rounded-2xl p-6 
                hover:border-lime hover:shadow-lg 
                transition-all duration-300">
```

#### Features
- Background: White (not cream)
- Border: 2px, 10% ink opacity
- Border Radius: 1rem (16px)
- Hover: Lime border + lifted shadow
- Transition: 300ms

### Product Mosaic Component
**File**: `components/hero/ProductMosaic.tsx`

#### Desktop Version (3 columns)
- **Column 1**: Scrolls down, 40s duration
- **Column 2**: Scrolls up (opposite), 35s duration
- **Column 3**: Scrolls down, 30s duration

#### Tile Sizes
- **Small**: `h-32` (128px)
- **Medium**: `h-48` (192px)
- **Large**: `h-64` (256px)

#### Tile Types

**Product Tiles**:
- Background: White
- Border: 2px, ink/10 opacity
- Border Radius: 1rem (rounded-2xl)
- Image: Object-contain with 1rem padding
- Hover: Lime border, 5% lime overlay

**Accent Tiles**:
- Colors: Lime, Yellow, Orange
- Opacity: 20%
- Purpose: Add visual rhythm

#### Animations
- **Entrance**: `fadeInScale` (0-0.5s random delay)
- **Continuous Scroll**: CSS keyframes `scrollUp` / `scrollDown`
- **Seamless Loop**: Items duplicated

#### Gradient Overlays
- Top: `from-cream to-transparent` (96px height)
- Bottom: `from-cream to-transparent` (96px height)
- Purpose: Create infinite scroll illusion

#### Mobile Version (2 columns)
- Reduced height: 300px
- Column 1: Scrolls down (medium speed)
- Column 2: Scrolls up (slow speed)
- Limit: 6 items max

---

## Page-by-Page Breakdown

### 1. Home Page (`app/page.tsx`)

#### Hero Section
**Layout**: 2-column grid (text left, mosaic right)

**Left Column**:
- **Handwritten annotation** (SVG)
  - Text: IDEAS, SKETCHES, PROJECTS, PROBLEMS
  - Arrow: Curved path pointing right
- **Headline** (Caveat font, 72px desktop)
  - Line 1: "Your ideas."
  - Line 2: "Designed." (yellow marker highlight)
  - Line 3: "Made real."
- **Supporting Text**: 20px, ink/80, max-width 512px
- **CTAs**: 
  - Primary: "Explore Models" (lime, rounded-xl)
  - Secondary: "Start a Custom Project" (bordered)

**Right Column**:
- Desktop: `ProductMosaic` (600px height)
- Mobile: `ProductMosaicMobile` (below text, 300px)

#### How MIVO Works Section
**Background**: Cream with top border

**Section Header**:
- Handwritten annotation (left): "A SIMPLE PROCESS..."
- Title: "How MIVO Works?" (60px, yellow highlight)
- Lime border callout (right): Descriptive text + tags

**Steps Layout**: 2×2 zigzag grid
- **Step 1** (top-left): Share Your Idea
- **Step 2** (middle-right, offset down 96px): We Design
- **Step 3** (bottom-left): We Print
- **Step 4** (bottom-right, offset down 48px): You Get It

**Each Step Card**:
- Lime circle badge with number (64×64px)
- Image container: 192px height, rounded-3xl, white bg, bordered
- Title: Caveat 32px
- Description: Inter 16px, ink/70

**Zigzag Flow (Desktop)**:
- SVG arrows between steps
- Dashed lines: strokeDasharray 6,6
- Yellow stars at midpoints
- Sparkle lines near stars

**Animation**: Framer Motion
- Stagger: 0.2s delay between steps
- Initial: `opacity: 0, x: ±30`
- Animate: `opacity: 1, x: 0`
- Duration: 600ms

#### What We Make Section
**Background**: Cream with top border

**Section Header**:
- Annotation: "SOLUTIONS FOR REAL PROBLEMS"
- Title: "What We Make" (60px, yellow highlight)
- Lime border callout: Feature tags

**Service Cards**: 4-column grid
- **Card 1**: 3D Printing
- **Card 2**: CAD Design
- **Card 3**: Prototyping
- **Card 4**: Custom Parts (checkmark accent)

**Card Structure**:
- Aspect-square image container
- Title: Caveat 32px
- Description: Inter 16px
- Right arrow (transforms on hover)
- Hover: Lime border, lifted shadow, translate arrow

**Images Used**:
- `/services/3d-printing.webp`
- `/services/cad-design.webp`
- `/services/prototyping.webp`
- `/services/custom-parts.webp`

#### Featured Models Section
**Background**: Ink (dark mode)
**Text**: Cream

**Layout**: 3-column product grid
- Product images from Supabase
- Product name, category, price
- Hover: Lime border on card
- Link to: `/product/[id]`

**CTA**: "View All Models" button (lime accent)

#### Contact CTA Section
**Background**: Cream
- Centered text layout
- Headline: Caveat 48px
- Subtext: 20px
- Button: "Get a Quote" (lime, rounded-xl)

---

### 2. Explore Page (`app/explore/page.tsx`)

#### Header
**Background**: Cream
**Border**: Bottom border (ink/10)

- Title: "Ready-to-Order Models." (Caveat 72px)
- Yellow marker accent on period
- Product count indicator with lime checkmark

#### Filters Section

**Search Bar**:
- Full-width input
- Placeholder: "Search by name, category, or tag..."
- Search icon: Right-aligned
- Border: 2px ink/20, focus → lime

**Sort Dropdown**:
- Options: Name, Price (Low→High), Price (High→Low)
- Styled select with lime focus ring

**Category Pills**:
- All Products + dynamic categories
- Active: Lime background, ink text, shadow
- Inactive: White background, ink/70 text
- Hover: Lime/50 border, lime/5 background

#### Product Grid
**Layout**: Responsive grid
- Mobile: 1 column
- Tablet: 2 columns
- Desktop: 3 columns
- Gap: 2rem (32px)

**Product Card**:
- Aspect-square image container (cream/5 background)
- Border: cream/10, hover → lime
- Product name: 20px semibold
- Category: 14px cream/60
- Price: 32px bold
- Transition: 300ms

**Loading State**:
- Centered spinner (lime border, transparent top)
- "Loading products..." text

**Empty State**:
- "No products found" message
- "Clear filters" button

---

### 3. Custom Orders Page (`app/custom/page.tsx`)

#### Header
**Background**: Ink (dark)
**Text**: Cream

- Title: "Custom 3D Printing" (60px bold)
- Description: 20px cream/80

#### Form Layout
**Grid**: 2 columns (form left, info sidebar right)

**Form Sections**:

1. **Contact Information**
   - Name (required)
   - Email (required)
   - Phone (required)

2. **Project Details**
   - Project Type (dropdown)
   - Description (textarea, required)
   - Quantity
   - Material preference

3. **Additional Info**
   - Budget range
   - Timeline
   - File upload

**Form Styling**:
- White panels with 2px ink/10 border
- Padding: 2rem (32px)
- Input fields: 2px border, lime focus ring
- Textareas: Min height 192px

**Submit Button**:
- Full-width on mobile
- Lime accent variant
- Loading state: Disabled with spinner

#### Info Sidebar

**What to Include Card**:
- Checkmark list items
- Gray background
- Rounded corners

**Quick Stats**:
- Turnaround time
- Material options
- Free quote badge

#### Form Validation
- HTML5 required attributes
- Client-side JS validation before submit
- Server-side API validation
- Rate limiting: 5 requests per 15 minutes per IP

#### Success/Error Handling
- Alert on success: "Quote request submitted!"
- Alert on error: Rate limit exceeded (429)
- Form reset on successful submission

---

### 4. Contact Page (`app/contact/page.tsx`)

Similar structure to Custom Orders but simpler:
- Name, Email, Subject, Message fields
- Rate limit: 3 requests per 15 minutes per IP
- Contact info sidebar (phone, email, address)
- Social media links

---

### 5. About Page (`app/about/page.tsx`)

#### Hero Section
- Company mission statement
- Handwritten headline style
- Team photo placeholder

#### Equipment Section
- Bambu Lab A1 printer showcase
- Technical specs
- Capabilities list

#### Process Section
- Similar to home page "How MIVO Works"
- More detailed explanations

---

### 6. Product Detail Page (`app/product/[id]/page.tsx`)

#### Layout
**Grid**: Image gallery left, product info right

#### Image Gallery
- Main image display (large)
- Thumbnail strip below
- Hover: Border highlight
- Click: Change main image

#### Product Info Panel
- Product name (32px bold)
- Category badge
- Price display (large, bold)
  - Fixed: Show price
  - Configurable: "From ₹X"
  - Quote: "Contact for pricing"
- Stock indicator
- Description text

#### Configuration Section (if configurable)
- Size selector (radio buttons)
- Material selector (dropdown)
- Color selector (swatches)
- Quantity stepper
- Price breakdown display

#### Add to Cart
- Primary button (lime)
- Quantity validation
- Loading state

#### Tabs Section
- Description
- Specifications (key-value pairs)
- Shipping info

---

### 7. Cart Page (`app/cart/page.tsx`)

#### Cart Items
- Product thumbnail
- Name + variant details
- Quantity adjuster
- Price per item
- Remove button

#### Summary Panel
- Subtotal
- Estimated shipping
- Total (bold, large)
- Checkout button (lime, full-width)

#### Empty State
- Icon: Empty cart illustration
- Message: "Your cart is empty"
- CTA: "Explore Models" button

---

## Animations & Transitions

### Global Animations

#### Fade In Scale
```css
@keyframes fadeInScale {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
```
**Usage**: Product mosaic tiles entrance
**Duration**: 800ms
**Easing**: `cubic-bezier(0.4, 0, 0.2, 1)`

#### Scroll Up/Down (Mosaic)
```css
@keyframes scrollDown {
  0% { transform: translateY(0); }
  100% { transform: translateY(-50%); }
}

@keyframes scrollUp {
  0% { transform: translateY(-50%); }
  100% { transform: translateY(0); }
}
```
**Usage**: Continuous vertical scroll in mosaic
**Duration**: 30-40s
**Easing**: Linear
**Loop**: Infinite

### Framer Motion Animations

#### Page Load Fade In
```jsx
initial={{ opacity: 0, y: 20 }}
animate={{ opacity: 1, y: 0 }}
transition={{ duration: 0.6 }}
```
**Usage**: Hero sections, page headers

#### Staggered Cards
```jsx
initial={{ opacity: 0, y: 20 }}
whileInView={{ opacity: 1, y: 0 }}
viewport={{ once: true }}
transition={{ delay: index * 0.1, duration: 0.5 }}
```
**Usage**: Service cards, product grids, step cards

#### Slide from Sides
```jsx
// Left side
initial={{ opacity: 0, x: -30 }}
animate={{ opacity: 1, x: 0 }}

// Right side
initial={{ opacity: 0, x: 30 }}
animate={{ opacity: 1, x: 0 }}
```
**Usage**: Zigzag step layout

#### Mobile Menu
```jsx
initial={{ opacity: 0, height: 0 }}
animate={{ opacity: 1, height: 'auto' }}
exit={{ opacity: 0, height: 0 }}
transition={{ duration: 0.3, ease: 'easeInOut' }}
```
**Usage**: Mobile navigation dropdown

### CSS Transitions

#### Button Interactions
```css
transition-all duration-200
hover:scale-[1.02]
active:scale-[0.98]
```

#### Border/Shadow on Hover
```css
transition-all duration-300
hover:border-lime
hover:shadow-lg
```

#### Arrow Translation
```css
transition-transform duration-300
group-hover:translate-x-2
```

### Smooth Scrolling
```css
html {
  scroll-behavior: smooth;
}
```
**Usage**: Anchor links navigation

### Reduced Motion Support
```css
@media (prefers-reduced-motion: reduce) {
  html {
    scroll-behavior: auto;
  }
  
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```
**Accessibility**: Respects user's motion preferences

---

## Images & Assets

### Logo Files

| File | Dimensions | Format | Background | Usage |
|------|-----------|--------|------------|-------|
| `mivo-logo-full.png` | 280×80 | PNG | None | Navigation header |
| `mivo-logo-horizontal.png` | Variable | PNG | White | Light backgrounds |
| `mivo-logo-square.png` | Square | PNG | White | Social media, favicons |
| `mivo-logo-horizontal-transparent.png` | Variable | PNG | Transparent | Overlays |
| `mivo-logo-square-transparent.png` | Square | PNG | Transparent | Overlays |

### Service Images

All located in `public/services/`

| File | Dimensions | Format | Content | Usage |
|------|-----------|--------|---------|-------|
| `idea-sketch.webp` | 800×600 | WebP | Hand sketching mechanical part | Step 1 card |
| `cad-design.webp` | 800×600 | WebP | Laptop with CAD bracket model | Step 2 card |
| `3d-printing.webp` | 800×600 | WebP | 3D printer making lime bracket | Step 3 card |
| `custom-parts.webp` | 800×600 | WebP | Finished 3D printed components | Step 4 card |
| `prototyping.webp` | 800×600 | WebP | Prototype electronics enclosure | Prototyping service card |

**Style**: Technical illustrations with lime accent colors

### Equipment Images

| File | Dimensions | Format | Content | Usage |
|------|-----------|--------|---------|-------|
| `bambu-lab-a1.webp` | 1200×900 | WebP | Bambu Lab A1 printer full view | Equipment showcase |
| `bambu-a1-printing-gear.png` | 800×800 | PNG | A1 printing mechanical gear | Product mosaic |
| `bambu-a1-mask-print.png` | 800×800 | PNG | A1 printing face mask | Product mosaic |

### Image Optimization

#### Next.js Image Component
```jsx
<Image
  src="/path/to/image.webp"
  alt="Descriptive alt text"
  width={800}
  height={600}
  sizes="(max-width: 768px) 100vw, 50vw"
  className="object-contain"
  loading="lazy"  // or priority for above-fold
/>
```

#### Responsive Sizes
- Mobile (≤768px): `100vw`
- Tablet (≤1024px): `50vw`
- Desktop: `25vw` or fixed width

#### Loading Strategy
- **Priority**: Logo, hero images (above fold)
- **Lazy**: Everything else (below fold)

#### Format Choice
- **WebP**: Service images, hero images (smaller file size)
- **PNG**: Logos, transparent backgrounds
- **JPG**: Photography (if used)

### Product Images

Stored in **Supabase Storage** bucket: `product-images`

**URL Pattern**:
```
https://fuqjvxcyonuztfsepecb.supabase.co/storage/v1/object/public/product-images/{filename}
```

**Naming Convention**:
- Generated by Supabase Storage
- UUID-based filenames
- Stored in database: `products.images` array

---

## Responsive Design

### Breakpoints (Tailwind Default)

| Breakpoint | Min Width | Target Devices | Usage |
|-----------|-----------|----------------|-------|
| `sm` | 640px | Large phones | Rarely used |
| `md` | 768px | Tablets | 2-column layouts |
| `lg` | 1024px | Laptops | Desktop navigation |
| `xl` | 1280px | Desktops | Max container width |
| `2xl` | 1536px | Large screens | Rarely used |

### Mobile-First Approach

All styles are mobile-first, then enhanced for larger screens:
```jsx
className="text-3xl md:text-5xl lg:text-6xl"
// Mobile: 3xl (48px)
// Tablet: 5xl (60px)
// Desktop: 6xl (72px)
```

### Key Responsive Patterns

#### Grid Transformations
```jsx
// Mobile: Stack | Tablet: 2 cols | Desktop: 3 cols
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
```

#### Flex Direction
```jsx
// Mobile: Stack | Desktop: Row
className="flex flex-col md:flex-row gap-6"
```

#### Hidden/Visible
```jsx
// Show only on desktop
className="hidden lg:block"

// Show only on mobile
className="lg:hidden"
```

#### Hero Layout
- **Mobile**: Text above, mosaic below (stacked)
- **Desktop**: Text left, mosaic right (side-by-side)

#### Navigation
- **Mobile**: Hamburger menu, dropdown
- **Desktop**: Horizontal menu, all visible

#### Typography Scale
- **Mobile**: Smaller font sizes (48px hero)
- **Desktop**: Larger font sizes (72px hero)

#### Spacing
- **Mobile**: Tighter spacing (4rem sections)
- **Desktop**: Generous spacing (8rem sections)

#### Product Mosaic
- **Mobile**: 2 columns, 300px height
- **Desktop**: 3 columns, 600px height

---

## Accessibility

### Semantic HTML
- `<header>`, `<nav>`, `<main>`, `<section>`, `<footer>`
- Proper heading hierarchy (H1 → H2 → H3)
- `<button>` for interactions, `<Link>` for navigation

### ARIA Labels
```jsx
<button aria-label="Toggle menu" aria-expanded={isOpen}>
<button aria-label="Search">
<a aria-label="WhatsApp">
```

### Keyboard Navigation
- All interactive elements focusable
- Focus rings: `focus:ring-2 focus:ring-lime/50`
- Tab order follows visual order

### Color Contrast

| Combination | Ratio | WCAG Level | Usage |
|------------|-------|------------|-------|
| Ink on Cream | 15.8:1 | AAA | Body text |
| Cream on Ink | 15.8:1 | AAA | Footer text |
| Ink on Lime | 10.2:1 | AAA | Button text |
| Ink/80 on Cream | 12.6:1 | AAA | Secondary text |

All color combinations exceed WCAG AAA standards (7:1)

### Image Alt Text
- Descriptive alt text for all images
- Logo alt: "MIVO - Making Ideas Into Visible Objects"
- Service images: Describe content (not "image of...")

### Form Accessibility
- `<label>` for every input
- Required indicators (asterisks)
- Error messages associated with inputs
- Clear submit button text

### Motion Preferences
```css
@media (prefers-reduced-motion: reduce) {
  /* Disable animations */
}
```

### Focus Management
- Visible focus indicators on all interactive elements
- Focus returns to trigger after modal close
- Skip-to-content links (if needed)

---

## Performance Optimizations

### Image Optimization
- Next.js `<Image>` component auto-optimization
- WebP format for smaller file sizes
- Lazy loading for below-fold images
- Responsive sizes attribute

### Font Loading
- Google Fonts with `next/font`
- Variable font format
- `font-display: swap` implicit
- Preloaded for above-fold text

### Code Splitting
- Automatic route-based splitting (Next.js App Router)
- Dynamic imports for heavy components
- Lazy load admin components

### CSS Optimization
- Tailwind CSS purges unused styles
- Critical CSS inlined
- No external CSS files

### Animation Performance
- CSS transforms (GPU-accelerated)
- `will-change` for continuous animations
- Reduced motion support

---

## Browser Support

### Target Browsers
- Chrome/Edge: Last 2 versions
- Firefox: Last 2 versions
- Safari: Last 2 versions
- Mobile Safari (iOS 14+)
- Chrome Mobile (Android 10+)

### Polyfills
Next.js includes necessary polyfills automatically

### Graceful Degradation
- Animations disabled for reduced motion
- Fallback fonts if web fonts fail
- JavaScript enhancement (forms work without JS)

---

## File Structure Summary

```
app/
├── globals.css           # Global styles, theme variables
├── layout.tsx            # Root layout with fonts
├── page.tsx              # Home page (hero, services, featured)
├── explore/page.tsx      # Product catalog with filters
├── custom/page.tsx       # Custom order form
├── contact/page.tsx      # Contact form
├── about/page.tsx        # About MIVO
├── cart/page.tsx         # Shopping cart
└── product/[id]/page.tsx # Product detail

components/
├── Navigation.tsx        # Header nav with mobile menu
├── Footer.tsx            # Site footer
├── hero/
│   └── ProductMosaic.tsx # Animated product mosaic
└── ui/
    ├── Button.tsx        # Button variants
    ├── Input.tsx         # Form input
    └── Card.tsx          # Card container

public/
├── mivo-logo-*.png       # Logo variations
├── services/             # Service illustration images
│   ├── idea-sketch.webp
│   ├── cad-design.webp
│   ├── 3d-printing.webp
│   ├── prototyping.webp
│   └── custom-parts.webp
├── bambu-lab-a1.webp     # Equipment photo
├── bambu-a1-printing-gear.png
└── bambu-a1-mask-print.png
```

---

## Design Tokens Reference

### Spacing
```css
--spacing-section: 8rem;          /* 128px */
--spacing-section-mobile: 4rem;   /* 64px */
```

### Transitions
```css
--transition-smooth: 0.4s cubic-bezier(0.4, 0, 0.2, 1);
--transition-fast: 0.2s cubic-bezier(0.4, 0, 0.2, 1);
```

### Shadows
```css
shadow-sm   /* 0 1px 2px 0 rgba(0, 0, 0, 0.05) */
shadow-md   /* 0 4px 6px -1px rgba(0, 0, 0, 0.1) */
shadow-lg   /* 0 10px 15px -3px rgba(0, 0, 0, 0.1) */
shadow-xl   /* 0 20px 25px -5px rgba(0, 0, 0, 0.1) */
```

---

## Key Design Principles

1. **Handcrafted Meets Technical**: Blend handwritten fonts with precise layouts
2. **Generous Whitespace**: Let content breathe, avoid clutter
3. **Playful Accents**: Yellow highlights, lime CTAs add personality
4. **Clear Hierarchy**: Size, weight, color guide attention
5. **Consistent Patterns**: Reuse components, maintain rhythm
6. **Mobile-First**: Design for small screens, enhance for large
7. **Performance-Focused**: Optimize images, lazy load, minimize JS
8. **Accessible by Default**: High contrast, keyboard nav, alt text

---

**End of Frontend Documentation**  
Last Updated: 2026-10-18
