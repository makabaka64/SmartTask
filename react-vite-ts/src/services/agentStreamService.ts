import { getToken } from '@/utils/token';
import type { AgentType, AgentStreamEventMap } from '@/types/agent';

type EventHandlers = {
  [K in keyof AgentStreamEventMap]?: (payload: AgentStreamEventMap[K], meta: { id?: number }) => void;
};

type StreamAgentRunOptions = {
  signal?: AbortSignal;
  onEventId?: (eventId: number) => void;
};

type ParsedSSEEvent = {
  id?: number;
  event: string;
  data: string;
};

function parseSSEChunk(buffer: string, emit: (event: ParsedSSEEvent) => void) {
  const parts = buffer.split('\n\n');
  const complete = parts.slice(0, -1);
  const rest = parts[parts.length - 1] || '';

  for (const part of complete) {
    const lines = part.replace(/\r/g, '').split('\n');
    let eventName = 'message';
    let eventId: number | undefined;
    const dataLines: string[] = [];

    for (const line of lines) {
      if (line.startsWith('event:')) {
        eventName = line.slice(6).trim();
      } else if (line.startsWith('id:')) {
        const parsedId = Number(line.slice(3).trim());
        eventId = Number.isFinite(parsedId) ? parsedId : undefined;
      } else if (line.startsWith('data:')) {
        dataLines.push(line.slice(5).trim());
      }
    }

    if (dataLines.length) {
      emit({ id: eventId, event: eventName, data: dataLines.join('\n') });
    }
  }

  return rest;
}

async function consumeAgentEventStream(
  response: Response,
  handlers: EventHandlers,
  options: StreamAgentRunOptions = {}
) {
  if (!response.ok || !response.body) {
    throw new Error('Agent stream request failed');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  const dispatch = (event: ParsedSSEEvent) => {
    if (event.id !== undefined) {
      options.onEventId?.(event.id);
    }
    const parsed = JSON.parse(event.data);
    const handler = handlers[event.event as keyof AgentStreamEventMap] as
      | ((payload: unknown, meta: { id?: number }) => void)
      | undefined;
    handler?.(parsed, { id: event.id });
  };

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    buffer = parseSSEChunk(buffer, dispatch);
  }
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

  await consumeAgentEventStream(response, handlers, options);
}

export async function resumeAgentRunEvents(
  runId: string,
  lastEventId: number,
  handlers: EventHandlers,
  options: StreamAgentRunOptions = {}
) {
  const url = new URL(`http://localhost:3001/agent/runs/${runId}/events/stream`);
  if (lastEventId > 0) {
    url.searchParams.set('lastEventId', String(lastEventId));
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Authorization: getToken() || ''
    },
    credentials: 'include',
    signal: options.signal
  });

  await consumeAgentEventStream(response, handlers, options);
}
