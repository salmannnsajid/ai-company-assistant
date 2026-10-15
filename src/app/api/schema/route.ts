import { createClient } from '@libsql/client';
import { dbUrl } from '@/mastra/db-url';

const db = createClient({ url: dbUrl('company.db') });

// Returns the company database structure (tables, columns, keys, row counts) for the schema panel.
export async function GET() {
  const tables = await db.execute("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY rowid");
  const result = await Promise.all(
    tables.rows.map(async ({ name }) => {
      const [columns, foreignKeys, count] = await Promise.all([
        db.execute(`PRAGMA table_info(${name})`),
        db.execute(`PRAGMA foreign_key_list(${name})`),
        db.execute(`SELECT COUNT(*) AS n FROM ${name}`),
      ]);
      return {
        name: String(name),
        rows: Number(count.rows[0].n),
        columns: columns.rows.map((col) => {
          const fk = foreignKeys.rows.find((k) => k.from === col.name);
          return {
            name: String(col.name),
            type: String(col.type),
            primaryKey: Number(col.pk) > 0,
            references: fk ? `${fk.table}.${fk.to}` : null,
          };
        }),
      };
    }),
  );
  return Response.json(result);
}
