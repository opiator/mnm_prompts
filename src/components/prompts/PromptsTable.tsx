'use client';

import { useState } from 'react';
import { MoreHorizontal, Eye, Edit, Trash2, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Prompt } from '@/types';
import { formatDate } from '@/lib/utils';
import { useDeletePrompt } from '@/hooks/use-prompts';
import { toast } from 'sonner';

interface PromptsTableProps {
  prompts: Prompt[];
}

export function PromptsTable({ prompts }: PromptsTableProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const deletePromptMutation = useDeletePrompt();

  const handleDelete = async (id: string) => {
    try {
      await deletePromptMutation.mutateAsync(id);
      toast.success('Prompt deleted successfully');
      setDeleteId(null);
    } catch (error) {
      toast.error('Failed to delete prompt');
    }
  };

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    toast.success('Prompt ID copied to clipboard');
  };

  if (prompts.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">No prompts yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first prompt to get started with testing and managing your LLM templates.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>All Prompts ({prompts.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead>Versions</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {prompts.map((prompt) => (
              <TableRow key={prompt.id}>
                <TableCell className="font-medium">
                  <a 
                    href={`/prompts/${prompt.id}`}
                    className="hover:underline"
                  >
                    {prompt.name}
                  </a>
                </TableCell>
                <TableCell className="max-w-xs">
                  <p className="truncate text-muted-foreground">
                    {prompt.description || 'No description'}
                  </p>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1 flex-wrap">
                    {prompt.tags?.slice(0, 2).map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {prompt.tags && prompt.tags.length > 2 && (
                      <Badge variant="outline" className="text-xs">
                        +{prompt.tags.length - 2}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {prompt.versions?.length || 0}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(prompt.updatedAt)}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <a href={`/prompts/${prompt.id}`}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </a>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <a href={`/prompts/${prompt.id}/edit`}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </a>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleCopyId(prompt.id)}>
                        <Copy className="mr-2 h-4 w-4" />
                        Copy ID
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => handleDelete(prompt.id)}
                        className="text-destructive"
                        disabled={deletePromptMutation.isPending}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {deletePromptMutation.isPending ? 'Deleting...' : 'Delete'}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}