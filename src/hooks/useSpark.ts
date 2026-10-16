import { useEffect, useState, useCallback } from 'react';
import { apiClient } from '../lib/apiClient';
import { useAuth } from '../providers/AuthProvider';
import { useSession } from 'next-auth/react';

interface SparkJob {
  jobId: number;
  name: string;
  status: string;
  submissionTime?: string;
  completionTime?: string;
  durationMs?: number | null;
  errorMessage?: string | null;
  appId?: string;
}

interface SparkApplicationSummary {
  id: string;
  name: string;
  startTime?: string;
  endTime?: string;
  durationMs?: number | null;
  runningJobs: number;
  failedJobs: number;
  jobs: SparkJob[];
}

interface ClusterHealth {
  historyServer: string;
  applicationCount: number;
  totalExecutors: number;
  activeExecutors: number;
  totalMemory: number;
  totalMemoryLimit: number;
  totalCores: number;
  memoryUtilization: number;
}

interface DeltaFootprintEntry {
  path: string;
  bucket?: string;
  prefix?: string | null;
  sizeBytes?: number;
  sizeHuman?: string;
  objectCount?: number;
  error?: string;
}

export function useSpark() {
  const { isAuthenticated } = useAuth();
  const { status: sessionStatus } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apps, setApps] = useState<SparkApplicationSummary[]>([]);
  const [latestJobs, setLatestJobs] = useState<SparkJob[]>([]);
  const [runningJobs, setRunningJobs] = useState<SparkJob[]>([]);
  const [failedJobs, setFailedJobs] = useState<SparkJob[]>([]);
  const [cluster, setCluster] = useState<ClusterHealth | null>(null);
  const [deltaTables, setDeltaTables] = useState<DeltaFootprintEntry[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const jobsData = await apiClient.get<any>('/api/v1/spark/jobs');
      setApps(jobsData.applications || []);
      setLatestJobs(jobsData.latestJobs || []);
      setRunningJobs(jobsData.runningJobs || []);
      setFailedJobs(jobsData.failedJobs || []);
      
      const clusterData = await apiClient.get<ClusterHealth>('/api/v1/spark/cluster');
      setCluster(clusterData);
      
      const deltaData = await apiClient.get<any>('/api/v1/spark/delta/footprint');
      setDeltaTables(deltaData.tables || []);
    } catch (e: any) {
      setError(e.message || 'Spark load failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && sessionStatus === 'authenticated') {
      load();
    }
  }, [load, isAuthenticated, sessionStatus]);

  return {
    loading,
    error,
    apps,
    latestJobs,
    runningJobs,
    failedJobs,
    cluster,
    deltaTables,
    reload: load,
    isAuthenticated,
  };
}

export type { SparkJob, SparkApplicationSummary, ClusterHealth, DeltaFootprintEntry };