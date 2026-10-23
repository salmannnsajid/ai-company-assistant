import { useState } from 'react';
import { MicIcon, SendIcon, StopIcon } from '@/components/icons';
import { useDictation } from '@/hooks/use-dictation';

type ComposerProps = {
  /** A reply is on its way, so the send button becomes a stop button. */
  streaming: boolean;
  onSend: (text: string) => void;
  onStop: () => void;
};

// The input row: type or dictate a question, send it, or stop a reply in progress.
export function Composer({ streaming, onSend, onStop }: ComposerProps) {
  const [input, setInput] = useState('');
  const { listening, transcribing, start, stop, cancel } = useDictation(setInput);

  function toggleMic() {
    if (listening) {
      stop();
      return;
    }
    start(input);
  }

  function submit() {
    // Drop anything the mic is still producing, so it can't land back in the empty box.
    if (listening) cancel();
    if (!input.trim() || streaming || transcribing) return;
    onSend(input);
    setInput('');
  }

  const placeholder = listening
    ? 'Listening…'
    : transcribing
      ? 'Transcribing…'
      : 'Ask about projects, sprints, or the team…';

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border border-line bg-surface p-2 shadow-sm transition focus-within:border-accent/60"
    >
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        rows={1}
        placeholder={placeholder}
        className="scroll-thin field-sizing-content max-h-40 flex-1 resize-none bg-transparent px-3 py-2.5 text-[15px] outline-none placeholder:text-muted"
      />
      <button
        type="button"
        onClick={toggleMic}
        disabled={transcribing}
        aria-label={listening ? 'Stop dictation' : 'Dictate'}
        aria-pressed={listening}
        className={`grid size-10 shrink-0 place-items-center rounded-xl transition disabled:opacity-40 ${
          listening ? 'animate-pulse bg-danger text-white' : 'text-muted hover:bg-surface-2 hover:text-fg'
        }`}
      >
        {listening ? <StopIcon /> : <MicIcon />}
      </button>
      {streaming ? (
        <button
          type="button"
          onClick={onStop}
          aria-label="Stop"
          className="grid size-10 shrink-0 place-items-center rounded-xl bg-fg text-bg transition hover:opacity-90"
        >
          <StopIcon />
        </button>
      ) : (
        <button
          type="submit"
          disabled={transcribing || !input.trim()}
          aria-label="Send"
          className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-accent-fg transition hover:opacity-90 disabled:opacity-30"
        >
          <SendIcon />
        </button>
      )}
    </form>
  );
}
