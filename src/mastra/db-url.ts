// `mastra dev` runs from src/mastra/public, `next dev` from the project root.
// Resolving database files against the project root lets both use the same files.
const projectRoot = process.cwd().replace(/\/src\/mastra\/public$/, '');

export const dbUrl = (file: string) => `file:${projectRoot}/${file}`;
