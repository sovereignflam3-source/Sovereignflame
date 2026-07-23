# Sovereign Flame Design Philosophy

## Repository status

The current workspace contains only Git metadata and no application source files. This provides a clean slate to establish a strong architectural foundation and a restrained, craft-driven visual system before implementing pages or features.

## Architectural philosophy

1. Start with a design system, not page layouts.
2. Keep technology invisible: the experience should feel handcrafted, not engineered.
3. Separate concerns clearly:
   - `design-system/` for tokens, primitives, typography, spacing, motion rules, and foundational components
   - `components/` for reusable UI pieces built from those primitives
   - `content/` for structured content, copy, and assets
   - `pages/` or `app/` only after the system is established
4. Favor semantic HTML and accessible structure.
5. Use a layered architecture:
   - Tokens -> Primitives -> Components -> Sections -> Pages
6. Embrace restraint: fewer, better elements; calm pace; precise spacing.

## Recommended project architecture

This site should be built as a component-driven, content-forward project. A recommended structure is:

- `src/`
  - `design-system/`
    - `tokens/`
      - `colors.ts|json`
      - `typography.ts|json`
      - `spacing.ts|json`
      - `motion.ts|json`
      - `layout.ts|json`
    - `primitives/`
      - `Text.tsx`
      - `Stack.tsx`
      - `Box.tsx`
      - `IconButton.tsx`
    - `components/`
      - `Button/`
      - `Card/`
      - `Link/`
      - `Section/`
  - `components/`
    - `SiteHeader/`
    - `SiteFooter/`
    - `Hero/`
    - `FeatureGrid/`
  - `lib/`
  - `content/`
  - `styles/`
- `public/`
- `package.json`
- `tsconfig.json`

### Implementation options

- If using a React-based stack: prefer a framework like Next.js with the app router or Astro with React/Vue support.
- If choosing a static site generator: maintain the same design-system-first folder structure and keep tokens in CSS variables or JSON.
- Keep the design system framework-agnostic where possible so it can later migrate without rewriting the visual language.

## Design token system

Design tokens should be the first implementation artifact. They should be stored in a single source of truth and exposed through both CSS custom properties and JS/TS values.

### Color tokens

Use a restrained palette built from material references: wax, paper, ink, bronze, candlelight.

- `background-base`: `#F3EFE7` (soft parchment)
- `surface-muted`: `#E4DED4` (aged paper)
- `surface`: `#D9D2C7` (warm stone)
- `ink`: `#1F1A16` (deep charcoal)
- `ink-muted`: `#4F473F` (soft graphite)
- `bronze`: `#9B7B5D` (aged metal)
- `candle`: `#B88A56` (warm flame)
- `seal`: `#6F3F34` (burnt umber)
- `ember`: `#8F2E1F` (reserved accent)
- `shadow`: `rgba(31, 26, 22, 0.12)`

Use the accent colors with great restraint. The site should feel monochromatic with warm highlights rather than saturated.

### Typography tokens

Use a serif-first typographic voice for craftsmanship and warmth, with a neutral sans-serif for interface text.

- `font-family-display`: `Cormorant Garamond, Georgia, 'Times New Roman', serif`
- `font-family-text`: `Crimson Pro, Georgia, 'Times New Roman', serif`
- `font-family-ui`: `Inter, 'Segoe UI', system-ui, sans-serif`
- `font-weight-regular`: `400`
- `font-weight-medium`: `500`
- `font-weight-semibold`: `600`
- `font-weight-bold`: `700`

Scale:
- `font-size-1`: `0.875rem` (14px)
- `font-size-2`: `1rem` (16px)
- `font-size-3`: `1.125rem` (18px)
- `font-size-4`: `1.375rem` (22px)
- `font-size-5`: `1.75rem` (28px)
- `font-size-6`: `2.25rem` (36px)
- `font-size-7`: `3rem` (48px)

Line-height and letter spacing should favor readability and elegance.

### Spacing tokens

Adopt an intentional scale using generous breathing room.

