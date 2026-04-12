import api from './api';

export async function transcribeAudio(audioUri: string, durationSeconds: number): Promise<string> {
  const formData = new FormData();

  // React Native FormData accepts file objects
  formData.append('audio', {
    uri: audioUri,
    name: 'recording.m4a',
    type: 'audio/m4a',
  } as any);

  formData.append('durationSeconds', String(durationSeconds));

  const response = await api.post('/transcribe', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
  });

  return response.data.data.transcript;
}
