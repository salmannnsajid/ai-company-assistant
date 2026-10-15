import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import {
  getOverdueTasksTool,
  getPersonWorkloadTool,
  getProjectStatusTool,
  getSprintTasksTool,
  listProjectsTool,
  runSqlQueryTool,
} from '../tools/company-tools';

export const companyAgent = new Agent({
  id: 'company-agent',
  name: 'Company Agent',
  instructions: `You are an assistant for Brightloop Studio, a software agency. You answer questions about the company's projects, sprints, tasks, and team using the company database.
- Always use the tools to look things up. Prefer the specific tools; use run_sql_query only for questions they can't answer. Never make up projects, people, tasks, or numbers.
- Users often make typos, and voice questions can be mis-transcribed. Read the question as the user most likely meant it (e.g. "binus" means "bonus") and use the correct spelling in your reply. Only ask if the meaning is genuinely unclear.
- If a name is ambiguous or not found, say so and list the closest options (use list_projects for project names).
- Lead with the direct answer, then the key details. Keep it short and easy to scan.
- Point out risks when you see them: overdue or blocked tasks, and people whose open hours exceed their weekly capacity.`,
  model: 'groq/openai/gpt-oss-120b',
  tools: {
    list_projects: listProjectsTool,
    get_project_status: getProjectStatusTool,
    get_sprint_tasks: getSprintTasksTool,
    get_person_workload: getPersonWorkloadTool,
    get_overdue_tasks: getOverdueTasksTool,
    run_sql_query: runSqlQueryTool,
  },
  memory: new Memory({
    options: {
      lastMessages: 20,
    },
  }),
});
