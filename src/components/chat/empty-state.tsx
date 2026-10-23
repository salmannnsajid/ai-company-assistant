import { SparkIcon } from '@/components/icons';

const SUGGESTIONS = [
  'Which projects are at risk?',
  'Is anyone on the team overloaded?',
  "What's overdue right now?",
  'Which client has the biggest budget?',
];

// First screen of a new chat: what the assistant knows, plus a few questions to tap.
export function EmptyState({ onPick }: { onPick: (question: string) => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <div className="mb-5 grid size-14 place-items-center rounded-2xl bg-accent text-accent-fg shadow-lg shadow-accent/25">
        <SparkIcon className="size-7" />
      </div>
      <h2 className="text-2xl font-semibold tracking-tight">How can I help?</h2>
      <p className="mt-2 max-w-sm text-sm text-muted">
        Ask about projects, deadlines, or who is working on what. Type below or tap the mic to talk.
      </p>
      <div className="mt-8 grid w-full max-w-lg gap-2 sm:grid-cols-2">
        {SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            onClick={() => onPick(suggestion)}
            className="rounded-xl border border-line bg-surface px-4 py-3 text-left text-sm transition hover:border-accent/50 hover:bg-surface-2"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}
