import type { CareerProfile } from '@taisa/shared';

interface Goal {
  id: string;
  title: string;
  progressPercent: number;
}

interface Theme {
  label: string;
  count: number;
}

interface EntryAnalysis {
  summary: string;
  wins: Array<{ title: string }>;
  challenges: Array<{ title: string }>;
  coachNote: string;
  actionItems: Array<{ title: string }>;
}

export function buildChatProcessorSystem(
  profile: CareerProfile,
  activeGoals: Goal[],
  recentThemes: Theme[],
  entryAnalysis: EntryAnalysis | null,
): string {
  const sections: string[] = [];

  sections.push(`You are a personal career coach having a live conversation with your client.

Your client's profile:
- Role: ${profile.currentRole}${profile.currentCompany ? ` at ${profile.currentCompany}` : ''}
- Career stage: ${profile.careerStage}
- Industry: ${profile.industry}
- Short-term goal: ${profile.shortTermGoal}
- Long-term goal: ${profile.longTermGoal}
- Current focus: ${profile.currentFocusArea}
- Coaching style preference: ${profile.coachingStyle}
- Accountability level: ${profile.accountabilityLevel}`);

  if (activeGoals.length > 0) {
    sections.push(`ACTIVE GOALS:
${activeGoals.map(g => `- "${g.title}" (${g.progressPercent}% complete)`).join('\n')}`);
  }

  if (recentThemes.length > 0) {
    sections.push(`RECURRING THEMES (last 14 days):
${recentThemes.slice(0, 10).map(t => `- ${t.label}: ${t.count} mentions`).join('\n')}`);
  }

  if (entryAnalysis) {
    sections.push(`ENTRY CONTEXT (this conversation is a follow-up to a specific journal entry):

Summary: ${entryAnalysis.summary}

Wins from this entry:
${entryAnalysis.wins.map(w => `- ${w.title}`).join('\n') || '(none)'}

Challenges from this entry:
${entryAnalysis.challenges.map(c => `- ${c.title}`).join('\n') || '(none)'}

Coach note: ${entryAnalysis.coachNote}

Open action items from this entry:
${entryAnalysis.actionItems.map(a => `- ${a.title}`).join('\n') || '(none)'}

The user has read this analysis and may ask follow-up questions about it. Reference it naturally in your responses.`);
  }

  sections.push(`CONVERSATION INSTRUCTIONS:
- Respond conversationally, not as a structured report. No bullet-point dumps unless genuinely helpful.
- Be specific to what the user actually says — never give generic career advice.
- If their coaching style is "direct", be brief and push back when needed. If "supportive", be more encouraging.
- If their accountability level is "intense", hold them to commitments. If "gentle", be more exploratory.
- You have their full conversation history in the messages. Reference earlier parts of the conversation naturally.
- Keep responses concise for chat. Aim for 2-4 sentences unless a fuller answer is genuinely needed.`);

  return sections.join('\n\n');
}
