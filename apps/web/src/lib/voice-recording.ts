import { BASE_URL } from "@/lib/eden";

export type VoiceRecordingStatus =
  | "idle"
  | "starting"
  | "listening"
  | "transcribing"
  | "error"
  | "unsupported";

export class VoiceTranscriptionUnavailableError extends Error {}

export function isVoiceRecordingSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.mediaDevices?.getUserMedia === "function" &&
    typeof MediaRecorder !== "undefined"
  );
}

function pickMimeType(): string | undefined {
  return ["audio/webm", "audio/mp4", "audio/ogg"].find((type) =>
    MediaRecorder.isTypeSupported(type),
  );
}

export type VoiceRecording = {
  stop: () => Promise<Blob>;
};

export async function startVoiceRecording(): Promise<VoiceRecording> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mimeType = pickMimeType();
  const recorder = new MediaRecorder(
    stream,
    mimeType ? { mimeType } : undefined,
  );
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const stopped = new Promise<Blob>((resolve) => {
    recorder.onstop = () => {
      for (const track of stream.getTracks()) track.stop();
      resolve(new Blob(chunks, { type: recorder.mimeType }));
    };
  });

  recorder.start();

  return {
    stop: () => {
      recorder.stop();
      return stopped;
    },
  };
}

const EXTENSION_BY_MIME: Record<string, string> = {
  "audio/webm": "webm",
  "audio/mp4": "m4a",
  "audio/ogg": "ogg",
};

export async function transcribeVoiceClip(
  blob: Blob,
  language?: string,
): Promise<string> {
  const extension = EXTENSION_BY_MIME[blob.type] ?? "webm";
  const form = new FormData();
  form.append("file", blob, `voice.${extension}`);
  if (language) form.append("language", language);

  const res = await fetch(`${BASE_URL}/api/transcription`, {
    method: "POST",
    credentials: "include",
    body: form,
  });
  if (res.status === 503) throw new VoiceTranscriptionUnavailableError();
  if (!res.ok) throw new Error("Transcription failed");

  const data = (await res.json()) as { text: string };
  return data.text;
}

export function appendSpeechTranscript(input: string, transcript: string): string {
  return [input.trim(), transcript.trim()].filter(Boolean).join(" ");
}
