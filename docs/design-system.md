# Taisa Design System

A living reference for all UI work on the Taisa mobile app. Update this doc whenever a new component is extracted or a token changes.

---

## Status

| Layer | Current state | Target state |
|---|---|---|
| Styling | `StyleSheet.create()` throughout | NativeWind (Tailwind CSS for React Native) |
| Components | Inline styles, no shared component library | Primitives in `mobile/src/components/ui/` |
| Tokens | `mobile/src/constants/theme.ts` (JS object) | Mapped into `tailwind.config.js` as named classes |
| Storybook | Not set up | Revisit after 3–4 screens are rebuilt |

**Before any screen is rebuilt:** the NativeWind setup (install, configure `tailwind.config.js`, wire babel plugin, map tokens) must be completed first. That is tracked as a separate task and is a prerequisite for all screen-level work.

---

## The Build Workflow

Every screen follows this design → build → extract loop:

```
1. Design a screen (in Figma or with Claude)
2. Build it inline with NativeWind classes
3. Extract reusable patterns into mobile/src/components/ui/
4. Update this doc with the new component
```

**Extraction rule:** if a UI pattern appears in two or more screens, it becomes a `ui/` component. Do not extract speculatively — wait for the second use.

---

## Color Tokens

All values are sourced from `mobile/src/constants/theme.ts`. These will be mapped 1-to-1 into `tailwind.config.js` so NativeWind classes like `bg-background` and `text-textPrimary` resolve to the correct hex values.

### Base Palette

| Token | Hex | When to use |
|---|---|---|
| `background` | `#0A0A0F` | Root screen background — the darkest layer |
| `surface` | `#13131A` | Cards, bottom sheets, modals |
| `surfaceElevated` | `#1C1C27` | Elevated cards, popovers, tooltips |
| `border` | `#2A2A38` | Standard dividers, card outlines |
| `borderSubtle` | `#1E1E2A` | Subtle separators, inset rules |

### Accent

| Token | Hex | When to use |
|---|---|---|
| `accent` | `#7C6FFF` | Primary actions: buttons, active tabs, links, focus rings |
| `accentMuted` | `#2D2B50` | Accent-tinted backgrounds (selected state, highlight rows) |
| `accentGlow` | `#7C6FFF30` | Glow/halo effects behind accent elements (30% opacity) |

### Semantic

| Token | Hex | Meaning |
|---|---|---|
| `positive` | `#4ADE80` | Wins, growth, success states |
| `positiveMuted` | `#1A3D2B` | Positive-tinted backgrounds |
| `warning` | `#FBBF24` | Stalling, caution, needs attention |
| `warningMuted` | `#3D3010` | Warning-tinted backgrounds |
| `error` | `#F87171` | Errors, destructive actions, blocking issues |
| `errorMuted` | `#3D1515` | Error-tinted backgrounds |
| `info` | `#60A5FA` | Decisions, informational states, neutral signals |

### Text

| Token | Hex | When to use |
|---|---|---|
| `textPrimary` | `#F0F0F8` | Headings, body copy, primary labels |
| `textSecondary` | `#8888A8` | Supporting text, metadata, subtitles |
| `textTertiary` | `#55556A` | Placeholder text, disabled labels, timestamps |
| `textAccent` | `#A89FFF` | Inline accent text, active nav labels, highlights |

### Momentum Signals

Used on the Trajectory screen and any momentum-aware UI elements.

| Token | Hex | Signal |
|---|---|---|
| `momentum.accelerating` | `#4ADE80` | Career momentum is accelerating |
| `momentum.steady` | `#60A5FA` | Career momentum is steady |
| `momentum.stalling` | `#FBBF24` | Career momentum is stalling |
| `momentum.recovering` | `#A78BFA` | Career momentum is recovering |

### Sentiment

Used on journal entries and coach notes to reflect emotional tone.

| Token | Hex | Sentiment |
|---|---|---|
| `sentiment.very_positive` | `#4ADE80` | Very positive |
| `sentiment.positive` | `#86EFAC` | Positive |
| `sentiment.neutral` | `#60A5FA` | Neutral |
| `sentiment.challenging` | `#FBBF24` | Challenging |
| `sentiment.difficult` | `#F87171` | Difficult |

---

## Spacing Scale

Sourced from `mobile/src/constants/theme.ts`. All values are in points (React Native dp).

