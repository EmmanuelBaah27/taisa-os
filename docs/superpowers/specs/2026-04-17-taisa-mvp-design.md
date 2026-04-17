# Taisa MVP Design Spec

**Date:** 2026-04-17
**Status:** Approved
**Author:** Baah + Claude
**Topic:** MVP scope, navigation, flows, and chat architecture

---

## Context

The Taisa codebase has a working backend loop: voice → Whisper transcription → Claude one-shot analysis → SQLite storage. The mobile app has screens for onboarding, recording, a home/stats view, trajectory, and entry detail. All of this works but does not yet feel like the product.

What's missing is the experience layer: a clean navigation structure, the conversational AI interface, and a UI rebuilt in NativeWind throughout. This spec defines the MVP — the minimum version of Taisa worth using daily.

---

## What the MVP Is

> Record your day or start a conversation. See your analysis. Continue the conversation from it. Clean NativeWind UI throughout.

---

## Goals

1. Make the daily log → analysis loop feel polished and intentional
2. Add a conversational AI surface that works from two entry points: general (Chat tab) and contextual (entry detail)
3. Rebuild every screen in NativeWind with a consistent visual language
4. Keep scope tight — no modes, no session summaries, no CV archive

---

## Navigation Structure

Three tabs + a persistent floating action button (FAB). Every screen is rebuilt in NativeWind.

```
Tab 1: Logs
  └── Entry detail (analysis + chat below)

Tab 2: Chat
  └── Active session (voice or text)

Tab 3: Profile
  └── Onboarding data + stats section

Persistent FAB (visible on all tabs)
  └── Recording overlay → Result screen (auto-opens)
```

The recording flow is a modal/overlay that sits above the tabs — not a dedicated tab.

---

## Screen Inventory

| Screen | Current state | MVP work |
|---|---|---|
| Logs tab | Exists as Home (stats card + recent entries) | Redesign in NativeWind — remove stats card, show entry list with previews |
| Entry detail | Exists (read-only analysis) | Redesign in NativeWind + add chat interface below analysis |
| Result screen | Exists (partial) | Redesign in NativeWind + shimmer loading state during processing |
| Recording overlay | Exists as Record tab | Convert to FAB-triggered overlay/modal |
| Chat tab | Does not exist | Build from scratch |
| Profile tab | Exists | Rebuild in NativeWind + add small stats section |
| Onboarding | Exists (3-step) | Rebuild in NativeWind |

---

## Core Flows

### Flow 1 — Daily log

```
Tap FAB (from any tab)
  → Recording overlay opens
  → User speaks, taps stop
  → Result screen auto-opens with shimmer loading state
  → Analysis renders: wins, challenges, coach note, action items
  → User dismisses → returns to the tab they were on
```

The result screen captures all processing states: `draft → processing → complete → error`. The shimmer is shown during `processing`. Error state shows a retry option.

### Flow 2 — Entry → follow-up chat

```
Logs tab → tap any entry
  → Entry detail opens
  → Top section: full analysis (summary, wins, challenges, coach note, action items)
  → Bottom section: chat input (new)
  → Entry's full analysis is silently injected as context on session start
  → User asks follow-up questions, AI responds conversationally
```

This is the primary contextual chat experience — the Perplexity-like "read then ask" pattern. The analysis is always visible above the conversation.

### Flow 3 — General chat

```
Chat tab
  → Session starts automatically on first message
  → User sends voice or text
  → AI responds conversationally
  → No specific entry attached — fresh context
  → Session ends when user navigates away
```

No explicit "start session" or "end session" button in MVP. Session management is automatic.

---

## Chat Architecture

### The unified model

One chat system handles both entry-contextual chat and general chat. The `chat_sessions` table has a nullable `entry_id`. When set, the entry's full analysis is injected into the system prompt. When null, the session is fresh.

This avoids duplicate agents, duplicate routes, and duplicate UI logic.

### New DB tables

```sql
CREATE TABLE chat_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  entry_id TEXT REFERENCES journal_entries(id),  -- nullable
  started_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active'           -- active / ended
);

CREATE TABLE chat_messages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES chat_sessions(id),
  role TEXT NOT NULL,       -- 'user' / 'assistant'
  content TEXT NOT NULL,
  created_at TEXT NOT NULL
);
```

### New backend routes

```
POST /api/v1/chat/session/start
  body: { entryId?: string }
  returns: { sessionId: string }

POST /api/v1/chat/message
  body: { sessionId: string, message: string }
  returns: { reply: string }

GET /api/v1/chat/session/:sessionId/messages
  returns: { messages: ChatMessage[] }
```

