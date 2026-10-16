import { useState } from 'react';
import { minioClient, Bucket, BucketObject, BucketStats } from '../lib/minioClient';

interface UseMinioReturn {
  buckets: Bucket[];
  objects: BucketObject[];
  stats: BucketStats | null;
  loading: boolean;
  error: string | null;
  loadBuckets: () => Promise<void>;
  createBucket: (name: string, region?: string) => Promise<boolean>;
  deleteBucket: (name: string) => Promise<boolean>;
  loadObjects: (bucketName: string, prefix?: string) => Promise<void>;
  uploadObject: (bucketName: string, objectName: string, file: File) => Promise<boolean>;
  deleteObject: (bucketName: string, objectName: string) => Promise<boolean>;
  getObjectURL: (bucketName: string, objectName: string) => string;
  loadBucketStats: (bucketName: string) => Promise<void>;
}

export function useMinio(): UseMinioReturn {
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [objects, setObjects] = useState<BucketObject[]>([]);
  const [stats, setStats] = useState<BucketStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadBuckets = async () => {
    setLoading(true);
    setError(null);
    try {
      const bucketList = await minioClient.listBuckets();
      setBuckets(bucketList);
    } catch (err) {
      setError((err as Error).message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const createBucket = async (name: string, region?: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const result = await minioClient.createBucket(name, region);
      return result;
    } catch (err) {
      setError((err as Error).message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteBucket = async (name: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const result = await minioClient.deleteBucket(name);
      return result;
    } catch (err) {
      setError((err as Error).message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const loadObjects = async (bucketName: string, prefix?: string) => {
    setLoading(true);
    setError(null);
    try {
      const objectList = await minioClient.listObjects(bucketName, prefix);
      setObjects(objectList);
    } catch (err) {
      setError((err as Error).message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const uploadObject = async (
    bucketName: string,
    objectName: string,
    file: File
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const result = await minioClient.uploadObject(bucketName, objectName, file);
      return result;
    } catch (err) {
      setError((err as Error).message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteObject = async (bucketName: string, objectName: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const result = await minioClient.deleteObject(bucketName, objectName);
      return result;
    } catch (err) {
      setError((err as Error).message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getObjectURL = (bucketName: string, objectName: string): string => {
    return minioClient.getObjectURL(bucketName, objectName);
  };

  const loadBucketStats = async (bucketName: string) => {
    setError(null);
    try {
      const bucketStats = await minioClient.getBucketStats(bucketName);
      setStats(bucketStats);
    } catch (err) {
      setError((err as Error).message);
      console.error('Error loading bucket stats:', err);
    }
  };

  return {
    buckets,
    objects,
    stats,
    loading,
    error,
    loadBuckets,
    createBucket,
    deleteBucket,
    loadObjects,
    uploadObject,
    deleteObject,
    getObjectURL,
    loadBucketStats,
  };
}
