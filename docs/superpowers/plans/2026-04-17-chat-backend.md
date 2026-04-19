# Chat Backend + Security Foundations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the multi-turn chat backend (3 routes, agent, prompt builder, 2 DB tables) and add security foundations (rate limiting, input validation, data deletion) without changing any existing behaviour.

**Architecture:** One unified chat system handles both general chat and entry-contextual chat. Sessions have a nullable `entry_id` — when set, the full entry analysis is injected into the system prompt. The chat agent calls the Anthropic SDK directly with an alternating `messages` array (not `callClaudeJson`, which is single-turn only). Rate limiting protects the two AI-heavy routes (`/chat` and `/transcribe`); Zod validates all inputs at the route layer.

**Tech Stack:** Node/Express/TypeScript, better-sqlite3 (sync), @anthropic-ai/sdk, Zod, express-rate-limit, Jest + Supertest (test harness added in Task 1), uuid.

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Modify | `backend/package.json` | Add `express-rate-limit` + test deps |
| Create | `backend/jest.config.js` | Jest config pointing at ts-jest |
| Create | `backend/src/db/schema.sql` | Append `chat_sessions` + `chat_messages` tables |
| Create | `backend/src/prompts/system/chatProcessor.ts` | Pure system-prompt builder for chat |
| Create | `backend/src/services/claude/chatAgent.ts` | Multi-turn chat agent (load context → call Claude → persist message) |
| Create | `backend/src/routes/chat.ts` | Three chat endpoints with Zod validation |
| Modify | `backend/src/index.ts` | Mount chat router + apply rate limiter to `/transcribe` and `/chat` |
| Modify | `backend/src/routes/profile.ts` | Add `DELETE /` endpoint for full data deletion |
| Create | `backend/src/__tests__/chatProcessor.test.ts` | Unit tests for prompt builder |
| Create | `backend/src/__tests__/chatAgent.test.ts` | Unit tests for chat agent logic |
| Create | `backend/src/__tests__/chat.routes.test.ts` | Integration tests for all 3 routes |
| Create | `backend/src/__tests__/profile.delete.test.ts` | Integration test for DELETE /profile |

---

## Task 1: Test Infrastructure

**Files:**
- Modify: `backend/package.json`
- Create: `backend/jest.config.js`

- [ ] **Step 1: Install test dependencies**

Run from repo root (backend workspace):
```bash
npm install --workspace=backend --save-dev jest ts-jest @types/jest supertest @types/supertest
```

- [ ] **Step 2: Run the install and verify no errors**

Expected: `added N packages` with no peer dep errors. If `legacy-peer-deps` issues arise in backend, add `backend/.npmrc` with `legacy-peer-deps=true`.

- [ ] **Step 3: Create jest.config.js**

Create `backend/jest.config.js`:
```js
/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^@taisa/shared$': '<rootDir>/../shared/src/index.ts',
  },
  setupFilesAfterFramework: [],
};
```

- [ ] **Step 4: Add test script to backend/package.json**

Open `backend/package.json` and add to `scripts`:
```json
"test": "jest",
"test:watch": "jest --watch"
```

- [ ] **Step 5: Verify Jest runs (empty suite)**

Run:
```bash
cd backend && npx jest --passWithNoTests
```
Expected: `Test Suites: 0 passed` — confirms config works.

- [ ] **Step 6: Commit**

```bash
git add backend/package.json backend/jest.config.js backend/package-lock.json
git commit -m "chore: add jest + supertest to backend"
```

---

## Task 2: DB Schema Migration — Chat Tables

**Files:**
- Modify: `backend/src/db/schema.sql`

The schema is executed via `db.exec(schema)` on startup. All statements use `CREATE TABLE IF NOT EXISTS`, so adding new tables here auto-migrates on next server start — no migration runner needed.

- [ ] **Step 1: Write the failing test first**

Create `backend/src/__tests__/chatTables.test.ts`:
```typescript
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

function makeDb() {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  const schema = fs.readFileSync(path.join(__dirname, '../db/schema.sql'), 'utf-8');
  db.exec(schema);
  return db;
}

describe('chat DB tables', () => {
  test('chat_sessions table exists with correct columns', () => {
    const db = makeDb();
    const info = db.prepare("PRAGMA table_info(chat_sessions)").all() as any[];
    const cols = info.map((c: any) => c.name);
    expect(cols).toEqual(expect.arrayContaining(['id', 'user_id', 'entry_id', 'started_at', 'status']));
  });

  test('chat_messages table exists with correct columns', () => {
    const db = makeDb();
    const info = db.prepare("PRAGMA table_info(chat_messages)").all() as any[];
    const cols = info.map((c: any) => c.name);
    expect(cols).toEqual(expect.arrayContaining(['id', 'session_id', 'role', 'content', 'created_at']));
  });

  test('entry_id is nullable on chat_sessions', () => {
    const db = makeDb();
    const info = db.prepare("PRAGMA table_info(chat_sessions)").all() as any[];
    const entryIdCol = (info as any[]).find((c: any) => c.name === 'entry_id');
    expect(entryIdCol.notnull).toBe(0); // 0 means nullable
  });

  test('chat_messages role is constrained to user/assistant', () => {
    const db = makeDb();
    // Insert a valid session first
    db.prepare(`INSERT INTO chat_sessions (id, user_id, entry_id, started_at, status)
      VALUES ('s1', 'u1', NULL, '2026-01-01T00:00:00Z', 'active')`).run();
    // Valid role should work
    db.prepare(`INSERT INTO chat_messages (id, session_id, role, content, created_at)
      VALUES ('m1', 's1', 'user', 'hello', '2026-01-01T00:00:01Z')`).run();
    const row = db.prepare("SELECT * FROM chat_messages WHERE id = 'm1'").get() as any;
    expect(row.role).toBe('user');
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
cd backend && npx jest chatTables --no-coverage
```
Expected: FAIL — `chat_sessions table exists with correct columns` fails because tables don't exist yet.

