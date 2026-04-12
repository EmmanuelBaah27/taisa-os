import type { CareerProfile } from '@taisa/shared';

export function buildJournalProcessorSystem(profile: CareerProfile): string {
  return `You are a professional career coach reviewing a voice journal entry from your client.

Your client's profile:
- Role: ${profile.currentRole}${profile.currentCompany ? ` at ${profile.currentCompany}` : ''}
- Career stage: ${profile.careerStage}
- Industry: ${profile.industry}
- Short-term goal: ${profile.shortTermGoal}
- Long-term goal: ${profile.longTermGoal}
- Current focus: ${profile.currentFocusArea}
- Coaching style preference: ${profile.coachingStyle}
- Accountability level: ${profile.accountabilityLevel}

Your job is to deeply analyze this journal entry and extract structured information. Be perceptive. Read between the lines. Notice what is said AND unsaid. Do not be generic — be specific to what this person actually shared.

For the coachNote: write 2-3 sentences directly to your client in second person ("You"). Be warm but direct. Reference something specific they said. If their accountability level is "intense", push harder. If "gentle", be more encouraging.

For goalAssessments: for EACH active goal provided, explicitly assess whether this entry shows evidence of progress, regression, or neutrality. Surface specific quotes or behaviors from the entry as evidence. Assign a progressDelta between -5 (clear regression) and +20 (strong evidence of progress). Only assign high deltas when the evidence is concrete.

Return ONLY a valid JSON object — no markdown, no explanation — matching this exact structure:
{
  "summary": "string (2-3 sentences)",
  "sentiment": "very_positive" | "positive" | "neutral" | "challenging" | "difficult",
  "energyLevel": 1 | 2 | 3 | 4 | 5,
  "wins": [{ "title": "string", "description": "string", "impact": "small"|"medium"|"large", "category": "technical"|"leadership"|"relationship"|"delivery"|"learning" }],
  "challenges": [{ "title": "string", "description": "string", "category": "string", "resolution": "unresolved"|"in_progress"|"resolved" }],
  "decisions": [{ "title": "string", "description": "string", "decisionMade": "string|null", "context": "string|null" }],
  "actionItems": [{ "id": "uuid-placeholder", "title": "string", "dueContext": "string|null", "priority": "high"|"medium"|"low", "status": "open", "sourceEntryId": "entry-id-placeholder" }],
  "themes": [{ "label": "string", "weight": 0.0-1.0 }],
  "coachNote": "string",
  "growthAreas": ["string"],
  "momentumSignal": "accelerating" | "steady" | "stalling" | "recovering",
  "patternFlags": [{ "patternType": "string", "description": "string", "relatedEntryIds": [] }],
  "accountabilityCallouts": ["string"],
  "goalAssessments": [{ "goalId": "string", "evidence": "string", "progressDelta": number, "milestonesAchieved": [] }]
}`;
}

export function buildJournalProcessorUser(params: {
  transcript: string;
  recordedAt: string;
  durationSeconds: number | null;
  entryId: string;
  openActionItems: Array<{ title: string; dueContext: string | null; priority: string; createdAt: string }>;
  recentThemes: Array<{ label: string; count: number }>;
  activeGoals: Array<{ id: string; title: string; description: string; relatedThemes: string[]; progressPercent: number; milestones: Array<{ id: string; title: string; status: string }> }>;
}): string {
  const { transcript, recordedAt, durationSeconds, entryId, openActionItems, recentThemes, activeGoals } = params;

  return `Here is today's journal entry (recorded ${recordedAt}${durationSeconds ? `, duration ${Math.round(durationSeconds)}s` : ''}):

---
${transcript}
---

ENTRY ID (use for sourceEntryId in actionItems): ${entryId}

OPEN ACTION ITEMS FROM PRIOR ENTRIES (check for follow-through):
${openActionItems.length > 0
  ? openActionItems.map(a => `- [${a.priority.toUpperCase()}] "${a.title}" (committed ${a.createdAt})`).join('\n')
  : '(none — this may be their first entry)'}

RECURRING THEMES FROM LAST 30 ENTRIES (for pattern detection):
${recentThemes.length > 0
  ? recentThemes.map(t => `- "${t.label}": ${t.count} mentions`).join('\n')
  : '(no prior theme data)'}

ACTIVE GOALS (assess progress for each):
${activeGoals.length > 0
  ? activeGoals.map(g => `- Goal ID: ${g.id}\n  Title: "${g.title}"\n  Description: ${g.description}\n  Current progress: ${g.progressPercent}%\n  Related themes: ${g.relatedThemes.join(', ')}\n  Milestones: ${g.milestones.map(m => `${m.title} (${m.status})`).join(', ') || 'none'}`).join('\n\n')
  : '(no active goals yet)'}

Analyze this entry and return structured JSON only.`;
}
