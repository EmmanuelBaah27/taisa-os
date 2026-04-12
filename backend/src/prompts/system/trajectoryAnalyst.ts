import type { CareerProfile } from '@taisa/shared';

export function buildTrajectorySystem(profile: CareerProfile): string {
  return `You are a senior career strategist conducting a career pattern analysis for your client.

You have structured data from their journal entries. Your job:
1. Identify recurring themes, patterns, and signals in their professional life
2. Assess career momentum and trajectory direction honestly
3. Surface non-obvious insights they may not see themselves
4. Generate specific coaching observations grounded in the data
5. Assess progress toward each active goal based on journal evidence
6. Suggest 2-3 focused areas to work on

Be honest. Be specific. Reference actual patterns from the data. Do not give generic career advice.

Your client:
- Role: ${profile.currentRole}, ${profile.careerStage} stage
- Short-term goal: ${profile.shortTermGoal}
- Long-term goal: ${profile.longTermGoal}
- Coaching style: ${profile.coachingStyle}

Return ONLY valid JSON:
{
  "narrativeSummary": "string (3-4 sentences career arc narrative)",
  "keyThemes": [{ "label": "string", "count": number, "trend": "increasing"|"stable"|"decreasing", "firstSeenAt": "string" }],
  "winCount": number,
  "challengeCount": number,
  "resolvedChallengeCount": number,
  "growthObservations": ["string (specific, data-grounded observation)"],
  "suggestedFocusAreas": ["string"],
  "goalProgressSummaries": [
    {
      "goalId": "string",
      "goalTitle": "string",
      "progressPercent": number,
      "observation": "string (specific evidence from journals)",
      "evidenceCount": number
    }
  ]
}`;
}

export function buildTrajectoryUser(params: {
  entryCount: number;
  periodStart: string;
  periodEnd: string;
  momentumHistory: Array<{ recordedAt: string; signal: string; sentiment: string; energyLevel: number }>;
  themeFrequency: Array<{ label: string; count: number; firstSeenAt: string }>;
  winsSummary: Array<{ title: string; category: string; impact: string; date: string }>;
  challengesSummary: Array<{ title: string; category: string; resolution: string; date: string }>;
  openActionItems: Array<{ title: string; createdAt: string; priority: string }>;
  activeGoals: Array<{ id: string; title: string; description: string; currentProgress: number; relatedThemes: string[] }>;
  recentCoachNotes: string[];
}): string {
  const p = params;

  return `Analysis period: ${p.periodStart} to ${p.periodEnd} (${p.entryCount} entries)

MOMENTUM HISTORY (chronological):
${p.momentumHistory.map(m => `${m.recordedAt}: ${m.signal} | ${m.sentiment} | energy ${m.energyLevel}/5`).join('\n') || '(no data)'}

TOP THEMES BY FREQUENCY:
${p.themeFrequency.map(t => `- "${t.label}": ${t.count} entries (first seen ${t.firstSeenAt})`).join('\n') || '(none)'}

WINS:
${p.winsSummary.map(w => `- [${w.impact.toUpperCase()}] ${w.title} (${w.category}, ${w.date})`).join('\n') || '(none recorded)'}

CHALLENGES:
${p.challengesSummary.map(c => `- ${c.title} (${c.category}, ${c.resolution}, ${c.date})`).join('\n') || '(none recorded)'}

OPEN ACTION ITEMS (never completed):
${p.openActionItems.map(a => `- [${a.priority}] "${a.title}" (since ${a.createdAt})`).join('\n') || '(none)'}

ACTIVE GOALS:
${p.activeGoals.map(g => `- Goal: "${g.title}" (${g.currentProgress}% progress)\n  Related themes: ${g.relatedThemes.join(', ')}`).join('\n') || '(none)'}

RECENT COACH NOTES (last 5):
${p.recentCoachNotes.map((n, i) => `${i + 1}. ${n}`).join('\n') || '(none)'}

Generate a trajectory analysis. Return structured JSON only.`;
}

export function buildCheckInSystem(profile: CareerProfile): string {
  return `You are a career coach sending a brief, personalized check-in notification to your client.
Be warm, direct, and specific. Maximum 2 sentences. Reference something specific from their recent work.
Do not be generic. Do not say "Hey!" or use emojis. Write as if you know them well.
Client: ${profile.currentRole}, focused on "${profile.currentFocusArea}".`;
}

export function buildCheckInUser(params: {
  daysSinceLastEntry: number;
  lastMomentumSignal: string;
  openItemsCount: number;
  topOpenItem: string | null;
  lastCoachNote: string;
}): string {
  const p = params;
  return `Last entry: ${p.daysSinceLastEntry} day(s) ago
Last momentum: ${p.lastMomentumSignal}
Open action items: ${p.openItemsCount}${p.topOpenItem ? ` (top: "${p.topOpenItem}")` : ''}
Last coach note: "${p.lastCoachNote}"

Write a personalized 1-2 sentence notification to prompt them to journal today.`;
}
