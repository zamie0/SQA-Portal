"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type SpeechRecognitionResultLike = {
  isFinal: boolean;
  0: {
    transcript: string;
  };
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultLike;
  };
};

type SpeechRecognitionErrorEventLike = {
  error?: string;
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

type SpeechWindow = Window &
  typeof globalThis & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };

function getSpeechRecognition() {
  if (typeof window === "undefined") return null;
  const speechWindow = window as SpeechWindow;
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null;
}

export function useLiveTranscription({
  value,
  onChange,
  language = "en-US",
}: {
  value: string;
  onChange: (value: string) => void;
  language?: string;
}) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState("");
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const shouldListenRef = useRef(false);
  const committedTextRef = useRef("");
  const latestValueRef = useRef(value);

  useEffect(() => {
    latestValueRef.current = value;
  }, [value]);

  const stop = useCallback(() => {
    shouldListenRef.current = false;
    setListening(false);
    recognitionRef.current?.stop();
  }, []);

  const start = useCallback(() => {
    const Recognition = getSpeechRecognition();
    if (!Recognition) {
      setError(
        "Live voice transcription is not supported in this browser. Try Chrome or Edge with microphone access enabled.",
      );
      return;
    }

    recognitionRef.current?.abort();
    const recognition = new Recognition();
    const base = latestValueRef.current.trim() ? `${latestValueRef.current.trimEnd()} ` : "";

    committedTextRef.current = base;
    shouldListenRef.current = true;
    setError("");
    setListening(true);

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;
    recognition.onresult = (event) => {
      let interim = "";

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const transcript = result[0]?.transcript ?? "";

        if (result.isFinal) {
          committedTextRef.current = `${committedTextRef.current}${transcript.trim()} `;
        } else {
          interim += transcript;
        }
      }

      onChange(`${committedTextRef.current}${interim}`.trimStart());
    };
    recognition.onerror = (event) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        shouldListenRef.current = false;
        setListening(false);
      }

      const message =
        event.error === "not-allowed"
          ? "Microphone access was blocked. Allow microphone permission and try again."
          : event.error === "no-speech"
            ? "No speech detected yet. Keep speaking or try again."
            : "Live voice transcription stopped unexpectedly.";
      setError(message);
    };
    recognition.onend = () => {
      if (!shouldListenRef.current) {
        setListening(false);
        return;
      }

      try {
        recognition.start();
      } catch {
        shouldListenRef.current = false;
        setListening(false);
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch {
      shouldListenRef.current = false;
      setListening(false);
      setError("Unable to start live voice transcription.");
    }
  }, [language, onChange]);

  const toggle = useCallback(() => {
    if (shouldListenRef.current) {
      stop();
    } else {
      start();
    }
  }, [start, stop]);

  useEffect(
    () => () => {
      shouldListenRef.current = false;
      recognitionRef.current?.abort();
    },
    [],
  );

  return {
    listening,
    error,
    start,
    stop,
    toggle,
  };
}
