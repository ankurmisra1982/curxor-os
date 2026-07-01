/// <reference path="./patron-voice-browser.d.ts" />
/** Browser speech APIs for Patron voice mode (local · no cloud STT). */

export interface PatronVoiceSupport {
  recognition: boolean;
  synthesis: boolean;
}

type SpeechRecognitionCtor = new () => SpeechRecognition;

function recognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

export function getPatronVoiceSupport(): PatronVoiceSupport {
  return {
    recognition: recognitionCtor() !== null,
    synthesis: typeof window !== "undefined" && "speechSynthesis" in window,
  };
}

/** Plain text for TTS — strip lightweight markdown noise. */
export function patronSpeechPlainText(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/#{1,6}\s+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function stopPatronSpeech(): void {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
}

export function speakPatronText(text: string): void {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  const plain = patronSpeechPlainText(text);
  if (!plain) return;
  stopPatronSpeech();
  const utter = new SpeechSynthesisUtterance(plain);
  utter.lang = "en-US";
  utter.rate = 1;
  window.speechSynthesis.speak(utter);
}

export interface PatronRecognizerHandlers {
  onInterim?: (text: string) => void;
  onFinal: (text: string) => void;
  onError?: (message: string) => void;
  onEnd?: () => void;
}

export function createPatronRecognizer(handlers: PatronRecognizerHandlers): {
  start: () => void;
  stop: () => void;
  abort: () => void;
} | null {
  const Ctor = recognitionCtor();
  if (!Ctor) return null;

  const rec = new Ctor();
  rec.continuous = false;
  rec.interimResults = true;
  rec.lang = "en-US";
  rec.maxAlternatives = 1;

  rec.onresult = (event: SpeechRecognitionEvent) => {
    let interim = "";
    let final = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const chunk = event.results[i]?.[0]?.transcript ?? "";
      if (event.results[i]?.isFinal) final += chunk;
      else interim += chunk;
    }
    if (interim.trim()) handlers.onInterim?.(interim.trim());
    if (final.trim()) handlers.onFinal(final.trim());
  };

  rec.onerror = (event: SpeechRecognitionErrorEvent) => {
    const blocked = event.error === "not-allowed" || event.error === "service-not-allowed";
    handlers.onError?.(
      blocked
        ? "Microphone permission denied — allow mic in browser settings."
        : event.error === "no-speech"
          ? "No speech heard — try again."
          : "Voice input unavailable.",
    );
  };

  rec.onend = () => handlers.onEnd?.();

  return {
    start: () => rec.start(),
    stop: () => rec.stop(),
    abort: () => rec.abort(),
  };
}
