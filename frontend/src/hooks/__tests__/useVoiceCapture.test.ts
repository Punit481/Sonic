import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useVoiceCapture } from "../useVoiceCapture";

const options = { text: "", onText: () => {}, onRecording: () => {} };
const w = window as unknown as Record<string, unknown>;
const nav = navigator as unknown as Record<string, unknown>;

describe("useVoiceCapture", () => {
  beforeEach(() => {
    w.webkitSpeechRecognition = class {};
    w.MediaRecorder = class {};
    Object.defineProperty(navigator, "mediaDevices", { value: { getUserMedia: () => {} }, configurable: true });
    localStorage.clear();
  });

  afterEach(() => {
    delete w.webkitSpeechRecognition;
    delete w.MediaRecorder;
    delete nav.brave;
  });

  it("uses live transcription where the browser supports it", () => {
    const { result } = renderHook(() => useVoiceCapture(options));
    expect(result.current.mode).toBe("live");
    expect(result.current.liveAvailable).toBe(true);
  });

  it("records straight away in Brave, whose speech service is blocked", () => {
    nav.brave = {};
    const { result } = renderHook(() => useVoiceCapture(options));
    expect(result.current.mode).toBe("record");
    expect(result.current.liveAvailable).toBe(false);
  });

  it("remembers that live transcription failed here before", () => {
    localStorage.setItem("sonic.voiceMode", "record");
    const { result } = renderHook(() => useVoiceCapture(options));
    expect(result.current.mode).toBe("record");
  });
});