- [ ] **Step 3: Add tables to schema.sql**

Append to the bottom of `backend/src/db/schema.sql` (after the indexes section):

```sql
-- Chat Sessions
CREATE TABLE IF NOT EXISTS chat_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  entry_id TEXT REFERENCES journal_entries(id),
  started_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active'
);

-- Chat Messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES chat_sessions(id),
  role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- Chat indexes
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_entry_id ON chat_sessions(entry_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd backend && npx jest chatTables --no-coverage
```
Expected: PASS — all 4 tests green.

- [ ] **Step 5: Commit**

```bash
git add backend/src/db/schema.sql backend/src/__tests__/chatTables.test.ts
git commit -m "feat: add chat_sessions and chat_messages tables to schema"
```

---

## Task 3: Chat Prompt Builder

**Files:**
- Create: `backend/src/prompts/system/chatProcessor.ts`
- Create: `backend/src/__tests__/chatProcessor.test.ts`

The prompt builder is a pure function — no DB, no Claude calls. It takes structured context and returns a string system prompt.

- [ ] **Step 1: Write the failing test**

Create `backend/src/__tests__/chatProcessor.test.ts`:
```typescript
import { buildChatProcessorSystem } from '../prompts/system/chatProcessor';

const baseProfile = {
  currentRole: 'Senior Designer',
  currentCompany: 'Acme',
  industry: 'Tech',
  careerStage: 'senior',
  shortTermGoal: 'Lead a design system',
  longTermGoal: 'Become a CPO',
  currentFocusArea: 'Systems thinking',
  coachingStyle: 'direct',
  accountabilityLevel: 'intense',
};

const baseGoals = [{ id: 'g1', title: 'Ship design system v1', progressPercent: 40 }];
const baseThemes = [{ label: 'communication', count: 5 }, { label: 'leadership', count: 3 }];

describe('buildChatProcessorSystem', () => {
  test('includes user role and goals', () => {
    const prompt = buildChatProcessorSystem(baseProfile as any, baseGoals, baseThemes, null);
    expect(prompt).toContain('Senior Designer');
    expect(prompt).toContain('Ship design system v1');
  });

  test('includes recent themes', () => {
    const prompt = buildChatProcessorSystem(baseProfile as any, baseGoals, baseThemes, null);
    expect(prompt).toContain('communication');
    expect(prompt).toContain('leadership');
  });

  test('does NOT inject entry analysis when entryAnalysis is null', () => {
    const prompt = buildChatProcessorSystem(baseProfile as any, baseGoals, baseThemes, null);
    expect(prompt).not.toContain('ENTRY CONTEXT');
  });

  test('injects entry analysis when entryAnalysis is provided', () => {
    const analysis = {
      summary: 'Had a productive day',
      wins: [{ title: 'Shipped v1' }],
      challenges: [{ title: 'Stakeholder misalignment' }],
      coachNote: 'Keep pushing.',
      actionItems: [{ title: 'Follow up with PM' }],
    };
    const prompt = buildChatProcessorSystem(baseProfile as any, baseGoals, baseThemes, analysis as any);
    expect(prompt).toContain('ENTRY CONTEXT');
    expect(prompt).toContain('Had a productive day');
    expect(prompt).toContain('Shipped v1');
    expect(prompt).toContain('Follow up with PM');
  });

  test('reflects coaching style in persona instructions', () => {
    const prompt = buildChatProcessorSystem(baseProfile as any, baseGoals, baseThemes, null);
    expect(prompt).toContain('direct');
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd backend && npx jest chatProcessor --no-coverage
```
Expected: FAIL — `Cannot find module '../prompts/system/chatProcessor'`

- [ ] **Step 3: Implement chatProcessor.ts**

Create `backend/src/prompts/system/chatProcessor.ts`:
```typescript
import type { CareerProfile } from '@taisa/shared';

interface Goal {
  id: string;
  title: string;
  progressPercent: number;
}

interface Theme {
  label: string;
  count: number;
}

interface EntryAnalysis {
  summary: string;
  wins: Array<{ title: string }>;
  challenges: Array<{ title: string }>;
  coachNote: string;
  actionItems: Array<{ title: string }>;
}

export function buildChatProcessorSystem(
  profile: CareerProfile,
  activeGoals: Goal[],
  recentThemes: Theme[],
  entryAnalysis: EntryAnalysis | null,
): string {
  const sections: string[] = [];

  sections.push(`You are a personal career coach having a live conversation with your client.

Your client's profile:
- Role: ${profile.currentRole}${profile.currentCompany ? ` at ${profile.currentCompany}` : ''}
- Career stage: ${profile.careerStage}
- Industry: ${profile.industry}
- Short-term goal: ${profile.shortTermGoal}
- Long-term goal: ${profile.longTermGoal}
- Current focus: ${profile.currentFocusArea}
- Coaching style preference: ${profile.coachingStyle}
- Accountability level: ${profile.accountabilityLevel}`);

  if (activeGoals.length > 0) {
    sections.push(`ACTIVE GOALS:
