# V1 Status — What's Built vs. What's Spec'd

> Read this before planning what to build next. Updated as features ship.
> Last updated: 2026-04-15

---

## What's Fully Wired and Working

The core loop is functional end-to-end:

| Feature | Status | Notes |
|---|---|---|
| Onboarding (3-step) | ✅ Built | Role, goals, coaching prefs → stored in `users` table |
| Voice recording | ✅ Built | `expo-av`, high quality, haptic feedback |
| Transcription | ✅ Built | OpenAI Whisper via `/api/v1/transcribe` |
| Journal entry creation | ✅ Built | POST `/api/v1/entries`, status: draft → processing → complete |
| Claude analysis | ✅ Built | `journalAgent.ts` → `journalProcessor.ts` prompt → structured JSON |
| Action item extraction | ✅ Built | Denormalised to `action_items` table, status tracking |
| Goal management | ✅ Built | Manual + AI-suggested goals, milestones, progress % |
| Trajectory snapshots | ✅ Built | POST `/api/v1/trajectory/generate`, requires 3+ entries |
| Performance review upload | ✅ Built | Text input → Claude extracts feedback + suggests goals |
| Daily notifications | ✅ Built | Personalized message from Claude, scheduled via Expo Notifications |
| Data export | ✅ Built | Share journal as JSON via native Share API |

---

## What Diverged From the Product Spec and Why

The product docs (artifacts #001–#005) describe a slightly different product than what was built. Neither is wrong — the build made pragmatic V1 decisions.

| Spec (artifacts #001–#005) | Reality (codebase) | Reason |
|---|---|---|
| Chat interface ("Conversation" surface) | One-shot voice analysis — no back-and-forth | Simpler first; chat is the next major build |
| CV Archive surface (artifact #004) | Action items list (partial approximation) | CV Moment not a first-class entity yet |
| Four-mode agent: Mirror / Nudge / Challenge / Direct | Single coaching analysis mode | Modes require chat + session memory; not yet implemented |
| Three memory layers: Immediate / Recent / Persistent | Single SQLite file, no layer distinction | V1 simplification from memory-model-003 |
| "Today View" (today's captures + open threads) | "Home" tab (stats card + recent entries) | Different framing, same intent |
| Bottom nav: Today / Capture / Chat / Archive / Goals | Home / Record / Trajectory / Profile | Built before IA (artifact #005) was finalised |
| Open Thread as first-class entity | `action_items` with `open` status | Approximated — good enough for V1 |

---

## Known Gaps (Not Divergence — Genuinely Missing)

These were never built, not re-scoped:

- **No auth** — uses `deviceId` as `userId` via `x-user-id` header. Single user only. No login/logout.
- **No settings / edit profile screen** — profile is read-only after onboarding. Updates only via API.
- **No search or filter** — entries, goals, and action items cannot be filtered by date, theme, or status in the UI.
- **Tab icons are placeholders** — geometric shapes (○ ● △ □) in `(tabs)/_layout.tsx`. No real icons installed.
- **Notification times hard-coded** — 15:00 and 19:00 in `notifications.ts`. No user preference UI.
- **No offline support** — all stores call the API directly; no local caching or queue.
- **No milestone detail UI** — milestones exist in the DB and API but are not browsable in the app.

---

## What to Build Next (Priority Order)

1. **Chat interface + four-mode agent** — the core product value described in the spec. Currently missing entirely. Requires new backend routes and a new mobile screen.
2. **Persistent memory layer** — goals, patterns, and open threads as properly structured context injected at session start. Required for the four modes to work well.
3. **Session summary** — auto-generated after closing a chat session. Closes the loop.
4. **CV Archive as a first-class surface** — CV Moment entity, dedicated screen, copy-to-clipboard.
5. **Settings / edit profile** — basic UX hygiene. Needed before sharing with anyone else.
6. **Real tab icons** — install `lucide-react-native`, replace placeholders in `(tabs)/_layout.tsx`.
7. **NativeWind migration** — prerequisite for UI rebuild. Must be set up before redesigning any screen. Involves installing NativeWind, migrating `theme.ts` tokens to `tailwind.config.js`, and updating existing screens.
