// hooks/useAiModels.ts
'use client';

import { useQuery } from '@tanstack/react-query';
import { aiModelsClient } from '@/lib/aiModels/client';


export function useModels() {
  return useQuery({
    queryKey: ['models'],
    queryFn: () => aiModelsClient.list(),
  });
}

export function useModel(slug: string) {
  return useQuery({
    queryKey: ['model', slug],
    // Use the dedicated client instead of manual fetch
    queryFn: () => aiModelsClient.get(slug), 
    enabled: Boolean(slug),
    staleTime: 60_000,
  });
}