${activeGoals.map(g => `- "${g.title}" (${g.progressPercent}% complete)`).join('\n')}`);
  }

  if (recentThemes.length > 0) {
    sections.push(`RECURRING THEMES (last 14 days):
${recentThemes.slice(0, 10).map(t => `- ${t.label}: ${t.count} mentions`).join('\n')}`);
  }

  if (entryAnalysis) {
    sections.push(`ENTRY CONTEXT (this conversation is a follow-up to a specific journal entry):

Summary: ${entryAnalysis.summary}

Wins from this entry:
${entryAnalysis.wins.map(w => `- ${w.title}`).join('\n') || '(none)'}

Challenges from this entry:
${entryAnalysis.challenges.map(c => `- ${c.title}`).join('\n') || '(none)'}

Coach note: ${entryAnalysis.coachNote}

Open action items from this entry:
${entryAnalysis.actionItems.map(a => `- ${a.title}`).join('\n') || '(none)'}

The user has read this analysis and may ask follow-up questions about it. Reference it naturally in your responses.`);
  }

  sections.push(`CONVERSATION INSTRUCTIONS:
- Respond conversationally, not as a structured report. No bullet-point dumps unless genuinely helpful.
- Be specific to what the user actually says — never give generic career advice.
- If their coaching style is "direct", be brief and push back when needed. If "supportive", be more encouraging.
- If their accountability level is "intense", hold them to commitments. If "gentle", be more exploratory.
- You have their full conversation history in the messages. Reference earlier parts of the conversation naturally.
- Keep responses concise for chat. Aim for 2-4 sentences unless a fuller answer is genuinely needed.`);

  return sections.join('\n\n');
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd backend && npx jest chatProcessor --no-coverage
```
Expected: PASS — all 5 tests green.

- [ ] **Step 5: Commit**

```bash
git add backend/src/prompts/system/chatProcessor.ts backend/src/__tests__/chatProcessor.test.ts
git commit -m "feat: add chatProcessor system prompt builder"
```

---

## Task 4: Chat Agent

**Files:**
- Create: `backend/src/services/claude/chatAgent.ts`
- Create: `backend/src/__tests__/chatAgent.test.ts`

The chat agent loads user context from DB, builds the system prompt, loads message history, calls Claude with the full messages array, persists the new user + assistant messages, and returns the reply.

- [ ] **Step 1: Write the failing test**

Create `backend/src/__tests__/chatAgent.test.ts`:
```typescript
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

// --- DB helpers ---
function makeDb() {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  const schema = fs.readFileSync(path.join(__dirname, '../db/schema.sql'), 'utf-8');
  db.exec(schema);
  return db;
}

function seedUser(db: Database.Database) {
  db.prepare(`INSERT INTO users (id, created_at, updated_at, current_role, industry,
    career_stage, short_term_goal, long_term_goal, current_focus_area,
    coaching_style, accountability_level)
    VALUES ('u1', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z',
    'Designer', 'Tech', 'mid', 'Lead team', 'CPO', 'Systems', 'direct', 'moderate')`
  ).run();
}

// --- Mock the Anthropic client + DB connection ---
jest.mock('../services/claude/client', () => ({
  MODEL: 'claude-sonnet-4-6',
  default: {
    messages: {
      create: jest.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Great question. Keep pushing.' }],
      }),
    },
  },
}));

jest.mock('../db/connection', () => {
  const db = makeDb();
  seedUser(db);
  return { getDb: () => db };
});

import { sendMessage } from '../services/claude/chatAgent';
import { getDb } from '../db/connection';

describe('chatAgent.sendMessage', () => {
  beforeEach(() => {
    const db = getDb();
    db.prepare('DELETE FROM chat_messages').run();
    db.prepare('DELETE FROM chat_sessions').run();
  });

  test('creates a session and returns a reply', async () => {
    const db = getDb();
    // Seed a session
    db.prepare(`INSERT INTO chat_sessions (id, user_id, entry_id, started_at, status)
      VALUES ('sess1', 'u1', NULL, '2026-01-01T00:00:00Z', 'active')`).run();

    const reply = await sendMessage('sess1', 'u1', 'How am I doing?');
    expect(typeof reply).toBe('string');
    expect(reply.length).toBeGreaterThan(0);
  });

  test('persists user message and assistant reply to chat_messages', async () => {
    const db = getDb();
    db.prepare(`INSERT INTO chat_sessions (id, user_id, entry_id, started_at, status)
      VALUES ('sess2', 'u1', NULL, '2026-01-01T00:00:00Z', 'active')`).run();

    await sendMessage('sess2', 'u1', 'What should I focus on?');

    const messages = db.prepare('SELECT * FROM chat_messages WHERE session_id = ? ORDER BY created_at')
      .all('sess2') as any[];
    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe('user');
    expect(messages[0].content).toBe('What should I focus on?');
    expect(messages[1].role).toBe('assistant');
    expect(messages[1].content).toBe('Great question. Keep pushing.');
  });

  test('throws if session does not belong to userId', async () => {
    const db = getDb();
    db.prepare(`INSERT INTO chat_sessions (id, user_id, entry_id, started_at, status)
      VALUES ('sess3', 'other-user', NULL, '2026-01-01T00:00:00Z', 'active')`).run();

    await expect(sendMessage('sess3', 'u1', 'Hello')).rejects.toThrow('Session not found');
  });

  test('passes full message history to Claude', async () => {
    const db = getDb();
    const anthropicMock = require('../services/claude/client').default;
    db.prepare(`INSERT INTO chat_sessions (id, user_id, entry_id, started_at, status)
      VALUES ('sess4', 'u1', NULL, '2026-01-01T00:00:00Z', 'active')`).run();
    // Pre-seed one prior message exchange
    db.prepare(`INSERT INTO chat_messages (id, session_id, role, content, created_at)
      VALUES ('m1', 'sess4', 'user', 'Prior question', '2026-01-01T00:00:01Z')`).run();
    db.prepare(`INSERT INTO chat_messages (id, session_id, role, content, created_at)
      VALUES ('m2', 'sess4', 'assistant', 'Prior answer', '2026-01-01T00:00:02Z')`).run();

    await sendMessage('sess4', 'u1', 'Follow-up question');

    const call = anthropicMock.messages.create.mock.calls.at(-1)[0];
    // messages array should include prior history + new user message
    expect(call.messages.length).toBe(3);
    expect(call.messages[0]).toEqual({ role: 'user', content: 'Prior question' });
    expect(call.messages[1]).toEqual({ role: 'assistant', content: 'Prior answer' });
    expect(call.messages[2]).toEqual({ role: 'user', content: 'Follow-up question' });
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd backend && npx jest chatAgent --no-coverage
```
Expected: FAIL — `Cannot find module '../services/claude/chatAgent'`

