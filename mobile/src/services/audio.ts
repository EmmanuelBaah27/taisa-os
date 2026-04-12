import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';

export interface RecordingResult {
  uri: string;
  durationSeconds: number;
}

let recording: Audio.Recording | null = null;
let startTime: number = 0;

export async function requestAudioPermissions(): Promise<boolean> {
  const { granted } = await Audio.requestPermissionsAsync();
  return granted;
}

export async function startRecording(): Promise<void> {
  const granted = await requestAudioPermissions();
  if (!granted) throw new Error('Audio permission denied');

  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
  });

  const { recording: rec } = await Audio.Recording.createAsync(
    Audio.RecordingOptionsPresets.HIGH_QUALITY
  );

  recording = rec;
  startTime = Date.now();
}

export async function stopRecording(): Promise<RecordingResult> {
  if (!recording) throw new Error('No active recording');

  await recording.stopAndUnloadAsync();
  const uri = recording.getURI();
  const durationSeconds = (Date.now() - startTime) / 1000;

  recording = null;

  await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

  if (!uri) throw new Error('Recording URI is null');

  return { uri, durationSeconds };
}

export function isRecording(): boolean {
  return recording !== null;
}
