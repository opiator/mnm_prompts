'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePrompts } from '@/hooks/use-prompts';
import { PromptsTable } from '@/components/prompts/PromptsTable';
import { CreatePromptDialog } from '@/components/prompts/CreatePromptDialog';

export default function PromptsPage() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const { data: prompts, isLoading, error } = usePrompts();

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-destructive mb-2">
            Error loading prompts
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
          <h1 className="text-3xl font-bold">Prompts</h1>
          <p className="text-muted-foreground">
            Manage your prompt templates and versions
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Prompt
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading prompts...</p>
          </div>
        </div>
      ) : (
        <PromptsTable prompts={prompts || []} />
      )}

      <CreatePromptDialog 
        open={showCreateDialog} 
        onOpenChange={setShowCreateDialog} 
      />
    </div>
  );
}