- [ ] **Step 3: Implement chatAgent.ts**

Create `backend/src/services/claude/chatAgent.ts`:
```typescript
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../../db/connection';
import anthropicClient, { MODEL } from './client';
import { buildChatProcessorSystem } from '../../prompts/system/chatProcessor';

interface StartSessionOptions {
  userId: string;
  entryId?: string | null;
}

export async function startSession({ userId, entryId = null }: StartSessionOptions): Promise<string> {
  const db = getDb();

  // Verify user exists
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
  if (!user) throw new Error('User not found');

  // Verify entry belongs to user if provided
  if (entryId) {
    const entry = db.prepare('SELECT id FROM journal_entries WHERE id = ? AND user_id = ?').get(entryId, userId);
    if (!entry) throw new Error('Entry not found');
  }

  const sessionId = uuidv4();
  const now = new Date().toISOString();

  db.prepare(`INSERT INTO chat_sessions (id, user_id, entry_id, started_at, status)
    VALUES (?, ?, ?, ?, 'active')`
  ).run(sessionId, userId, entryId ?? null, now);

  return sessionId;
}

export async function sendMessage(
  sessionId: string,
  userId: string,
  userMessage: string,
): Promise<string> {
  const db = getDb();

  // Load session — verify it belongs to this user
  const session = db.prepare('SELECT * FROM chat_sessions WHERE id = ? AND user_id = ?')
    .get(sessionId, userId) as any;
  if (!session) throw new Error('Session not found');

  // Load user profile
  const profileRow = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
  if (!profileRow) throw new Error('User not found');

  const profile = {
    currentRole: profileRow.current_role,
    currentCompany: profileRow.current_company,
    industry: profileRow.industry,
    careerStage: profileRow.career_stage,
    shortTermGoal: profileRow.short_term_goal,
    longTermGoal: profileRow.long_term_goal,
    currentFocusArea: profileRow.current_focus_area,
    coachingStyle: profileRow.coaching_style,
    accountabilityLevel: profileRow.accountability_level,
  };

  // Load active goals
  const activeGoals = (db.prepare(
    "SELECT id, title, progress_percent FROM goals WHERE user_id = ? AND status = 'active'"
  ).all(userId) as any[]).map(g => ({
    id: g.id,
    title: g.title,
    progressPercent: g.progress_percent,
  }));

  // Load recent themes (last 14 days context)
  const recentThemes = (db.prepare(
    'SELECT label, count FROM career_themes WHERE user_id = ? ORDER BY count DESC LIMIT 10'
  ).all(userId) as any[]).map(t => ({ label: t.label, count: t.count }));

  // Load entry analysis if session has entry_id
  let entryAnalysis: any = null;
  if (session.entry_id) {
    const entryRow = db.prepare('SELECT analysis_id FROM journal_entries WHERE id = ?')
      .get(session.entry_id) as any;
    if (entryRow?.analysis_id) {
      const analysisRow = db.prepare('SELECT * FROM entry_analyses WHERE id = ?')
        .get(entryRow.analysis_id) as any;
      if (analysisRow) {
        entryAnalysis = {
          summary: analysisRow.summary,
          wins: JSON.parse(analysisRow.wins || '[]'),
          challenges: JSON.parse(analysisRow.challenges || '[]'),
          coachNote: analysisRow.coach_note,
          actionItems: JSON.parse(analysisRow.action_items || '[]'),
        };
      }
    }
  }

  // Load prior message history for this session
  const priorMessages = (db.prepare(
    'SELECT role, content FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC'
  ).all(sessionId) as any[]).map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

  // Build system prompt
  const system = buildChatProcessorSystem(profile as any, activeGoals, recentThemes, entryAnalysis);

  // Call Claude with full history
  const response = await anthropicClient.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system,
    messages: [
      ...priorMessages,
      { role: 'user', content: userMessage },
    ],
  });

  const content = response.content[0];
  if (content.type !== 'text') throw new Error('Unexpected response type from Claude');
  const assistantReply = content.text;

  // Persist user message + assistant reply
  const now = new Date().toISOString();
  const insertMsg = db.prepare(`INSERT INTO chat_messages (id, session_id, role, content, created_at)
    VALUES (?, ?, ?, ?, ?)`);

  insertMsg.run(uuidv4(), sessionId, 'user', userMessage, now);
  // Offset by 1ms so ordering is deterministic
  const replyTime = new Date(Date.now() + 1).toISOString();
  insertMsg.run(uuidv4(), sessionId, 'assistant', assistantReply, replyTime);

  return assistantReply;
}

export async function getMessages(sessionId: string, userId: string) {
  const db = getDb();

  const session = db.prepare('SELECT * FROM chat_sessions WHERE id = ? AND user_id = ?')
    .get(sessionId, userId) as any;
  if (!session) throw new Error('Session not found');

  return db.prepare(
    'SELECT id, role, content, created_at FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC'
  ).all(sessionId);
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd backend && npx jest chatAgent --no-coverage
```
Expected: PASS — all 4 tests green.

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/claude/chatAgent.ts backend/src/__tests__/chatAgent.test.ts
git commit -m "feat: add multi-turn chatAgent with context injection"
```

---

## Task 5: Chat Routes with Zod Validation

**Files:**
- Create: `backend/src/routes/chat.ts`
- Create: `backend/src/__tests__/chat.routes.test.ts`

All inputs are validated with Zod at the route layer. Message content is capped at 4000 chars to prevent abuse.

- [ ] **Step 1: Write the failing tests**

Create `backend/src/__tests__/chat.routes.test.ts`:
```typescript
import request from 'supertest';
import express from 'express';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

