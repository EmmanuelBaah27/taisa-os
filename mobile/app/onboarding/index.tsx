import { useState } from 'react';
import { View, Text, TextInput, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import * as Device from 'expo-device';
import { v4 as uuidv4 } from 'uuid';
import { useCareerStore } from '../../src/stores/careerStore';
import { colors, spacing, fontSize, radius } from '../../src/constants/theme';

const STAGES = ['early', 'mid', 'senior', 'executive', 'founder'];
const COACHING_STYLES = ['direct', 'supportive', 'socratic', 'structured'];
const ACCOUNTABILITY = ['gentle', 'moderate', 'intense'];

export default function OnboardingScreen() {
  const { initUser, isLoading } = useCareerStore();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    currentRole: '',
    currentCompany: '',
    industry: '',
    yearsOfExperience: '0',
    careerStage: 'mid',
    shortTermGoal: '',
    longTermGoal: '',
    currentFocusArea: '',
    coachingStyle: 'direct',
    accountabilityLevel: 'moderate',
  });

  const updateForm = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }));

  const handleSubmit = async () => {
    const deviceId = uuidv4(); // In production, use Device.osBuildId or similar
    await initUser(deviceId, {
      ...form,
      yearsOfExperience: parseInt(form.yearsOfExperience) || 0,
    } as any);
    router.replace('/(tabs)');
  };

  const steps = [
    // Step 0: Career context
    <ScrollView key={0} contentContainerStyle={styles.stepContent}>
      <Text style={styles.stepTitle}>Tell me about yourself</Text>
      <Text style={styles.stepSubtitle}>This helps your coach personalize every response.</Text>

      <Field label="Current role" placeholder="e.g. Product Manager" value={form.currentRole} onChange={v => updateForm('currentRole', v)} />
      <Field label="Company (optional)" placeholder="e.g. Acme Corp" value={form.currentCompany} onChange={v => updateForm('currentCompany', v)} />
      <Field label="Industry" placeholder="e.g. FinTech, Healthcare, Media" value={form.industry} onChange={v => updateForm('industry', v)} />
      <Field label="Years of experience" placeholder="5" value={form.yearsOfExperience} onChange={v => updateForm('yearsOfExperience', v)} keyboardType="numeric" />

      <Text style={styles.fieldLabel}>Career stage</Text>
      <View style={styles.pills}>
        {STAGES.map(s => (
          <Pill key={s} label={s} selected={form.careerStage === s} onPress={() => updateForm('careerStage', s)} />
        ))}
      </View>

      <TouchableOpacity
        style={[styles.button, { opacity: form.currentRole && form.industry ? 1 : 0.5 }]}
        onPress={() => setStep(1)}
        disabled={!form.currentRole || !form.industry}
      >
        <Text style={styles.buttonText}>Continue</Text>
      </TouchableOpacity>
    </ScrollView>,

    // Step 1: Goals
    <ScrollView key={1} contentContainerStyle={styles.stepContent}>
      <Text style={styles.stepTitle}>What are you working toward?</Text>
      <Text style={styles.stepSubtitle}>Your coach uses these to keep your reflections focused.</Text>

      <Field label="Short-term goal (3-6 months)" placeholder="e.g. Get promoted to Senior PM" value={form.shortTermGoal} onChange={v => updateForm('shortTermGoal', v)} multiline />
      <Field label="Long-term vision (1-3 years)" placeholder="e.g. Lead a product org of 10+" value={form.longTermGoal} onChange={v => updateForm('longTermGoal', v)} multiline />
      <Field label="Current focus area" placeholder="e.g. Improving stakeholder communication" value={form.currentFocusArea} onChange={v => updateForm('currentFocusArea', v)} />

      <View style={styles.row}>
        <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={() => setStep(0)}>
          <Text style={styles.secondaryButtonText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton, { opacity: form.shortTermGoal ? 1 : 0.5 }]}
          onPress={() => setStep(2)}
          disabled={!form.shortTermGoal}
        >
          <Text style={styles.buttonText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>,

    // Step 2: Coaching preferences
    <ScrollView key={2} contentContainerStyle={styles.stepContent}>
      <Text style={styles.stepTitle}>How should your coach work with you?</Text>

      <Text style={styles.fieldLabel}>Coaching style</Text>
      <View style={styles.pills}>
        {COACHING_STYLES.map(s => (
          <Pill key={s} label={s} selected={form.coachingStyle === s} onPress={() => updateForm('coachingStyle', s)} />
        ))}
      </View>

      <Text style={styles.fieldLabel}>Accountability level</Text>
      <View style={styles.pills}>
        {ACCOUNTABILITY.map(a => (
          <Pill key={a} label={a} selected={form.accountabilityLevel === a} onPress={() => updateForm('accountabilityLevel', a)} />
        ))}
      </View>

      <View style={styles.row}>
        <TouchableOpacity style={[styles.button, styles.secondaryButton]} onPress={() => setStep(1)}>
          <Text style={styles.secondaryButtonText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.primaryButton]} onPress={handleSubmit} disabled={isLoading}>
          {isLoading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>Start journaling</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>,
  ];

  return (
    <View style={styles.container}>
      <View style={styles.progress}>
        {[0, 1, 2].map(i => (
          <View key={i} style={[styles.dot, step >= i && styles.dotActive]} />
        ))}
      </View>
      {steps[step]}
    </View>
  );
}

function Field({ label, ...props }: { label: string; [key: string]: any }) {
  return (
    <View style={{ marginBottom: spacing.lg }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.input, props.multiline && { height: 80, textAlignVertical: 'top' }]}
        placeholderTextColor={colors.textTertiary}
        {...props}
      />
    </View>
  );
}

function Pill({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.pill, selected && styles.pillSelected]}>
      <Text style={[styles.pillText, selected && styles.pillTextSelected]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  progress: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm, paddingTop: 60, marginBottom: spacing.lg },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.accent },
  stepContent: { padding: spacing.lg, paddingBottom: 60 },
  stepTitle: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.sm },
  stepSubtitle: { fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: spacing.xl, lineHeight: 20 },
  fieldLabel: { fontSize: fontSize.sm, fontWeight: '500', color: colors.textSecondary, marginBottom: spacing.sm },
  input: {
    backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, color: colors.textPrimary, fontSize: fontSize.base, height: 48,
  },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.xl },
  pill: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.full, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  pillSelected: { borderColor: colors.accent, backgroundColor: colors.accentMuted },
  pillText: { fontSize: fontSize.sm, color: colors.textSecondary, textTransform: 'capitalize' },
  pillTextSelected: { color: colors.accent, fontWeight: '600' },
  button: { flex: 1, paddingVertical: spacing.md, borderRadius: radius.full, alignItems: 'center' },
  primaryButton: { backgroundColor: colors.accent },
  secondaryButton: { borderWidth: 1, borderColor: colors.border, marginRight: spacing.sm },
  buttonText: { color: '#FFF', fontWeight: '600', fontSize: fontSize.base },
  secondaryButtonText: { color: colors.textSecondary, fontSize: fontSize.base },
  row: { flexDirection: 'row', marginTop: spacing.lg },
});
