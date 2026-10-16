import { NextResponse } from 'next/server';

// Standard response utilities for Trino API routes to reduce duplication.
// Shape fields:
// source: string  (route identifier e.g. trino-execute)
// timestamp: ISO string
// traceId: unique request id (also echoed in X-Trace-Id header)
// status: HTTP status code (duplicated for convenience in body)
// error?: string
// queryId?: string
// Additional payload-specific fields merged in.

export interface TrinoOkPayload {
  source: string;
  traceId?: string;
  queryId?: string | null;
  [key: string]: any; // columns, rows, items, etc.
}

export interface TrinoErrorPayload {
  source: string;
  traceId?: string;
  error: string;
  queryId?: string | null;
  details?: string;
  trinoError?: any;
  [key: string]: any;
}

function ensureTraceId(id?: string): string {
  return id || ((globalThis.crypto && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).slice(2));
}

export function trinoOk(payload: TrinoOkPayload, status = 200) {
  const traceId = ensureTraceId(payload.traceId);
  const body = {
    ...payload,
    traceId,
    timestamp: new Date().toISOString(),
    status,
  };
  const resp = NextResponse.json(body, { status });
  resp.headers.set('X-Trace-Id', traceId);
  return resp;
}

export function trinoError(payload: TrinoErrorPayload, status = 500) {
  const traceId = ensureTraceId(payload.traceId);
  const body = {
    ...payload,
    traceId,
    timestamp: new Date().toISOString(),
    status,
  };
  const resp = NextResponse.json(body, { status });
  resp.headers.set('X-Trace-Id', traceId);
  return resp;
}
