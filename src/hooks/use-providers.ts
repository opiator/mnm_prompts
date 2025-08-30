'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ProviderKey, CreateProviderKeyRequest } from '@/types';

// Fetch all providers
export function useProviders() {
  return useQuery<ProviderKey[]>({
    queryKey: ['providers'],
    queryFn: async () => {
      const response = await fetch('/api/providers');
      if (!response.ok) {
        throw new Error('Failed to fetch providers');
      }
      return response.json();
    },
  });
}

// Create or update a provider key
export function useCreateProviderKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateProviderKeyRequest): Promise<ProviderKey> => {
      const response = await fetch('/api/providers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create/update provider');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['providers'] });
    },
  });
}