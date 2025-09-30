# Styling Guide
## FieldLite CRM - CSS & Design System Consistency

**Last Updated:** 2025-09-29
**Version:** 1.0.0

---

## Table of Contents
1. [Design System Overview](#design-system-overview)
2. [Color System](#color-system)
3. [Typography](#typography)
4. [Spacing & Layout](#spacing--layout)
5. [Component Patterns](#component-patterns)
6. [Tailwind Best Practices](#tailwind-best-practices)
7. [Dark Mode](#dark-mode)
8. [Responsive Design](#responsive-design)
9. [Animation & Transitions](#animation--transitions)
10. [Common Patterns](#common-patterns)
11. [Anti-Patterns (What NOT to Do)](#anti-patterns-what-not-to-do)

---

## Design System Overview

FieldLite CRM uses a **utility-first CSS approach** with Tailwind CSS v4 and shadcn/ui components.

### Core Technologies
- **Tailwind CSS 4** - Utility-first CSS framework
- **shadcn/ui** - Unstyled, accessible component library (based on Radix UI)
- **CSS Variables** - For theming and design tokens
- **OKLCH Color Space** - Modern, perceptually uniform colors
- **next-themes** - Light/dark mode support

### Style Philosophy
✅ **Utility-first** - Use Tailwind classes for most styling
✅ **Component-based** - Reusable components in `/components/ui`
✅ **Design tokens** - CSS variables for consistency
✅ **Responsive by default** - Mobile-first approach
✅ **Accessible** - WCAG 2.1 AA compliant

---

## Color System

### Design Tokens (CSS Variables)

All colors are defined as CSS variables in [app/globals.css](./app/globals.css) using the **OKLCH color space** (more perceptually uniform than HSL).

#### Semantic Color Tokens

```css
/* Light mode */
--background       /* Page background (white) */
--foreground       /* Main text color (near black) */
--card             /* Card background */
--card-foreground  /* Text on cards */
--popover          /* Popover/dropdown background */
--popover-foreground /* Text in popovers */
--primary          /* Primary brand color (buttons, links) */
--primary-foreground /* Text on primary color */
--secondary        /* Secondary actions */
--secondary-foreground /* Text on secondary */
--muted            /* Muted backgrounds */
--muted-foreground /* Muted text (less emphasis) */
--accent           /* Accent highlights */
--accent-foreground /* Text on accent */
--destructive      /* Error/danger states */
--border           /* Border color */
--input            /* Input border color */
--ring             /* Focus ring color */
```

### Using Colors in Tailwind

**Always use semantic tokens, not arbitrary values:**

✅ **CORRECT:**
```tsx
<div className="bg-background text-foreground">
<Button className="bg-primary text-primary-foreground">
<p className="text-muted-foreground">
```

❌ **WRONG:**
```tsx
<div className="bg-white text-black">              {/* Don't use absolute colors */}
<Button className="bg-blue-500 text-white">        {/* Don't use Tailwind colors */}
<p className="text-gray-500">                      {/* Use muted-foreground instead */}
```

### Color Usage Guidelines

| Token | When to Use | Examples |
|-------|-------------|----------|
| `background` | Page or section backgrounds | Main page, modal overlays |
| `foreground` | Primary text content | Headings, body text |
| `card` | Contained content areas | Cards, panels, widgets |
| `primary` | Primary actions, brand elements | CTA buttons, links, active nav |
| `secondary` | Secondary actions | Cancel buttons, tags |
| `muted` | De-emphasized content | Disabled states, placeholders |
| `accent` | Highlights, hover states | Hover backgrounds, active items |
| `destructive` | Errors, dangerous actions | Delete buttons, error messages |
| `border` | Separators, outlines | Dividers, card borders |
| `ring` | Focus indicators | Focus rings on inputs |

---

## Typography

### Font System

**Primary Font:** Geist Sans (sans-serif)
**Monospace Font:** Geist Mono (code, numbers)

Fonts are configured in [app/layout.tsx](./app/layout.tsx):

```tsx
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});
```

### Font Size Scale

Use Tailwind's default scale:

```tsx
text-xs    // 0.75rem (12px)
text-sm    // 0.875rem (14px)
text-base  // 1rem (16px)    ← Body text default
text-lg    // 1.125rem (18px)
text-xl    // 1.25rem (20px)
text-2xl   // 1.5rem (24px)
text-3xl   // 1.875rem (30px)
text-4xl   // 2.25rem (36px)
```

### Typography Guidelines

#### Headings
```tsx
<h1 className="text-4xl font-bold tracking-tight">Page Title</h1>
<h2 className="text-3xl font-semibold">Section Title</h2>
<h3 className="text-2xl font-semibold">Subsection</h3>
<h4 className="text-xl font-medium">Card Title</h4>
```

#### Body Text
```tsx
<p className="text-base">Regular body text</p>
<p className="text-sm text-muted-foreground">Secondary text</p>
<p className="text-xs text-muted-foreground">Caption or help text</p>
```

#### Labels & Inputs
```tsx
<label className="text-sm font-medium">Field Label</label>
<input className="text-sm" />
<span className="text-xs text-muted-foreground">Help text</span>
```

### Font Weight Scale
```tsx
font-normal    // 400 - Regular text
font-medium    // 500 - Labels, emphasized text
font-semibold  // 600 - Headings, important text
font-bold      // 700 - Extra emphasis (use sparingly)
```

---

## Spacing & Layout

### Spacing Scale (Tailwind)

Use consistent spacing for padding, margins, and gaps:

```tsx
p-1    // 0.25rem (4px)
p-2    // 0.5rem (8px)
p-3    // 0.75rem (12px)
p-4    // 1rem (16px)    ← Most common
p-6    // 1.5rem (24px)
p-8    // 2rem (32px)
p-12   // 3rem (48px)
```

### Layout Patterns

#### Container
Use the `.container` class for consistent page width:

```tsx
<div className="container">
  {/* Content automatically centered with max-width and responsive padding */}
</div>
```

Defined in [app/globals.css](./app/globals.css):
```css
.container {
  @apply mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8;
}
```

#### Stack (Vertical Spacing)
```tsx
<div className="space-y-4">
  <div>Item 1</div>
  <div>Item 2</div>
  <div>Item 3</div>
</div>
```

#### Grid
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  <Card>...</Card>
  <Card>...</Card>
  <Card>...</Card>
</div>
```

#### Flex
```tsx
<div className="flex items-center justify-between gap-4">
  <div>Left content</div>
  <div>Right content</div>
</div>
```

---

## Component Patterns

### shadcn/ui Components

All UI components are in [components/ui/](./components/ui/) and follow consistent patterns.

#### Button Component

**Variants:**
```tsx
<Button variant="default">Primary Action</Button>
<Button variant="secondary">Secondary Action</Button>
<Button variant="outline">Outlined Button</Button>
<Button variant="ghost">Ghost Button</Button>
<Button variant="destructive">Delete</Button>
<Button variant="link">Link Button</Button>
```

**Sizes:**
```tsx
<Button size="sm">Small</Button>
<Button size="default">Default</Button>
<Button size="lg">Large</Button>
<Button size="icon"><Icon /></Button>
```

**With Icons:**
```tsx
import { Plus } from "lucide-react"

<Button>
  <Plus />
  Add Item
</Button>
```

#### Card Component
```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"

<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Optional description</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Card content goes here</p>
  </CardContent>
  <CardFooter>
    <Button>Action</Button>
  </CardFooter>
</Card>
```

#### Input Component
```tsx
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

<div className="space-y-2">
  <Label htmlFor="email">Email</Label>
  <Input
    id="email"
    type="email"
    placeholder="you@example.com"
  />
</div>
```

#### Dialog Component
```tsx
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

<Dialog>
  <DialogTrigger asChild>
    <Button>Open Dialog</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Dialog Title</DialogTitle>
      <DialogDescription>Dialog description text</DialogDescription>
    </DialogHeader>
    {/* Dialog content */}
  </DialogContent>
</Dialog>
```

---

## Tailwind Best Practices

### 1. Class Order Convention

Follow this order for readability:

```tsx
<div className="
  // Layout
  flex items-center justify-between gap-4

  // Sizing
  w-full max-w-4xl h-12

  // Spacing
  p-4 m-2

  // Typography
  text-sm font-medium

  // Colors
  bg-card text-foreground

  // Borders
  border border-border rounded-md

  // Effects
  shadow-sm hover:shadow-md

  // Transitions
  transition-all duration-200
">
```

### 2. Use the `cn()` Utility

Always use `cn()` from [lib/utils.ts](./lib/utils.ts) to merge classes:

```tsx
import { cn } from "@/lib/utils"

<div className={cn(
  "base-classes",
  condition && "conditional-classes",
  className // Allow prop override
)}>
```

**Why?**
- Handles Tailwind class conflicts (e.g., `p-4` vs `p-2`)
- Cleaner conditional classes
- Prevents duplicate classes

### 3. Extract Complex Patterns to Components

❌ **Don't repeat complex class strings:**
```tsx
<button className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2">
  Button 1
</button>
<button className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2">
  Button 2
</button>
```

✅ **Use the Button component:**
```tsx
<Button>Button 1</Button>
<Button>Button 2</Button>
```

### 4. Responsive Design Prefixes

Mobile-first approach:

```tsx
<div className="
  text-sm           // Mobile (default)
  md:text-base      // Tablet (768px+)
  lg:text-lg        // Desktop (1024px+)

  grid-cols-1       // Mobile (1 column)
  md:grid-cols-2    // Tablet (2 columns)
  lg:grid-cols-3    // Desktop (3 columns)
">
```

Breakpoints:
- `sm:` - 640px and up
- `md:` - 768px and up
- `lg:` - 1024px and up
- `xl:` - 1280px and up
- `2xl:` - 1536px and up

---

## Dark Mode

### Implementation

Dark mode uses CSS variables that change based on the `.dark` class on the `<html>` element.

Managed by [next-themes](https://github.com/pacocoursey/next-themes) in [components/theme-provider.tsx](./components/theme-provider.tsx).

### Using Dark Mode in Components

**Automatic (Recommended):**
Use semantic color tokens - they automatically adapt:

```tsx
<div className="bg-card text-foreground border border-border">
  {/* Colors automatically change in dark mode */}
</div>
```

**Manual Override (Rare):**
Only when you need specific dark mode behavior:

```tsx
<div className="bg-white dark:bg-gray-900">
  {/* Explicit dark mode style */}
</div>
```

### Dark Mode Guidelines

✅ **DO:**
- Use semantic color tokens (they auto-adapt)
- Test every component in both light and dark mode
- Ensure sufficient contrast in both modes
- Use `dark:` prefix sparingly for exceptions

❌ **DON'T:**
- Use absolute colors like `bg-white` or `text-black`
- Assume light mode is the only mode
- Forget to test dark mode

### Testing Dark Mode

```tsx
// Toggle dark mode programmatically for testing
import { useTheme } from "next-themes"

const { theme, setTheme } = useTheme()

<button onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
  Toggle Theme
</button>
```

---

## Responsive Design

### Mobile-First Approach

Design for mobile first, then enhance for larger screens:

```tsx
<div className="
  flex flex-col       // Mobile: vertical stack
  md:flex-row         // Tablet+: horizontal layout

  gap-2               // Mobile: small gap
  md:gap-4            // Tablet+: larger gap

  p-4                 // Mobile: standard padding
  md:p-6              // Tablet+: more padding
  lg:p-8              // Desktop: even more padding
">
```

### Common Responsive Patterns

#### Responsive Grid
```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
  {/* 1 column on mobile, 2 on tablet, 3 on desktop, 4 on large desktop */}
</div>
```

#### Responsive Text
```tsx
<h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold">
  Responsive Heading
</h1>
```

#### Hide/Show Elements
```tsx
<div className="hidden md:block">Only visible on tablet and up</div>
<div className="block md:hidden">Only visible on mobile</div>
```

#### Responsive Container
```tsx
<div className="
  w-full              // Mobile: full width
  md:max-w-2xl        // Tablet: max 42rem
  lg:max-w-4xl        // Desktop: max 56rem
  mx-auto             // Center horizontally
  px-4                // Mobile padding
  md:px-6             // Tablet padding
  lg:px-8             // Desktop padding
">
```

---

## Animation & Transitions

### Transition Utilities

```tsx
// Basic transition (all properties)
className="transition-all duration-200"

// Specific properties
className="transition-colors duration-200"
className="transition-opacity duration-300"
className="transition-transform duration-200"

// Timing functions
className="ease-in"
className="ease-out"
className="ease-in-out"
```

### Hover & Focus States

```tsx
<button className="
  bg-primary text-primary-foreground
  hover:bg-primary/90              // Hover: slightly lighter
  focus-visible:ring-2             // Focus: ring
  focus-visible:ring-ring          // Focus: ring color
  focus-visible:ring-offset-2      // Focus: ring offset
  transition-colors duration-200   // Smooth transition
">
  Interactive Button
</button>
```

### Framer Motion (For Complex Animations)

For advanced animations, use Framer Motion (already installed):

```tsx
import { motion } from "framer-motion"

<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -20 }}
  transition={{ duration: 0.3 }}
>
  Animated content
</motion.div>
```

---

## Common Patterns

### 1. Form Layout

```tsx
<form className="space-y-6">
  <div className="space-y-2">
    <Label htmlFor="name">Name</Label>
    <Input id="name" placeholder="Enter your name" />
    <p className="text-xs text-muted-foreground">Your full name</p>
  </div>

  <div className="space-y-2">
    <Label htmlFor="email">Email</Label>
    <Input id="email" type="email" placeholder="you@example.com" />
  </div>

  <div className="flex justify-end gap-2">
    <Button variant="outline" type="button">Cancel</Button>
    <Button type="submit">Save</Button>
  </div>
</form>
```

### 2. Data Table Header

```tsx
<div className="flex items-center justify-between mb-4">
  <div>
    <h2 className="text-2xl font-semibold">Customers</h2>
    <p className="text-sm text-muted-foreground">
      Manage your customer database
    </p>
  </div>
  <Button>
    <Plus />
    Add Customer
  </Button>
</div>
```

### 3. Stat Cards

```tsx
<Card>
  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
    <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
    <DollarSign className="size-4 text-muted-foreground" />
  </CardHeader>
  <CardContent>
    <div className="text-2xl font-bold">$45,231.89</div>
    <p className="text-xs text-muted-foreground">
      +20.1% from last month
    </p>
  </CardContent>
</Card>
```

### 4. List with Actions

```tsx
<div className="space-y-2">
  {items.map((item) => (
    <div
      key={item.id}
      className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors"
    >
      <div>
        <p className="font-medium">{item.name}</p>
        <p className="text-sm text-muted-foreground">{item.description}</p>
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="ghost">Edit</Button>
        <Button size="sm" variant="ghost">Delete</Button>
      </div>
    </div>
  ))}
</div>
```

### 5. Empty State

```tsx
<div className="flex flex-col items-center justify-center py-12 text-center">
  <InboxIcon className="size-12 text-muted-foreground mb-4" />
  <h3 className="text-lg font-semibold mb-2">No customers yet</h3>
  <p className="text-sm text-muted-foreground mb-6 max-w-sm">
    Get started by adding your first customer to the system.
  </p>
  <Button>
    <Plus />
    Add Customer
  </Button>
</div>
```

### 6. Loading State

```tsx
import { Skeleton } from "@/components/ui/skeleton"

<Card>
  <CardHeader>
    <Skeleton className="h-6 w-32" />
    <Skeleton className="h-4 w-48 mt-2" />
  </CardHeader>
  <CardContent>
    <Skeleton className="h-20 w-full" />
  </CardContent>
</Card>
```

---

## Anti-Patterns (What NOT to Do)

### ❌ 1. Don't Use Inline Styles

**Wrong:**
```tsx
<div style={{ color: 'red', fontSize: '16px' }}>Text</div>
```

**Correct:**
```tsx
<div className="text-destructive text-base">Text</div>
```

**Why?** Inline styles bypass Tailwind's design system and break dark mode.

---

### ❌ 2. Don't Use Arbitrary Values (Usually)

**Wrong:**
```tsx
<div className="p-[13px] text-[#ff0000]">
```

**Correct:**
```tsx
<div className="p-4 text-destructive">
```

**Exception:** Only use arbitrary values for truly one-off situations that don't fit the design system.

---

### ❌ 3. Don't Mix Conflicting Classes

**Wrong:**
```tsx
<div className="p-4 p-2">  {/* Which padding wins? */}
```

**Correct:**
```tsx
<div className={cn("p-4", condition && "p-2")}>  {/* cn() handles conflicts */}
```

---

### ❌ 4. Don't Create Custom CSS Files

**Wrong:**
```css
/* custom.css */
.my-button {
  background: blue;
  padding: 10px;
}
```

**Correct:**
```tsx
// Use shadcn/ui components or Tailwind
<Button>My Button</Button>
```

**Exception:** Only add to [app/globals.css](./app/globals.css) for truly global styles or design tokens.

---

### ❌ 5. Don't Ignore Responsive Design

**Wrong:**
```tsx
<div className="grid grid-cols-4 gap-4">  {/* Breaks on mobile */}
```

**Correct:**
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
```

---

### ❌ 6. Don't Use Magic Numbers

**Wrong:**
```tsx
<div className="w-[347px] h-[219px]">  {/* Why these numbers? */}
```

**Correct:**
```tsx
<div className="w-full max-w-md aspect-video">  {/* Semantic sizing */}
```

---

### ❌ 7. Don't Forget Focus States

**Wrong:**
```tsx
<button className="bg-primary text-white p-2 rounded">
  {/* No focus state - bad for accessibility */}
</button>
```

**Correct:**
```tsx
<Button>Click Me</Button>  {/* Button component has focus states built-in */}
```

---

### ❌ 8. Don't Use Absolute Colors

**Wrong:**
```tsx
<div className="bg-white dark:bg-black text-gray-900 dark:text-white">
```

**Correct:**
```tsx
<div className="bg-background text-foreground">  {/* Semantic tokens */}
```

---

## Adding New UI Components

### Using shadcn/ui CLI

To add a new component from shadcn/ui:

```bash
npx shadcn@latest add [component-name]
```

Examples:
```bash
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add dialog
npx shadcn@latest add dropdown-menu
```

This will:
1. Install necessary dependencies
2. Add the component to `components/ui/`
3. Configure for your project

### Component Configuration

shadcn/ui components are configured in [components.json](./components.json):

```json
{
  "style": "new-york",           // Component style variant
  "rsc": true,                   // React Server Components support
  "tailwind": {
    "baseColor": "neutral",      // Base color palette
    "cssVariables": true         // Use CSS variables for colors
  }
}
```

---

## Customizing Components

### Extending Button Variants

Edit [components/ui/button.tsx](./components/ui/button.tsx):

```tsx
const buttonVariants = cva(
  "base-classes",
  {
    variants: {
      variant: {
        default: "...",
        destructive: "...",
        // Add custom variant
        success: "bg-green-600 text-white hover:bg-green-700"
      }
    }
  }
)
```

Usage:
```tsx
<Button variant="success">Save</Button>
```

---

## Accessibility

### Color Contrast

Ensure sufficient contrast for text:
- **Normal text:** 4.5:1 contrast ratio
- **Large text:** 3:1 contrast ratio

Our semantic tokens are designed to meet WCAG AA standards in both light and dark modes.

### Focus States

Always ensure focusable elements have visible focus indicators:

```tsx
<button className="
  focus-visible:outline-none
  focus-visible:ring-2
  focus-visible:ring-ring
  focus-visible:ring-offset-2
">
```

### Screen Readers

Use semantic HTML and ARIA labels:

```tsx
<button aria-label="Close dialog">
  <X />  {/* Icon without text needs aria-label */}
</button>
```

---

## Performance

### Avoid Excessive Classes

❌ **Too many classes:**
```tsx
<div className="mt-1 ml-2 mr-3 mb-4 pt-5 pl-6 pr-7 pb-8 ...">
```

✅ **Use shorthand:**
```tsx
<div className="m-2 p-6">
```

### Purge Unused Styles

Tailwind automatically purges unused styles in production (configured in Tailwind v4).

---

## Maintenance Checklist

### When Adding New Features

- [ ] Use existing UI components from `components/ui/`
- [ ] Use semantic color tokens (not absolute colors)
- [ ] Test in both light and dark mode
- [ ] Test on mobile, tablet, and desktop
- [ ] Ensure keyboard navigation works
- [ ] Ensure sufficient color contrast
- [ ] Follow spacing and typography guidelines
- [ ] Use `cn()` utility for conditional classes

### When Customizing Styles

- [ ] Check if it can be done with existing components
- [ ] If creating custom styles, add to relevant component
- [ ] Document any new patterns in this guide
- [ ] Ensure consistency with existing design system
- [ ] Test accessibility (keyboard, screen reader, contrast)

---

## Related Documentation

- [Codebase Documentation](./codebase.md) - Component structure and file locations
- [Architecture Documentation](./architecture.md) - Technical decisions
- [Project Plan](./plan.md) - Development roadmap

---

## Resources

- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [shadcn/ui Components](https://ui.shadcn.com)
- [Radix UI Documentation](https://www.radix-ui.com)
- [OKLCH Color Picker](https://oklch.com)
- [WCAG Contrast Checker](https://webaim.org/resources/contrastchecker/)

---

## Questions?

If you're unsure about how to style something:
1. Check if there's an existing component in `components/ui/`
2. Look for similar patterns in the codebase
3. Refer to this guide
4. Ask the team or create an issue

**Remember: Consistency > Creativity. Use the design system!**