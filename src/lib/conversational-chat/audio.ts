export const MAX_RECORDING_MS = 60_000
export const MAX_AUDIO_UPLOAD_BYTES = 10 * 1024 * 1024

const EXTENSION_BY_MIME: Array<{ match: string; extension: string }> = [
  { match: 'mp4', extension: 'mp4' },
  { match: 'aac', extension: 'aac' },
  { match: 'ogg', extension: 'ogg' },
  { match: 'wav', extension: 'wav' },
  { match: 'webm', extension: 'webm' }
]

export function getAudioFileExtension(mimeType: string): string {
  const found = EXTENSION_BY_MIME.find(({ match }) => mimeType.includes(match))
  return found?.extension ?? 'webm'
}

export function getSupportedRecordingMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined

  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/aac'
  ]

  return candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate))
}
