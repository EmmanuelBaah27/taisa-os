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
