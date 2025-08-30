'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, Trash2 } from 'lucide-react';
import { Dataset } from '@/types';
import { formatDate } from '@/lib/utils';
import { useDeleteDataset } from '@/hooks/use-datasets';
import { toast } from 'sonner';

interface DatasetsTableProps {
  datasets: Dataset[];
  onEditDataset?: (dataset: Dataset) => void;
}

export function DatasetsTable({ datasets, onEditDataset }: DatasetsTableProps) {
  const deleteDatasetMutation = useDeleteDataset();

  const handleDelete = async (dataset: Dataset) => {
    if (!confirm(`Are you sure you want to delete "${dataset.name}"? This will also delete all items in this dataset.`)) {
      return;
    }

    try {
      await deleteDatasetMutation.mutateAsync(dataset.id);
      toast.success('Dataset deleted successfully');
    } catch (error) {
      toast.error('Failed to delete dataset');
    }
  };
  if (datasets.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">No datasets yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first dataset to store test data for your prompts.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>All Datasets ({datasets.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {datasets.map((dataset) => (
              <TableRow key={dataset.id}>
                <TableCell className="font-medium">
                  <a 
                    href={`/datasets/${dataset.id}`}
                    className="hover:underline"
                  >
                    {dataset.name}
                  </a>
                </TableCell>
                <TableCell className="max-w-xs">
                  <p className="truncate text-muted-foreground">
                    {dataset.description || 'No description'}
                  </p>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {(dataset as any).itemCount || 0}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(dataset.updatedAt)}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {onEditDataset && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEditDataset(dataset)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(dataset)}
                      disabled={deleteDatasetMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}