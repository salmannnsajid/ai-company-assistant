import { useEffect, useState } from 'react';

// Shown one at a time while the agent works; the first is shown right away.
const WORKING_PHRASES = ['Thinking', 'Working on it', 'Still thinking', 'One moment'];

// The wording for the status line, cycled on a timer so it reads as one continuous wait
// instead of flickering as tool calls start and finish.
export function useWorkingPhrase(working: boolean): string {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!working) {
      setIndex(0);
      return;
    }
    const id = setInterval(() => setIndex((i) => (i % (WORKING_PHRASES.length - 1)) + 1), 2500);
    return () => clearInterval(id);
  }, [working]);

  return WORKING_PHRASES[index];
}
