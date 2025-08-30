'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useDataset, useUpdateDatasetItem } from '@/hooks/use-datasets';
import { toast } from 'sonner';
import { isValidJSON } from '@/lib/utils';

interface EditDatasetItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  datasetId: string;
  itemId: string;
  existingVariables?: string[];
}

export function EditDatasetItemDialog({ 
  open, 
  onOpenChange, 
  datasetId,
  itemId,
  existingVariables = []
}: EditDatasetItemDialogProps) {
  const [jsonData, setJsonData] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { data: dataset } = useDataset(datasetId);
  const updateItemMutation = useUpdateDatasetItem();
  
  const currentItem = dataset?.items?.find(item => item.id === itemId);

  useEffect(() => {
    if (currentItem) {
      setJsonData(JSON.stringify(currentItem.data, null, 2));
    }
  }, [currentItem]);

  const handleSubmit = async () => {
    if (!isValidJSON(jsonData)) {
      toast.error('Invalid JSON format');
      return;
    }

    setIsSubmitting(true);
    try {
      const parsedData = JSON.parse(jsonData);
      
      await updateItemMutation.mutateAsync({
        datasetId,
        itemId,
        data: parsedData,
      });

      toast.success('Dataset item updated successfully');
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update item');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!currentItem) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Dataset Item</DialogTitle>
          <DialogDescription>
            Modify the JSON data for this dataset item.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>JSON Data</Label>
            <Textarea
              value={jsonData}
              onChange={(e) => setJsonData(e.target.value)}
              className="font-mono text-sm min-h-[300px] resize-none"
              placeholder='{\n  "key": "value"\n}'
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}