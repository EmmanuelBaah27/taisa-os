import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Share } from 'react-native';
import { useCareerStore } from '../../src/stores/careerStore';
import { colors, spacing, fontSize, radius } from '../../src/constants/theme';
import api from '../../src/services/api';

export default function ProfileScreen() {
  const { profile } = useCareerStore();

  const handleExport = async () => {
    try {
      const entries = await api.get('/entries', { params: { limit: 1000 } });
      const data = JSON.stringify(entries.data.data.items, null, 2);
      await Share.share({ message: data, title: 'Taisa — Journal Export' });
    } catch (e) {
      console.error('Export failed', e);
    }
  };

  if (!profile) return null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Profile</Text>

      <View style={styles.card}>
        <Row label="Role" value={profile.currentRole} />
        {profile.currentCompany && <Row label="Company" value={profile.currentCompany} />}
        <Row label="Industry" value={profile.industry} />
        <Row label="Stage" value={profile.careerStage} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Goals</Text>
        <Text style={styles.goalText}>{profile.shortTermGoal}</Text>
        <Text style={[styles.goalText, { color: colors.textTertiary, marginTop: spacing.xs }]}>{profile.longTermGoal}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Coaching Preferences</Text>
        <Row label="Style" value={profile.coachingStyle} />
        <Row label="Accountability" value={profile.accountabilityLevel} />
        <Row label="Daily reminders" value={profile.reminderTimes?.join(', ') || '15:00, 19:00'} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Stats</Text>
        <Row label="Total entries" value={String(profile.totalEntryCount)} />
        <Row label="Open action items" value={String(profile.openActionItemCount)} />
        <Row label="Trajectory" value={profile.growthTrajectory} />
      </View>

      <TouchableOpacity style={styles.exportButton} onPress={handleExport}>
        <Text style={styles.exportText}>Export journal data</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingTop: 60, paddingBottom: 40 },
  title: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.xl },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.lg, borderWidth: 1, borderColor: colors.border },
  cardLabel: { fontSize: fontSize.xs, fontWeight: '600', color: colors.textTertiary, letterSpacing: 1, textTransform: 'uppercase', marginBottom: spacing.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  rowLabel: { fontSize: fontSize.sm, color: colors.textSecondary },
  rowValue: { fontSize: fontSize.sm, color: colors.textPrimary, fontWeight: '500', textTransform: 'capitalize' },
  goalText: { fontSize: fontSize.sm, color: colors.textPrimary, lineHeight: 20 },
  exportButton: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, alignItems: 'center', marginTop: spacing.md },
  exportText: { fontSize: fontSize.sm, color: colors.textSecondary },
});
