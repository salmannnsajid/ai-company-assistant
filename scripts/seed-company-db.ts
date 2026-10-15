// Creates a fake company database for the company agent to query.
// Run with: npm run seed   (re-running wipes and recreates all data)
import { createClient } from '@libsql/client';

const db = createClient({ url: 'file:company.db' });

await db.executeMultiple(`
  DROP TABLE IF EXISTS tasks;
  DROP TABLE IF EXISTS sprints;
  DROP TABLE IF EXISTS projects;
  DROP TABLE IF EXISTS people;

  CREATE TABLE people (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    email TEXT NOT NULL,
    weekly_capacity_hours INTEGER NOT NULL
  );

  CREATE TABLE projects (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    client TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('active', 'on_hold', 'completed')),
    start_date TEXT NOT NULL,
    due_date TEXT NOT NULL,
    lead_id INTEGER NOT NULL REFERENCES people(id),
    budget_hours INTEGER NOT NULL
  );

  CREATE TABLE sprints (
    id INTEGER PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id),
    name TEXT NOT NULL,
    goal TEXT NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('planned', 'active', 'completed'))
  );

  CREATE TABLE tasks (
    id INTEGER PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id),
    sprint_id INTEGER NOT NULL REFERENCES sprints(id),
    title TEXT NOT NULL,
    assignee_id INTEGER REFERENCES people(id),
    status TEXT NOT NULL CHECK (status IN ('todo', 'in_progress', 'blocked', 'done')),
    priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high')),
    estimate_hours INTEGER NOT NULL,
    due_date TEXT NOT NULL
  );
`);

// [id, name, role, email, weekly_capacity_hours]
const people = [
  [1, 'Ayesha Khan', 'Engineering Manager', 'ayesha@brightloop.dev', 20],
  [2, 'Bilal Ahmed', 'Senior Backend Engineer', 'bilal@brightloop.dev', 40],
  [3, 'Sara Malik', 'Frontend Engineer', 'sara@brightloop.dev', 40],
  [4, 'Omar Farooq', 'Full-stack Engineer', 'omar@brightloop.dev', 40],
  [5, 'Hina Raza', 'UI/UX Designer', 'hina@brightloop.dev', 32],
  [6, 'Daniyal Qureshi', 'Mobile Engineer', 'daniyal@brightloop.dev', 40],
  [7, 'Zara Hussain', 'QA Engineer', 'zara@brightloop.dev', 40],
  [8, 'Usman Tariq', 'DevOps Engineer', 'usman@brightloop.dev', 40],
  [9, 'Fatima Sheikh', 'Project Manager', 'fatima@brightloop.dev', 40],
  [10, 'Ali Hassan', 'Backend Engineer', 'ali@brightloop.dev', 40],
];

// [id, name, client, status, start_date, due_date, lead_id, budget_hours]
const projects = [
  [1, 'Shopfront Redesign', 'Noor Retail', 'active', '2026-09-07', '2026-11-30', 3, 600],
  [2, 'Clinic Booking App', 'MediCare Plus', 'active', '2026-09-14', '2026-12-15', 6, 800],
  [3, 'Payments API v2', 'PayFlow', 'active', '2026-09-07', '2026-10-31', 2, 500],
  [4, 'Internal HR Portal', 'Brightloop (internal)', 'on_hold', '2026-06-01', '2027-01-31', 4, 300],
  [5, 'Logistics Dashboard', 'TransCargo', 'completed', '2026-07-27', '2026-08-29', 10, 400],
];

// [id, project_id, name, goal, start_date, end_date, status]
const sprints = [
  [1, 1, 'Sprint 1', 'Design system and new homepage', '2026-09-07', '2026-09-18', 'completed'],
  [2, 1, 'Sprint 2', 'Product listing and search', '2026-09-21', '2026-10-02', 'completed'],
  [3, 1, 'Sprint 3', 'Checkout flow', '2026-10-05', '2026-10-16', 'active'],
  [4, 2, 'Sprint 1', 'Auth and patient profiles', '2026-09-14', '2026-09-25', 'completed'],
  [5, 2, 'Sprint 2', 'Doctor schedules', '2026-09-28', '2026-10-09', 'completed'],
  [6, 2, 'Sprint 3', 'Appointment booking', '2026-10-12', '2026-10-23', 'active'],
  [7, 3, 'Sprint 1', 'Core payment endpoints', '2026-09-07', '2026-09-18', 'completed'],
  [8, 3, 'Sprint 2', 'Refunds and webhooks', '2026-09-21', '2026-10-02', 'completed'],
  [9, 3, 'Sprint 3', 'Security review and go-live prep', '2026-10-05', '2026-10-16', 'active'],
  [10, 4, 'Sprint 1', 'Employee directory', '2026-06-01', '2026-06-12', 'completed'],
  [11, 4, 'Sprint 2', 'Leave requests', '2026-11-02', '2026-11-13', 'planned'],
  [12, 5, 'Sprint 1', 'Live shipment map', '2026-07-27', '2026-08-07', 'completed'],
  [13, 5, 'Sprint 2', 'Reports and export', '2026-08-10', '2026-08-21', 'completed'],
];

