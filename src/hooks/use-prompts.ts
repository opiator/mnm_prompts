'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  Prompt, 
  PromptVersion, 
  CreatePromptRequest, 
  UpdatePromptRequest,
  CreatePromptVersionRequest 
} from '@/types';

// Fetch all prompts
export function usePrompts() {
  return useQuery<Prompt[]>({
    queryKey: ['prompts'],
    queryFn: async () => {
      const response = await fetch('/api/prompts');
      if (!response.ok) {
        throw new Error('Failed to fetch prompts');
      }
      return response.json();
    },
  });
}

// Fetch a specific prompt
export function usePrompt(id: string) {
  return useQuery<Prompt>({
    queryKey: ['prompts', id],
    queryFn: async () => {
      const response = await fetch(`/api/prompts/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch prompt');
      }
      return response.json();
    },
    enabled: !!id,
  });
}

// Fetch prompt versions
export function usePromptVersions(promptId: string) {
  return useQuery<PromptVersion[]>({
    queryKey: ['prompts', promptId, 'versions'],
    queryFn: async () => {
      const response = await fetch(`/api/prompts/${promptId}/versions`);
      if (!response.ok) {
        throw new Error('Failed to fetch prompt versions');
      }
      return response.json();
    },
    enabled: !!promptId,
  });
}

// Create a new prompt
export function useCreatePrompt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreatePromptRequest): Promise<Prompt> => {
      const response = await fetch('/api/prompts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create prompt');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prompts'] });
    },
  });
}

// Update a prompt
export function useUpdatePrompt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdatePromptRequest }): Promise<Prompt> => {
      const response = await fetch(`/api/prompts/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update prompt');
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['prompts'] });
      queryClient.invalidateQueries({ queryKey: ['prompts', data.id] });
    },
  });
}

// Delete a prompt
export function useDeletePrompt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const response = await fetch(`/api/prompts/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete prompt');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prompts'] });
    },
  });
}

// Create a new prompt version
export function useCreatePromptVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      promptId, 
      data 
    }: { 
      promptId: string; 
      data: CreatePromptVersionRequest 
    }): Promise<PromptVersion> => {
      const response = await fetch(`/api/prompts/${promptId}/versions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create prompt version');
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['prompts'] });
      queryClient.invalidateQueries({ queryKey: ['prompts', variables.promptId] });
      queryClient.invalidateQueries({ queryKey: ['prompts', variables.promptId, 'versions'] });
    },
  });
}