- `space-xxs`: `0.25rem`
- `space-xs`: `0.5rem`
- `space-sm`: `0.75rem`
- `space-md`: `1.25rem`
- `space-lg`: `1.75rem`
- `space-xl`: `2.5rem`
- `space-xxl`: `4rem`
- `space-3xl`: `6rem`

Use spacing as a compositional tool, not as decoration.

### Motion principles

Motion should be subtle, purposeful, and easy to reduce.

- Duration: `180ms` to `240ms`
- Easing: `cubic-bezier(0.22, 1, 0.36, 1)` or `ease-out`
- Interactions: fade, slight slide, soft scale for hover states
- Avoid: bouncy, swirling, or exaggerated movement
- Respect `prefers-reduced-motion`

### Elevation and borders

Use low-contrast shadows and refined strokes.

- `shadow-soft`: `0 12px 24px rgba(31, 26, 22, 0.08)`
- `border-light`: `1px solid rgba(31, 26, 22, 0.08)`
- `border-strong`: `1px solid rgba(31, 26, 22, 0.14)`

Prefer edges that feel like craftsmanship, not neon glass.

## Recommended fonts

The typographic system should communicate refined craftsmanship and timeless presence.

### Primary font for headings

- `Cormorant Garamond` — ideal for a signet-like, literary voice with elegant contrast and tasteful flourish.
- Alternative: `Crimson Pro` or `Tiempos Text` if a slightly more grounded serif is desired.

### Secondary font for body text

- `Crimson Pro` or `EB Garamond` — warm, readable, sophisticated.

### UI / system font

- `Inter` or `Source Sans 3` — neutral, unobtrusive, and modern enough to support labels, navigation, and small text.

### Practical font stack

- `font-family-display`: `Cormorant Garamond, Georgia, 'Times New Roman', serif`
- `font-family-text`: `Crimson Pro, Georgia, 'Times New Roman', serif`
- `font-family-ui`: `Inter, 'Segoe UI', system-ui, sans-serif`

## Visual language document

### Core emotional tone

- Quiet confidence
- Elegance
- Craftsmanship
- Warmth without sentimentality
- Mystery without confusion
- Luxury through restraint
- Timelessness

### Visual mood

The site should feel like a quietly lit workshop, not a polished software showroom.

- Material references: wax seals, handmade paper, leather, brass, carved wood, candlelight.
- Color story: charcoal, parchment, bronze, candle glow, soot blue, restrained umber.
- Texture: subtle surface suggestion, not overt pattern; think soft grain and paper fibers rather than digital noise.
- Light: warm, directional, and carefully controlled. Avoid high-contrast neon or chrome.

### Layout and composition

- Generous negative space.
- Centered or gently offset content blocks.
- Consistent margins and rhythm.
- Use grids with breathing room rather than crowded card layouts.

### Typography and hierarchy

- Strong, expressive headings.
- Clear, calm body copy.
- Distinct callouts and quotes that feel like handcrafted notes.
- Typographic hierarchy should guide the eye without overt embellishment.

### Interaction and animation

- Hover and focus states should be tonal or subtle scale changes.
- Transitions should feel like a gentle hand, not a flashy reveal.
- Micro-interactions should emphasize confidence and reassurance.

### Imagery and iconography

- Photography or illustration should focus on details of craft: tools, hands, materials, textured surfaces.
- Avoid abstract tech metaphors, glossy device mockups, or generic startup stock imagery.
- Icons should feel custom, restrained, and linear with refined terminals.

### Copy tone

- Calm and inviting
- Precise and understated
- Avoid hype, jargon, and overt sales language
- Focus on presence, craft, and the visitor’s experience

## Practical guidance for future development

1. Build the token system first and use it everywhere.
2. Keep components small, composable, and grounded in real content needs.
3. Use a single source of truth for spacing, color, typography, and motion.
4. Design for accessibility, readability, and calm navigation.
5. Avoid trends; favor materials, textures, and details that feel built to last.
6. Let the site feel like an invitation from a master craftsman, not a product pitch.

## Next step

Create the design-system foundation in code and define the first reusable primitives before constructing any page templates.
