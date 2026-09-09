/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useRef } from 'react';
import { SpeechRecognitionStatus } from '../types';

// TypeScript definitions for the Web Speech API
interface SpeechRecognitionEvent extends Event {
  readonly results: SpeechRecognitionResultList;
  readonly resultIndex: number;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  readonly transcript: string;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
  onend: (() => any) | null;
  start(): void;
  stop(): void;
}

interface SpeechRecognitionStatic {
  new (): SpeechRecognition;
}

declare global {
  interface Window {
    SpeechRecognition: SpeechRecognitionStatic;
    webkitSpeechRecognition: SpeechRecognitionStatic;
  }
}

interface SpeechRecognitionHook {
  status: SpeechRecognitionStatus;
  startListening: () => void;
  stopListening: () => void;
  hasRecognitionSupport: boolean;
}

const getSpeechRecognition = (): SpeechRecognitionStatic | null => {
  if (typeof window !== 'undefined') {
    return window.SpeechRecognition || window.webkitSpeechRecognition;
  }
  return null;
};

export const useSpeechRecognition = (
    currentText: string,
    setText: React.Dispatch<React.SetStateAction<string>>
): SpeechRecognitionHook => {
  const [status, setStatus] = useState<SpeechRecognitionStatus>('idle');
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const textBeforeListenStartRef = useRef('');
  const statusRef = useRef(status);
  statusRef.current = status;

  useEffect(() => {
    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) {
      console.log("Speech recognition not supported by this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'ru-RU';

    recognition.onresult = (event) => {
      if (statusRef.current === 'idle') return;
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = 0; i < event.results.length; i++) {
        const transcriptPart = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcriptPart;
        } else {
          interimTranscript += transcriptPart;
        }
      }
      
      const separator = textBeforeListenStartRef.current.length > 0 ? ' ' : '';
      setText(textBeforeListenStartRef.current + separator + finalTranscript + interimTranscript);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'network') {
          setStatus('reconnecting');
      } else {
          setStatus('error');
      }
    };

    recognition.onend = () => {
      // Only transition to idle if we are not in a reconnect cycle
      if (statusRef.current === 'listening' || statusRef.current === 'error') {
          setStatus('idle');
          console.log("Speech recognition ended.");
      }
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Effect to handle automatic reconnection
  useEffect(() => {
    if (status !== 'reconnecting') return;

    const recognition = recognitionRef.current;
    if (!recognition) return;

    console.log("Network error. Attempting to restart recognition in 1s...");
    const timeoutId = setTimeout(() => {
        textBeforeListenStartRef.current = currentText.trim();
        recognition.start();
        setStatus('listening');
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [status, currentText]);


  const startListening = () => {
    if (recognitionRef.current && (status === 'idle' || status === 'error')) {
      textBeforeListenStartRef.current = currentText.trim();
      recognitionRef.current.start();
      setStatus('listening');
      console.log("Speech recognition started.");
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && (status === 'listening' || status === 'reconnecting')) {
      recognitionRef.current.stop();
      setStatus('idle');
      statusRef.current = 'idle'; // Immediately update ref to prevent onresult from setting text
      console.log("Speech recognition stopped by user.");
    }
  };

  return {
    status,
    startListening,
    stopListening,
    hasRecognitionSupport: !!getSpeechRecognition(),
  };
};