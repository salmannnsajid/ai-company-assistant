import type { UIMessage } from 'ai';
import { SparkIcon } from '@/components/icons';
import { Markdown } from './markdown';
import { MessageActions } from './message-actions';
import { Steps } from './steps';
import { Typing } from './typing';
import { segmentsToText, toSegments } from '@/lib/message-segments';

export function UserMessage({ message }: { message: UIMessage }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[80%] rounded-2xl rounded-br-md bg-accent px-4 py-2.5 text-accent-fg">
        {message.parts.map((part, i) => (part.type === 'text' ? <span key={i}>{part.text}</span> : null))}
      </div>
    </div>
  );
}

export function AssistantAvatar({ className = '' }: { className?: string }) {
  return (
    <div className={`grid size-8 place-items-center rounded-lg bg-surface-2 text-accent ${className}`}>
      <SparkIcon className="size-4" />
    </div>
  );
}

type AssistantMessageProps = {
  message: UIMessage;
  /** The agent is still working on this answer, so the status line stands in for the steps. */
  working: boolean;
  statusLabel: string;
  showActions: boolean;
  /** Only the newest answer can be regenerated. */
  onRetry?: () => void;
};

export function AssistantMessage({ message, working, statusLabel, showActions, onRetry }: AssistantMessageProps) {
  const segments = toSegments(message.parts);
  return (
    <div className="group flex gap-3">
      <AssistantAvatar className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1 space-y-3">
        {segments.map((segment, i) =>
          segment.kind === 'tools' ? (
            working ? null : <Steps key={i} parts={segment.parts} />
          ) : (
            <Markdown key={i} text={segment.text} />
          ),
        )}
        {working && <Typing label={statusLabel} />}
        {showActions && <MessageActions text={segmentsToText(segments)} onRetry={onRetry} />}
      </div>
    </div>
  );
}
