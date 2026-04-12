import { Router } from 'express';
import { getDb } from '../db/connection';
import { analyzeEntry } from '../services/claude/journalAgent';
import { parseAnalysisRow } from './entries';

const router = Router();

// POST /api/v1/analyze/:entryId
router.post('/:entryId', async (req, res) => {
  const userId = req.headers['x-user-id'] as string;
  if (!userId) return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'x-user-id header required' } });

  const db = getDb();
  const entry = db.prepare('SELECT * FROM journal_entries WHERE id = ? AND user_id = ?').get(req.params.entryId, userId) as any;
  if (!entry) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Entry not found' } });

  // Set status to processing
  db.prepare("UPDATE journal_entries SET status = 'processing', updated_at = ? WHERE id = ?")
    .run(new Date().toISOString(), req.params.entryId);

  try {
    const analysis = await analyzeEntry(req.params.entryId, userId);
    res.json({ success: true, data: analysis });
  } catch (error: any) {
    db.prepare("UPDATE journal_entries SET status = 'error', updated_at = ? WHERE id = ?")
      .run(new Date().toISOString(), req.params.entryId);
    console.error('Analysis error:', error);
    res.status(500).json({ success: false, error: { code: 'ANALYSIS_FAILED', message: error.message } });
  }
});

// GET /api/v1/analyze/:entryId
router.get('/:entryId', (req, res) => {
  const userId = req.headers['x-user-id'] as string;
  if (!userId) return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'x-user-id header required' } });

  const db = getDb();
  const entry = db.prepare('SELECT * FROM journal_entries WHERE id = ? AND user_id = ?').get(req.params.entryId, userId) as any;
  if (!entry || !entry.analysis_id) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'No analysis found' } });

  const row = db.prepare('SELECT * FROM entry_analyses WHERE id = ?').get(entry.analysis_id) as any;
  res.json({ success: true, data: parseAnalysisRow(row) });
});

export default router;
