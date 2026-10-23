import { useState } from 'react';
import { CheckIcon, CopyIcon, RetryIcon } from '@/components/icons';

const ACTION_BUTTON = 'grid size-8 place-items-center rounded-lg transition hover:bg-surface-2 hover:text-fg';

// Copy (and Retry on the latest answer). Hidden until hover on older answers, like ChatGPT.
export function MessageActions({ text, onRetry }: { text: string; onRetry?: () => void }) {
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
