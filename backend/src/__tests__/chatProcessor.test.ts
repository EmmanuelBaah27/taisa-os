import { buildChatProcessorSystem } from '../prompts/system/chatProcessor';

const baseProfile = {
  id: 'p1',
  userId: 'u1',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  currentRole: 'Senior Designer',
  currentCompany: 'Acme',
  industry: 'Tech',
  yearsOfExperience: 8,
  careerStage: 'senior',
  shortTermGoal: 'Lead a design system',
  longTermGoal: 'Become a CPO',
  currentFocusArea: 'Systems thinking',
  coachingStyle: 'direct',
  accountabilityLevel: 'intense',
  reminderTimes: [],
  dominantThemes: [],
  growthTrajectory: 'rising',
  openActionItemCount: 0,
  totalEntryCount: 10,
  lastEntryAt: '2026-04-17T10:00:00Z',
};

const baseGoals = [{ id: 'g1', title: 'Ship design system v1', progressPercent: 40 }];
const baseThemes = [
  { label: 'communication', count: 5 },
  { label: 'leadership', count: 3 },
];

describe('buildChatProcessorSystem', () => {
  test('includes user role and goals', () => {
    const prompt = buildChatProcessorSystem(baseProfile as any, baseGoals, baseThemes, null);
    expect(prompt).toContain('Senior Designer');
    expect(prompt).toContain('Ship design system v1');
  });

  test('includes recent themes', () => {
    const prompt = buildChatProcessorSystem(baseProfile as any, baseGoals, baseThemes, null);
    expect(prompt).toContain('communication');
    expect(prompt).toContain('leadership');
  });

  test('does NOT inject entry analysis when entryAnalysis is null', () => {
    const prompt = buildChatProcessorSystem(baseProfile as any, baseGoals, baseThemes, null);
    expect(prompt).not.toContain('ENTRY CONTEXT');
  });

  test('injects entry analysis when entryAnalysis is provided', () => {
    const analysis = {
      summary: 'Had a productive day',
      wins: [{ title: 'Shipped v1' }],
      challenges: [{ title: 'Stakeholder misalignment' }],
      coachNote: 'Keep pushing.',
      actionItems: [{ title: 'Follow up with PM' }],
    };
    const prompt = buildChatProcessorSystem(baseProfile as any, baseGoals, baseThemes, analysis as any);
    expect(prompt).toContain('ENTRY CONTEXT');
    expect(prompt).toContain('Had a productive day');
    expect(prompt).toContain('Shipped v1');
    expect(prompt).toContain('Follow up with PM');
  });

  test('reflects coaching style in persona instructions', () => {
    const prompt = buildChatProcessorSystem(baseProfile as any, baseGoals, baseThemes, null);
    expect(prompt).toContain('direct');
  });
});
