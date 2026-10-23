'use client';

import { useEffect, useRef, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { ChatHeader } from '@/components/chat/chat-header';
import { Composer } from '@/components/chat/composer';
import { EmptyState } from '@/components/chat/empty-state';
import { ErrorNotice } from '@/components/chat/error-notice';
import { MessageList } from '@/components/chat/message-list';
import { SchemaPanel } from '@/components/schema-panel';

export default function ChatPage() {
  const [showSchema, setShowSchema] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, regenerate, stop, status, error } = useChat({
    transport: new DefaultChatTransport({ api: '/api/chat' }),
  });

  const streaming = status === 'submitted' || status === 'streaming';

  // "Working" lasts from sending until the answer text starts, so one status line can cover
  // the whole wait.
  const lastMessage = messages[messages.length - 1];
  const working =
    status === 'submitted' ||
    (status === 'streaming' && !lastMessage.parts.some((p) => p.type === 'text' && p.text.trim()));

  // Keep the newest message in view.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, status]);

  function send(text: string) {
    if (!text.trim() || streaming) return;
    sendMessage({ text });
  }

  return (
    <div className="flex h-full flex-col">
      <ChatHeader schemaOpen={showSchema} onToggleSchema={() => setShowSchema((s) => !s)} />

      <div className="relative flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
          <main className="scroll-thin flex-1 overflow-y-auto">
            <div className="mx-auto flex min-h-full max-w-3xl flex-col gap-6 px-4 py-8">
              {messages.length === 0 && <EmptyState onPick={send} />}
              <MessageList messages={messages} working={working} busy={streaming} onRetry={() => regenerate()} />
              {error && <ErrorNotice error={error} onRetry={() => regenerate()} />}
              <div ref={bottomRef} />
            </div>
          </main>

          <footer className="px-4 pb-5">
            <Composer streaming={streaming} onSend={send} onStop={() => stop()} />
            <p className="mt-2 text-center text-xs text-muted">
              Answers come from a demo database and can contain mistakes. · Built by Salman Sajid
            </p>
          </footer>
        </div>
        {showSchema && <SchemaPanel onClose={() => setShowSchema(false)} />}
      </div>
    </div>
  );
}
