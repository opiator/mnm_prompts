'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, Edit, Plus, Play, Copy, Calendar, Hash, Tag, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { usePrompt, useDeletePromptVersion } from '@/hooks/use-prompts';
import { formatDate, extractVariables } from '@/lib/utils';
import { toast } from 'sonner';

export default function PromptDetailPage() {
  const params = useParams();
  const promptId = params.id as string;
  
  const { data: prompt, isLoading, error } = usePrompt(promptId);
  const deleteVersionMutation = useDeletePromptVersion();

  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const handleTestInPlayground = () => {
    // Navigate to playground with this prompt pre-selected
    window.location.href = `/playground?prompt=${promptId}`;
  };

  const handleDeleteVersion = async (versionId: string) => {
    if (!confirm('Are you sure you want to delete this version? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteVersionMutation.mutateAsync({
        promptId,
        versionId,
      });
      toast.success('Version deleted successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete version');
    }
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-destructive mb-2">
            Error loading prompt
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
          <p className="text-muted-foreground">Loading prompt...</p>
        </div>
      </div>
    );
  }

  if (!prompt) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-lg font-semibold mb-2">Prompt not found</h2>
          <p className="text-muted-foreground mb-4">
            The prompt you're looking for doesn't exist.
          </p>
          <Button asChild>
            <a href="/prompts">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Prompts
            </a>
          </Button>
        </div>
      </div>
    );
  }

  const currentVersion = prompt.versions?.[0];
  const variables = currentVersion ? extractVariables(currentVersion.template) : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <a href="/prompts">
            <ArrowLeft className="h-4 w-4" />
          </a>
        </Button>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">{prompt.name}</h1>
              <p className="text-muted-foreground">
                {prompt.description || 'No description'}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleTestInPlayground}>
                <Play className="mr-2 h-4 w-4" />
                Test in Playground
              </Button>
              <Button variant="outline" asChild>
                <a href={`/prompts/${promptId}/edit`}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Prompt
                </a>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Prompt Info */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold">{prompt.versions?.length || 0}</div>
              <p className="text-xs text-muted-foreground">Versions</p>
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
              <div className="text-xs font-medium">{formatDate(prompt.createdAt)}</div>
              <p className="text-xs text-muted-foreground">Created</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-xs font-medium">{formatDate(prompt.updatedAt)}</div>
              <p className="text-xs text-muted-foreground">Last Updated</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tags */}
      {prompt.tags && prompt.tags.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center">
              <Tag className="mr-2 h-4 w-4" />
              Tags
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 flex-wrap">
              {prompt.tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Variables */}
      {variables.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center">
              <Hash className="mr-2 h-4 w-4" />
              Variables
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 flex-wrap">
              {variables.map((variable) => (
                <Badge key={variable} variant="outline">
                  {`{{${variable}}}`}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Template */}
      {currentVersion && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              Latest Template
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCopyToClipboard(currentVersion.template)}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-muted p-4 rounded-md">
              <pre className="whitespace-pre-wrap text-sm font-mono">
                {currentVersion.template}
              </pre>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Version History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center">
              <Calendar className="mr-2 h-4 w-4" />
              Version History ({prompt.versions?.length || 0})
            </span>
            <Button variant="outline" size="sm" asChild>
              <a href={`/prompts/${promptId}/versions/new`}>
                <Plus className="mr-2 h-4 w-4" />
                New Version
              </a>
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!prompt.versions || prompt.versions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                No versions yet.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Version</TableHead>
                  <TableHead>Change Description</TableHead>
                  <TableHead>Commit</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prompt.versions.map((version, index) => (
                  <TableRow key={version.id}>
                    <TableCell className="font-medium">
                      v{prompt.versions!.length - index}
                      {index === 0 && (
                        <Badge variant="secondary" className="ml-2">
                          Latest
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[300px] truncate">
                        {version.changeDescription || 'No description'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">
                        {version.commit}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(version.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyToClipboard(version.template)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        {prompt.versions && prompt.versions.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteVersion(version.id)}
                            disabled={deleteVersionMutation.isPending}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}