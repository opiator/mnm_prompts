'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Plus, ArrowLeft, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useDataset, useDeleteDatasetItem } from '@/hooks/use-datasets';
import { formatDate, extractDatasetVariables } from '@/lib/utils';
import { AddDatasetItemDialog } from '@/components/datasets/AddDatasetItemDialog';
import { EditDatasetItemDialog } from '@/components/datasets/EditDatasetItemDialog';
import { toast } from 'sonner';

export default function DatasetDetailPage() {
  const params = useParams();
  const datasetId = params.id as string;
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<string | null>(null);

  const { data: dataset, isLoading, error } = useDataset(datasetId);
  const deleteItemMutation = useDeleteDatasetItem();

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-destructive mb-2">
            Error loading dataset
          </h2>
          <p className="text-muted-foreground">
            {error instanceof Error ? error.message : 'Something went wrong'}
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dataset...</p>
        </div>
      </div>
    );
  }

  if (!dataset) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-lg font-semibold mb-2">Dataset not found</h2>
          <p className="text-muted-foreground mb-4">
            The dataset you're looking for doesn't exist.
          </p>
          <Button asChild>
            <a href="/datasets">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Datasets
            </a>
          </Button>
        </div>
      </div>
    );
  }

  const items = dataset.items || [];
  const variables = extractDatasetVariables(items);

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this item?')) {
      return;
    }

    try {
      await deleteItemMutation.mutateAsync({ datasetId, itemId });
      toast.success('Dataset item deleted successfully');
    } catch (error) {
      toast.error('Failed to delete dataset item');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <a href="/datasets">
            <ArrowLeft className="h-4 w-4" />
          </a>
        </Button>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">{dataset.name}</h1>
              <p className="text-muted-foreground">
                {dataset.description || 'No description'}
              </p>
            </div>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Item
            </Button>
          </div>
        </div>
      </div>

      {/* Dataset Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold">{items.length}</div>
              <p className="text-xs text-muted-foreground">Total Items</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold">{variables.length}</div>
              <p className="text-xs text-muted-foreground">Variables</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-xs font-medium">{formatDate(dataset.updatedAt)}</div>
              <p className="text-xs text-muted-foreground">Last Updated</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Variables */}
      {variables.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Available Variables</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 flex-wrap">
              {variables.map((variable) => (
                <Badge key={variable} variant="secondary">
                  {variable}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dataset Items */}
      <Card>
        <CardHeader>
          <CardTitle>Dataset Items ({items.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                No items in this dataset yet. Add some data to get started.
              </p>
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add First Item
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">#</TableHead>
                  {variables.slice(0, 4).map((variable) => (
                    <TableHead key={variable}>{variable}</TableHead>
                  ))}
                  {variables.length > 4 && (
                    <TableHead>+{variables.length - 4} more</TableHead>
                  )}
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, index) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    {variables.slice(0, 4).map((variable) => (
                      <TableCell key={variable}>
                        <div className="max-w-[200px] truncate">
                          {String(item.data[variable] || '-')}
                        </div>
                      </TableCell>
                    ))}
                    {variables.length > 4 && (
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          View all
                        </Badge>
                      </TableCell>
                    )}
                    <TableCell className="text-muted-foreground">
                      {formatDate(item.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingItem(item.id)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDeleteItem(item.id)}
                          disabled={deleteItemMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <AddDatasetItemDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        datasetId={datasetId}
        existingVariables={variables}
      />

      {editingItem && (
        <EditDatasetItemDialog
          open={!!editingItem}
          onOpenChange={(open) => !open && setEditingItem(null)}
          datasetId={datasetId}
          itemId={editingItem}
          existingVariables={variables}
        />
      )}
    </div>
  );
}