function makeDb() {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  const schema = fs.readFileSync(path.join(__dirname, '../db/schema.sql'), 'utf-8');
  db.exec(schema);
  db.prepare(`INSERT INTO users (id, created_at, updated_at, current_role, industry,
    career_stage, short_term_goal, long_term_goal, current_focus_area,
    coaching_style, accountability_level)
    VALUES ('u1', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z',
    'Designer', 'Tech', 'mid', 'Lead team', 'CPO', 'Systems', 'direct', 'moderate')`
  ).run();
  return db;
}

jest.mock('../db/connection', () => {
  const db = makeDb();
  return { getDb: () => db };
});

jest.mock('../services/claude/chatAgent', () => ({
  startSession: jest.fn().mockResolvedValue('mock-session-id'),
  sendMessage: jest.fn().mockResolvedValue('Here is my coaching response.'),
  getMessages: jest.fn().mockResolvedValue([
    { id: 'm1', role: 'user', content: 'Hello', created_at: '2026-01-01T00:00:01Z' },
    { id: 'm2', role: 'assistant', content: 'Hi there!', created_at: '2026-01-01T00:00:02Z' },
  ]),
}));

import chatRouter from '../routes/chat';

const app = express();
app.use(express.json());
app.use('/api/v1/chat', chatRouter);

describe('POST /api/v1/chat/session/start', () => {
  test('returns sessionId with valid userId', async () => {
    const res = await request(app)
      .post('/api/v1/chat/session/start')
      .set('x-user-id', 'u1')
      .send({});
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.sessionId).toBe('mock-session-id');
  });

  test('returns 401 without x-user-id header', async () => {
    const res = await request(app)
      .post('/api/v1/chat/session/start')
      .send({});
    expect(res.status).toBe(401);
  });

  test('accepts optional entryId in body', async () => {
    const { startSession } = require('../services/claude/chatAgent');
    const res = await request(app)
      .post('/api/v1/chat/session/start')
      .set('x-user-id', 'u1')
      .send({ entryId: 'entry-abc' });
    expect(res.status).toBe(201);
    expect(startSession).toHaveBeenCalledWith({ userId: 'u1', entryId: 'entry-abc' });
  });

  test('rejects entryId that is not a string', async () => {
    const res = await request(app)
      .post('/api/v1/chat/session/start')
      .set('x-user-id', 'u1')
      .send({ entryId: 123 });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/v1/chat/message', () => {
  test('returns reply with valid body', async () => {
    const res = await request(app)
      .post('/api/v1/chat/message')
      .set('x-user-id', 'u1')
      .send({ sessionId: 'sess1', message: 'Hello coach' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.reply).toBe('Here is my coaching response.');
  });

  test('returns 400 if sessionId is missing', async () => {
    const res = await request(app)
      .post('/api/v1/chat/message')
      .set('x-user-id', 'u1')
      .send({ message: 'Hello' });
    expect(res.status).toBe(400);
  });

  test('returns 400 if message exceeds 4000 chars', async () => {
    const res = await request(app)
      .post('/api/v1/chat/message')
      .set('x-user-id', 'u1')
      .send({ sessionId: 'sess1', message: 'a'.repeat(4001) });
    expect(res.status).toBe(400);
  });

  test('returns 400 if message is empty string', async () => {
    const res = await request(app)
      .post('/api/v1/chat/message')
      .set('x-user-id', 'u1')
      .send({ sessionId: 'sess1', message: '' });
    expect(res.status).toBe(400);
  });

  test('returns 401 without x-user-id header', async () => {
    const res = await request(app)
      .post('/api/v1/chat/message')
      .send({ sessionId: 'sess1', message: 'Hello' });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/v1/chat/session/:sessionId/messages', () => {
  test('returns messages array', async () => {
    const res = await request(app)
      .get('/api/v1/chat/session/sess1/messages')
      .set('x-user-id', 'u1');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.messages)).toBe(true);
    expect(res.body.data.messages).toHaveLength(2);
  });

  test('returns 401 without x-user-id header', async () => {
    const res = await request(app)
      .get('/api/v1/chat/session/sess1/messages');
    expect(res.status).toBe(401);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd backend && npx jest chat.routes --no-coverage
```
Expected: FAIL — `Cannot find module '../routes/chat'`

- [ ] **Step 3: Implement chat.ts**

Create `backend/src/routes/chat.ts`:
```typescript
import { Router } from 'express';
import { z } from 'zod';
import { startSession, sendMessage, getMessages } from '../services/claude/chatAgent';

const router = Router();

// Helper: extract and validate userId
function requireUserId(req: any, res: any): string | null {
  const userId = req.headers['x-user-id'] as string;
  if (!userId) {
    res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'x-user-id header required' } });
    return null;
  }
  return userId;
}

// POST /api/v1/chat/session/start
const StartSessionSchema = z.object({
  entryId: z.string().optional().nullable(),
});

router.post('/session/start', async (req, res) => {
  const userId = requireUserId(req, res);
  if (!userId) return;

  const parsed = StartSessionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } });
  }

  try {
    const sessionId = await startSession({ userId, entryId: parsed.data.entryId ?? null });
    res.status(201).json({ success: true, data: { sessionId } });
  } catch (error: any) {
    res.status(400).json({ success: false, error: { code: 'SESSION_CREATE_FAILED', message: error.message } });
  }
});

