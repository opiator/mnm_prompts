'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDatasets } from '@/hooks/use-datasets';
import { DatasetsTable } from '@/components/datasets/DatasetsTable';
import { CreateDatasetDialog } from '@/components/datasets/CreateDatasetDialog';
import { EditDatasetDialog } from '@/components/datasets/EditDatasetDialog';
import { Dataset } from '@/types';

export default function DatasetsPage() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingDataset, setEditingDataset] = useState<Dataset | null>(null);
  const { data: datasets, isLoading, error } = useDatasets();

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-destructive mb-2">
            Error loading datasets
          </h2>
          <p className="text-muted-foreground">
            {error instanceof Error ? error.message : 'Something went wrong'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Datasets</h1>
          <p className="text-muted-foreground">
            Manage your test data for prompt variables
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Dataset
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading datasets...</p>
          </div>
        </div>
      ) : (
        <DatasetsTable 
          datasets={datasets || []} 
          onEditDataset={setEditingDataset}
        />
      )}

      <CreateDatasetDialog 
        open={showCreateDialog} 
        onOpenChange={setShowCreateDialog} 
      />

      <EditDatasetDialog
        open={!!editingDataset}
        onOpenChange={(open) => !open && setEditingDataset(null)}
        dataset={editingDataset}
      />
    </div>
  );
}