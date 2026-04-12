import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import api from '../../src/services/api';
import { colors, spacing, fontSize, radius } from '../../src/constants/theme';
import type { TrajectorySnapshot } from '@taisa/shared';

export default function TrajectoryScreen() {
  const [snapshot, setSnapshot] = useState<TrajectorySnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTrajectory();
  }, []);

  const loadTrajectory = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/trajectory');
      setSnapshot(res.data.data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const generate = async () => {
    setIsGenerating(true);
    try {
      const res = await api.post('/trajectory/generate');
      setSnapshot(res.data.data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading) {
    return <View style={styles.center}><ActivityIndicator color={colors.accent} /></View>;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Career Trajectory</Text>

      {!snapshot ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Not enough data yet</Text>
          <Text style={styles.emptyBody}>Add at least 3 journal entries, then generate your trajectory analysis.</Text>
          <TouchableOpacity style={styles.button} onPress={generate} disabled={isGenerating}>
            <Text style={styles.buttonText}>{isGenerating ? 'Generating...' : 'Generate Trajectory'}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* Narrative */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Your Career Story</Text>
            <Text style={styles.narrative}>{snapshot.narrativeSummary}</Text>
          </View>

          {/* Stats row */}
          <View style={styles.statsRow}>
            <StatCard label="Wins" value={String(snapshot.winCount)} color={colors.positive} />
            <StatCard label="Challenges" value={String(snapshot.challengeCount)} color={colors.warning} />
            <StatCard label="Resolved" value={String(snapshot.resolvedChallengeCount)} color={colors.info} />
          </View>

          {/* Growth Observations */}
          {snapshot.growthObservations.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Growth Observations</Text>
              {snapshot.growthObservations.map((obs, i) => (
                <View key={i} style={styles.observationRow}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.observation}>{obs}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Top Themes */}
          {snapshot.keyThemes.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Top Themes</Text>
              <View style={styles.themeCloud}>
                {snapshot.keyThemes.slice(0, 10).map((t, i) => (
                  <View key={i} style={styles.themeTag}>
                    <Text style={styles.themeText}>{t.label}</Text>
                    <Text style={styles.themeCount}>{t.count}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Suggested Focus Areas */}
          {snapshot.suggestedFocusAreas.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Suggested Focus Areas</Text>
              {snapshot.suggestedFocusAreas.map((area, i) => (
                <View key={i} style={styles.focusArea}>
                  <Text style={styles.focusAreaText}>{area}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Goal Progress */}
          {snapshot.goalProgressSummaries.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Goal Progress</Text>
              {snapshot.goalProgressSummaries.map((gps, i) => (
                <View key={i} style={styles.goalProgress}>
                  <View style={styles.goalProgressHeader}>
                    <Text style={styles.goalTitle}>{gps.goalTitle}</Text>
                    <Text style={styles.goalPercent}>{gps.progressPercent}%</Text>
                  </View>
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${gps.progressPercent}%` }]} />
                  </View>
                  <Text style={styles.goalObservation}>{gps.observation}</Text>
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity style={styles.button} onPress={generate} disabled={isGenerating}>
            <Text style={styles.buttonText}>{isGenerating ? 'Regenerating...' : 'Regenerate'}</Text>
          </TouchableOpacity>
        </>
      )}

      {error && <Text style={styles.error}>{error}</Text>}
    </ScrollView>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={[styles.statCard, { borderColor: color + '40' }]}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingTop: 60, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  title: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.xl },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.lg, borderWidth: 1, borderColor: colors.border },
  cardLabel: { fontSize: fontSize.xs, fontWeight: '600', color: colors.textTertiary, letterSpacing: 1, textTransform: 'uppercase', marginBottom: spacing.md },
  narrative: { fontSize: fontSize.base, color: colors.textPrimary, lineHeight: 24 },
  statsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  statCard: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, alignItems: 'center', borderWidth: 1 },
  statValue: { fontSize: fontSize.xl, fontWeight: '700' },
  statLabel: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  observationRow: { flexDirection: 'row', marginBottom: spacing.sm },
  bullet: { color: colors.accent, marginRight: spacing.sm, fontSize: fontSize.base },
  observation: { flex: 1, fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 20 },
  themeCloud: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  themeTag: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.accentMuted, borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 4, gap: 4 },
  themeText: { fontSize: fontSize.xs, color: colors.textAccent },
  themeCount: { fontSize: fontSize.xs, color: colors.accent, fontWeight: '600' },
  focusArea: { backgroundColor: colors.surfaceElevated, borderRadius: radius.sm, padding: spacing.sm, marginBottom: spacing.xs },
  focusAreaText: { fontSize: fontSize.sm, color: colors.textPrimary },
  goalProgress: { marginBottom: spacing.md },
  goalProgressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs },
  goalTitle: { fontSize: fontSize.sm, fontWeight: '600', color: colors.textPrimary, flex: 1 },
  goalPercent: { fontSize: fontSize.sm, fontWeight: '700', color: colors.accent },
  progressBar: { height: 4, backgroundColor: colors.border, borderRadius: 2, marginBottom: spacing.xs },
  progressFill: { height: 4, backgroundColor: colors.accent, borderRadius: 2 },
  goalObservation: { fontSize: fontSize.xs, color: colors.textSecondary },
  button: { backgroundColor: colors.accent, borderRadius: radius.full, paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.md },
  buttonText: { color: '#FFF', fontWeight: '600', fontSize: fontSize.base },
  emptyState: { alignItems: 'center', paddingVertical: spacing.xxl },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: '600', color: colors.textPrimary, marginBottom: spacing.sm },
  emptyBody: { fontSize: fontSize.sm, color: colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: spacing.xl },
  error: { color: colors.error, textAlign: 'center', fontSize: fontSize.sm },
});
