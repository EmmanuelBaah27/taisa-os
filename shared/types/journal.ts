export type InputType = 'voice' | 'text';
export type EntryStatus = 'draft' | 'transcribing' | 'processing' | 'complete' | 'error';
export type Sentiment = 'very_positive' | 'positive' | 'neutral' | 'challenging' | 'difficult';
export type MomentumSignal = 'accelerating' | 'steady' | 'stalling' | 'recovering';
export type WinCategory = 'technical' | 'leadership' | 'relationship' | 'delivery' | 'learning';
export type WinImpact = 'small' | 'medium' | 'large';
export type ChallengeResolution = 'unresolved' | 'in_progress' | 'resolved';
export type ActionItemPriority = 'high' | 'medium' | 'low';
export type ActionItemStatus = 'open' | 'completed' | 'dropped';

export interface JournalEntry {
  id: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  recordedAt: string;
  inputType: InputType;
  rawTranscript: string;
  editedTranscript: string | null;
  audioDurationSeconds: number | null;
  audioFileRef: string | null;
  status: EntryStatus;
  analysisId: string | null;
}

export interface Win {
  title: string;
  description: string;
  impact: WinImpact;
  category: WinCategory;
}

export interface Challenge {
  title: string;
  description: string;
  category: string;
  resolution: ChallengeResolution;
}

export interface Decision {
  title: string;
  description: string;
  decisionMade: string | null;
  context: string | null;
}

export interface ActionItem {
  id: string;
  title: string;
  dueContext: string | null;
  priority: ActionItemPriority;
  status: ActionItemStatus;
  sourceEntryId: string;
}

export interface Theme {
  label: string;
  weight: number;
}

export interface PatternFlag {
  patternType: string;
  description: string;
  relatedEntryIds: string[];
}

export interface EntryAnalysis {
  id: string;
  entryId: string;
  createdAt: string;
  modelVersion: string;
  summary: string;
  sentiment: Sentiment;
  energyLevel: 1 | 2 | 3 | 4 | 5;
  wins: Win[];
  challenges: Challenge[];
  decisions: Decision[];
  actionItems: ActionItem[];
  themes: Theme[];
  coachNote: string;
  growthAreas: string[];
  momentumSignal: MomentumSignal;
  patternFlags: PatternFlag[];
  accountabilityCallouts: string[];
  goalAssessments: GoalAssessment[];
}

export interface GoalAssessment {
  goalId: string;
  evidence: string;
  progressDelta: number; // -5 to +20, how much this entry moves the needle
  milestonesAchieved: string[]; // milestone IDs
}
