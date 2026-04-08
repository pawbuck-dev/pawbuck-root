import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from "expo-speech-recognition";
import { useCallback, useRef, useState } from "react";
import { Alert, Platform } from "react-native";

const SILENT_ERRORS = new Set([
  "aborted",
  "no-speech",
  "not-allowed",
  "interrupted",
]);

/**
 * Push-to-talk style speech-to-text for Milo composer (expo-speech-recognition).
 * Merges recognized text with whatever was in the field when recording started.
 */
export function useMiloSpeechToText(
  inputText: string,
  setInputText: (value: string) => void
) {
  const [isListening, setIsListening] = useState(false);
  const baseTextRef = useRef("");
  /** Avoid double-start before native `start` event fires. */
  const sessionActiveRef = useRef(false);

  useSpeechRecognitionEvent("start", () => {
    sessionActiveRef.current = true;
    setIsListening(true);
  });
  useSpeechRecognitionEvent("end", () => {
    sessionActiveRef.current = false;
    setIsListening(false);
  });

  useSpeechRecognitionEvent("result", (event) => {
    const piece = event.results[0]?.transcript ?? "";
    const trimmed = piece.trim();
    if (!trimmed) return;
    const base = baseTextRef.current;
    const spacer = base.length > 0 ? " " : "";
    setInputText(`${base}${spacer}${trimmed}`);
  });

  useSpeechRecognitionEvent("error", (event) => {
    sessionActiveRef.current = false;
    setIsListening(false);
    if (SILENT_ERRORS.has(event.error)) return;
    Alert.alert(
      "Voice input",
      event.message?.trim() ||
        `Speech recognition failed (${event.error}). Try again.`
    );
  });

  const stop = useCallback(() => {
    try {
      ExpoSpeechRecognitionModule.stop();
    } catch {
      /* already stopped */
    }
  }, []);

  const toggle = useCallback(async () => {
    if (sessionActiveRef.current) {
      stop();
      return;
    }

    const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        "Microphone & dictation",
        Platform.select({
          ios:
            "Allow microphone and speech recognition for Pawbuck in Settings to speak to Milo.",
          default:
            "Allow microphone access for Pawbuck to speak to Milo.",
        })
      );
      return;
    }

    baseTextRef.current = inputText.trimEnd();

    try {
      ExpoSpeechRecognitionModule.start({
        lang: "en-US",
        interimResults: true,
        continuous: false,
        maxAlternatives: 1,
      });
    } catch {
      Alert.alert("Voice input", "Could not start speech recognition.");
    }
  }, [inputText, stop]);

  return { isListening, toggleSpeech: toggle, stopSpeech: stop };
}
