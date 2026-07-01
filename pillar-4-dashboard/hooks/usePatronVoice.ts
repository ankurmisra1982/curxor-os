"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  createPatronRecognizer,
  getPatronVoiceSupport,
  speakPatronText,
  stopPatronSpeech,
  type PatronVoiceSupport,
} from "@/lib/patron-voice-browser";

interface UsePatronVoiceOptions {
  voiceEnabled: boolean;
  disabled?: boolean;
  onInterimText?: (text: string) => void;
  onFinalText: (text: string) => void;
}

export function usePatronVoice({
  voiceEnabled,
  disabled = false,
  onInterimText,
  onFinalText,
}: UsePatronVoiceOptions) {
  const [support, setSupport] = useState<PatronVoiceSupport>({ recognition: false, synthesis: false });
  const [listening, setListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const recognizerRef = useRef<ReturnType<typeof createPatronRecognizer> | null>(null);

  useEffect(() => {
    setSupport(getPatronVoiceSupport());
  }, []);

  useEffect(() => {
    if (!voiceEnabled) {
      stopPatronSpeech();
      recognizerRef.current?.abort();
      setListening(false);
    }
  }, [voiceEnabled]);

  useEffect(() => {
    return () => {
      recognizerRef.current?.abort();
      stopPatronSpeech();
    };
  }, []);

  const stopListening = useCallback(() => {
    recognizerRef.current?.stop();
    setListening(false);
  }, []);

  const startListening = useCallback(() => {
    if (!voiceEnabled || disabled || !support.recognition) return;
    setVoiceError(null);
    recognizerRef.current?.abort();
    const recognizer = createPatronRecognizer({
      onInterim: onInterimText,
      onFinal: (text) => {
        onFinalText(text);
        setListening(false);
      },
      onError: (message) => {
        setVoiceError(message);
        setListening(false);
      },
      onEnd: () => setListening(false),
    });
    if (!recognizer) {
      setVoiceError("Voice input not supported in this browser.");
      return;
    }
    recognizerRef.current = recognizer;
    try {
      recognizer.start();
      setListening(true);
    } catch {
      setVoiceError("Could not start microphone.");
      setListening(false);
    }
  }, [voiceEnabled, disabled, support.recognition, onInterimText, onFinalText]);

  const toggleListening = useCallback(() => {
    if (listening) stopListening();
    else startListening();
  }, [listening, startListening, stopListening]);

  const speakReply = useCallback(
    (text: string) => {
      if (!voiceEnabled || !support.synthesis) return;
      speakPatronText(text);
    },
    [voiceEnabled, support.synthesis],
  );

  return {
    support,
    listening,
    voiceError,
    startListening,
    stopListening,
    toggleListening,
    speakReply,
    stopSpeaking: stopPatronSpeech,
  };
}
