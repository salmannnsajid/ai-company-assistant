'use client';

import { useEffect, useRef, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type ToolUIPart, type UIMessage } from 'ai';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { SchemaPanel } from './schema-panel';

const SUGGESTIONS = [
  'Which projects are at risk?',
  'Is anyone on the team overloaded?',
  "What's overdue right now?",
  'Which client has the biggest budget?',
];

// Friendly labels for the agent's tool calls: [while running, when done].
const TOOL_LABELS: Record<string, [string, string]> = {
  list_projects: ['Looking up projects', 'Looked up projects'],
  get_project_status: ['Checking project status', 'Checked project status'],
  get_sprint_tasks: ['Pulling sprint tasks', 'Pulled sprint tasks'],
  get_person_workload: ['Checking workload', 'Checked workload'],
  get_overdue_tasks: ['Finding overdue tasks', 'Found overdue tasks'],
  run_sql_query: ['Querying the database', 'Queried the database'],
};

// Shown one at a time while the agent works; the first is shown right away.
const WORKING_PHRASES = [
  'Thinking',
  'Digging into the data',
  'Flipping through the sprint board',
  'Crunching the numbers',
  'Connecting the dots',
  'Double-checking the details',
  'Putting your answer together',
];

type Segment ={ kind: 'text'; text: string } | { kind: 'tools'; parts: ToolUIPart[] };

// Groups a message's parts so consecutive tool calls render as one "steps" block.
function toSegments(parts: UIMessage['parts']): Segment[] {
  const segments: Segment[] = [];
  for (const part of parts) {
    const last = segments[segments.length - 1];
    if (part.type === 'text' && part.text.trim()) segments.push({ kind: 'text', text: part.text });
    // Tool calls show up as parts named "tool-<toolName>".
    else if (part.type.startsWith('tool-')) {
      if (last?.kind === 'tools') last.parts.push(part as ToolUIPart);
      else segments.push({ kind: 'tools', parts: [part as ToolUIPart] });
    }
  }
  return segments;
}

