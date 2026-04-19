-- Users / Career Profile
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  current_role TEXT NOT NULL DEFAULT '',
  current_company TEXT,
  industry TEXT NOT NULL DEFAULT '',
  years_of_experience INTEGER NOT NULL DEFAULT 0,
  career_stage TEXT NOT NULL DEFAULT 'mid',
  short_term_goal TEXT NOT NULL DEFAULT '',
  long_term_goal TEXT NOT NULL DEFAULT '',
  current_focus_area TEXT NOT NULL DEFAULT '',
  coaching_style TEXT NOT NULL DEFAULT 'direct',
  accountability_level TEXT NOT NULL DEFAULT 'moderate',
  reminder_times TEXT NOT NULL DEFAULT '["15:00","19:00"]',
  dominant_themes TEXT NOT NULL DEFAULT '[]',
  growth_trajectory TEXT NOT NULL DEFAULT 'steady',
  open_action_item_count INTEGER NOT NULL DEFAULT 0,
  total_entry_count INTEGER NOT NULL DEFAULT 0,
  last_entry_at TEXT
);

-- Journal Entries
CREATE TABLE IF NOT EXISTS journal_entries (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  recorded_at TEXT NOT NULL,
  input_type TEXT NOT NULL DEFAULT 'voice',
  raw_transcript TEXT NOT NULL DEFAULT '',
  edited_transcript TEXT,
  audio_duration_seconds REAL,
  audio_file_ref TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  analysis_id TEXT
);

-- Entry Analyses
CREATE TABLE IF NOT EXISTS entry_analyses (
  id TEXT PRIMARY KEY,
  entry_id TEXT NOT NULL REFERENCES journal_entries(id),
  created_at TEXT NOT NULL,
  model_version TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  sentiment TEXT NOT NULL DEFAULT 'neutral',
  energy_level INTEGER NOT NULL DEFAULT 3,
  wins TEXT NOT NULL DEFAULT '[]',
  challenges TEXT NOT NULL DEFAULT '[]',
  decisions TEXT NOT NULL DEFAULT '[]',
  action_items TEXT NOT NULL DEFAULT '[]',
  themes TEXT NOT NULL DEFAULT '[]',
  coach_note TEXT NOT NULL DEFAULT '',
  growth_areas TEXT NOT NULL DEFAULT '[]',
  momentum_signal TEXT NOT NULL DEFAULT 'steady',
  pattern_flags TEXT NOT NULL DEFAULT '[]',
  accountability_callouts TEXT NOT NULL DEFAULT '[]',
  goal_assessments TEXT NOT NULL DEFAULT '[]'
);

-- Action Items (denormalized for quick querying across entries)
CREATE TABLE IF NOT EXISTS action_items (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  source_entry_id TEXT NOT NULL REFERENCES journal_entries(id),
  title TEXT NOT NULL,
  due_context TEXT,
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'open',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Performance Reviews
CREATE TABLE IF NOT EXISTS performance_reviews (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  reviewer_context TEXT NOT NULL DEFAULT '',
  raw_text TEXT NOT NULL,
  extracted_feedback TEXT NOT NULL DEFAULT '{}',
  suggested_goals TEXT NOT NULL DEFAULT '[]'
);

-- Goals
CREATE TABLE IF NOT EXISTS goals (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  source_review_id TEXT REFERENCES performance_reviews(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  suggested_by_ai INTEGER NOT NULL DEFAULT 0,
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'active',
  related_themes TEXT NOT NULL DEFAULT '[]',
  progress_percent INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  target_date TEXT
);

-- Milestones
CREATE TABLE IF NOT EXISTS milestones (
  id TEXT PRIMARY KEY,
  goal_id TEXT NOT NULL REFERENCES goals(id),
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  evidence_entry_ids TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Career Themes (aggregate frequency tracking)
CREATE TABLE IF NOT EXISTS career_themes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  label TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  trend TEXT NOT NULL DEFAULT 'stable',
  UNIQUE(user_id, label)
);

-- Trajectory Snapshots
CREATE TABLE IF NOT EXISTS trajectory_snapshots (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  generated_at TEXT NOT NULL,
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  narrative_summary TEXT NOT NULL DEFAULT '',
  key_themes TEXT NOT NULL DEFAULT '[]',
  momentum_history TEXT NOT NULL DEFAULT '[]',
  win_count INTEGER NOT NULL DEFAULT 0,
  challenge_count INTEGER NOT NULL DEFAULT 0,
  resolved_challenge_count INTEGER NOT NULL DEFAULT 0,
  growth_observations TEXT NOT NULL DEFAULT '[]',
  suggested_focus_areas TEXT NOT NULL DEFAULT '[]',
  goal_progress_summaries TEXT NOT NULL DEFAULT '[]'
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_entries_user_id ON journal_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_entries_recorded_at ON journal_entries(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_analyses_entry_id ON entry_analyses(entry_id);
CREATE INDEX IF NOT EXISTS idx_action_items_user_status ON action_items(user_id, status);
CREATE INDEX IF NOT EXISTS idx_goals_user_status ON goals(user_id, status);
CREATE INDEX IF NOT EXISTS idx_themes_user_label ON career_themes(user_id, label);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON performance_reviews(user_id);

-- Chat Sessions
CREATE TABLE IF NOT EXISTS chat_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  entry_id TEXT REFERENCES journal_entries(id),
  started_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'ended'))
);

-- Chat Messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES chat_sessions(id),
  role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- Chat indexes
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_entry_id ON chat_sessions(entry_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
