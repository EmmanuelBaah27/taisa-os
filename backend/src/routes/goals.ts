import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/connection';

const router = Router();

function rowToGoal(g: any, db: any) {
  const milestones = (db.prepare('SELECT * FROM milestones WHERE goal_id = ?').all(g.id) as any[]).map(m => ({
    id: m.id, goalId: m.goal_id, title: m.title, status: m.status,
    evidenceEntryIds: JSON.parse(m.evidence_entry_ids || '[]'),
  }));
  return {
    id: g.id, userId: g.user_id, title: g.title, description: g.description,
    sourceReviewId: g.source_review_id, suggestedByAI: !!g.suggested_by_ai,
    priority: g.priority, status: g.status,
    relatedThemes: JSON.parse(g.related_themes || '[]'),
    progressPercent: g.progress_percent,
    createdAt: g.created_at, updatedAt: g.updated_at, targetDate: g.target_date,
    milestones,
  };
}

// GET /api/v1/goals
router.get('/', (req, res) => {
  const userId = req.headers['x-user-id'] as string;
  if (!userId) return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'x-user-id header required' } });

  const db = getDb();
  const status = req.query.status || 'active';
  const rows = db.prepare('SELECT * FROM goals WHERE user_id = ? AND status = ? ORDER BY created_at DESC').all(userId, status) as any[];
  res.json({ success: true, data: rows.map(g => rowToGoal(g, db)) });
});

// POST /api/v1/goals (manual goal creation)
router.post('/', (req, res) => {
  const userId = req.headers['x-user-id'] as string;
  if (!userId) return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'x-user-id header required' } });

  const db = getDb();
  const { title, description, priority, relatedThemes, targetDate } = req.body;
  if (!title) return res.status(400).json({ success: false, error: { code: 'MISSING_TITLE', message: 'title required' } });

  const now = new Date().toISOString();
  const id = uuidv4();

  db.prepare(`INSERT INTO goals (id, user_id, title, description, suggested_by_ai, priority, status, related_themes, progress_percent, created_at, updated_at, target_date)
    VALUES (?, ?, ?, ?, 0, ?, 'active', ?, 0, ?, ?, ?)`
  ).run(id, userId, title, description || '', priority || 'medium', JSON.stringify(relatedThemes || []), now, now, targetDate || null);

  const row = db.prepare('SELECT * FROM goals WHERE id = ?').get(id) as any;
  res.status(201).json({ success: true, data: rowToGoal(row, db) });
});

// PATCH /api/v1/goals/:id
router.patch('/:id', (req, res) => {
  const userId = req.headers['x-user-id'] as string;
  if (!userId) return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'x-user-id header required' } });

  const db = getDb();
  const { status, priority, title, description, targetDate } = req.body;
  const now = new Date().toISOString();

  db.prepare(`UPDATE goals SET
    status = COALESCE(?, status),
    priority = COALESCE(?, priority),
    title = COALESCE(?, title),
    description = COALESCE(?, description),
    target_date = COALESCE(?, target_date),
    updated_at = ?
  WHERE id = ? AND user_id = ?`).run(status, priority, title, description, targetDate, now, req.params.id, userId);

  const row = db.prepare('SELECT * FROM goals WHERE id = ?').get(req.params.id) as any;
  res.json({ success: true, data: rowToGoal(row, db) });
});

// GET /api/v1/goals/:id/progress
router.get('/:id/progress', (req, res) => {
  const userId = req.headers['x-user-id'] as string;
  if (!userId) return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'x-user-id header required' } });

  const db = getDb();
  const goal = db.prepare('SELECT * FROM goals WHERE id = ? AND user_id = ?').get(req.params.id, userId) as any;
  if (!goal) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Goal not found' } });

  // Find journal entries that assessed this goal
  const analyses = db.prepare(`
    SELECT ea.goal_assessments, ea.created_at, je.recorded_at, ea.summary
    FROM entry_analyses ea
    JOIN journal_entries je ON ea.entry_id = je.id
    WHERE je.user_id = ?
    ORDER BY je.recorded_at DESC
  `).all(userId) as any[];

  const evidence = analyses
    .flatMap((a: any) => {
      const assessments: any[] = JSON.parse(a.goal_assessments || '[]');
      return assessments
        .filter(ga => ga.goalId === req.params.id && ga.evidence)
        .map(ga => ({ date: a.recorded_at, evidence: ga.evidence, progressDelta: ga.progressDelta }));
    });

  res.json({
    success: true,
    data: {
      goal: rowToGoal(goal, db),
      evidence,
      totalEvidenceCount: evidence.length,
    },
  });
});

export default router;