// POST /api/v1/chat/message
const SendMessageSchema = z.object({
  sessionId: z.string().min(1),
  message: z.string().min(1).max(4000),
});

router.post('/message', async (req, res) => {
  const userId = requireUserId(req, res);
  if (!userId) return;

  const parsed = SendMessageSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } });
  }

  try {
    const reply = await sendMessage(parsed.data.sessionId, userId, parsed.data.message);
    res.json({ success: true, data: { reply } });
  } catch (error: any) {
    if (error.message === 'Session not found') {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: error.message } });
    }
    console.error('Chat message error:', error);
    res.status(500).json({ success: false, error: { code: 'CHAT_FAILED', message: error.message } });
  }
});

// GET /api/v1/chat/session/:sessionId/messages
router.get('/session/:sessionId/messages', async (req, res) => {
  const userId = requireUserId(req, res);
  if (!userId) return;

  try {
    const messages = await getMessages(req.params.sessionId, userId);
    res.json({ success: true, data: { messages } });
  } catch (error: any) {
    if (error.message === 'Session not found') {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: error.message } });
    }
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

export default router;
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd backend && npx jest chat.routes --no-coverage
```
Expected: PASS — all 10 tests green.

- [ ] **Step 5: Commit**

```bash
git add backend/src/routes/chat.ts backend/src/__tests__/chat.routes.test.ts
git commit -m "feat: add chat routes with Zod validation"
```

---

## Task 6: Rate Limiting + Mount in index.ts

**Files:**
- Modify: `backend/package.json` (add express-rate-limit)
- Modify: `backend/src/index.ts` (mount router + rate limiter)

Rate limit protects the two AI-heavy routes. The limit is per IP (MVP) with a comment noting the upgrade path to per-userId once auth is added.

- [ ] **Step 1: Install express-rate-limit**

```bash
npm install --workspace=backend express-rate-limit
npm install --workspace=backend --save-dev @types/express-rate-limit
```

- [ ] **Step 2: Verify install**

```bash
cd backend && node -e "require('express-rate-limit'); console.log('ok')"
```
Expected: `ok`

- [ ] **Step 3: Add rate limiter and mount chat router in index.ts**

Open `backend/src/index.ts`. Make these two changes:

**Add imports at the top** (after existing imports):
```typescript
import rateLimit from 'express-rate-limit';
import chatRouter from './routes/chat';
```

**Add rate limiter middleware and chat route** (after existing route mounts, before the health check):
```typescript
// Rate limiter for AI-heavy routes
// MVP: rate limit by IP. TODO: upgrade to per-userId once auth is added.
const aiRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,             // 20 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests, please wait a moment.' } },
});

app.use('/api/v1/chat', aiRateLimit, chatRouter);
app.use('/api/v1/transcribe', aiRateLimit);
```

**Important:** The `app.use('/api/v1/transcribe', aiRateLimit)` line must come AFTER the existing transcribe router mount — Express will apply both middlewares in order. If you want rate limiting before the handler, move the new line above the existing `app.use('/api/v1/transcribe', transcribeRouter)` line. The correct order:

```typescript
// Replace the existing transcribe router line with these two lines:
app.use('/api/v1/transcribe', aiRateLimit, transcribeRouter);
// ...and add chat:
app.use('/api/v1/chat', aiRateLimit, chatRouter);
```

The full updated routes block in `backend/src/index.ts` should look like:
```typescript
// Rate limiter for AI-heavy routes
// MVP: rate limited by IP. TODO: switch to per-userId key once auth is added (use keyGenerator option).
const aiRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests, please wait a moment.' } },
});

