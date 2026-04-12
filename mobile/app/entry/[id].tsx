import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import api from '../../src/services/api';
import { colors, spacing, fontSize, radius } from '../../src/constants/theme';
import type { JournalEntry, EntryAnalysis } from '@taisa/shared';

export default function EntryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [analysis, setAnalysis] = useState<EntryAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showTranscript, setShowTranscript] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.get(`/entries/${id}`).then(res => {
      setEntry(res.data.data.entry);
      setAnalysis(res.data.data.analysis);
    }).finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) return <View style={styles.center}><ActivityIndicator color={colors.accent} /></View>;
  if (!entry) return <View style={styles.center}><Text style={styles.errorText}>Entry not found</Text></View>;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={() => router.back()} style={styles.back}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.date}>{new Date(entry.recordedAt).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</Text>

      {/* Coach Note */}
      {analysis?.coachNote && (
        <View style={styles.coachCard}>
          <Text style={styles.coachLabel}>Coach note</Text>
          <Text style={styles.coachNote}>{analysis.coachNote}</Text>
        </View>
      )}

      {/* Analysis */}
      {analysis && (
        <>
          <Text style={styles.summary}>{analysis.summary}</Text>

          <View style={styles.metaRow}>
            <MetaChip label={analysis.sentiment.replace('_', ' ')} color={colors.sentiment[analysis.sentiment]} />
            <MetaChip label={`Energy ${analysis.energyLevel}/5`} color={colors.textSecondary} />
            <MetaChip label={analysis.momentumSignal} color={colors.momentum[analysis.momentumSignal]} />
          </View>

          {analysis.wins.length > 0 && (
            <Section title={`Wins (${analysis.wins.length})`}>
              {analysis.wins.map((w, i) => (
                <Item key={i} title={w.title} body={w.description} accent={colors.positive} />
              ))}
            </Section>
          )}

          {analysis.challenges.length > 0 && (
            <Section title={`Challenges (${analysis.challenges.length})`}>
              {analysis.challenges.map((c, i) => (
                <Item key={i} title={c.title} body={c.description} accent={colors.warning} />
              ))}
            </Section>
          )}

          {analysis.decisions.length > 0 && (
            <Section title="Decisions">
              {analysis.decisions.map((d, i) => (
                <Item key={i} title={d.title} body={d.description} accent={colors.info} />
              ))}
            </Section>
          )}

          {analysis.actionItems.length > 0 && (
            <Section title="Action Items">
              {analysis.actionItems.map(a => (
                <View key={a.id} style={styles.actionItem}>
                  <View style={[styles.priorityDot, { backgroundColor: a.priority === 'high' ? colors.error : a.priority === 'medium' ? colors.warning : colors.textTertiary }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.actionTitle}>{a.title}</Text>
                    {a.dueContext && <Text style={styles.actionDue}>{a.dueContext}</Text>}
                  </View>
                </View>
              ))}
            </Section>
          )}

          {analysis.themes.length > 0 && (
            <View style={styles.themes}>
              {analysis.themes.map((t, i) => (
                <View key={i} style={styles.themeTag}>
                  <Text style={styles.themeText}>{t.label}</Text>
                </View>
              ))}
            </View>
          )}

          {analysis.accountabilityCallouts.length > 0 && (
            <View style={styles.calloutCard}>
              <Text style={styles.calloutLabel}>Accountability</Text>
              {analysis.accountabilityCallouts.map((c, i) => (
                <Text key={i} style={styles.callout}>• {c}</Text>
              ))}
            </View>
          )}
        </>
      )}

      {/* Transcript toggle */}
      <TouchableOpacity onPress={() => setShowTranscript(v => !v)} style={styles.transcriptToggle}>
        <Text style={styles.transcriptToggleText}>{showTranscript ? 'Hide transcript' : 'Show transcript'}</Text>
      </TouchableOpacity>
      {showTranscript && (
        <Text style={styles.transcript}>{entry.editedTranscript || entry.rawTranscript}</Text>
      )}
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{title}</Text>
      {children}
    </View>
  );
}

function Item({ title, body, accent }: { title: string; body: string; accent: string }) {
  return (
    <View style={[styles.item, { borderLeftColor: accent }]}>
      <Text style={styles.itemTitle}>{title}</Text>
      <Text style={styles.itemBody}>{body}</Text>
    </View>
  );
}

function MetaChip({ label, color }: { label: string; color: string }) {
  return (
    <View style={styles.chip}>
      <Text style={[styles.chipText, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingTop: 60, paddingBottom: 60 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  back: { marginBottom: spacing.lg },
  backText: { color: colors.accent, fontSize: fontSize.sm },
  date: { fontSize: fontSize.xl, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.lg },
  coachCard: { backgroundColor: colors.accentMuted, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.lg, borderWidth: 1, borderColor: colors.accent + '40' },
  coachLabel: { fontSize: fontSize.xs, fontWeight: '600', color: colors.accent, letterSpacing: 1, textTransform: 'uppercase', marginBottom: spacing.sm },
  coachNote: { fontSize: fontSize.base, color: colors.textPrimary, lineHeight: 22, fontStyle: 'italic' },
  summary: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 20, marginBottom: spacing.lg },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.xl },
  chip: { backgroundColor: colors.surface, borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: 4, borderWidth: 1, borderColor: colors.border },
  chipText: { fontSize: fontSize.xs, fontWeight: '500', textTransform: 'capitalize' },
  section: { marginBottom: spacing.xl },
  sectionLabel: { fontSize: fontSize.xs, fontWeight: '600', color: colors.textTertiary, letterSpacing: 1, textTransform: 'uppercase', marginBottom: spacing.md },
  item: { borderLeftWidth: 2, paddingLeft: spacing.md, marginBottom: spacing.md },
  itemTitle: { fontSize: fontSize.sm, fontWeight: '600', color: colors.textPrimary },
  itemBody: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 18, marginTop: 2 },
  actionItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.sm },
  priorityDot: { width: 8, height: 8, borderRadius: 4, marginRight: spacing.sm, marginTop: 4 },
  actionTitle: { fontSize: fontSize.sm, color: colors.textPrimary },
  actionDue: { fontSize: fontSize.xs, color: colors.textTertiary, marginTop: 2 },
  themes: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.xl },
  themeTag: { backgroundColor: colors.accentMuted, borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 4 },
  themeText: { fontSize: fontSize.xs, color: colors.textAccent },
  calloutCard: { backgroundColor: colors.surfaceElevated, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.xl },
  calloutLabel: { fontSize: fontSize.xs, fontWeight: '600', color: colors.warning, letterSpacing: 1, textTransform: 'uppercase', marginBottom: spacing.sm },
  callout: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 20 },
  transcriptToggle: { paddingVertical: spacing.sm, marginBottom: spacing.sm },
  transcriptToggleText: { color: colors.textSecondary, fontSize: fontSize.sm },
  transcript: { fontSize: fontSize.sm, color: colors.textTertiary, lineHeight: 20 },
  errorText: { color: colors.error, fontSize: fontSize.base },
});
