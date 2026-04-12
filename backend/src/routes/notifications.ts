import { Router } from 'express';
import { getDb } from '../db/connection';
import { callClaude } from '../services/claude/client';
import { buildCheckInSystem, buildCheckInUser } from '../prompts/system/trajectoryAnalyst';

const router = Router();

// POST /api/v1/notifications/checkin-message
// Returns a personalized notification message to display to the user
router.post('/checkin-message', async (req, res) => {
  const userId = req.headers['x-user-id'] as string;
  if (!userId) return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'x-user-id header required' } });

  const db = getDb();
  const profileRow = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
  if (!profileRow) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Profile not found' } });

  const lastEntry = db.prepare(
    'SELECT je.recorded_at, ea.momentum_signal, ea.coach_note FROM journal_entries je LEFT JOIN entry_analyses ea ON je.analysis_id = ea.id WHERE je.user_id = ? ORDER BY je.recorded_at DESC LIMIT 1'
  ).get(userId) as any;

  const openItems = db.prepare(
    "SELECT title FROM action_items WHERE user_id = ? AND status = 'open' ORDER BY created_at ASC LIMIT 1"
  ).get(userId) as any;

  const daysSince = lastEntry
    ? Math.floor((Date.now() - new Date(lastEntry.recorded_at).getTime()) / 86400000)
    : 999;

  const profile = {
    currentRole: profileRow.current_role,
    currentFocusArea: profileRow.current_focus_area,
    coachingStyle: profileRow.coaching_style,
  };

  try {
    const message = await callClaude({
      system: buildCheckInSystem(profile as any),
      userMessage: buildCheckInUser({
        daysSinceLastEntry: daysSince,
        lastMomentumSignal: lastEntry?.momentum_signal || 'steady',
        openItemsCount: profileRow.open_action_item_count,
        topOpenItem: openItems?.title || null,
        lastCoachNote: lastEntry?.coach_note || 'No entries yet.',
      }),
      temperature: 0.7,
      maxTokens: 100,
    });

    res.json({ success: true, data: { message: message.trim() } });
  } catch (error: any) {
    // Fallback message if Claude fails
    res.json({ success: true, data: { message: 'Time to reflect on your day. What happened?' } });
  }
});

export default router;
