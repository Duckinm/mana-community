import { afterEach, describe, expect, it, vi } from "vitest";
import {
  appendSpeechTranscript,
  isVoiceRecordingSupported,
} from "@/lib/voice-recording";

describe("voice recording helpers", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("appends new transcript to existing input", () => {
    expect(appendSpeechTranscript("Please", "create a project")).toBe(
      "Please create a project",
    );
    expect(appendSpeechTranscript("", "hello")).toBe("hello");
  });

  it("detects unsupported browsers", () => {
    vi.stubGlobal("navigator", {});
    vi.stubGlobal("MediaRecorder", undefined);
    expect(isVoiceRecordingSupported()).toBe(false);
  });

  it("detects supported browsers", () => {
    vi.stubGlobal("navigator", { mediaDevices: { getUserMedia: vi.fn() } });
    vi.stubGlobal("MediaRecorder", class {});
    expect(isVoiceRecordingSupported()).toBe(true);
  });
});