// [sprint_id, title, assignee_id, status, priority, estimate_hours, due_date?]
// due_date defaults to the sprint's end date.
const tasks: [number, string, number, string, string, number, string?][] = [
  // Shopfront Redesign
  [1, 'Create design tokens and color palette', 5, 'done', 'high', 12],
  [1, 'Build header and navigation components', 3, 'done', 'high', 16],
  [1, 'Implement new homepage layout', 3, 'done', 'medium', 20],
  [1, 'Set up visual regression tests', 7, 'done', 'low', 8],
  [2, 'Product listing page with filters', 3, 'done', 'high', 24],
  [2, 'Search API integration', 4, 'done', 'high', 16],
  [2, 'Product card hover states', 5, 'done', 'low', 6],
  [2, 'QA product listing on mobile', 7, 'done', 'medium', 8],
  [3, 'Cart page redesign', 3, 'done', 'high', 16],
  [3, 'Checkout form validation', 4, 'in_progress', 'high', 12],
  [3, 'Payment step UI', 3, 'in_progress', 'high', 14],
  [3, 'Order confirmation email template', 5, 'todo', 'medium', 6],
  [3, 'Guest checkout option', 4, 'blocked', 'medium', 10, '2026-10-12'],
  [3, 'Checkout end-to-end tests', 7, 'todo', 'high', 10],
  [3, 'Fix layout shift on product images', 3, 'todo', 'low', 4],
  // Clinic Booking App
  [4, 'Sign up and login screens', 6, 'done', 'high', 16],
  [4, 'Patient profile API', 10, 'done', 'high', 14],
  [4, 'Onboarding screen designs', 5, 'done', 'medium', 10],
  [4, 'Auth flow QA', 7, 'done', 'medium', 6],
  [5, 'Doctor availability API', 10, 'done', 'high', 18],
  [5, 'Doctor profile screen', 6, 'done', 'medium', 12],
  [5, 'Weekly schedule calendar view', 6, 'done', 'high', 20],
  [5, 'Schedule screens QA', 7, 'done', 'medium', 6],
  [6, 'Book appointment API', 10, 'in_progress', 'high', 16],
  [6, 'Time slot picker screen', 6, 'in_progress', 'high', 14],
  [6, 'Appointment reminders via SMS', 10, 'todo', 'medium', 10],
  [6, 'Cancel and reschedule flow designs', 5, 'done', 'medium', 8],
  [6, 'Cancel and reschedule screens', 6, 'todo', 'medium', 12],
  [6, 'Booking flow QA', 7, 'todo', 'high', 8],
  [6, 'Push notification setup', 6, 'blocked', 'low', 6],
  // Payments API v2
  [7, 'Create payment intent endpoint', 2, 'done', 'high', 16],
  [7, 'Card tokenization integration', 2, 'done', 'high', 20],
  [7, 'Idempotency keys', 10, 'done', 'medium', 8],
  [7, 'CI pipeline for API', 8, 'done', 'medium', 10],
  [8, 'Refund endpoint', 10, 'done', 'high', 14],
  [8, 'Webhook delivery system', 2, 'done', 'high', 20],
  [8, 'Webhook signature verification', 2, 'done', 'high', 6],
  [8, 'API contract tests', 7, 'done', 'medium', 10],
  [9, 'Fix webhook retry bug', 2, 'in_progress', 'high', 8, '2026-10-09'],
  [9, 'Penetration test fixes', 2, 'blocked', 'high', 16, '2026-10-12'],
  [9, 'Rate limiting', 10, 'done', 'medium', 8],
  [9, 'Production infrastructure setup', 8, 'in_progress', 'high', 16],
  [9, 'Monitoring and alerts', 8, 'todo', 'high', 10],
  [9, 'Load testing', 7, 'todo', 'high', 12],
  [9, 'API documentation update', 10, 'todo', 'medium', 6],
  // Internal HR Portal
  [10, 'Employee directory page', 4, 'done', 'medium', 16],
  [10, 'Employee search', 4, 'done', 'low', 8],
  [10, 'Profile photo upload', 3, 'done', 'low', 6],
  [10, 'Directory QA', 7, 'done', 'low', 4],
  [11, 'Leave request form', 4, 'todo', 'medium', 12],
  [11, 'Manager approval flow', 4, 'todo', 'medium', 14],
  [11, 'Leave balance calculation', 4, 'todo', 'low', 8],
  // Logistics Dashboard
  [12, 'Live shipment map', 3, 'done', 'high', 24],
  [12, 'Shipment tracking API', 10, 'done', 'high', 18],
  [12, 'Map clustering for dense areas', 3, 'done', 'medium', 10],
  [12, 'Deploy to staging', 8, 'done', 'medium', 6],
  [13, 'Delivery performance report', 10, 'done', 'high', 16],
  [13, 'CSV and PDF export', 3, 'done', 'medium', 12],
  [13, 'Production deployment', 8, 'done', 'high', 8],
  [13, 'Final QA and sign-off', 7, 'done', 'high', 8],
];

const sprintById = new Map(sprints.map((s) => [s[0] as number, s]));

await db.batch(
  [
    ...people.map((args) => ({ sql: 'INSERT INTO people VALUES (?, ?, ?, ?, ?)', args })),
    ...projects.map((args) => ({ sql: 'INSERT INTO projects VALUES (?, ?, ?, ?, ?, ?, ?, ?)', args })),
    ...sprints.map((args) => ({ sql: 'INSERT INTO sprints VALUES (?, ?, ?, ?, ?, ?, ?)', args })),
    ...tasks.map(([sprintId, title, assigneeId, status, priority, estimate, due]) => {
      const sprint = sprintById.get(sprintId)!;
      return {
        sql: `INSERT INTO tasks (project_id, sprint_id, title, assignee_id, status, priority, estimate_hours, due_date)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [sprint[1], sprintId, title, assigneeId, status, priority, estimate, due ?? sprint[5]],
      };
    }),
  ],
  'write',
);

console.log(
  `Seeded company.db: ${people.length} people, ${projects.length} projects, ${sprints.length} sprints, ${tasks.length} tasks.`,
);
