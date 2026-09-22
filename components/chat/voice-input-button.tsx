"use client";

import { MicIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type SpeechAlternativeLike = { transcript: string };

type SpeechResultLike = {
  0: SpeechAlternativeLike;
  isFinal: boolean;
  length: number;
};

type SpeechResultListLike = {
  length: number;
  [index: number]: SpeechResultLike;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: SpeechResultListLike;
};

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onend: (() => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  start: () => void;
  stop: () => void;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") {
    return null;
  }

  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };

  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/**
 * Locale-aware voice dictation button (Web Speech API).
 * Renders nothing when the browser has no speech recognition support.
 */
export function VoiceInputButton({
  disabled,
  onTranscript,
}: {
  disabled: boolean;
  onTranscript: (text: string) => void;
}) {
  const { locale, t } = useI18n();
  const [supported, setSupported] = useState(true);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const baseInputRef = useRef("");
  const listeningRef = useRef(false);

  useEffect(() => {
    setSupported(getSpeechRecognitionCtor() !== null);
  }, []);

  const stopListening = useCallback(() => {
    listeningRef.current = false;
    setListening(false);
    const recognition = recognitionRef.current;

    if (recognition) {
      recognition.stop();
      recognitionRef.current = null;
    }
  }, []);

  const startListening = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();

    if (!Ctor) {
      toast.error(t("input.voiceUnsupported"));
      return;
    }

    const recognition = new Ctor();
    recognition.lang = locale === "ar" ? "ar-SA" : "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;

    baseInputRef.current = "";
    recognition.onresult = (event) => {
      let finalText = "";
      let interimText = "";

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const transcript = result[0]?.transcript ?? "";

        if (result.isFinal) {
          finalText += transcript;
        } else {
          interimText += transcript;
        }
      }

      if (finalText) {
        baseInputRef.current = [baseInputRef.current, finalText.trim()]
          .filter(Boolean)
          .join(" ");
      }

      const composed = [baseInputRef.current, interimText.trim()]
        .filter(Boolean)
        .join(" ");

      onTranscript(composed);
    };

    recognition.onerror = (event) => {
      if (
        event.error === "not-allowed" ||
        event.error === "service-not-allowed"
      ) {
        toast.error(t("input.voicePermission"));
      } else if (event.error !== "aborted" && event.error !== "no-speech") {
        toast.error(t("input.voiceError"));
      }
    };

    recognition.onend = () => {
      if (listeningRef.current) {
        listeningRef.current = false;
        setListening(false);
        recognitionRef.current = null;
      }
    };

    recognitionRef.current = recognition;
    baseInputRef.current = "";
    listeningRef.current = true;
    setListening(true);

    try {
      recognition.start();
    } catch {
      listeningRef.current = false;
      setListening(false);
      recognitionRef.current = null;
    }
  }, [locale, onTranscript, t]);

  const handleToggle = useCallback(() => {
    if (listeningRef.current) {
      stopListening();
    } else {
      startListening();
    }
  }, [startListening, stopListening]);

  useEffect(
    () => () => {
      if (listeningRef.current) {
        listeningRef.current = false;
        recognitionRef.current?.stop();
        recognitionRef.current = null;
      }
    },
    []
  );

  if (!supported) {
    return null;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          aria-label={t("input.voice")}
          className={cn(
            "h-7 w-7 rounded-lg border border-border/40 p-1 transition-colors",
            listening
              ? "animate-pulse border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/15 hover:text-destructive"
              : "text-foreground hover:border-border hover:text-foreground"
          )}
          data-testid="voice-input-button"
          disabled={disabled}
          onClick={handleToggle}
          variant="ghost"
        >
          <MicIcon className="size-3.5" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={8}>
        {listening ? t("input.listening") : t("input.voice")}
      </TooltipContent>
    </Tooltip>
  );
}
