import { useState, useRef } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Animated, Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useVoiceRecorder } from '../../src/hooks/useVoiceRecorder';
import { transcribeAudio } from '../../src/services/transcription';
import { useJournalStore } from '../../src/stores/journalStore';
import { useUIStore } from '../../src/stores/uiStore';
import { colors, spacing, fontSize, radius } from '../../src/constants/theme';
import type { EntryAnalysis } from '@taisa/shared';

export default function JournalScreen() {
  const { start, stop, isRecording, duration } = useVoiceRecorder();
  const { createEntry, analyzeEntry } = useJournalStore();
  const { recordingPhase, setRecordingPhase } = useUIStore();

  const [transcript, setTranscript] = useState('');
  const [analysis, setAnalysis] = useState<EntryAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);

  const startPulse = () => {
    pulseLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    pulseLoop.current.start();
  };

  const stopPulse = () => {
    pulseLoop.current?.stop();
    Animated.timing(pulseAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
  };

  const handleRecord = async () => {
    if (isRecording) {
      // Stop recording
      stopPulse();
      setRecordingPhase('reviewing');
      try {
        const result = await stop();
        setRecordingPhase('reviewing');
        // Auto-transcribe
        const text = await transcribeAudio(result.uri, result.durationSeconds);
        setTranscript(text);
      } catch (e: any) {
        setError(e.message);
        setRecordingPhase('idle');
      }
    } else {
      // Start recording
      try {
        setError(null);
        setRecordingPhase('recording');
        await start();
        startPulse();
      } catch (e: any) {
        setError(e.message);
        setRecordingPhase('idle');
      }
    }
  };

  const handleProcess = async () => {
    if (!transcript.trim()) return;
    setRecordingPhase('processing');

    try {
      const entry = await createEntry({
        rawTranscript: transcript,
        editedTranscript: transcript,
        recordedAt: new Date().toISOString(),
      });

      const result = await analyzeEntry(entry.id);
      setAnalysis(result);
      setRecordingPhase('complete');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      setError(e.message);
      setRecordingPhase('reviewing');
    }
  };

  const handleReset = () => {
    setTranscript('');
    setAnalysis(null);
    setError(null);
    setRecordingPhase('idle');
  };

  // Phase: idle or recording
  if (recordingPhase === 'idle' || recordingPhase === 'recording') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>
          {isRecording ? formatDuration(duration) : 'Ready to record'}
        </Text>
        <Text style={styles.prompt}>
          {isRecording
            ? 'Speak freely — wins, challenges, decisions, thoughts'
            : 'What happened today? Any wins, challenges, or decisions?'}
        </Text>

        <Animated.View style={[styles.recordButton, { transform: [{ scale: pulseAnim }] }]}>
          <TouchableOpacity
            style={[styles.recordInner, isRecording && styles.recordInnerActive]}
            onPress={handleRecord}
          >
            <View style={isRecording ? styles.stopIcon : styles.micIcon} />
          </TouchableOpacity>
        </Animated.View>

        {error && <Text style={styles.errorText}>{error}</Text>}
      </View>
    );
  }

  // Phase: reviewing transcript
  if (recordingPhase === 'reviewing') {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.reviewContent}>
        <Text style={styles.title}>Review your entry</Text>
        <Text style={styles.prompt}>Edit if needed, then process with AI.</Text>

        <TextInput
          style={styles.transcriptInput}
          value={transcript}
          onChangeText={setTranscript}
          multiline
          placeholderTextColor={colors.textTertiary}
          placeholder="Your transcript will appear here..."
        />

        {error && <Text style={styles.errorText}>{error}</Text>}

        <TouchableOpacity style={styles.primaryButton} onPress={handleProcess}>
          <Text style={styles.primaryButtonText}>Process with AI</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={handleReset}>
          <Text style={styles.secondaryButtonText}>Record again</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // Phase: processing
  if (recordingPhase === 'processing') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Your coach is reviewing...</Text>
        <View style={styles.processingSteps}>
          {['Transcribed', 'Extracting insights', 'Identifying patterns', 'Writing coach note'].map((step, i) => (
            <Text key={step} style={[styles.processingStep, { opacity: 0.4 + i * 0.2 }]}>
              {step}
            </Text>
          ))}
        </View>
      </View>
    );
  }

  // Phase: complete — show analysis
  if (recordingPhase === 'complete' && analysis) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.reviewContent}>
        <Text style={styles.title}>Entry complete</Text>

        {/* Coach Note */}
        <View style={styles.coachNoteCard}>
          <Text style={styles.coachNoteLabel}>Coach note</Text>
          <Text style={styles.coachNote}>{analysis.coachNote}</Text>
        </View>

        {/* Summary */}
        <Text style={styles.summary}>{analysis.summary}</Text>

        {/* Wins */}
        {analysis.wins.length > 0 && (
          <Section title={`Wins (${analysis.wins.length})`}>
            {analysis.wins.map((w, i) => (
              <View key={i} style={styles.item}>
                <Text style={styles.itemTitle}>{w.title}</Text>
                <Text style={styles.itemDesc}>{w.description}</Text>
              </View>
            ))}
          </Section>
        )}

        {/* Challenges */}
        {analysis.challenges.length > 0 && (
          <Section title={`Challenges (${analysis.challenges.length})`}>
            {analysis.challenges.map((c, i) => (
              <View key={i} style={styles.item}>
                <Text style={styles.itemTitle}>{c.title}</Text>
                <Text style={styles.itemDesc}>{c.description}</Text>
              </View>
            ))}
          </Section>
        )}

        {/* Action Items */}
        {analysis.actionItems.length > 0 && (
          <Section title={`Action Items (${analysis.actionItems.length})`}>
            {analysis.actionItems.map((a) => (
              <View key={a.id} style={styles.actionItem}>
                <View style={[styles.priorityDot, { backgroundColor: a.priority === 'high' ? colors.error : a.priority === 'medium' ? colors.warning : colors.textTertiary }]} />
                <Text style={styles.actionItemTitle}>{a.title}</Text>
              </View>
            ))}
          </Section>
        )}

        <TouchableOpacity style={styles.primaryButton} onPress={handleReset}>
          <Text style={styles.primaryButtonText}>Done</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return null;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: spacing.lg }}>
      <Text style={{ fontSize: fontSize.xs, fontWeight: '600', color: colors.textTertiary, letterSpacing: 1, textTransform: 'uppercase', marginBottom: spacing.sm }}>
        {title}
      </Text>
      {children}
    </View>
  );
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  reviewContent: { padding: spacing.lg, paddingTop: 60, paddingBottom: 40 },
  title: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.textPrimary, textAlign: 'center', marginTop: 100, marginBottom: spacing.md, paddingHorizontal: spacing.lg },
  prompt: { fontSize: fontSize.base, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: spacing.xl, lineHeight: 22 },
  recordButton: { alignSelf: 'center', marginTop: 60 },
  recordInner: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: colors.accentMuted,
    borderWidth: 2, borderColor: colors.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  recordInnerActive: { backgroundColor: '#3D1515', borderColor: colors.error },
  micIcon: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.accent },
  stopIcon: { width: 20, height: 20, borderRadius: 4, backgroundColor: colors.error },
  transcriptInput: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, color: colors.textPrimary,
    fontSize: fontSize.base, lineHeight: 22,
    minHeight: 160, textAlignVertical: 'top',
    marginBottom: spacing.lg,
  },
  primaryButton: {
    backgroundColor: colors.accent, borderRadius: radius.full,
    paddingVertical: spacing.md, alignItems: 'center', marginBottom: spacing.sm,
  },
  primaryButtonText: { color: '#FFF', fontWeight: '600', fontSize: fontSize.base },
  secondaryButton: { paddingVertical: spacing.sm, alignItems: 'center' },
  secondaryButtonText: { color: colors.textSecondary, fontSize: fontSize.sm },
  errorText: { color: colors.error, fontSize: fontSize.sm, textAlign: 'center', marginTop: spacing.md },
  processingSteps: { marginTop: spacing.xl, paddingHorizontal: spacing.xl },
  processingStep: { fontSize: fontSize.base, color: colors.textSecondary, marginBottom: spacing.md, textAlign: 'center' },
  coachNoteCard: {
    backgroundColor: colors.accentMuted, borderRadius: radius.lg,
    padding: spacing.lg, marginBottom: spacing.lg,
    borderWidth: 1, borderColor: colors.accent + '40',
  },
  coachNoteLabel: { fontSize: fontSize.xs, fontWeight: '600', color: colors.accent, letterSpacing: 1, textTransform: 'uppercase', marginBottom: spacing.sm },
  coachNote: { fontSize: fontSize.base, color: colors.textPrimary, lineHeight: 22, fontStyle: 'italic' },
  summary: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 20, marginBottom: spacing.xl },
  item: { marginBottom: spacing.sm },
  itemTitle: { fontSize: fontSize.sm, fontWeight: '600', color: colors.textPrimary },
  itemDesc: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 18 },
  actionItem: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  priorityDot: { width: 8, height: 8, borderRadius: 4, marginRight: spacing.sm },
  actionItemTitle: { fontSize: fontSize.sm, color: colors.textPrimary, flex: 1 },
});
