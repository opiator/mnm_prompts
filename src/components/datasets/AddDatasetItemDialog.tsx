'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useFieldArray } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, Minus } from 'lucide-react';
import { useCreateDatasetItem } from '@/hooks/use-datasets';
import { toast } from 'sonner';
import { isValidJSON } from '@/lib/utils';

const fieldSchema = z.object({
  key: z.string().min(1, 'Key is required'),
  value: z.string().min(1, 'Value is required'),
});

const formSchema = z.object({
  mode: z.enum(['fields', 'json']),
  fields: z.array(fieldSchema),
  jsonData: z.string().min(1, 'JSON data is required'),
});

type FormData = z.infer<typeof formSchema>;

interface AddDatasetItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  datasetId: string;
  existingVariables?: string[];
}

export function AddDatasetItemDialog({ 
  open, 
  onOpenChange, 
  datasetId,
  existingVariables = []
}: AddDatasetItemDialogProps) {
  const [mode, setMode] = useState<'fields' | 'json'>('fields');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const createItemMutation = useCreateDatasetItem();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      mode: 'fields',
      fields: existingVariables.length > 0 
        ? existingVariables.map(variable => ({ key: variable, value: '' }))
        : [{ key: '', value: '' }],
      jsonData: existingVariables.length > 0 
        ? JSON.stringify(
            existingVariables.reduce((acc, variable) => {
              acc[variable] = '';
              return acc;
            }, {} as Record<string, string>),
            null,
            2
          )
        : '{\n  "key": "value"\n}',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'fields',
  });

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      let itemData: Record<string, any>;

      if (data.mode === 'json') {
        // Validate JSON
        if (!isValidJSON(data.jsonData)) {
          toast.error('Invalid JSON format');
          setIsSubmitting(false);
          return;
        }
        itemData = JSON.parse(data.jsonData);
      } else {
        // Convert fields to object
        itemData = {};
        data.fields.forEach(field => {
          if (field.key.trim()) {
            itemData[field.key.trim()] = field.value;
          }
        });

        if (Object.keys(itemData).length === 0) {
          toast.error('At least one field is required');
          setIsSubmitting(false);
          return;
        }
      }

      await createItemMutation.mutateAsync({
        datasetId,
        data: { data: itemData },
      });

      toast.success('Dataset item added successfully');
      form.reset();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add item');
    } finally {
      setIsSubmitting(false);
    }
  };

  const addExistingVariable = (variable: string) => {
    const currentFields = form.getValues('fields');
    const exists = currentFields.some(field => field.key === variable);
    if (!exists) {
      append({ key: variable, value: '' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Dataset Item</DialogTitle>
          <DialogDescription>
            Add a new data item to this dataset. You can enter data as key-value pairs or as JSON.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Mode Toggle */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant={mode === 'fields' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMode('fields')}
              >
                Fields
              </Button>
              <Button
                type="button"
                variant={mode === 'json' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMode('json')}
              >
                JSON
              </Button>
            </div>

            {/* Existing Variables */}
            {existingVariables.length > 0 && mode === 'fields' && (
              <div>
                <label className="text-sm font-medium">Quick Add Variables:</label>
                <div className="flex gap-1 flex-wrap mt-1">
                  {existingVariables.map((variable) => (
                    <Button
                      key={variable}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addExistingVariable(variable)}
                      className="h-6 px-2 text-xs"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      {variable}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {mode === 'fields' ? (
              <>
                {/* Key-Value Fields */}
                <div className="space-y-3">
                  <label className="text-sm font-medium">Data Fields</label>
                  {fields.map((field, index) => (
                    <div key={field.id} className="flex gap-2">
                      <FormField
                        control={form.control}
                        name={`fields.${index}.key`}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormControl>
                              <Input placeholder="Key (e.g., question)" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`fields.${index}.value`}
                        render={({ field }) => (
                          <FormItem className="flex-[2]">
                            <FormControl>
                              <Textarea
                                placeholder="Value (e.g., What is machine learning?)"
                                className="resize-none"
                                rows={1}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => remove(index)}
                        disabled={fields.length === 1}
                        className="mt-1"
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => append({ key: '', value: '' })}
                    className="w-full"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Field
                  </Button>
                </div>
              </>
            ) : (
              <>
                {/* JSON Mode */}
                <FormField
                  control={form.control}
                  name="jsonData"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>JSON Data</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder='{\n  "question": "What is AI?",\n  "category": "technology"\n}'
                          className="font-mono text-sm min-h-[200px] resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Enter valid JSON data for this dataset item.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Adding...' : 'Add Item'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}