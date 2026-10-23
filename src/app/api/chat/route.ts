import { handleChatStream } from '@mastra/ai-sdk';
import { createUIMessageStreamResponse } from 'ai';
import { mastra } from '@/mastra';

// Streams the company agent's reply to the chat page.
// `useChat` sends a chat `id`; using it as the memory thread gives each chat its own history.
export async function POST(req: Request) {
  const { id, messages, trigger } = await req.json();
  const stream = await handleChatStream({
    mastra,
    agentId: 'company-agent',
    version: 'v7',
    params: {
      messages,
      trigger,
      // Each tool call uses a step; the default of 5 can run out before the agent writes its answer.
      maxSteps: 10,
      memory: { thread: id, resource: 'web-user' },
    },
  });
  return createUIMessageStreamResponse({ stream });
}
