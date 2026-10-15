import { createClient, type InArgs } from '@libsql/client';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { dbUrl } from '../db-url';

// The fake company database created by `npm run seed`.
const db = createClient({ url: dbUrl('company.db') });

// Runs a query and returns rows as plain objects ({ column: value }).
async function query(sql: string, args: InArgs = []) {
  const result = await db.execute({ sql, args });
  return result.rows.map((row) => Object.fromEntries(result.columns.map((col) => [col, row[col]])));
}

async function findProject(name: string) {
  const [project] = await query('SELECT * FROM projects WHERE name LIKE ?', [`%${name}%`]);
  if (!project) throw new Error(`No project matching "${name}".`);
  return project;
}

export const listProjectsTool = createTool({
  id: 'list_projects',
  description: 'List all company projects with client, status, lead, due date, and task progress.',
  inputSchema: z.object({}),
  execute: async () =>
    query(`
      SELECT p.name, p.client, p.status, p.due_date, lead.name AS lead,
             COUNT(t.id) AS total_tasks,
             SUM(t.status = 'done') AS done_tasks
      FROM projects p
      JOIN people lead ON lead.id = p.lead_id
      LEFT JOIN tasks t ON t.project_id = p.id
      GROUP BY p.id
      ORDER BY p.status, p.due_date
    `),
});

export const getProjectStatusTool = createTool({
  id: 'get_project_status',
  description:
    'Get the status of one project: details, current sprint, task counts by status, and overdue tasks.',
  inputSchema: z.object({
    project: z.string().describe('Project name or part of it, e.g. "Payments"'),
  }),
  execute: async ({ project }) => {
    const p = await findProject(project);
    const [lead] = await query('SELECT name, role FROM people WHERE id = ?', [p.lead_id]);
    const [currentSprint] = await query(
      `SELECT name, goal, start_date, end_date FROM sprints
       WHERE project_id = ? AND status = 'active'`,
      [p.id],
    );
    const tasksByStatus = await query(
      'SELECT status, COUNT(*) AS count FROM tasks WHERE project_id = ? GROUP BY status',
      [p.id],
    );
    const overdueTasks = await query(
      `SELECT t.title, t.status, t.due_date, people.name AS assignee
       FROM tasks t LEFT JOIN people ON people.id = t.assignee_id
       WHERE t.project_id = ? AND t.status != 'done' AND t.due_date < date('now', 'localtime')`,
      [p.id],
    );
    return { project: p, lead, currentSprint: currentSprint ?? null, tasksByStatus, overdueTasks };
  },
});

export const getSprintTasksTool = createTool({
  id: 'get_sprint_tasks',
  description:
    "List the tasks in a project's sprint with assignee, status, priority, and due date. Defaults to the current sprint.",
  inputSchema: z.object({
    project: z.string().describe('Project name or part of it'),
    sprint: z.string().optional().describe('Sprint name, e.g. "Sprint 2". Omit for the current sprint.'),
  }),
  execute: async ({ project, sprint }) => {
    const p = await findProject(project);
    // Without a sprint name: the active sprint, or the most recent one if none is active.
    const [s] = sprint
      ? await query('SELECT * FROM sprints WHERE project_id = ? AND name LIKE ?', [p.id, `%${sprint}%`])
      : await query(
          `SELECT * FROM sprints WHERE project_id = ?
           ORDER BY status = 'active' DESC, start_date DESC LIMIT 1`,
          [p.id],
        );
    if (!s) throw new Error(`No sprint matching "${sprint}" in ${p.name}.`);
    const tasks = await query(
      `SELECT t.title, t.status, t.priority, t.estimate_hours, t.due_date, people.name AS assignee
       FROM tasks t LEFT JOIN people ON people.id = t.assignee_id
       WHERE t.sprint_id = ?
       ORDER BY t.status, t.priority`,
      [s.id],
    );
    return { project: p.name, sprint: s, tasks };
  },
});

export const getPersonWorkloadTool = createTool({
  id: 'get_person_workload',
  description:
    "Get a team member's role and open (not done) tasks across all projects, with total open estimate hours vs their weekly capacity.",
  inputSchema: z.object({
    person: z.string().describe('Person name or part of it, e.g. "Bilal"'),
  }),
  execute: async ({ person }) => {
    const [p] = await query('SELECT * FROM people WHERE name LIKE ?', [`%${person}%`]);
    if (!p) throw new Error(`No team member matching "${person}".`);
    const openTasks = await query(
      `SELECT t.title, t.status, t.priority, t.estimate_hours, t.due_date, projects.name AS project
       FROM tasks t JOIN projects ON projects.id = t.project_id
       WHERE t.assignee_id = ? AND t.status != 'done'
       ORDER BY t.due_date`,
      [p.id],
    );
    const openHours = openTasks.reduce((sum, t) => sum + Number(t.estimate_hours), 0);
    return { person: p, openTasks, openHours };
  },
});

export const getOverdueTasksTool = createTool({
  id: 'get_overdue_tasks',
  description: 'List all tasks across the company that are past their due date and not done.',
  inputSchema: z.object({}),
  execute: async () =>
    query(`
      SELECT t.title, t.status, t.priority, t.due_date, projects.name AS project, people.name AS assignee
      FROM tasks t
      JOIN projects ON projects.id = t.project_id
      LEFT JOIN people ON people.id = t.assignee_id
      WHERE t.status != 'done' AND t.due_date < date('now', 'localtime')
      ORDER BY t.due_date
    `),
});

// --- Text-to-SQL: the agent writes its own query for questions the tools above don't cover. ---

// A separate connection that SQLite itself keeps read-only, so even a bad query can't change data.
const readOnlyDb = createClient({ url: dbUrl('company.db') });

// The table definitions, read from the database so the tool description always matches it.
const schema = (await readOnlyDb.execute("SELECT sql FROM sqlite_master WHERE type = 'table'")).rows
  .map((row) => row.sql)
  .join(';\n');

const MAX_ROWS = 100;

export const runSqlQueryTool = createTool({
  id: 'run_sql_query',
  description: `Run a read-only SQLite SELECT query against the company database. Use this only when the other tools can't answer the question. Dates are 'YYYY-MM-DD' text; use date('now', 'localtime') for today. Returns at most ${MAX_ROWS} rows.

Schema:
${schema}`,
  inputSchema: z.object({
    sql: z.string().describe('A single SELECT (or WITH ... SELECT) statement'),
  }),
  execute: async ({ sql }) => {
    const statement = sql.trim().replace(/;$/, '');
    if (!/^(select|with)\b/i.test(statement) || statement.includes(';')) {
      throw new Error('Only a single SELECT statement is allowed.');
    }
    await readOnlyDb.execute('PRAGMA query_only = ON');
    // Wrapping the query enforces the row limit whatever the model wrote.
    const result = await readOnlyDb.execute(`SELECT * FROM (${statement}) LIMIT ${MAX_ROWS}`);
    return result.rows.map((row) => Object.fromEntries(result.columns.map((col) => [col, row[col]])));
  },
});
