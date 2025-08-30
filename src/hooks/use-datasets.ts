'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  Dataset, 
  DatasetItem, 
  CreateDatasetRequest, 
  CreateDatasetItemRequest 
} from '@/types';

// Fetch all datasets
export function useDatasets() {
  return useQuery<Dataset[]>({
    queryKey: ['datasets'],
    queryFn: async () => {
      const response = await fetch('/api/datasets');
      if (!response.ok) {
        throw new Error('Failed to fetch datasets');
      }
      return response.json();
    },
  });
}

// Fetch a specific dataset
export function useDataset(id: string) {
  return useQuery<Dataset>({
    queryKey: ['datasets', id],
    queryFn: async () => {
      const response = await fetch(`/api/datasets/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch dataset');
      }
      return response.json();
    },
    enabled: !!id,
  });
}

// Fetch dataset items
export function useDatasetItems(datasetId: string) {
  return useQuery<DatasetItem[]>({
    queryKey: ['datasets', datasetId, 'items'],
    queryFn: async () => {
      const response = await fetch(`/api/datasets/${datasetId}/items`);
      if (!response.ok) {
        throw new Error('Failed to fetch dataset items');
      }
      return response.json();
    },
    enabled: !!datasetId,
  });
}

// Create a new dataset
export function useCreateDataset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateDatasetRequest): Promise<Dataset> => {
      const response = await fetch('/api/datasets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create dataset');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['datasets'] });
    },
  });
}

// Update a dataset
export function useUpdateDataset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: CreateDatasetRequest }): Promise<Dataset> => {
      const response = await fetch(`/api/datasets/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update dataset');
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['datasets'] });
      queryClient.invalidateQueries({ queryKey: ['datasets', data.id] });
    },
  });
}

// Delete a dataset
export function useDeleteDataset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const response = await fetch(`/api/datasets/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete dataset');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['datasets'] });
    },
  });
}

// Add item to dataset
export function useCreateDatasetItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      datasetId, 
      data 
    }: { 
      datasetId: string; 
      data: CreateDatasetItemRequest 
    }): Promise<DatasetItem> => {
      const response = await fetch(`/api/datasets/${datasetId}/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create dataset item');
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['datasets'] });
      queryClient.invalidateQueries({ queryKey: ['datasets', variables.datasetId] });
      queryClient.invalidateQueries({ queryKey: ['datasets', variables.datasetId, 'items'] });
    },
  });
}

// Update dataset item
export function useUpdateDatasetItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      datasetId, 
      itemId, 
      data 
    }: { 
      datasetId: string; 
      itemId: string;
      data: any;
    }): Promise<DatasetItem> => {
      const response = await fetch(`/api/datasets/${datasetId}/items/${itemId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ data }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update dataset item');
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['datasets'] });
      queryClient.invalidateQueries({ queryKey: ['datasets', variables.datasetId] });
      queryClient.invalidateQueries({ queryKey: ['datasets', variables.datasetId, 'items'] });
    },
  });
}

// Delete dataset item
export function useDeleteDatasetItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      datasetId, 
      itemId 
    }: { 
      datasetId: string; 
      itemId: string;
    }): Promise<void> => {
      const response = await fetch(`/api/datasets/${datasetId}/items/${itemId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete dataset item');
      }
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['datasets'] });
      queryClient.invalidateQueries({ queryKey: ['datasets', variables.datasetId] });
      queryClient.invalidateQueries({ queryKey: ['datasets', variables.datasetId, 'items'] });
    },
  });
}