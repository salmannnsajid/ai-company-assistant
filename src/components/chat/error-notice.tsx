import { AlertIcon } from '@/components/icons';
import { errorText } from '@/lib/error-text';

// Shown in place of an answer when the request fails. Stacks on narrow screens so a long
// message can never push the chat sideways.
export function ErrorNotice({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-col gap-3 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 sm:flex-row sm:items-center"
    >
      <div className="flex min-w-0 flex-1 items-start gap-2.5">
        <span className="mt-0.5 shrink-0 text-danger">
          <AlertIcon />
        </span>
        <p className="min-w-0 text-sm break-words">{errorText(error)}</p>
      </div>
      <button
        onClick={onRetry}
        className="shrink-0 self-start rounded-lg border border-danger/40 px-3 py-1.5 text-sm font-medium text-danger transition hover:bg-danger/10 sm:self-auto"
      >
        Try again
      </button>
    </div>
  );
}
