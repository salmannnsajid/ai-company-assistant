import { Mastra } from '@mastra/core/mastra';
import { LibSQLStore } from '@mastra/libsql';
import { DuckDBStore } from '@mastra/duckdb';
import { MastraCompositeStore } from '@mastra/core/storage';
import {
  MastraStorageExporter,
  MastraPlatformExporter,
  Observability,
  SensitiveDataFilter,
} from '@mastra/observability';
import { companyAgent } from './agents/company-agent';
import {
  getOverdueTasksTool,
  getPersonWorkloadTool,
  getProjectStatusTool,
  getSprintTasksTool,
  listProjectsTool,
  runSqlQueryTool,
} from './tools/company-tools';
import { dbUrl } from './db-url';

export const mastra = new Mastra({
  bundler: {
    externals: ['@duckdb/node-bindings'],
  },
  agents: { companyAgent },
  tools: {
    listProjectsTool,
    getProjectStatusTool,
    getSprintTasksTool,
    getPersonWorkloadTool,
    getOverdueTasksTool,
    runSqlQueryTool,
  },
  storage: new MastraCompositeStore({
    id: 'composite-storage',
    default: new LibSQLStore({
      id: 'mastra-storage',
      url: dbUrl('mastra.db'),
    }),
    domains: {
      observability: await new DuckDBStore().getStore('observability'),
    },
  }),
  observability: new Observability({
    configs: {
      default: {
        serviceName: 'mastra',
        exporters: [new MastraStorageExporter(), new MastraPlatformExporter()],
        spanOutputProcessors: [new SensitiveDataFilter()],
      },
    },
  }),
});
