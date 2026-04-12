import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/connection';
import type { JournalEntry } from '@taisa/shared';

const router = Router();

function getUserId(req: any): string | null {
  return req.headers['x-user-id'] as string || null;
}

function rowToEntry(row: any): JournalEntry {
  return {
    id: row.id,
    userId: row.user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    recordedAt: row.recorded_at,
    inputType: row.input_type,
    rawTranscript: row.raw_transcript,
    editedTranscript: row.edited_transcript,
    audioDurationSeconds: row.audio_duration_seconds,
    audioFileRef: row.audio_file_ref,
    status: row.status,
    analysisId: row.analysis_id,
  };
}

// GET /api/v1/entries
router.get('/', (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'x-user-id header required' } });

  const db = getDb();
  const limit = parseInt(req.query.limit as string) || 20;
  const offset = parseInt(req.query.offset as string) || 0;
  const since = req.query.since as string;

  let query = 'SELECT * FROM journal_entries WHERE user_id = ?';
  const params: any[] = [userId];

  if (since) {
    query += ' AND recorded_at >= ?';
    params.push(since);
  }

  query += ' ORDER BY recorded_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const rows = db.prepare(query).all(...params) as any[];
  const total = (db.prepare('SELECT COUNT(*) as count FROM journal_entries WHERE user_id = ?').get(userId) as any).count;

  res.json({
    success: true,
    data: {
      items: rows.map(rowToEntry),
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    },
  });
});

// POST /api/v1/entries
router.post('/', (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'x-user-id header required' } });

  const db = getDb();
  const { inputType, rawTranscript, editedTranscript, audioDurationSeconds, recordedAt } = req.body;

  if (!rawTranscript) {
    return res.status(400).json({ success: false, error: { code: 'MISSING_TRANSCRIPT', message: 'rawTranscript required' } });
  }

  const now = new Date().toISOString();
  const id = uuidv4();

  db.prepare(`INSERT INTO journal_entries (
    id, user_id, created_at, updated_at, recorded_at, input_type,
    raw_transcript, edited_transcript, audio_duration_seconds, status
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')`
  ).run(id, userId, now, now, recordedAt || now, inputType || 'voice', rawTranscript, editedTranscript || null, audioDurationSeconds || null);

  // Increment user entry count
  db.prepare('UPDATE users SET total_entry_count = total_entry_count + 1, last_entry_at = ? WHERE id = ?').run(now, userId);

  const row = db.prepare('SELECT * FROM journal_entries WHERE id = ?').get(id) as any;
  res.status(201).json({ success: true, data: rowToEntry(row) });
});

// GET /api/v1/entries/:id
router.get('/:id', (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'x-user-id header required' } });

  const db = getDb();
  const row = db.prepare('SELECT * FROM journal_entries WHERE id = ? AND user_id = ?').get(req.params.id, userId) as any;
  if (!row) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Entry not found' } });

  const entry = rowToEntry(row);
  let analysis = null;

  if (row.analysis_id) {
    const analysisRow = db.prepare('SELECT * FROM entry_analyses WHERE id = ?').get(row.analysis_id) as any;
    if (analysisRow) analysis = parseAnalysisRow(analysisRow);
  }

  res.json({ success: true, data: { entry, analysis } });
});

// PUT /api/v1/entries/:id
router.put('/:id', (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'x-user-id header required' } });

  const db = getDb();
  const { editedTranscript, status } = req.body;
  const now = new Date().toISOString();

  db.prepare(`UPDATE journal_entries SET
    edited_transcript = COALESCE(?, edited_transcript),
    status = COALESCE(?, status),
    updated_at = ?
  WHERE id = ? AND user_id = ?`).run(editedTranscript || null, status || null, now, req.params.id, userId);

  const row = db.prepare('SELECT * FROM journal_entries WHERE id = ?').get(req.params.id) as any;
  res.json({ success: true, data: rowToEntry(row) });
});

function parseAnalysisRow(row: any) {
  return {
    id: row.id,
    entryId: row.entry_id,
    createdAt: row.created_at,
    modelVersion: row.model_version,
    summary: row.summary,
    sentiment: row.sentiment,
    energyLevel: row.energy_level,
    wins: JSON.parse(row.wins || '[]'),
    challenges: JSON.parse(row.challenges || '[]'),
    decisions: JSON.parse(row.decisions || '[]'),
    actionItems: JSON.parse(row.action_items || '[]'),
    themes: JSON.parse(row.themes || '[]'),
    coachNote: row.coach_note,
    growthAreas: JSON.parse(row.growth_areas || '[]'),
    momentumSignal: row.momentum_signal,
    patternFlags: JSON.parse(row.pattern_flags || '[]'),
    accountabilityCallouts: JSON.parse(row.accountability_callouts || '[]'),
    goalAssessments: JSON.parse(row.goal_assessments || '[]'),
  };
}

export { parseAnalysisRow };
export default router;
