import { randomUUID } from 'node:crypto';

export interface EventEnvelope<T = unknown> {
  eventId: string;
  correlationId: string;
  type: string;
  source: string;
  occurredAt: string;
  actorId?: number;
  data: T;
}

export function buildEvent<T>(params: {
  type: string;
  source: string;
  data: T;
  actorId?: number;
  correlationId?: string;
}): EventEnvelope<T> {
  return {
    eventId: randomUUID(),
    correlationId: params.correlationId ?? randomUUID(),
    type: params.type,
    source: params.source,
    occurredAt: new Date().toISOString(),
    actorId: params.actorId,
    data: params.data,
  };
}
