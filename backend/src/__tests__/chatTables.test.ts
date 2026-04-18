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
    // Create user first to satisfy foreign key constraint
    db.prepare(`INSERT INTO users (id, created_at, updated_at)
      VALUES ('u1', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')`).run();
    db.prepare(`INSERT INTO chat_sessions (id, user_id, entry_id, started_at, status)
      VALUES ('s1', 'u1', NULL, '2026-01-01T00:00:00Z', 'active')`).run();
    db.prepare(`INSERT INTO chat_messages (id, session_id, role, content, created_at)
      VALUES ('m1', 's1', 'user', 'hello', '2026-01-01T00:00:01Z')`).run();
    const row = db.prepare("SELECT * FROM chat_messages WHERE id = 'm1'").get() as any;
    expect(row.role).toBe('user');
  });

  test('chat_messages rejects invalid role values', () => {
    const db = makeDb();
    db.prepare(`INSERT INTO users (id, created_at, updated_at)
      VALUES ('u2', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')`).run();
    db.prepare(`INSERT INTO chat_sessions (id, user_id, entry_id, started_at, status)
      VALUES ('s2', 'u2', NULL, '2026-01-01T00:00:00Z', 'active')`).run();
    expect(() => {
      db.prepare(`INSERT INTO chat_messages (id, session_id, role, content, created_at)
        VALUES ('m2', 's2', 'system', 'hello', '2026-01-01T00:00:01Z')`).run();
    }).toThrow();
  });
});
