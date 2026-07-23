import { getToken } from '@/utils/token';
import type { AgentType, AgentStreamEventMap } from '@/types/agent';

type EventHandlers = {
  [K in keyof AgentStreamEventMap]?: (payload: AgentStreamEventMap[K]) => void;
};

type StreamAgentRunOptions = {
  signal?: AbortSignal;
};

function parseSSEChunk(buffer: string, emit: (event: string, data: string) => void) {
  const parts = buffer.split('\n\n');
  const complete = parts.slice(0, -1);
  const rest = parts.at(-1) || '';

  for (const part of complete) {
    const lines = part.split('\n');
    let eventName = 'message';
    const dataLines: string[] = [];

    for (const line of lines) {
      if (line.startsWith('event:')) {
        eventName = line.slice(6).trim();
      } else if (line.startsWith('data:')) {
        dataLines.push(line.slice(5).trim());
      }
    }

    if (dataLines.length) {
      emit(eventName, dataLines.join('\n'));
    }
  }

  return rest;
}

export async function streamAgentRun(
  agentType: AgentType,
  input: string,
  handlers: EventHandlers,
  options: StreamAgentRunOptions = {}
) {
  const response = await fetch('http://localhost:3001/agent/stream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: getToken() || ''
    },
    credentials: 'include',
    body: JSON.stringify({ agentType, input }),
    signal: options.signal
  });

  if (!response.ok || !response.body) {
    throw new Error('Agent stream request failed');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  const dispatch = (eventName: string, rawData: string) => {
    const parsed = JSON.parse(rawData);
    const handler = handlers[eventName as keyof AgentStreamEventMap] as
      | ((payload: unknown) => void)
      | undefined;
    handler?.(parsed);
  };

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    buffer = parseSSEChunk(buffer, dispatch);
  }
}