| Token | Value | When to use |
|---|---|---|
| `xs` | 4 | Icon gaps, tight internal padding, badge insets |
| `sm` | 8 | Compact padding inside chips/tags, small gaps between inline elements |
| `md` | 16 | Default content padding, standard gap between list items |
| `lg` | 24 | Section spacing, card internal padding |
| `xl` | 32 | Large section gaps, screen-level vertical rhythm |
| `xxl` | 48 | Hero sections, major screen separations |

In NativeWind: map these as custom spacing values (e.g. `p-md`, `gap-lg`) in `tailwind.config.js` so the scale is enforced via classes rather than magic numbers.

---

## Border Radius Scale

Sourced from `mobile/src/constants/theme.ts`.

| Token | Value | When to use |
|---|---|---|
| `sm` | 8 | Chips, tags, small badges |
| `md` | 12 | Input fields, compact cards |
| `lg` | 16 | Standard cards, bottom sheets |
| `xl` | 24 | Large modals, prominent cards |
| `full` | 9999 | Pills, avatars, fully rounded buttons |

---

## Typography

Sourced from `mobile/src/constants/theme.ts`. To be expanded as screens are built — line heights, letter spacing, and named text styles (e.g. `heading1`, `bodyLarge`) will be added here once patterns emerge from screen work.

### Font Size

| Token | Value (pt) | Suggested use |
|---|---|---|
| `xs` | 11 | Captions, fine print, timestamps |
| `sm` | 13 | Secondary labels, metadata |
| `base` | 15 | Body copy |
| `md` | 17 | Emphasized body, primary labels |
| `lg` | 20 | Section headings |
| `xl` | 24 | Screen subheadings |
| `xxl` | 30 | Screen headings |
| `display` | 38 | Hero / display text |

### Font Weight

| Token | Value | When to use |
|---|---|---|
| `regular` | `400` | Body copy, secondary labels |
| `medium` | `500` | Emphasized labels, metadata |
| `semibold` | `600` | Headings, button labels |
| `bold` | `700` | Display text, strong emphasis |

---

## Component Structure

Target directory layout for `mobile/src/components/`. No components have been extracted yet — this is the structure to build toward.

```
mobile/src/components/
  ui/           Primitives — reusable across any screen
                Button, Card, Input, Text, Badge, Tag

  layout/       Structural wrappers
                Screen, Stack, Row, Divider, Section

  features/     Domain-specific, tied to Taisa concepts
                EntryCard, GoalTag, CoachNote, ModeChip
```

**`ui/`** — no business logic, no data fetching. Pure presentational primitives that accept props and render.

**`layout/`** — structural shells. `Screen` wraps every screen with safe area and background. `Stack`/`Row` are directional flex containers with spacing props. `Section` wraps a titled block of content.

**`features/`** — components that know about Taisa's domain model (journal entries, goals, momentum). They may receive typed domain objects as props but do not fetch data themselves.

---

## Rules for Writing New Components

All new components must follow these five rules so that Claude and human developers produce consistent output.

**1. NativeWind classes only — no `StyleSheet.create()`**

New components use Tailwind classes via NativeWind. `StyleSheet.create()` is only acceptable in legacy screens that have not yet been migrated.

```tsx
// Good
<View className="bg-surface rounded-lg p-md" />

// Bad
<View style={styles.card} />
```

**2. Use token names, not raw hex values**

Classes reference token names mapped in `tailwind.config.js`. Never hard-code a hex value inside a component.

```tsx
// Good
<Text className="text-textPrimary" />

// Bad
<Text style={{ color: '#F0F0F8' }} />
```

Token-to-class mapping examples: `bg-background`, `bg-surface`, `bg-surfaceElevated`, `text-textPrimary`, `text-textSecondary`, `text-accent`, `border-border`, `bg-accent`, `bg-accentMuted`.

**3. Props over internal variant logic**

Expose explicit props instead of burying variant switching inside the component. This makes usage readable and makes Claude-generated call sites predictable.

```tsx
// Good
<Button size="sm" variant="primary" />

// Bad — internal magic based on context
<Button />  // "it just knows" which size to be
```

**4. One component per file**

Each file exports exactly one component. The file name matches the component name (`Button.tsx` exports `Button`).

**5. TypeScript always**

Every component has a typed props interface defined in the same file. No `any`. Prop names are explicit and documented with a JSDoc comment when the purpose is not obvious.

```tsx
interface ButtonProps {
  /** Visual hierarchy level */
  variant: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  label: string;
  onPress: () => void;
  disabled?: boolean;
}
```

---

## Storybook

Not set up. Revisit after 3–4 screens have been rebuilt using NativeWind. At that point there will be enough components to make a component browser worthwhile, and the component API surface will have stabilized enough to write stories without churn.