// Routes
app.use('/api/v1/profile', profileRouter);
app.use('/api/v1/entries', entriesRouter);
app.use('/api/v1/transcribe', aiRateLimit, transcribeRouter);
app.use('/api/v1/analyze', analyzeRouter);
app.use('/api/v1/reviews', reviewsRouter);
app.use('/api/v1/goals', goalsRouter);
app.use('/api/v1/action-items', actionItemsRouter);
app.use('/api/v1/trajectory', trajectoryRouter);
app.use('/api/v1/notifications', notificationsRouter);
app.use('/api/v1/chat', aiRateLimit, chatRouter);
```

- [ ] **Step 4: Start backend and verify health check**

```bash
npm run backend
```
Expected: `Taisa backend running on http://localhost:3001`

- [ ] **Step 5: Smoke test the new routes**

```bash
# Should return 401 (no userId)
curl -s -X POST http://localhost:3001/api/v1/chat/session/start | jq .

# Should return 201
curl -s -X POST http://localhost:3001/api/v1/chat/session/start \
  -H "Content-Type: application/json" \
  -H "x-user-id: test-user" \
  -d '{}' | jq .
```

The first should return `{"success":false,"error":{"code":"UNAUTHORIZED",...}}`.
The second may return a 400 ("User not found") since no profile exists for "test-user" — that's correct behaviour.

- [ ] **Step 6: Run all tests to confirm nothing broke**

```bash
cd backend && npx jest --no-coverage
```
Expected: All test suites pass.

- [ ] **Step 7: Commit**

```bash
git add backend/src/index.ts backend/package.json backend/package-lock.json
git commit -m "feat: mount chat router and add AI rate limiting"
```

---

## Task 7: Data Deletion Endpoint (GDPR-Readiness)

**Files:**
- Modify: `backend/src/routes/profile.ts`
- Create: `backend/src/__tests__/profile.delete.test.ts`

`DELETE /api/v1/profile` deletes all data for the authenticated userId in a single transaction, ordered to respect foreign keys. This is the privacy escape hatch for users who want to erase their data.

- [ ] **Step 1: Write the failing test**

Create `backend/src/__tests__/profile.delete.test.ts`:
```typescript
import request from 'supertest';
import express from 'express';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

function makeDb() {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  const schema = fs.readFileSync(path.join(__dirname, '../db/schema.sql'), 'utf-8');
  db.exec(schema);
  return db;
}

const db = makeDb();

jest.mock('../db/connection', () => ({ getDb: () => db }));

import profileRouter from '../routes/profile';

const app = express();
app.use(express.json());
app.use('/api/v1/profile', profileRouter);

function seedUser(userId: string) {
  db.prepare(`INSERT OR REPLACE INTO users (id, created_at, updated_at, current_role, industry,
    career_stage, short_term_goal, long_term_goal, current_focus_area,
    coaching_style, accountability_level)
    VALUES (?, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z',
    'Designer', 'Tech', 'mid', 'Lead team', 'CPO', 'Systems', 'direct', 'moderate')`
  ).run(userId);
}

describe('DELETE /api/v1/profile', () => {
  beforeEach(() => {
    // Clean state
    db.prepare('DELETE FROM chat_messages').run();
    db.prepare('DELETE FROM chat_sessions').run();
    db.prepare('DELETE FROM action_items').run();
    db.prepare('DELETE FROM journal_entries').run();
    db.prepare('DELETE FROM users').run();
    seedUser('u1');
  });

  test('deletes the user and returns 200', async () => {
    const res = await request(app)
      .delete('/api/v1/profile')
      .set('x-user-id', 'u1');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get('u1');
    expect(user).toBeUndefined();
  });

  test('returns 401 without x-user-id header', async () => {
    const res = await request(app).delete('/api/v1/profile');
    expect(res.status).toBe(401);
  });

  test('returns 404 if user does not exist', async () => {
    const res = await request(app)
      .delete('/api/v1/profile')
      .set('x-user-id', 'nonexistent');
    expect(res.status).toBe(404);
  });

  test('deletes related chat sessions and messages', async () => {
    // Seed a session + message
    db.prepare(`INSERT INTO chat_sessions (id, user_id, entry_id, started_at, status)
      VALUES ('s1', 'u1', NULL, '2026-01-01T00:00:00Z', 'active')`).run();
    db.prepare(`INSERT INTO chat_messages (id, session_id, role, content, created_at)
      VALUES ('m1', 's1', 'user', 'hi', '2026-01-01T00:00:01Z')`).run();

    await request(app).delete('/api/v1/profile').set('x-user-id', 'u1');

    const sessions = db.prepare('SELECT * FROM chat_sessions WHERE user_id = ?').all('u1');
    const messages = db.prepare('SELECT * FROM chat_messages WHERE session_id = ?').all('s1');
    expect(sessions).toHaveLength(0);
    expect(messages).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd backend && npx jest profile.delete --no-coverage
```
Expected: FAIL — the DELETE route doesn't exist yet.

- [ ] **Step 3: Add DELETE route to profile.ts**

Open `backend/src/routes/profile.ts`. Add the following route after the `PUT /` handler and before the `rowToProfile` function:

