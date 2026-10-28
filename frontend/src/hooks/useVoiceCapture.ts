import { useCallback, useEffect, useRef, useState } from "react";

/*
 * Two ways to capture a workout by voice:
 *
 * - "live": the browser's Web Speech API transcribes as you talk, into editable text.
 *   Chrome and Edge support it. Brave, Arc and some Chromium builds expose the API but
 *   fail with a "network" or "service-not-allowed" error, and Firefox lacks it.
 * - "record": the microphone is recorded and the server transcribes it with Whisper.
 *   Works in every modern browser.
 *
 * The hook starts in "live" when the API exists and switches to "record" for good if the
 * browser's speech service turns out to be unusable.
 */

export type CaptureMode = "live" | "record";
export type CaptureState = "idle" | "starting" | "listening" | "recording";

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: { transcript: string };
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

const speechRecognition = (): SpeechRecognitionCtor | undefined => {
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
};

const MODE_KEY = "sonic.voiceMode";

const savedMode = (): CaptureMode | null => {
  try {
    const value = localStorage.getItem(MODE_KEY);
    return value === "live" || value === "record" ? value : null;
  } catch {
    return null;
  }
};

const saveMode = (mode: CaptureMode) => {
  try {
    localStorage.setItem(MODE_KEY, mode);
  } catch {
    // Private mode or blocked storage: the browser just asks again next visit.
  }
};

/** Brave exposes the Web Speech API but blocks the speech service behind it. */
const isBrave = () => typeof navigator !== "undefined" && "brave" in navigator;

const initialMode = (): CaptureMode => {
  if (!speechRecognition() || isBrave()) return "record";
  return savedMode() ?? "live";
};

const canRecord = () =>
  typeof window !== "undefined" &&
  typeof MediaRecorder !== "undefined" &&
  !!navigator.mediaDevices?.getUserMedia;

const RECORDING_TYPES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];

const micErrorMessage = (error: unknown) => {
  const name = error instanceof DOMException ? error.name : "";
  if (name === "NotAllowedError" || name === "SecurityError")
    return "Microphone access is blocked. Allow it from the icon in your address bar, then try again.";
  if (name === "NotFoundError") return "No microphone found. Plug one in, or type your workout instead.";
  if (name === "NotReadableError") return "Your microphone is busy in another app.";
  return "Couldn't start the microphone. You can type your workout instead.";
};

interface Options {
  /** Current text; live transcription is appended to it. */
  text: string;
  onText: (text: string) => void;
  /** Called with the finished recording in "record" mode. */
  onRecording: (audio: Blob) => void;
}