export default function ChatPage() {
  const [input, setInput] = useState('');
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [showSchema, setShowSchema] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const askedByVoice = useRef(false); // read the reply aloud only if the question was spoken

  const { messages, sendMessage, regenerate, stop, status, error } = useChat({
    transport: new DefaultChatTransport({ api: '/api/chat' }),
    onFinish: ({ message }) => {
      if (!askedByVoice.current) return;
      const text = message.parts.map((p) => (p.type === 'text' ? p.text : '')).join(' ');
      speechSynthesis.speak(new SpeechSynthesisUtterance(text.replace(/[*_#|`]/g, '')));
    },
  });
  const busy = status === 'submitted' || status === 'streaming' || transcribing;

  // "Working" lasts from sending until the answer text starts. One status line covers it all,
  // cycling phrases on a timer so it doesn't flicker as tool calls start and finish.
  const lastMessage = messages[messages.length - 1];
  const working =
    status === 'submitted' ||
    (status === 'streaming' && !lastMessage.parts.some((p) => p.type === 'text' && p.text.trim()));
  const [phraseIndex, setPhraseIndex] = useState(0);
  useEffect(() => {
    if (!working) {
      setPhraseIndex(0);
      return;
    }
    const id = setInterval(() => setPhraseIndex((i) => (i % (WORKING_PHRASES.length - 1)) + 1), 2500);
    return () => clearInterval(id);
  }, [working]);

  // Keep the newest message in view.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, status, recording, transcribing]);

  function send(text: string) {
    if (!text.trim() || busy) return;
    askedByVoice.current = false;
    sendMessage({ text });
    setInput('');
  }

  async function toggleRecording() {
    if (recording) {
      recorderRef.current?.stop();
      return;
    }
    speechSynthesis.cancel(); // stop talking when the user wants to speak
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const chunks: Blob[] = [];
    const recorder = new MediaRecorder(stream);
    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      setRecording(false);
      setTranscribing(true);
      const blob = new Blob(chunks, { type: recorder.mimeType });
      const form = new FormData();
      form.append('audio', blob, blob.type.includes('mp4') ? 'speech.mp4' : 'speech.webm');
      const { text } = await fetch('/api/transcribe', { method: 'POST', body: form }).then((r) => r.json());
      setTranscribing(false);
      if (!text) return;
      askedByVoice.current = true;
      sendMessage({ text }, { body: { voice: true } });
    };
    recorder.start();
    recorderRef.current = recorder;
    setRecording(true);
  }

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-line bg-surface/80 backdrop-blur">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="grid size-9 place-items-center rounded-xl bg-accent text-accent-fg">
            <SparkIcon />
          </div>
          <div>
            <h1 className="text-[15px] font-semibold leading-tight">Brightloop Assistant</h1>
            <p className="text-xs text-muted">Projects, sprints and team, from the company database</p>
          </div>
          <button
            onClick={() => setShowSchema((s) => !s)}
            aria-pressed={showSchema}
            className={`ml-auto flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition ${
              showSchema ? 'border-accent/50 bg-accent/10 text-accent' : 'border-line text-muted hover:bg-surface-2 hover:text-fg'
            }`}
          >
            <DatabaseIcon />
            <span className="hidden sm:inline">Database</span>
          </button>
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
          <main className="scroll-thin flex-1 overflow-y-auto">
            <div className="mx-auto flex min-h-full max-w-3xl flex-col gap-6 px-4 py-8">
              {messages.length === 0 && (
                <div className="flex flex-1 flex-col items-center justify-center text-center">
                  <div className="mb-5 grid size-14 place-items-center rounded-2xl bg-accent text-accent-fg shadow-lg shadow-accent/25">
                    <SparkIcon className="size-7" />
                  </div>
                  <h2 className="text-2xl font-semibold tracking-tight">How can I help?</h2>
                  <p className="mt-2 max-w-sm text-sm text-muted">
                    Ask about projects, deadlines, or who is working on what. Type below or tap the mic to talk.
                  </p>
                  <div className="mt-8 grid w-full max-w-lg gap-2 sm:grid-cols-2">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        onClick={() => send(s)}
                        className="rounded-xl border border-line bg-surface px-4 py-3 text-left text-sm transition hover:border-accent/50 hover:bg-surface-2"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((message, index) => {
                const isLast = index === messages.length - 1;
                return message.role === 'user' ? (
                  <div key={message.id} className="flex justify-end">
                    <div className="max-w-[80%] rounded-2xl rounded-br-md bg-accent px-4 py-2.5 text-accent-fg">
                      {message.parts.map((part, i) => (part.type === 'text' ? <span key={i}>{part.text}</span> : null))}
                    </div>
                  </div>
                ) : (
                  <div key={message.id} className="group flex gap-3">
                    <div className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-surface-2 text-accent">
                      <SparkIcon className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-3">
                      {toSegments(message.parts).map((segment, i) => {
                        if (segment.kind === 'tools') {
                          // While working, the status line below speaks for the steps.
                          return isLast && working ? null : <Steps key={i} parts={segment.parts} />;
                        }
                        return (
                          <div key={i} className="markdown">
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              components={{
                                table: ({ children }) => (
                                  <div className="table-wrap">
                                    <table>{children}</table>
                                  </div>
                                ),
                              }}
                            >
                              {segment.text}
                            </ReactMarkdown>
                          </div>
                        );
                      })}
                      {isLast && working && <Typing label={WORKING_PHRASES[phraseIndex]} />}
                      {!(isLast && busy) && (
                        <MessageActions
                          text={toSegments(message.parts)
                            .map((s) => (s.kind === 'text' ? s.text : ''))
                            .join('\n\n')}
                          onRetry={isLast ? () => regenerate() : undefined}
                        />
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Once the reply's message exists, the status line lives inside it instead (one avatar). */}
              {(transcribing || (working && lastMessage?.role !== 'assistant')) && (
                <div className="flex items-center gap-3">
                  <div className="grid size-8 place-items-center rounded-lg bg-surface-2 text-accent">
                    <SparkIcon className="size-4" />
                  </div>
                  <Typing label={transcribing ? 'Transcribing' : WORKING_PHRASES[phraseIndex]} />
                </div>
              )}

              {error && (
                <div className="flex items-center gap-3 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
                  <span className="flex-1">
                    {/rate limit/i.test(error.message)
                      ? 'The free model is busy (rate limit). Wait about 10 seconds and try again.'
                      : error.message}
                  </span>
                  <button
                    onClick={() => regenerate()}
                    className="shrink-0 rounded-lg border border-danger/40 px-3 py-1 font-medium transition hover:bg-danger/10"
                  >
                    Try again
                  </button>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          </main>

          <footer className="px-4 pb-5">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border border-line bg-surface p-2 shadow-sm transition focus-within:border-accent/60"
            >
              {recording ? (
                <div className="flex flex-1 items-center gap-2 px-3 py-2.5 text-sm text-danger">
                  <span className="size-2 animate-pulse rounded-full bg-danger" />
                  Listening… tap stop when you are done
                </div>
              ) : (
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      send(input);
                    }
                  }}
                  rows={1}
                  placeholder="Ask about projects, sprints, or the team…"
                  className="field-sizing-content max-h-40 flex-1 resize-none bg-transparent px-3 py-2.5 text-[15px] outline-none placeholder:text-muted"
                />
              )}
              <button
                type="button"
                onClick={toggleRecording}
                disabled={busy && !recording}
                aria-label={recording ? 'Stop recording' : 'Talk'}
                className={`grid size-10 shrink-0 place-items-center rounded-xl transition disabled:opacity-40 ${
                  recording ? 'bg-danger text-white' : 'text-muted hover:bg-surface-2 hover:text-fg'
                }`}
              >
                {recording ? <StopIcon /> : <MicIcon />}
              </button>
              {status === 'submitted' || status === 'streaming' ? (
                <button
                  type="button"
                  onClick={() => stop()}
                  aria-label="Stop"
                  className="grid size-10 shrink-0 place-items-center rounded-xl bg-fg text-bg transition hover:opacity-90"
                >
                  <StopIcon />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={busy || recording || !input.trim()}
                  aria-label="Send"
                  className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-accent-fg transition hover:opacity-90 disabled:opacity-30"
                >
                  <SendIcon />
                </button>
              )}
            </form>
            <p className="mt-2 text-center text-xs text-muted">Answers come from a demo database and can contain mistakes.</p>
          </footer>
        </div>
        {showSchema && <SchemaPanel onClose={() => setShowSchema(false)} />}
      </div>
    </div>
  );
}

function DatabaseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="size-4" aria-hidden>
      <ellipse cx="12" cy="5" rx="8" ry="3" />
      <path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" />
    </svg>
  );
}

const isRunning = (part: ToolUIPart) => part.state === 'input-streaming' || part.state === 'input-available';

function stepLabel(part: ToolUIPart) {
  const name = part.type.slice('tool-'.length);
  const [active, done] = TOOL_LABELS[name] ?? [name, name];
  return isRunning(part) ? active : done;
}

// One line per run of tool calls: the current step while running, then each kind of step once.
function Steps({ parts }: { parts: ToolUIPart[] }) {
  const current = parts.find(isRunning);
  if (current) return <div className="shimmer w-fit text-sm">{stepLabel(current)}…</div>;
  return (
    <div className="flex items-center gap-1.5 text-sm text-muted">
      <span className="text-emerald-500">
        <CheckIcon />
      </span>
      {[...new Set(parts.map(stepLabel))].join(' · ')}
    </div>
  );
}

function Typing({ label }: { label: string }) {
  return <div className="shimmer w-fit text-sm">{label}…</div>;
}

const ACTION_BUTTON = 'grid size-8 place-items-center rounded-lg transition hover:bg-surface-2 hover:text-fg';

// Copy (and Retry on the latest answer). Hidden until hover on older answers, like ChatGPT.
function MessageActions({ text, onRetry }: { text: string; onRetry?: () => void }) {
  const [copied, setCopied] = useState(false);
  if (!text) return null;
  return (
    <div
      className={`-ml-1.5 -mt-1 flex text-muted transition-opacity ${
        onRetry ? '' : 'opacity-0 group-hover:opacity-100 focus-within:opacity-100'
      }`}
    >
      <button
        onClick={async () => {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        aria-label={copied ? 'Copied' : 'Copy'}
        title={copied ? 'Copied' : 'Copy'}
        className={ACTION_BUTTON}
      >
        {copied ? <CheckIcon /> : <CopyIcon />}
      </button>
      {onRetry && (
        <button onClick={onRetry} aria-label="Retry" title="Retry" className={ACTION_BUTTON}>
          <RetryIcon />
        </button>
      )}
    </div>
  );
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4" aria-hidden>
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4" aria-hidden>
      <path d="M5 12l5 5 9-10" />
    </svg>
  );
}

function RetryIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4" aria-hidden>
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5" />
    </svg>
  );
}

function SparkIcon({ className = 'size-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 2l1.9 5.6L19.5 9.5l-5.6 1.9L12 17l-1.9-5.6L4.5 9.5l5.6-1.9L12 2zm7 11l.95 2.55L22.5 16.5l-2.55.95L19 20l-.95-2.55L15.5 16.5l2.55-.95L19 13z" />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="size-5" aria-hidden>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="size-4" aria-hidden>
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="size-5" aria-hidden>
      <path d="M12 19V5M5 12l7-7 7 7" />
    </svg>
  );
}
