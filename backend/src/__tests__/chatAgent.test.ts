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

function seedUser(db: Database.Database) {
  db.prepare(`INSERT INTO users (id, created_at, updated_at, current_role, industry,
    career_stage, short_term_goal, long_term_goal, current_focus_area,
    coaching_style, accountability_level)
    VALUES ('u1', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z',
    'Designer', 'Tech', 'mid', 'Lead team', 'CPO', 'Systems', 'direct', 'moderate')`
  ).run();
}

jest.mock('../services/claude/client', () => ({
  __esModule: true,
  MODEL: 'claude-sonnet-4-6',
  default: {
    messages: {
      create: jest.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Great question. Keep pushing.' }],
      }),
    },
  },
}));

const _db = makeDb();
seedUser(_db);

jest.mock('../db/connection', () => ({
  getDb: () => _db,
}));

import { sendMessage, startSession, getMessages } from '../services/claude/chatAgent';

describe('chatAgent', () => {
  beforeEach(() => {
    _db.prepare('DELETE FROM chat_messages').run();
    _db.prepare('DELETE FROM chat_sessions').run();
  });

  test('startSession creates a session and returns a sessionId', async () => {
    const sessionId = await startSession({ userId: 'u1' });
    expect(typeof sessionId).toBe('string');
    expect(sessionId.length).toBeGreaterThan(0);
    const row = _db.prepare('SELECT * FROM chat_sessions WHERE id = ?').get(sessionId) as any;
    expect(row).toBeDefined();
    expect(row.user_id).toBe('u1');
    expect(row.entry_id).toBeNull();
  });

  test('sendMessage returns a reply and persists both messages', async () => {
    _db.prepare(`INSERT INTO chat_sessions (id, user_id, entry_id, started_at, status)
      VALUES ('sess1', 'u1', NULL, '2026-01-01T00:00:00Z', 'active')`).run();

    const reply = await sendMessage('sess1', 'u1', 'What should I focus on?');
    expect(reply).toBe('Great question. Keep pushing.');

    const messages = _db.prepare('SELECT * FROM chat_messages WHERE session_id = ? ORDER BY created_at')
      .all('sess1') as any[];
    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe('user');
    expect(messages[0].content).toBe('What should I focus on?');
    expect(messages[1].role).toBe('assistant');
    expect(messages[1].content).toBe('Great question. Keep pushing.');
  });

  test('sendMessage throws if session does not belong to userId', async () => {
    _db.prepare(`INSERT INTO chat_sessions (id, user_id, entry_id, started_at, status)
      VALUES ('sess2', 'other-user', NULL, '2026-01-01T00:00:00Z', 'active')`).run();
    await expect(sendMessage('sess2', 'u1', 'Hello')).rejects.toThrow('Session not found');
  });

  test('sendMessage passes full message history to Claude', async () => {
    const anthropicMock = require('../services/claude/client').default;
    _db.prepare(`INSERT INTO chat_sessions (id, user_id, entry_id, started_at, status)
      VALUES ('sess3', 'u1', NULL, '2026-01-01T00:00:00Z', 'active')`).run();
    _db.prepare(`INSERT INTO chat_messages (id, session_id, role, content, created_at)
      VALUES ('m1', 'sess3', 'user', 'Prior question', '2026-01-01T00:00:01Z')`).run();
    _db.prepare(`INSERT INTO chat_messages (id, session_id, role, content, created_at)
      VALUES ('m2', 'sess3', 'assistant', 'Prior answer', '2026-01-01T00:00:02Z')`).run();

    await sendMessage('sess3', 'u1', 'Follow-up question');

    const call = anthropicMock.messages.create.mock.calls.at(-1)[0];
    expect(call.messages.length).toBe(3);
    expect(call.messages[0]).toEqual({ role: 'user', content: 'Prior question' });
    expect(call.messages[1]).toEqual({ role: 'assistant', content: 'Prior answer' });
    expect(call.messages[2]).toEqual({ role: 'user', content: 'Follow-up question' });
  });

  test('getMessages returns messages for a session owned by userId', async () => {
    _db.prepare(`INSERT INTO chat_sessions (id, user_id, entry_id, started_at, status)
      VALUES ('sess4', 'u1', NULL, '2026-01-01T00:00:00Z', 'active')`).run();
    _db.prepare(`INSERT INTO chat_messages (id, session_id, role, content, created_at)
      VALUES ('mx1', 'sess4', 'user', 'hello', '2026-01-01T00:00:01Z')`).run();

    const msgs = await getMessages('sess4', 'u1');
    expect(msgs).toHaveLength(1);
    expect((msgs[0] as any).content).toBe('hello');
  });

  test('getMessages throws if session does not belong to userId', async () => {
    _db.prepare(`INSERT INTO chat_sessions (id, user_id, entry_id, started_at, status)
      VALUES ('sess5', 'other-user', NULL, '2026-01-01T00:00:00Z', 'active')`).run();
    await expect(getMessages('sess5', 'u1')).rejects.toThrow('Session not found');
  });
});
