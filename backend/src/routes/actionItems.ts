import { Router } from 'express';
import { getDb } from '../db/connection';

const router = Router();

// GET /api/v1/action-items
router.get('/', (req, res) => {
  const userId = req.headers['x-user-id'] as string;
  if (!userId) return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'x-user-id header required' } });

  const db = getDb();
  const status = req.query.status || 'open';

  const rows = db.prepare(
    'SELECT * FROM action_items WHERE user_id = ? AND status = ? ORDER BY created_at DESC'
  ).all(userId, status) as any[];

  res.json({
    success: true,
    data: rows.map(r => ({
      id: r.id, userId: r.user_id, sourceEntryId: r.source_entry_id,
      title: r.title, dueContext: r.due_context, priority: r.priority,
      status: r.status, createdAt: r.created_at,
    })),
  });
});

// PATCH /api/v1/action-items/:id
router.patch('/:id', (req, res) => {
  const userId = req.headers['x-user-id'] as string;
  if (!userId) return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'x-user-id header required' } });

  const db = getDb();
  const { status } = req.body;
  if (!status) return res.status(400).json({ success: false, error: { code: 'MISSING_STATUS', message: 'status required' } });

  const now = new Date().toISOString();
  db.prepare('UPDATE action_items SET status = ?, updated_at = ? WHERE id = ? AND user_id = ?').run(status, now, req.params.id, userId);

  // Update open count on user profile
  const openCount = (db.prepare("SELECT COUNT(*) as count FROM action_items WHERE user_id = ? AND status = 'open'").get(userId) as any).count;
  db.prepare('UPDATE users SET open_action_item_count = ?, updated_at = ? WHERE id = ?').run(openCount, now, userId);

  const row = db.prepare('SELECT * FROM action_items WHERE id = ?').get(req.params.id) as any;
  res.json({ success: true, data: row });
});

export default router;
