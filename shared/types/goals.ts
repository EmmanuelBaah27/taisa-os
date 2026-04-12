import type { Theme } from './journal';

export type GoalPriority = 'high' | 'medium' | 'low';
export type GoalStatus = 'active' | 'achieved' | 'dropped';
export type MilestoneStatus = 'pending' | 'complete';

export interface Milestone {
  id: string;
  goalId: string;
  title: string;
  status: MilestoneStatus;
  evidenceEntryIds: string[];
}

export interface Goal {
  id: string;
  userId: string;
  title: string;
  description: string;
  sourceReviewId: string | null;
  suggestedByAI: boolean;
  priority: GoalPriority;
  status: GoalStatus;
  relatedThemes: string[];
  progressPercent: number;
  createdAt: string;
  targetDate: string | null;
  milestones: Milestone[];
}

export interface ReviewFeedback {
  strengths: string[];
  growthAreas: string[];
  concerns: string[];
  themes: Theme[];
  coachSummary: string;
  alignmentWithJournal: string; // How review feedback maps to existing journal patterns
}

export interface PerformanceReview {
  id: string;
  userId: string;
  createdAt: string;
  reviewerContext: string;
  rawText: string;
  extractedFeedback: ReviewFeedback;
  suggestedGoals: Goal[];
}
