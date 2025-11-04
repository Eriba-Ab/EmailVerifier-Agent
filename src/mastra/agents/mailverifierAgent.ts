import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { LibSQLStore } from '@mastra/libsql';
import { mailboxlayerTool } from '../tools/mailboxlayerTool';
import { scorers } from '../scorers/mailverifier-scorer';

export const mailverifierAgent = new Agent({
  name: 'mailverifier Agent',
  instructions: `
    You are an intelligent Email Verification Agent.
    Your job is to check if an email address is valid, disposable, free, and safe to use for communication.
    Use the mailboxlayerTool to perform your checks.
    Return clear and concise verification results.
  `,
  model: 'google/gemini-2.5-flash',
  tools: {mailboxlayerTool},
  scorers: {
      toolCallAppropriateness: {
        scorer: scorers.mailtoolCallAppropriatenessScorer,
        sampling: {
          type: 'ratio',
          rate: 1,
        },
      },
      completeness: {
        scorer: scorers.mailcompletenessScorer,
        sampling: {
          type: 'ratio',
          rate: 1,
        },
      },
      translation: {
        scorer: scorers.mailexplanationAccuracyScorer,
        sampling: {
          type: 'ratio',
          rate: 1,
        },
      },
    },
  memory: new Memory({
    storage: new LibSQLStore({
      url: 'file:../mastra.db',
    })
  })
})