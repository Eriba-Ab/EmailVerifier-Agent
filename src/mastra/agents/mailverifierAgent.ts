import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { LibSQLStore } from '@mastra/libsql';
import { mailboxlayerTool } from '../tools/mailboxlayerTool';

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
  memory: new Memory({
    storage: new LibSQLStore({
      url: 'file:../mastra.db',
    })
  })
})