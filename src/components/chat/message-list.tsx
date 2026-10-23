import type { UIMessage } from 'ai';
import { useWorkingPhrase } from '@/hooks/use-working-phrase';
import { AssistantAvatar, AssistantMessage, UserMessage } from './message';
import { Typing } from './typing';

type MessageListProps = {
  messages: UIMessage[];
  /** Between sending and the first words of the answer. */
  working: boolean;
  /** A reply is in flight, so the newest answer hides its copy/retry row. */
  busy: boolean;
  onRetry: () => void;
};

export function MessageList({ messages, working, busy, onRetry }: MessageListProps) {
  const phrase = useWorkingPhrase(working);
  const lastMessage = messages[messages.length - 1];

  return (
    <>
      {messages.map((message, index) => {
        const isLast = index === messages.length - 1;
        return message.role === 'user' ? (
          <UserMessage key={message.id} message={message} />
        ) : (
          <AssistantMessage
            key={message.id}
            message={message}
            working={isLast && working}
            statusLabel={phrase}
            showActions={!(isLast && busy)}
            onRetry={isLast ? onRetry : undefined}
          />
        );
      })}

      {/* Once the reply's message exists, the status line lives inside it instead (one avatar). */}
      {working && lastMessage?.role !== 'assistant' && (
        <div className="flex items-center gap-3">
          <AssistantAvatar />
          <Typing label={phrase} />
        </div>
      )}
    </>
  );
}
