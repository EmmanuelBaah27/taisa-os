import { useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useJournalStore } from '../../src/stores/journalStore';
import { useCareerStore } from '../../src/stores/careerStore';
import { colors, spacing, fontSize, radius } from '../../src/constants/theme';
import { format, formatDistanceToNow } from 'date-fns';

export default function HomeScreen() {
  const { entries, fetchEntries, isLoading } = useJournalStore();
  const { profile } = useCareerStore();

  useEffect(() => {
    fetchEntries();
  }, []);

  const latestAnalysis = entries[0]; // We'll load analysis separately when needed

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.greeting}>
          {getGreeting()}, {profile?.currentRole || 'there'}
        </Text>
        <Text style={styles.subGreeting}>{format(new Date(), 'EEEE, MMMM d')}</Text>
      </View>

      {/* Career Health Card */}
      <View style={styles.healthCard}>
        <Text style={styles.sectionLabel}>Career Health</Text>
        <View style={styles.healthStats}>
          <Stat label="Entries" value={String(profile?.totalEntryCount || 0)} />
          <Stat label="Open Items" value={String(profile?.openActionItemCount || 0)} />
          <Stat label="Momentum" value={profile?.growthTrajectory || '—'} />
        </View>
      </View>

      {/* Record CTA if no entries */}
      {entries.length === 0 && !isLoading && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Start your first entry</Text>
          <Text style={styles.emptyBody}>
            Record a voice note about your day — wins, challenges, decisions. Your coach will analyze it.
          </Text>
          <TouchableOpacity style={styles.ctaButton} onPress={() => router.push('/(tabs)/journal')}>
            <Text style={styles.ctaText}>Record now</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Recent Entries */}
      {entries.length > 0 && (
        <View>
          <Text style={styles.sectionLabel}>Recent Entries</Text>
          {isLoading ? (
            <ActivityIndicator color={colors.accent} />
          ) : (
            entries.slice(0, 5).map(entry => (
              <TouchableOpacity
                key={entry.id}
                style={styles.entryCard}
                onPress={() => router.push(`/entry/${entry.id}`)}
              >
                <View style={styles.entryCardHeader}>
                  <Text style={styles.entryDate}>
                    {formatDistanceToNow(new Date(entry.recordedAt), { addSuffix: true })}
                  </Text>
                  <StatusBadge status={entry.status} />
                </View>
                <Text style={styles.entryTranscriptPreview} numberOfLines={2}>
                  {entry.editedTranscript || entry.rawTranscript || 'Processing...'}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      )}
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function StatusBadge({ status }: { status: string }) {
  const color = status === 'complete' ? colors.positive : status === 'error' ? colors.error : colors.textTertiary;
  return <Text style={[styles.statusBadge, { color }]}>{status}</Text>;
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingTop: 60, paddingBottom: 40 },
  header: { marginBottom: spacing.xl },
  greeting: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.textPrimary },
  subGreeting: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 4 },
  healthCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  healthStats: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.md },
  stat: { alignItems: 'center' },
  statValue: { fontSize: fontSize.xl, fontWeight: '700', color: colors.textPrimary },
  statLabel: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  sectionLabel: { fontSize: fontSize.xs, fontWeight: '600', color: colors.textTertiary, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: spacing.md },
  emptyState: { alignItems: 'center', paddingVertical: spacing.xxl },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: '600', color: colors.textPrimary, marginBottom: spacing.sm },
  emptyBody: { fontSize: fontSize.sm, color: colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: spacing.xl },
  ctaButton: { backgroundColor: colors.accent, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: radius.full },
  ctaText: { color: '#FFF', fontWeight: '600', fontSize: fontSize.base },
  entryCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  entryCardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  entryDate: { fontSize: fontSize.xs, color: colors.textSecondary },
  statusBadge: { fontSize: fontSize.xs, fontWeight: '500' },
  entryTranscriptPreview: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 18 },
});
