'use client';

import { useEffect, useRef, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type ToolUIPart } from 'ai';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { SchemaPanel } from './schema-panel';

const SUGGESTIONS = [
  'Which projects are at risk?',
  'Is anyone on the team overloaded?',
  "What's overdue right now?",
  'Which client has the biggest budget?',
];

// Friendly labels for the agent's tool calls.
const TOOL_LABELS: Record<string, string> = {
  list_projects: 'Looked up projects',
  get_project_status: 'Checked project status',
  get_sprint_tasks: 'Pulled sprint tasks',
  get_person_workload: 'Checked workload',
  get_overdue_tasks: 'Found overdue tasks',
  run_sql_query: 'Queried the database',
};

export default function ChatPage() {
  const [input, setInput] = useState('');
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [showSchema, setShowSchema] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const askedByVoice = useRef(false); // read the reply aloud only if the question was spoken

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({ api: '/api/chat' }),
    onFinish: ({ message }) => {
      if (!askedByVoice.current) return;
      const text = message.parts.map((p) => (p.type === 'text' ? p.text : '')).join(' ');
      speechSynthesis.speak(new SpeechSynthesisUtterance(text.replace(/[*_#|`]/g, '')));
    },
  });
  const busy = status === 'submitted' || status === 'streaming' || transcribing;

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
          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
              {messages.length === 0 && (
                <div className="flex flex-col items-center pt-[12vh] text-center">
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

              {messages.map((message) =>
                message.role === 'user' ? (
                  <div key={message.id} className="flex justify-end">
                    <div className="max-w-[80%] rounded-2xl rounded-br-md bg-accent px-4 py-2.5 text-accent-fg">
                      {message.parts.map((part, i) => (part.type === 'text' ? <span key={i}>{part.text}</span> : null))}
                    </div>
                  </div>
                ) : (
                  <div key={message.id} className="flex gap-3">
                    <div className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-surface-2 text-accent">
                      <SparkIcon className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-3">
                      {message.parts.map((part, i) => {
                        if (part.type === 'text') {
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
                                {part.text}
                              </ReactMarkdown>
                            </div>
                          );
                        }
                        // Tool calls show up as parts named "tool-<toolName>".
                        if (part.type.startsWith('tool-')) {
                          return <ToolChip key={i} part={part as ToolUIPart} />;
                        }
                        return null;
                      })}
                    </div>
                  </div>
                ),
              )}

              {(status === 'submitted' || transcribing) && (
                <div className="flex items-center gap-3">
                  <div className="grid size-8 place-items-center rounded-lg bg-surface-2 text-accent">
                    <SparkIcon className="size-4" />
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted">
                    {transcribing ? 'Transcribing' : 'Thinking'}
                    <span className="flex gap-1">
                      {[0, 1, 2].map((d) => (
                        <span key={d} className="typing-dot size-1.5 rounded-full bg-muted" style={{ animationDelay: `${d * 0.15}s` }} />
                      ))}
                    </span>
                  </div>
                </div>
              )}

              {error && (
                <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
                  {/rate limit/i.test(error.message)
                    ? 'The free model is busy (rate limit). Wait about 10 seconds and try again.'
                    : error.message}
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
              <button
                type="submit"
                disabled={busy || recording || !input.trim()}
                aria-label="Send"
                className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-accent-fg transition hover:opacity-90 disabled:opacity-30"
              >
                <SendIcon />
              </button>
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

function ToolChip({ part }: { part: ToolUIPart }) {
  const name = part.type.slice('tool-'.length);
  const running = part.state === 'input-streaming' || part.state === 'input-available';
  const failed = part.state === 'output-error';
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-xs text-muted">
      {running ? (
        <span className="size-3 animate-spin rounded-full border-2 border-muted/40 border-t-accent" />
      ) : (
        <span className={failed ? 'text-danger' : 'text-emerald-500'}>{failed ? '✕' : '✓'}</span>
      )}
      {TOOL_LABELS[name] ?? name}
    </div>
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
