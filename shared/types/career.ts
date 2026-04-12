import type { MomentumSignal, Sentiment, Theme } from './journal';

export type CareerStage = 'early' | 'mid' | 'senior' | 'executive' | 'founder';
export type CoachingStyle = 'direct' | 'supportive' | 'socratic' | 'structured';
export type AccountabilityLevel = 'gentle' | 'moderate' | 'intense';
export type GrowthTrajectory = 'rising' | 'steady' | 'plateaued' | 'transitioning';

export interface CareerProfile {
  id: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  currentRole: string;
  currentCompany: string | null;
  industry: string;
  yearsOfExperience: number;
  careerStage: CareerStage;
  shortTermGoal: string;
  longTermGoal: string;
  currentFocusArea: string;
  coachingStyle: CoachingStyle;
  accountabilityLevel: AccountabilityLevel;
  reminderTimes: string[]; // e.g. ["15:00", "19:00"]
  dominantThemes: string[];
  growthTrajectory: GrowthTrajectory;
  openActionItemCount: number;
  totalEntryCount: number;
  lastEntryAt: string | null;
}

export interface MomentumPoint {
  entryId: string;
  recordedAt: string;
  signal: MomentumSignal;
  sentiment: Sentiment;
  energyLevel: number;
}

export interface ThemeTrend {
  label: string;
  count: number;
  trend: 'increasing' | 'stable' | 'decreasing';
  firstSeenAt: string;
}

export interface TrajectorySnapshot {
  id: string;
  userId: string;
  generatedAt: string;
  periodStart: string;
  periodEnd: string;
  narrativeSummary: string;
  keyThemes: ThemeTrend[];
  momentumHistory: MomentumPoint[];
  winCount: number;
  challengeCount: number;
  resolvedChallengeCount: number;
  growthObservations: string[];
  suggestedFocusAreas: string[];
  goalProgressSummaries: GoalProgressSummary[];
}

export interface GoalProgressSummary {
  goalId: string;
  goalTitle: string;
  progressPercent: number;
  observation: string;
  evidenceCount: number;
}
