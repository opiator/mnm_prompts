'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
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
import { useCreatePrompt } from '@/hooks/use-prompts';
import { toast } from 'sonner';
import { extractVariables } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

const formSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  template: z.string().min(1, 'Template is required'),
  tags: z.string().optional(),
  changeDescription: z.string().max(200, 'Change description too long').optional(),
});

type FormData = z.infer<typeof formSchema>;

interface CreatePromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreatePromptDialog({ open, onOpenChange }: CreatePromptDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const createPromptMutation = useCreatePrompt();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      template: '',
      tags: '',
      changeDescription: '',
    },
  });

  const template = form.watch('template');
  const variables = template ? extractVariables(template) : [];

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      const tags = data.tags 
        ? data.tags.split(',').map(tag => tag.trim()).filter(Boolean)
        : undefined;

      await createPromptMutation.mutateAsync({
        name: data.name,
        description: data.description || undefined,
        template: data.template,
        tags,
        changeDescription: data.changeDescription || undefined,
      });

      toast.success('Prompt created successfully');
      form.reset();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create prompt');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Prompt</DialogTitle>
          <DialogDescription>
            Create a new prompt template with variables for dynamic content.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="My awesome prompt" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="What does this prompt do?"
                      className="resize-none"
                      rows={2}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="template"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Template</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder={`You are a helpful assistant. Help the user with: {{user_question}}

Use this context: {{context}}`}
                      className="resize-none font-mono text-sm"
                      rows={8}
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    Use {`{{variable_name}}`} syntax for variables that can be replaced with dataset values.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {variables.length > 0 && (
              <div>
                <label className="text-sm font-medium">Detected Variables:</label>
                <div className="flex gap-1 flex-wrap mt-1">
                  {variables.map((variable) => (
                    <Badge key={variable} variant="secondary">
                      {variable}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tags (Optional)</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="chatbot, qa, customer-service"
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    Comma-separated tags for organizing your prompts.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="changeDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Change Description (Optional)</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Initial version"
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    Describe what this version does or what changed.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                {isSubmitting ? 'Creating...' : 'Create Prompt'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}