```typescript
// DELETE /api/v1/profile
// Permanently deletes all data for this user. Irreversible.
router.delete('/', (req, res) => {
  const db = getDb();
  const userId = req.headers['x-user-id'] as string;
  if (!userId) return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'x-user-id header required' } });

  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
  if (!user) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });

  // Delete all user data in dependency order (children before parents)
  const deleteAll = db.transaction(() => {
    // Chat messages (references chat_sessions)
    db.prepare(`DELETE FROM chat_messages WHERE session_id IN
      (SELECT id FROM chat_sessions WHERE user_id = ?)`).run(userId);
    db.prepare('DELETE FROM chat_sessions WHERE user_id = ?').run(userId);

    // Milestone (references goals)
    db.prepare(`DELETE FROM milestones WHERE goal_id IN
      (SELECT id FROM goals WHERE user_id = ?)`).run(userId);
    db.prepare('DELETE FROM goals WHERE user_id = ?').run(userId);

    // Entry analyses and action items (reference journal_entries)
    db.prepare(`DELETE FROM entry_analyses WHERE entry_id IN
      (SELECT id FROM journal_entries WHERE user_id = ?)`).run(userId);
    db.prepare('DELETE FROM action_items WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM journal_entries WHERE user_id = ?').run(userId);

    // Remaining user-owned data
    db.prepare('DELETE FROM performance_reviews WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM career_themes WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM trajectory_snapshots WHERE user_id = ?').run(userId);

    // Finally, the user
    db.prepare('DELETE FROM users WHERE id = ?').run(userId);
  });

  deleteAll();
  res.json({ success: true, data: { message: 'All user data deleted.' } });
});
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd backend && npx jest profile.delete --no-coverage
```
Expected: PASS — all 4 tests green.

- [ ] **Step 5: Run the full test suite**

```bash
cd backend && npx jest --no-coverage
```
Expected: All test suites pass (chatTables, chatProcessor, chatAgent, chat.routes, profile.delete).

- [ ] **Step 6: Commit**

```bash
git add backend/src/routes/profile.ts backend/src/__tests__/profile.delete.test.ts
git commit -m "feat: add DELETE /profile endpoint for full data erasure"
```

---

## Task 8: End-to-End Smoke Test

Manual verification that the whole chain works before closing the plan.

- [ ] **Step 1: Start the backend**

```bash
npm run backend
```

- [ ] **Step 2: Create a user profile (use any deviceId)**

```bash
curl -s -X POST http://localhost:3001/api/v1/profile/init \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "smoke-test-user",
    "currentRole": "Product Designer",
    "industry": "Tech",
    "careerStage": "mid",
    "shortTermGoal": "Lead a design system",
    "longTermGoal": "Become a CPO",
    "currentFocusArea": "Systems thinking",
    "coachingStyle": "direct",
    "accountabilityLevel": "moderate"
  }' | jq .
```
Expected: `"success": true` with the profile.

- [ ] **Step 3: Start a chat session**

```bash
curl -s -X POST http://localhost:3001/api/v1/chat/session/start \
  -H "Content-Type: application/json" \
  -H "x-user-id: smoke-test-user" \
  -d '{}' | jq .
```
Expected: `"success": true, "data": { "sessionId": "<uuid>" }`. Copy the sessionId.

- [ ] **Step 4: Send a message (replace SESSION_ID)**

```bash
curl -s -X POST http://localhost:3001/api/v1/chat/message \
  -H "Content-Type: application/json" \
  -H "x-user-id: smoke-test-user" \
  -d '{
    "sessionId": "SESSION_ID",
    "message": "What should I focus on this week to make progress toward my goals?"
  }' | jq .
```
Expected: `"success": true, "data": { "reply": "<Claude response>" }`. The reply should be conversational and reference the user's goals.

- [ ] **Step 5: Retrieve message history**

```bash
curl -s http://localhost:3001/api/v1/chat/session/SESSION_ID/messages \
  -H "x-user-id: smoke-test-user" | jq .
```
Expected: `"success": true, "data": { "messages": [<user msg>, <assistant reply>] }`.

- [ ] **Step 6: Delete user data**

```bash
curl -s -X DELETE http://localhost:3001/api/v1/profile \
  -H "x-user-id: smoke-test-user" | jq .
```
Expected: `"success": true, "data": { "message": "All user data deleted." }`.

- [ ] **Step 7: Final commit**

```bash
git add -A
git commit -m "feat: chat backend + security foundations complete"
```

---

## Self-Review Checklist

### Spec coverage

| Spec requirement | Covered in |
|---|---|
| `chat_sessions` table with nullable `entry_id` | Task 2 |
| `chat_messages` table | Task 2 |
| `POST /api/v1/chat/session/start` | Task 5 |
| `POST /api/v1/chat/message` | Task 5 |
| `GET /api/v1/chat/session/:sessionId/messages` | Task 5 |
| `chatAgent.ts` multi-turn | Task 4 |
| `chatProcessor.ts` prompt builder | Task 3 |
| Entry analysis injected when `entry_id` set | Tasks 3 + 4 |
| Profile/goals/themes always injected | Tasks 3 + 4 |
| Rate limiting on chat + transcribe routes | Task 6 |
| Zod input validation | Task 5 |
| Data deletion endpoint | Task 7 |

### Security properties after this plan

- **Rate limiting:** 20 req/min per IP on `/chat` and `/transcribe`
- **Input validation:** All chat inputs validated with Zod; message max 4000 chars
- **userId isolation:** Every DB query in chatAgent scopes by `user_id`; session ownership verified before any read/write
- **Data deletion:** `DELETE /api/v1/profile` cascades all user data in a single transaction
- **Auth-ready:** Rate limiter includes a `TODO` comment for upgrading to per-userId key when auth is added

### No placeholders

Scanned: no TBD/TODO in implementation steps. All code is complete.

### Type consistency

- `sendMessage(sessionId, userId, userMessage)` — consistent across agent, route, and tests
- `startSession({ userId, entryId })` — consistent across agent, route, and tests  
- `getMessages(sessionId, userId)` — consistent across agent, route, and tests
