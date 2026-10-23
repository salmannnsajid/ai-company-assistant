import { useRef, useState } from 'react';

// The Web Speech API is missing from TypeScript's DOM types, so declare the parts we use.
type Recognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
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
 * Shows words in the box while the user is still talking. This is a preview only: the clip
 * still goes to Whisper, whose text replaces whatever this showed, so a browser that hears
 * badly or gives up at the first pause can't affect the message that gets sent.
 *
 * Returns a function that stops it, or nothing at all when the browser can't do this.
 */
function startPreview(draft: string, onText: (text: string) => void) {
  if (!RecognitionCtor) return;
  const recognition = new RecognitionCtor();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-US';

  recognition.onresult = (event) => {
    // Rebuilt from the whole list every time. Adding results up as they arrive repeats
    // words, because browsers re-deliver results they have already marked final.
    let text = '';
    for (let i = 0; i < event.results.length; i++) text += `${event.results[i][0].transcript} `;
    onText(join(draft, text.replace(/\s+/g, ' ').trim()));
  };

  try {
    recognition.start();
  } catch {
    return; // no preview; the recording carries on regardless
  }
  return () => {
    recognition.onresult = null;
    recognition.stop();
  };
}

/**
 * Mic input for the composer: record the question, send the clip to /api/transcribe, and put
 * the text in the message box after whatever was already typed.
 */
export function useDictation(onText: (text: string) => void) {
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const stopPreview = useRef<(() => void) | undefined>(undefined);
  const discarded = useRef(false);

  async function start(draft: string) {
    discarded.current = false;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const chunks: Blob[] = [];
    const recorder = new MediaRecorder(stream);
    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      setRecording(false);
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
    setRecording(true);
    stopPreview.current = startPreview(draft, onText);
  }

  function stop() {
    stopPreview.current?.();
    stopPreview.current = undefined;
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
  }

  // Stop and throw the clip away, e.g. because the question was just sent.
  function cancel() {
    discarded.current = true;
    stop();
  }

  return { recording, transcribing, start, stop, cancel };
}
