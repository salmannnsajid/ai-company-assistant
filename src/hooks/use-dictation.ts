import { useRef, useState } from 'react';

// The Web Speech API is missing from TypeScript's DOM types, so declare the parts we use.
type Recognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
};

declare global {
  interface Window {
    SpeechRecognition?: new () => Recognition;
    webkitSpeechRecognition?: new () => Recognition;
  }
}

const RecognitionCtor = typeof window === 'undefined' ? undefined : (window.SpeechRecognition ?? window.webkitSpeechRecognition);

const join = (draft: string, spoken: string) => (draft ? `${draft.trimEnd()} ${spoken}` : spoken);

/**
 * Dictation for the composer. Where the browser can recognise speech itself (Chrome, Edge,
 * Safari) the words appear as they are spoken; elsewhere the clip is recorded and sent to
 * /api/transcribe, which takes a moment but ends up in the same place.
 *
 * `onText` receives the draft the box should show, so dictation adds to whatever was typed.
 */
export function useDictation(onText: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const recognitionRef = useRef<Recognition | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const keepListening = useRef(false);
  const discarded = useRef(false);

  function listen(draft: string) {
    const recognition = new RecognitionCtor!();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    let settled = ''; // words the browser has committed to this session
    recognition.onresult = (event) => {
      let pending = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) settled += result[0].transcript;
        else pending += result[0].transcript;
      }
      onText(join(draft, (settled + pending).trimStart()));
    };
    recognition.onerror = (event) => {
      if (event.error === 'no-speech') return; // just a pause; onend restarts below
      keepListening.current = false;
      setListening(false);
    };
    recognition.onend = () => {
      // Browsers end the session at every pause, so keep it going until the user taps stop.
      if (!keepListening.current) {
        setListening(false);
        return;
      }
      try {
        recognition.start();
      } catch {
        setListening(false);
      }
    };

    recognition.start();
    recognitionRef.current = recognition;
  }

  async function record(draft: string) {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const chunks: Blob[] = [];
    const recorder = new MediaRecorder(stream);
    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      setListening(false);
      if (discarded.current) return;
      setTranscribing(true);
      const blob = new Blob(chunks, { type: recorder.mimeType });
      const form = new FormData();
      form.append('audio', blob, blob.type.includes('mp4') ? 'speech.mp4' : 'speech.webm');
      const { text } = await fetch('/api/transcribe', { method: 'POST', body: form }).then((r) => r.json());
      setTranscribing(false);
      if (text) onText(join(draft, text));
    };
    recorder.start();
    recorderRef.current = recorder;
  }

  function start(draft: string) {
    keepListening.current = true;
    discarded.current = false;
    setListening(true);
    if (RecognitionCtor) listen(draft);
    else void record(draft);
  }

  // Finish dictating. Recognised words are already in the box; a recording still has to be
  // sent off for transcription.
  function stop() {
    keepListening.current = false;
    const recognition = recognitionRef.current;
    if (recognition) {
      recognition.onresult = null; // a late result would refill the box after the user moved on
      recognition.stop();
      recognitionRef.current = null;
      setListening(false);
    }
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
  }

  // Stop and throw away whatever is still coming, e.g. because the question was just sent.
  function cancel() {
    discarded.current = true;
    stop();
  }

  return { listening, transcribing, start, stop, cancel };
}
