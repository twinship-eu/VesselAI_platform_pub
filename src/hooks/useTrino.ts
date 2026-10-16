"use client";
import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '../lib/apiClient';
import { useAuth } from '../providers/AuthProvider';
import { useSession } from 'next-auth/react';

export interface TrinoColumn { name: string; type: string; }

interface ExecuteResponse {
  columns?: TrinoColumn[];
  rows?: any[][];
  nextUri?: string | null;
  prefetchHops?: number;
  queryId?: string | null;
  traceId?: string;
  error?: string;
  status?: number;
}

interface ExplainResponse {
  /** False when Trino refused to analyse the statement. */
  ok?: boolean;
  /** Why it was refused, already formatted for display. */
  message?: string;
  /** Tables the statement resolved to (TYPE IO only). */
  tables?: string[];
  planRows?: any[][];
  queryId?: string | null;
  traceId?: string;
  error?: string;
}

export interface QueryValidation {
  ok: boolean;
  message?: string;
  tables?: string[];
}

interface PingResponse {
  cluster?: any;
  traceId?: string;
  status?: number;
  error?: string;
}

export function useTrino(pingIntervalMs: number = 0) {
  // Auth/session gating: avoid firing requests before tokens are available.
  const { isAuthenticated, login } = useAuth();
  const { status: sessionStatus } = useSession();
  const [columns, setColumns] = useState<TrinoColumn[]>([]);
  const [rows, setRows] = useState<any[][]>([]);
  const [nextUri, setNextUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [traceId, setTraceId] = useState<string | null>(null);
  const [queryId, setQueryId] = useState<string | null>(null);
  const [explainText, setExplainText] = useState<string>('');
  const [validation, setValidation] = useState<QueryValidation | null>(null);
  const [pingStatus, setPingStatus] = useState<'ok' | 'fail' | 'loading' | 'idle'>('idle');
  const [clusterInfo, setClusterInfo] = useState<any>(null);

  const PREFETCH_MAX_HOPS = 12;
  const PREFETCH_DELAY_MS = 75;

  const run = useCallback(async (sql: string) => {
    if (!sql) return;
    setLoading(true); setError(null);
    try {
      const res = await apiClient.post<ExecuteResponse>('/api/v1/trino/execute', { query: sql });

      const initialColumns = res.columns || [];
      setColumns(initialColumns);
      setRows(res.rows || []);
      setNextUri(res.nextUri || null);
      setTraceId(res.traceId || null);
      setQueryId(res.queryId || null);

      // Trino often returns columns + nextUri first, with rows arriving on subsequent polls.
      // Prefetch a few hops so the UI shows results without requiring a manual "Next page" click.
      let hops = 0;
      let next = res.nextUri || null;
      let rows = res.rows || [];
      let columns = initialColumns;
      while (rows.length === 0 && next && hops < PREFETCH_MAX_HOPS) {
        const page = await apiClient.post<ExecuteResponse>('/api/v1/trino/execute', { nextUri: next });
        hops += 1;
        if (page.columns && page.columns.length) columns = page.columns;
        rows = page.rows || [];
        next = page.nextUri || null;

        setColumns(columns);
        setRows(rows);
        setNextUri(next);
        if (page.traceId) setTraceId(page.traceId);
        if (page.queryId) setQueryId(page.queryId);

        if (rows.length > 0 || !next) break;
        await new Promise((r) => setTimeout(r, PREFETCH_DELAY_MS));
      }
    } catch (e: any) {
      const status = e?.status as number | undefined;
      const details = e?.details as string | undefined;
      if (status === 401) setError('Unauthorized (Trino): session may be invalid.');
      // 403 is an ABAC access-denial whose detail message is self-explanatory.
      // Don't append "(HTTP 403)" — it adds noise and reads as a system fault.
      else if (status === 403) setError(details || e?.error || 'Access denied.');
      else if (status) setError(`${details || e?.error || 'Trino error'} (HTTP ${status})`);
      else setError(e?.message || 'Failed to run query');
    } finally { setLoading(false); }
  }, []);

  const next = useCallback(async () => {
    if (!nextUri) return;
    setLoading(true); setError(null);
    try {
      // Trino pages can be empty mid-stream, and the final page is always
      // empty. Follow nextUri until rows arrive or the query ends; never
      // replace the rows on screen with an empty end-of-stream page.
      let uri: string | null = nextUri;
      let hops = 0;
      while (uri && hops < PREFETCH_MAX_HOPS) {
        const res = await apiClient.post<ExecuteResponse>('/api/v1/trino/execute', { nextUri: uri });
        hops += 1;
        uri = res.nextUri || null;
        if (res.traceId) setTraceId(res.traceId);
        if (res.queryId) setQueryId(res.queryId);
        if (res.columns && res.columns.length) setColumns(res.columns);
        if (res.rows && res.rows.length) {
          setRows(res.rows);
          break;
        }
        if (uri) await new Promise((r) => setTimeout(r, PREFETCH_DELAY_MS));
      }
      setNextUri(uri);
    } catch (e: any) {
      const status = e?.status as number | undefined;
      const details = e?.details as string | undefined;
      if (status === 401) setError('Unauthorized (Trino): session may be invalid.');
      else if (status === 403) setError(details || e?.error || 'Access denied.');
      else if (status) setError(`${details || e?.error || 'Trino error'} (HTTP ${status})`);
      else setError(e?.message || 'Failed to page results');
    } finally { setLoading(false); }
  }, [nextUri]);

  const explain = useCallback(async (sql: string, type: 'distributed' | 'io' | 'normal' = 'distributed') => {
    if (!sql) return;
    setError(null);
    try {
      const res = await apiClient.post<ExplainResponse>('/api/v1/trino/explain', { query: sql, type });
      if (res.ok === false) {
        // Trino reports a bad statement in a 200 body, so this is the normal
        // failure path, not an exception.
        setExplainText(res.message || 'Trino could not analyse this statement.');
      } else {
        setExplainText((res.planRows || []).map((row) => String(row[0] ?? '')).join('\n'));
      }
      if (res.traceId) setTraceId(res.traceId);
      if (res.queryId) setQueryId(res.queryId);
    } catch (e: any) {
      const status = e?.status as number | undefined;
      const details = e?.details as string | undefined;
      if (status === 401) setExplainText('Unauthorized (Trino)');
      else if (status) setExplainText(`Explain failed (${status})${details ? `: ${details}` : ''}`);
      else setExplainText(e?.message || 'Failed to fetch explain');
    }
  }, []);

  /**
   * Check a statement without running it. EXPLAIN (TYPE IO) makes Trino parse
   * and resolve it — and the control-plane applies the same ABAC guard as a
   * real query — so this answers "is my SQL valid, does it read what I think,
   * and am I allowed?" without touching any data.
   */
  const validate = useCallback(async (sql: string) => {
    if (!sql) return;
    setError(null);
    setValidation(null);
    try {
      const res = await apiClient.post<ExplainResponse>('/api/v1/trino/explain', {
        query: sql,
        type: 'io',
      });
      if (res.ok === false) {
        setValidation({ ok: false, message: res.message || 'This statement is not valid.' });
      } else {
        setValidation({ ok: true, tables: res.tables || [] });
      }
      if (res.traceId) setTraceId(res.traceId);
    } catch (e: any) {
      const status = e?.status as number | undefined;
      const details = e?.details as string | undefined;
      // 403 here is the ABAC guard — the most useful thing Validate reports.
      setValidation({
        ok: false,
        message: details || e?.message || (status ? `Validation failed (${status})` : 'Validation failed'),
      });
    }
  }, []);

  const cancel = useCallback(async () => {
    if (!queryId) return;
    try {
      await apiClient.post(`/api/v1/trino/cancel/${encodeURIComponent(queryId)}`, {});
      setError(`Cancellation requested for query ${queryId}`);
    } catch (e: any) {
      setError(e?.message || 'Cancel failed');
    }
  }, [queryId]);

  const ping = useCallback(async () => {
    setPingStatus('loading');
    try {
      const res = await apiClient.get<PingResponse>('/api/v1/trino/ping');
      if (res.error) {
        setPingStatus('fail');
      } else {
        setPingStatus('ok');
        setClusterInfo(res.cluster);
      }
      if (res.traceId) setTraceId(res.traceId);
    } catch (e: any) {
      setPingStatus('fail');
    }
  }, []);

  // Initial ping
  useEffect(() => {
    if (isAuthenticated && sessionStatus === 'authenticated') {
      ping();
    }
  }, [ping, isAuthenticated, sessionStatus]);

  // Optional auto-refresh ping
  useEffect(() => {
    if (pingIntervalMs && pingIntervalMs > 0 && isAuthenticated && sessionStatus === 'authenticated') {
      const id = setInterval(() => {
        ping();
      }, pingIntervalMs);
      return () => clearInterval(id);
    }
  }, [ping, pingIntervalMs, isAuthenticated, sessionStatus]);

  // Auto-load catalogs on auth ready (was implicit on mount previously)
  useEffect(() => {
    if (!isAuthenticated || sessionStatus !== 'authenticated') return;
    // Trigger an initial lightweight metadata fetch to warm up UI (catalog list)
    (async () => {
      try {
        await apiClient.get<{ items: any[] }>('/api/v1/trino/metadata?level=catalogs');
      } catch (e: any) {
        // If we somehow get a 401 here, let caller surfaces via run()/ping later.
      }
    })();
  }, [isAuthenticated, sessionStatus, login]);

  return {
    // data
    columns, rows, nextUri, explainText, validation, traceId, queryId, clusterInfo,
    // states
    loading, error, pingStatus,
    // actions
    run, next, explain, validate, cancel, ping,
    // auth/session state (optional consumption)
    isAuthenticated,
  };
}