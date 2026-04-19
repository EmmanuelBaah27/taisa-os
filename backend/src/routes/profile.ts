import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/connection';
import type { CareerProfile } from '@taisa/shared';

const router = Router();

// POST /api/v1/profile/init — create or retrieve user
router.post('/init', (req, res) => {
  const db = getDb();
  const { deviceId, ...profileData } = req.body;

  if (!deviceId) {
    return res.status(400).json({ success: false, error: { code: 'MISSING_DEVICE_ID', message: 'deviceId required' } });
  }

  // Use deviceId as userId for MVP
  const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(deviceId) as any;

  if (existing) {
    return res.json({ success: true, data: rowToProfile(existing), isNew: false });
  }

  const now = new Date().toISOString();
  const profile = {
    id: deviceId,
    created_at: now,
    updated_at: now,
    current_role: profileData.currentRole || '',
    current_company: profileData.currentCompany || null,
    industry: profileData.industry || '',
    years_of_experience: profileData.yearsOfExperience || 0,
    career_stage: profileData.careerStage || 'mid',
    short_term_goal: profileData.shortTermGoal || '',
    long_term_goal: profileData.longTermGoal || '',
    current_focus_area: profileData.currentFocusArea || '',
    coaching_style: profileData.coachingStyle || 'direct',
    accountability_level: profileData.accountabilityLevel || 'moderate',
    reminder_times: JSON.stringify(profileData.reminderTimes || ['15:00', '19:00']),
    dominant_themes: '[]',
    growth_trajectory: 'steady',
    open_action_item_count: 0,
    total_entry_count: 0,
    last_entry_at: null,
  };

  db.prepare(`INSERT INTO users (
    id, created_at, updated_at, current_role, current_company, industry,
    years_of_experience, career_stage, short_term_goal, long_term_goal,
    current_focus_area, coaching_style, accountability_level, reminder_times,
    dominant_themes, growth_trajectory, open_action_item_count, total_entry_count, last_entry_at
  ) VALUES (
    @id, @created_at, @updated_at, @current_role, @current_company, @industry,
    @years_of_experience, @career_stage, @short_term_goal, @long_term_goal,
    @current_focus_area, @coaching_style, @accountability_level, @reminder_times,
    @dominant_themes, @growth_trajectory, @open_action_item_count, @total_entry_count, @last_entry_at
  )`).run(profile);

  return res.status(201).json({ success: true, data: rowToProfile(profile), isNew: true });
});

// GET /api/v1/profile
router.get('/', (req, res) => {
  const db = getDb();
  const userId = req.headers['x-user-id'] as string;

  if (!userId) return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'x-user-id header required' } });

  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
  if (!row) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Profile not found' } });

  res.json({ success: true, data: rowToProfile(row) });
});

// PUT /api/v1/profile
router.put('/', (req, res) => {
  const db = getDb();
  const userId = req.headers['x-user-id'] as string;
  if (!userId) return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'x-user-id header required' } });

  const updates = req.body;
  const now = new Date().toISOString();

  db.prepare(`UPDATE users SET
    current_role = COALESCE(@currentRole, current_role),
    current_company = COALESCE(@currentCompany, current_company),
    industry = COALESCE(@industry, industry),
    years_of_experience = COALESCE(@yearsOfExperience, years_of_experience),
    career_stage = COALESCE(@careerStage, career_stage),
    short_term_goal = COALESCE(@shortTermGoal, short_term_goal),
    long_term_goal = COALESCE(@longTermGoal, long_term_goal),
    current_focus_area = COALESCE(@currentFocusArea, current_focus_area),
    coaching_style = COALESCE(@coachingStyle, coaching_style),
    accountability_level = COALESCE(@accountabilityLevel, accountability_level),
    reminder_times = COALESCE(@reminderTimes, reminder_times),
    updated_at = @updatedAt
  WHERE id = @id`).run({
    ...updates,
    reminderTimes: updates.reminderTimes ? JSON.stringify(updates.reminderTimes) : undefined,
    updatedAt: now,
    id: userId,
  });

  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
  res.json({ success: true, data: rowToProfile(row) });
});

// DELETE /api/v1/profile
// Permanently deletes all data for this user. Irreversible.
router.delete('/', (req, res) => {
  const db = getDb();
  const userId = req.headers['x-user-id'] as string;
  if (!userId) return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'x-user-id header required' } });

  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
  if (!user) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });

  const deleteAll = db.transaction(() => {
    // Chat messages (references chat_sessions)
    db.prepare(`DELETE FROM chat_messages WHERE session_id IN
      (SELECT id FROM chat_sessions WHERE user_id = ?)`).run(userId);
    db.prepare('DELETE FROM chat_sessions WHERE user_id = ?').run(userId);
    // Milestones (references goals)
    db.prepare(`DELETE FROM milestones WHERE goal_id IN
      (SELECT id FROM goals WHERE user_id = ?)`).run(userId);
    db.prepare('DELETE FROM goals WHERE user_id = ?').run(userId);
    // Entry-linked data
    db.prepare(`DELETE FROM entry_analyses WHERE entry_id IN
      (SELECT id FROM journal_entries WHERE user_id = ?)`).run(userId);
    db.prepare('DELETE FROM action_items WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM journal_entries WHERE user_id = ?').run(userId);
    // Remaining user data
    db.prepare('DELETE FROM performance_reviews WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM career_themes WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM trajectory_snapshots WHERE user_id = ?').run(userId);
    // User last
    db.prepare('DELETE FROM users WHERE id = ?').run(userId);
  });

  try {
    deleteAll();
    res.json({ success: true, data: { message: 'All user data deleted.' } });
  } catch (error: any) {
    console.error('Data deletion failed:', error);
    res.status(500).json({ success: false, error: { code: 'DELETE_FAILED', message: 'Failed to delete user data.' } });
  }
});

function rowToProfile(row: any): CareerProfile {
  return {
    id: row.id,
    userId: row.id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    currentRole: row.current_role,
    currentCompany: row.current_company,
    industry: row.industry,
    yearsOfExperience: row.years_of_experience,
    careerStage: row.career_stage,
    shortTermGoal: row.short_term_goal,
    longTermGoal: row.long_term_goal,
    currentFocusArea: row.current_focus_area,
    coachingStyle: row.coaching_style,
    accountabilityLevel: row.accountability_level,
    reminderTimes: JSON.parse(row.reminder_times || '["15:00","19:00"]'),
    dominantThemes: JSON.parse(row.dominant_themes || '[]'),
    growthTrajectory: row.growth_trajectory,
    openActionItemCount: row.open_action_item_count,
    totalEntryCount: row.total_entry_count,
    lastEntryAt: row.last_entry_at,
  };
}

export default router;
