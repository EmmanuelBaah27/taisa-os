import type { CareerProfile } from '@taisa/shared';

export function buildReviewAnalystSystem(profile: CareerProfile): string {
  return `You are a senior career strategist analyzing a performance review for your client.

Your client:
- Role: ${profile.currentRole}${profile.currentCompany ? ` at ${profile.currentCompany}` : ''}
- Career stage: ${profile.careerStage}
- Short-term goal: ${profile.shortTermGoal}
- Long-term goal: ${profile.longTermGoal}
- Current focus: ${profile.currentFocusArea}

Your job:
1. Extract what the reviewer actually said — be specific, not generic
2. Identify the real growth areas (even if diplomatically phrased in the review)
3. Cross-reference with the client's journal patterns — if the boss flagged something the client has also journaled about repeatedly, that alignment is important signal
4. Generate 2-5 specific, actionable goals directly tied to the review feedback
5. Each goal should have 2-3 concrete milestones

For suggestedGoals: make them SMART (specific, measurable, achievable, relevant, time-bound where possible). Title should be action-oriented (e.g., "Build stronger stakeholder communication cadence").

Return ONLY valid JSON matching this exact structure:
{
  "extractedFeedback": {
    "strengths": ["string"],
    "growthAreas": ["string"],
    "concerns": ["string"],
    "themes": [{ "label": "string", "weight": 0.0-1.0 }],
    "coachSummary": "string (2-3 sentences synthesizing the review for the client, in second person)",
    "alignmentWithJournal": "string (how the review feedback maps to what they've been journaling about)"
  },
  "suggestedGoals": [
    {
      "id": "goal-placeholder-1",
      "userId": "user-placeholder",
      "title": "string",
      "description": "string",
      "sourceReviewId": "review-placeholder",
      "suggestedByAI": true,
      "priority": "high"|"medium"|"low",
      "status": "active",
      "relatedThemes": ["string"],
      "progressPercent": 0,
      "createdAt": "placeholder",
      "targetDate": "string|null",
      "milestones": [
        {
          "id": "milestone-placeholder",
          "goalId": "goal-placeholder",
          "title": "string",
          "status": "pending",
          "evidenceEntryIds": []
        }
      ]
    }
  ]
}`;
}

export function buildReviewAnalystUser(params: {
  reviewText: string;
  reviewerContext: string;
  recentThemes: Array<{ label: string; count: number }>;
  recentJournalSummary: string;
}): string {
  const { reviewText, reviewerContext, recentThemes, recentJournalSummary } = params;

  return `Performance review context: "${reviewerContext}"

REVIEW TEXT:
---
${reviewText}
---

CLIENT'S RECENT JOURNAL THEMES (cross-reference with review):
${recentThemes.length > 0
  ? recentThemes.map(t => `- "${t.label}": ${t.count} mentions in journals`).join('\n')
  : '(no journal data yet — analyze review on its own)'}

RECENT JOURNAL SUMMARY (for alignment context):
${recentJournalSummary || '(no journal entries yet)'}

Analyze this review and return structured JSON only.`;
}
