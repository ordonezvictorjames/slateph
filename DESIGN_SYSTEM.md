# Slate LMS - Books & Plants Design System 🌿📚

## Design Philosophy

Slate's design system is inspired by the natural world of learning - books, plants, and organic growth. The theme emphasizes:

- **Growth & Learning**: Like plants growing, students progress through their educational journey
- **Knowledge & Wisdom**: Books represent accumulated knowledge and structured learning
- **Natural & Organic**: Soft, earthy tones create a calm, focused learning environment
- **Fresh & Vibrant**: Green accents bring energy and life to the interface

## Color Palette

### Primary - Leaf Green
The main brand color representing growth, freshness, and learning.

- `leaf-50` #f0fdf4 - Lightest backgrounds
- `leaf-100` #dcfce7 - Hover states, light backgrounds
- `leaf-200` #bbf7d0 - Borders, dividers
- `leaf-300` #86efac - Accents
- `leaf-400` #4ade80 - Interactive elements
- `leaf-500` #22c55e - **Primary brand color**
- `leaf-600` #16a34a - Hover states
- `leaf-700` #15803d - Active states
- `leaf-800` #166534 - Dark text
- `leaf-900` #14532d - Headings

### Secondary - Earth Tones
Natural, grounding colors for text and backgrounds.

- `earth-50` to `earth-900` - Stone and soil tones

### Accent - Wood Brown
Warm browns representing books, paper, and natural materials.

- `wood-50` to `wood-900` - Warm brown tones

### Semantic Colors
- Success: `#22c55e` (Leaf green)
- Warning: `#f59e0b` (Amber)
- Error: `#ef4444` (Red)
- Info: `#3b82f6` (Blue)

## Typography

### Font Families
- **Sans**: Inter - Clean, readable body text
- **Display**: Poppins - Bold, friendly headings
- **Mono**: JetBrains Mono - Code and technical content

### Font Sizes
- xs: 0.75rem (12px)
- sm: 0.875rem (14px)
- base: 1rem (16px)
- lg: 1.125rem (18px)
- xl: 1.25rem (20px)
- 2xl: 1.5rem (24px)
- 3xl: 1.875rem (30px)
- 4xl: 2.25rem (36px)
- 5xl: 3rem (48px)

## Components

### Buttons
```tsx
<NatureButton variant="leaf">Primary Action</NatureButton>
<NatureButton variant="earth">Secondary Action</NatureButton>
<NatureButton variant="wood">Tertiary Action</NatureButton>
<NatureButton variant="outline">Outline Action</NatureButton>
```

### Cards
```tsx
<BookCard hover spine>
  <BookCardHeader icon={<Icon />}>Card Title</BookCardHeader>
  <BookCardContent>Card content goes here</BookCardContent>
  <BookCardFooter>Footer content</BookCardFooter>
</BookCard>
```

### Badges
```tsx
<Badge variant="leaf">Active</Badge>
<Badge variant="wood">Draft</Badge>
<Badge variant="success">Completed</Badge>
```

### Dividers
```tsx
<PlantDivider variant="leaf" />
<PlantDivider variant="vine" />
<PlantDivider variant="simple" />
```

## Spacing Scale
- 4px, 8px, 12px, 16px, 20px, 24px, 32px, 40px, 48px, 64px, 80px, 96px

## Border Radius
- sm: 0.5rem (8px)
- md: 0.75rem (12px)
- lg: 1rem (16px)
- xl: 1rem (16px)
- 2xl: 1.5rem (24px)
- 3xl: 2rem (32px)

## Shadows
- `shadow-soft`: Subtle green-tinted shadow
- `shadow-soft-lg`: Larger soft shadow for elevated elements
- `shadow-inner-soft`: Inner shadow for depth

## Animations
- `fade-in`: Smooth fade in
- `slide-up`: Slide up with fade
- `slide-down`: Slide down with fade
- `scale-in`: Scale in with fade
- `bounce-soft`: Gentle bounce
- `float`: Floating animation

## Usage Guidelines

### Do's ✅
- Use leaf green for primary actions and important elements
- Use earth tones for text and neutral backgrounds
- Use wood accents for warmth and secondary elements
- Maintain consistent spacing using the scale
- Use soft shadows for depth
- Add plant/book emojis sparingly for decoration

### Don'ts ❌
- Don't use harsh, saturated colors
- Don't mix too many accent colors
- Don't use small text below 14px for body content
- Don't overuse animations
- Don't forget hover and focus states

## Accessibility
- All text meets WCAG AA contrast requirements
- Focus states are clearly visible
- Interactive elements have minimum 44px touch targets
- Color is never the only indicator of state

## Implementation
All design tokens are configured in `tailwind.config.js` and can be used with Tailwind utility classes:

```tsx
<div className="bg-leaf-50 text-earth-900 p-6 rounded-2xl shadow-soft">
  <h2 className="font-display text-2xl text-leaf-600">Hello World</h2>
</div>
```
