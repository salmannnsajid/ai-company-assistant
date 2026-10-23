import { DatabaseIcon, SparkIcon } from '@/components/icons';

type ChatHeaderProps = {
  schemaOpen: boolean;
  onToggleSchema: () => void;
};

export function ChatHeader({ schemaOpen, onToggleSchema }: ChatHeaderProps) {
  return (
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
          onClick={onToggleSchema}
          aria-pressed={schemaOpen}
          className={`ml-auto flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition ${
            schemaOpen ? 'border-accent/50 bg-accent/10 text-accent' : 'border-line text-muted hover:bg-surface-2 hover:text-fg'
          }`}
        >
          <DatabaseIcon />
          <span className="hidden sm:inline">Database</span>
        </button>
      </div>
    </header>
  );
}
