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
    db.prepare('DELETE FROM chat_messages').run();
    db.prepare('DELETE FROM chat_sessions').run();
    db.prepare('DELETE FROM action_items').run();
    db.prepare('DELETE FROM milestones').run();
    db.prepare('DELETE FROM goals').run();
    db.prepare('DELETE FROM entry_analyses').run();
    db.prepare('DELETE FROM journal_entries').run();
    db.prepare('DELETE FROM performance_reviews').run();
    db.prepare('DELETE FROM career_themes').run();
    db.prepare('DELETE FROM trajectory_snapshots').run();
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
    // User should still exist
    const user = db.prepare('SELECT id FROM users WHERE id = ?').get('u1');
    expect(user).toBeTruthy();
  });

  test('returns 404 if user does not exist', async () => {
    const res = await request(app)
      .delete('/api/v1/profile')
      .set('x-user-id', 'nonexistent');
    expect(res.status).toBe(404);
  });

  test('deletes related chat sessions and messages', async () => {
    db.prepare(`INSERT INTO chat_sessions (id, user_id, entry_id, started_at, status)
      VALUES ('s1', 'u1', NULL, '2026-01-01T00:00:00Z', 'active')`).run();
    db.prepare(`INSERT INTO chat_messages (id, session_id, role, content, created_at)
      VALUES ('m1', 's1', 'user', 'hi', '2026-01-01T00:00:01Z')`).run();

    await request(app).delete('/api/v1/profile').set('x-user-id', 'u1');

    expect(db.prepare('SELECT * FROM chat_sessions WHERE user_id = ?').all('u1')).toHaveLength(0);
    expect(db.prepare('SELECT * FROM chat_messages WHERE session_id = ?').all('s1')).toHaveLength(0);
  });

  test('deletes goals and their milestones', async () => {
    db.prepare(`INSERT INTO goals (id, user_id, title, created_at, updated_at)
      VALUES ('g1', 'u1', 'Test goal', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')`).run();
    db.prepare(`INSERT INTO milestones (id, goal_id, title, created_at, updated_at)
      VALUES ('ms1', 'g1', 'Test milestone', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')`).run();

    await request(app).delete('/api/v1/profile').set('x-user-id', 'u1');

    expect(db.prepare('SELECT * FROM goals WHERE user_id = ?').all('u1')).toHaveLength(0);
    expect(db.prepare('SELECT * FROM milestones WHERE goal_id = ?').all('g1')).toHaveLength(0);
  });
});
