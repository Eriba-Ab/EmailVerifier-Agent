
import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { LibSQLStore } from '@mastra/libsql';
import { weatherWorkflow } from './workflows/weather-workflow';
import { mailVerifierWorkflow } from './workflows/mailverifier-workflow';
import { weatherAgent } from './agents/weather-agent';
import { mailverifierAgent } from './agents/mailverifierAgent';
import { toolCallAppropriatenessScorer, completenessScorer, translationScorer } from './scorers/weather-scorer';
import {mailtoolCallAppropriatenessScorer, mailcompletenessScorer, mailexplanationAccuracyScorer} from './scorers/mailverifier-scorer';
import { a2aRoute } from './routes/a2aroutes';

export const mastra = new Mastra({
  server: {apiRoutes: [a2aRoute] },
  workflows: { weatherWorkflow, mailVerifierWorkflow },
  agents: { weatherAgent, mailverifierAgent },
  scorers: { toolCallAppropriatenessScorer, completenessScorer, translationScorer, mailtoolCallAppropriatenessScorer, mailcompletenessScorer, mailexplanationAccuracyScorer },
  storage: new LibSQLStore({
    // stores observability, scores, ... into memory storage, if it needs to persist, change to file:../mastra.db
    url: ":memory:",
  }),
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'info',
  }),
  telemetry: {
    // Telemetry is deprecated and will be removed in the Nov 4th release
    enabled: false, 
  },
  observability: {
    // Enables DefaultExporter and CloudExporter for AI tracing
    default: { enabled: true }, 
  },
});
