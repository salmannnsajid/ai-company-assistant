import type { ToolUIPart, UIMessage } from 'ai';

export type Segment = { kind: 'text'; text: string } | { kind: 'tools'; parts: ToolUIPart[] };

// Groups a message's parts so consecutive tool calls render as one "steps" block.
export function toSegments(parts: UIMessage['parts']): Segment[] {
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

// The answer as plain text, for copying.
export function segmentsToText(segments: Segment[]): string {
  return segments
    .map((s) => (s.kind === 'text' ? s.text : ''))
    .join('\n\n')
    .trim();
}
