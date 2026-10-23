import type { ToolUIPart } from 'ai';
import { CheckIcon } from '@/components/icons';

// Friendly labels for the agent's tool calls: [while running, when done].
const TOOL_LABELS: Record<string, [string, string]> = {
  list_projects: ['Looking up projects', 'Looked up projects'],
  get_project_status: ['Checking project status', 'Checked project status'],
  get_sprint_tasks: ['Pulling sprint tasks', 'Pulled sprint tasks'],
  get_person_workload: ['Checking workload', 'Checked workload'],
  get_overdue_tasks: ['Finding overdue tasks', 'Found overdue tasks'],
  run_sql_query: ['Querying the database', 'Queried the database'],
};

const isRunning = (part: ToolUIPart) => part.state === 'input-streaming' || part.state === 'input-available';

function stepLabel(part: ToolUIPart) {
  const name = part.type.slice('tool-'.length);
  const [active, done] = TOOL_LABELS[name] ?? [name, name];
  return isRunning(part) ? active : done;
}

// One line per run of tool calls: the current step while running, then each kind of step once.
export function Steps({ parts }: { parts: ToolUIPart[] }) {
  const current = parts.find(isRunning);
  if (current) return <div className="shimmer w-fit text-sm">{stepLabel(current)}…</div>;
  return (
    <div className="flex items-center gap-1.5 text-sm text-muted">
      <span className="text-emerald-500">
        <CheckIcon />
      </span>
      {[...new Set(parts.map(stepLabel))].join(' · ')}
    </div>
  );
}