### New backend files

```
backend/src/routes/chat.ts
backend/src/services/claude/chatAgent.ts
backend/src/prompts/system/chatProcessor.ts
```

### How the chat agent differs from the journal agent

The current `callClaudeJson` function is single-turn only (one user message → one response). Chat requires multi-turn — the full conversation history is passed to Claude each time as an alternating `messages` array. The chat agent calls the Anthropic SDK directly:

```typescript
const response = await anthropic.messages.create({
  model: 'claude-sonnet-4-6',
  system: buildChatProcessorSystem(profile, goals, recentThemes, entryAnalysis),
  messages: [
    ...previousMessages.map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: newMessage }
  ],
  max_tokens: 1024
});
```

### Context injected every message

| Source | When injected |
|---|---|
| User profile (role, goals, coaching style) | Always |
| Active goals | Always |
| Recent entry themes (last 14 days) | Always |
| Entry full analysis | Only when `entry_id` is set on the session |
| Full message history for this session | Always |

### Voice in chat

Same Whisper transcription flow as the daily log recording. User speaks → audio sent to `/api/v1/transcribe` → transcript returned → sent as a chat message. The voice UI in chat will be designed separately and can evolve independently.

---

## What's In the MVP

- 3-tab nav (Logs, Chat, Profile) + persistent FAB
- All 6 screens rebuilt in NativeWind
- Recording overlay → shimmer result screen → full analysis
- Logs tab with entry previews
- Entry detail with full analysis + chat below
- Chat tab with voice and text input
- Profile tab with onboarding data + small stats section
- Backend: 3 chat routes, `chatAgent.ts`, `chatProcessor.ts`, 2 new DB tables

---

## Deferred — Not In MVP

These are real features with real product value. They are deferred, not dropped. Each will have its own spec → plan → build cycle.

### Four interaction modes (Mirror / Nudge / Challenge / Direct)

The agent currently responds as a general conversational coach. The four-mode system — where the agent selects Mirror, Nudge, Challenge, or Direct based on what the input calls for — is fully designed in `docs/agent-persona.md` Part 1 and Part 3 Step 1. Build after chat is stable.

### Session summary

Auto-generated when a session ends. Extracts key moments, insights surfaced, open threads, CV-worthy moments. Requires a session end trigger and a summary prompt. Spec is in `docs/agent-persona.md` Part 3 Step 4.

### Persistent memory layer

Goals, patterns, and open threads stored as first-class context and injected at every session start. Requires `ALTER TABLE users` to add `stated_patterns` and `open_threads` JSON columns. Spec is in `docs/agent-persona.md` Part 3 Step 5.

### Prior session context as narrative

Loading the last 5 coach notes and surfacing them as narrative in the system prompt. Enables "this is the third time you've mentioned this." Spec is in `docs/agent-persona.md` Part 3 Step 2.

### CV Archive

CV Moment as a first-class entity. Dedicated screen. Copy-to-clipboard for polished bullets. Requires a new `cv_moments` table and surface.

### Trajectory tab

Career arc snapshot. Currently exists but is removed from MVP nav. Reinstate once core loop is stable.

### Notification preferences UI

Notification times are currently hard-coded at 15:00 and 19:00. User preference UI deferred.

### Real tab icons

Lucide icons to replace the placeholder geometric shapes in `(tabs)/_layout.tsx`.

### Offline support

All stores currently call the API directly. No local caching or queue. Deferred.

### Settings / edit profile screen

Profile is currently read-only after onboarding. Full edit screen deferred.

---

## Build Order

This MVP has two largely independent tracks that can be sequenced or parallelised:

**Track A — UI rebuild (design-first)**
Each screen is designed in Figma first, then rebuilt in NativeWind. Order:
1. Design system tokens (already in `tailwind.config.js`) → confirm with one real screen
2. Logs tab
3. Entry detail (analysis view only, no chat yet)
4. Result screen + shimmer
5. Recording overlay → FAB
6. Profile tab
7. Chat tab (once backend is ready)
8. Onboarding

**Track B — Chat backend**
1. DB migration: `chat_sessions` + `chat_messages`
2. `chatProcessor.ts` prompt builder
3. `chatAgent.ts` multi-turn agent
4. Routes: `chat.ts` (3 endpoints)
5. Mount in `backend/src/index.ts`
6. Wire entry detail chat input to backend
7. Wire Chat tab to backend

Track B does not depend on Track A. The chat backend can be built and tested via API before any UI exists.
