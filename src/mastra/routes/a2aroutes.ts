import { registerApiRoute } from '@mastra/core/server';
import { randomUUID } from 'crypto';

export const a2aRoute = registerApiRoute('/a2a/agent/:agentId', {
  method: 'POST',
  handler: async (c) => {
    try {
      const mastra = c.get('mastra');
      const agentId = c.req.param('agentId');

      // Parse JSON-RPC 2.0 request
      const body = await c.req.json();
      const { jsonrpc, id: requestId, method, params } = body;

      if (jsonrpc !== '2.0' || !requestId) {
        return c.json({
          jsonrpc: '2.0',
          id: requestId || null,
          error: {
            code: -32600,
            message: 'Invalid Request: jsonrpc must be "2.0" and id is required'
          }
        }, 400);
      }

      // Retrieve the requested agent
      const agent = mastra.getAgent(agentId);
      if (!agent) {
        return c.json({
          jsonrpc: '2.0',
          id: requestId,
          error: {
            code: -32602,
            message: `Agent '${agentId}' not found`
          }
        }, 404);
      }

      // Extract A2A parameters
      const { message, messages, contextId, taskId, metadata } = params || {};

      // Normalize message list
      const messagesList = message
        ? [message]
        : Array.isArray(messages)
        ? messages
        : [];

      // Convert A2A messages into Mastra-compatible format
      const mastraMessages = messagesList.map((msg) => ({
        role: msg.role,
        content:
          msg.parts
            ?.map((part: { kind: string; text?: string; data?: any }) => {
              if (part.kind === 'text') return part.text;
              if (part.kind === 'data') return JSON.stringify(part.data);
              return '';
            })
            .join('\n') || ''
      }));

      // 🔹 Execute the agent and wait for full reasoning + tool results
      const response = await agent.generate(mastraMessages);

      // 🔹 Prefer final text if the agent re-responds after tool execution
      const agentText =
        response.finalText ||
        response.outputText ||
        response.text ||
        (response.messages?.at(-1)?.content ?? '');

      // 🔹 Combine agent text + tool data into a single artifact
      const artifacts: any = [
        {
          artifactId: randomUUID(),
          name: `${agentId}Response`,
          parts: [
            { kind: 'text', text: agentText },
            ...(response.toolResults?.map((r: any) => ({
              kind: 'data',
              data: r
            })) ?? [])
          ]
        }
      ];

      // 🔹 Build conversation history
      const history = [
        ...messagesList.map((msg) => ({
          kind: 'message',
          role: msg.role,
          parts: msg.parts,
          messageId: msg.messageId || randomUUID(),
          taskId: msg.taskId || taskId || randomUUID(),
        })),
        {
          kind: 'message',
          role: 'agent',
          parts: [{ kind: 'text', text: agentText }],
          messageId: randomUUID(),
          taskId: taskId || randomUUID(),
        }
      ];

      // 🔹 Return full A2A-compliant response
      return c.json({
        jsonrpc: '2.0',
        id: requestId,
        result: {
          id: taskId || randomUUID(),
          contextId: contextId || randomUUID(),
          status: {
            state: 'completed',
            timestamp: new Date().toISOString(),
            message: {
              messageId: randomUUID(),
              role: 'agent',
              parts: [{ kind: 'text', text: agentText }],
              kind: 'message'
            }
          },
          artifacts,
          history,
          kind: 'task'
        }
      });

    } catch (error: any) {
      console.error('A2A Error:', error);

      return c.json({
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32603,
          message: 'Internal error',
          data: { details: error.message }
        }
      }, 500);
    }
  }
});