export function useVoiceCapture({ text, onText, onRecording }: Options) {
  const [mode, setMode] = useState<CaptureMode>(initialMode);
  const [state, setState] = useState<CaptureState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const recognition = useRef<SpeechRecognitionLike | null>(null);
  const wantLive = useRef(false);
  const baseText = useRef("");
  const finalText = useRef("");
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const timer = useRef<number | null>(null);

  // Keep the latest callbacks without restarting recognition when they change.
  const onTextRef = useRef(onText);
  const onRecordingRef = useRef(onRecording);
  useEffect(() => {
    onTextRef.current = onText;
    onRecordingRef.current = onRecording;
  });

  const supported = !!speechRecognition() || canRecord();

  const startTimer = () => {
    setElapsed(0);
    const started = Date.now();
    timer.current = window.setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 250);
  };
  const stopTimer = () => {
    if (timer.current) window.clearInterval(timer.current);
    timer.current = null;
  };

  const releaseMic = () => {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
  };

  const startRecording = useCallback(async () => {
    setError(null);
    setState("starting");
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      setState("idle");
      setError(micErrorMessage(e));
      return;
    }
    const mimeType = RECORDING_TYPES.find((t) => MediaRecorder.isTypeSupported(t));
    const rec = new MediaRecorder(stream.current, mimeType ? { mimeType } : undefined);
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);
    rec.onstop = () => {
      releaseMic();
      stopTimer();
      setState("idle");
      const audio = new Blob(chunks, { type: (rec.mimeType || mimeType || "audio/webm").split(";")[0] });
      if (audio.size > 0) onRecordingRef.current(audio);
    };
    recorder.current = rec;
    rec.start(250);
    startTimer();
    setState("recording");
  }, []);

  /**
   * Live transcription failed in a way that will keep failing in this browser. The user pressed
   * the mic to talk, so start recording right away, and remember the choice for next time.
   */
  const switchToRecording = useCallback(() => {
    wantLive.current = false;
    recognition.current?.abort();
    recognition.current = null;
    stopTimer();
    setState("idle");
    if (canRecord()) {
      setMode("record");
      saveMode("record");
      void startRecording();
    } else {
      setError("Voice input isn't available in this browser. Type your workout instead.");
    }
  }, [startRecording]);

  const startLive = useCallback(() => {
    const Recognition = speechRecognition();
    if (!Recognition) return;
    setError(null);
    setState("starting");
    baseText.current = text.trim() ? text.trim() + " " : "";
    finalText.current = "";
    wantLive.current = true;

    const r = new Recognition();
    r.lang = navigator.language || "en-US";
    r.continuous = true;
    r.interimResults = true;
    r.onstart = () => setState("listening");
    r.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) finalText.current += result[0].transcript.trim() + " ";
        else interim += result[0].transcript;
      }
      onTextRef.current((baseText.current + finalText.current + interim).replace(/\s+/g, " ").trimStart());
    };
    r.onerror = (event) => {
      switch (event.error) {
        case "no-speech":
        case "aborted":
          return; // onend restarts if we're still listening
        case "network":
        case "service-not-allowed":
        case "language-not-supported":
          switchToRecording();
          return;
        case "not-allowed":
          wantLive.current = false;
          setError("Microphone access is blocked. Allow it from the icon in your address bar, then try again.");
          return;
        case "audio-capture":
          wantLive.current = false;
          setError("No microphone found. Plug one in, or type your workout instead.");
          return;
        default:
          wantLive.current = false;
          setError(`Voice input stopped (${event.error}). Try again or type instead.`);
      }
    };
    r.onend = () => {
      // Chrome ends a session after a pause even in continuous mode; carry on until stopped.
      if (wantLive.current && recognition.current === r) {
        baseText.current += finalText.current;
        finalText.current = "";
        try {
          r.start();
          return;
        } catch {
          // fall through to idle
        }
      }
      if (recognition.current === r) {
        recognition.current = null;
        stopTimer();
        setState("idle");
      }
    };
    recognition.current = r;
    try {
      r.start();
      startTimer();
    } catch {
      switchToRecording();
    }
  }, [text, switchToRecording]);

  const start = useCallback(() => {
    if (mode === "live") startLive();
    else void startRecording();
  }, [mode, startLive, startRecording]);

  const stop = useCallback(() => {
    if (mode === "live") {
      wantLive.current = false;
      recognition.current?.stop();
    } else if (recorder.current?.state === "recording") {
      recorder.current.stop();
    }
  }, [mode]);

  // Release the microphone if the page unmounts mid-capture.
  useEffect(
    () => () => {
      wantLive.current = false;
      recognition.current?.abort();
      if (recorder.current?.state === "recording") {
        recorder.current.onstop = null;
        recorder.current.stop();
      }
      releaseMic();
      stopTimer();
    },
    []
  );

  return {
    mode,
    setMode: (m: CaptureMode) => {
      if (state === "idle") {
        setMode(m);
        saveMode(m);
        setError(null);
      }
    },
    liveAvailable: !!speechRecognition() && !isBrave(),
    recordAvailable: canRecord(),
    supported,
    state,
    active: state !== "idle",
    elapsed,
    error,
    clearError: () => setError(null),
    start,
    stop,
  };
}
