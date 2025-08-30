'use client';

import { useMutation } from '@tanstack/react-query';
import { PlaygroundRequest, PlaygroundResponse } from '@/types';

export function usePlaygroundExecution() {
  return useMutation({
    mutationFn: async (data: PlaygroundRequest): Promise<PlaygroundResponse> => {
      const response = await fetch('/api/playground/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to execute playground request');
      }

      return response.json();
    },
  });
}