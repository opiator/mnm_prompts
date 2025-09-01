'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { ArrowLeft, Save, Eye, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { usePrompt, useUpdatePrompt, useCreatePromptVersion } from '@/hooks/use-prompts';
import { extractVariables, substituteVariables } from '@/lib/utils';
import { toast } from 'sonner';

const metadataSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  tags: z.string().optional(),
});

const versionSchema = z.object({
  template: z.string().min(1, 'Template is required'),
  changeDescription: z.string().max(200, 'Change description too long').optional(),
  responseSchema: z.string().optional(),
});

type MetadataFormData = z.infer<typeof metadataSchema>;
type VersionFormData = z.infer<typeof versionSchema>;

export default function PromptEditPage() {
  const params = useParams();
  const router = useRouter();
  const promptId = params.id as string;
  
  const [activeTab, setActiveTab] = useState('metadata');
  const [previewVariables, setPreviewVariables] = useState<Record<string, string>>({});
  
  const { data: prompt, isLoading, error } = usePrompt(promptId);
  const updatePromptMutation = useUpdatePrompt();
  const createVersionMutation = useCreatePromptVersion();

  const metadataForm = useForm<MetadataFormData>({
    resolver: zodResolver(metadataSchema),
    defaultValues: {
      name: '',
      description: '',
      tags: '',
    },
  });

  const versionForm = useForm<VersionFormData>({
    resolver: zodResolver(versionSchema),
    defaultValues: {
      template: '',
      changeDescription: '',
    },
  });

  // Update forms when prompt data loads
  useEffect(() => {
    if (prompt) {
      metadataForm.reset({
        name: prompt.name,
        description: prompt.description || '',
        tags: prompt.tags ? prompt.tags.join(', ') : '',
      });

      const currentVersion = prompt.versions?.[0];
      if (currentVersion) {
        versionForm.reset({
          template: currentVersion.template,
          changeDescription: '',
        });
      }
    }
  }, [prompt, metadataForm, versionForm]);

  const currentTemplate = versionForm.watch('template');
  const variables = extractVariables(currentTemplate);

  const handleMetadataSubmit = async (data: MetadataFormData) => {
    try {
      const tags = data.tags ? data.tags.split(',').map(tag => tag.trim()).filter(Boolean) : [];
      
      await updatePromptMutation.mutateAsync({
        id: promptId,
        data: {
          name: data.name,
          description: data.description || undefined,
          tags: tags.length > 0 ? tags : undefined,
        },
      });

      toast.success('Prompt metadata updated successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update prompt');
    }
  };

  const handleVersionSubmit = async (data: VersionFormData) => {
    try {
      await createVersionMutation.mutateAsync({
        promptId,
        data: {
          template: data.template,
          changeDescription: data.changeDescription || undefined,
          responseSchema: data.responseSchema || undefined,
        },
      });

      toast.success('New prompt version created successfully');
      router.push(`/prompts/${promptId}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create version');
    }
  };

  const handlePreviewVariableChange = (variable: string, value: string) => {
    setPreviewVariables(prev => ({
      ...prev,
      [variable]: value,
    }));
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
            The prompt you're trying to edit doesn't exist.
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <a href={`/prompts/${promptId}`}>
            <ArrowLeft className="h-4 w-4" />
          </a>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">Edit Prompt</h1>
          <p className="text-muted-foreground">
            {prompt.name}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Panel - Forms */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Edit Prompt</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="metadata">Metadata</TabsTrigger>
                  <TabsTrigger value="template">New Version</TabsTrigger>
                </TabsList>

                <TabsContent value="metadata" className="space-y-4 mt-4">
                  <Form {...metadataForm}>
                    <form onSubmit={metadataForm.handleSubmit(handleMetadataSubmit)} className="space-y-4">
                      <FormField
                        control={metadataForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Name *</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Enter prompt name..." />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={metadataForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                placeholder="Enter prompt description..."
                                rows={3}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={metadataForm.control}
                        name="tags"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tags</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="tag1, tag2, tag3"
                              />
                            </FormControl>
                            <FormDescription>
                              Comma-separated tags for organization
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button 
                        type="submit" 
                        disabled={updatePromptMutation.isPending}
                        className="w-full"
                      >
                        {updatePromptMutation.isPending ? (
                          'Saving...'
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" />
                            Save Metadata
                          </>
                        )}
                      </Button>
                    </form>
                  </Form>
                </TabsContent>

                <TabsContent value="template" className="space-y-4 mt-4">
                  <Form {...versionForm}>
                    <form onSubmit={versionForm.handleSubmit(handleVersionSubmit)} className="space-y-4">
                      <FormField
                        control={versionForm.control}
                        name="template"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Template *</FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                placeholder="Enter your prompt template here..."
                                className="font-mono text-sm min-h-[200px]"
                              />
                            </FormControl>
                            <FormDescription>
                              Use {'{{variable_name}}'} syntax for variables
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={versionForm.control}
                        name="changeDescription"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Change Description</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="Describe what changed in this version..."
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={versionForm.control}
                        name="responseSchema"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Response Schema (Optional)</FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                placeholder={`{
  "type": "object",
  "properties": {
    "answer": {
      "type": "string",
      "description": "The main response"
    },
    "confidence": {
      "type": "number",
      "minimum": 0,
      "maximum": 1
    }
  },
  "required": ["answer"]
}`}
                                className="font-mono text-xs min-h-[150px]"
                              />
                            </FormControl>
                            <FormDescription>
                              JSON Schema for structured output. When provided, the LLM will return responses matching this schema.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button 
                        type="submit" 
                        disabled={createVersionMutation.isPending}
                        className="w-full"
                      >
                        {createVersionMutation.isPending ? (
                          'Creating...'
                        ) : (
                          <>
                            <Plus className="mr-2 h-4 w-4" />
                            Create New Version
                          </>
                        )}
                      </Button>
                    </form>
                  </Form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Variables */}
          {variables.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Variables ({variables.length})</CardTitle>
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
        </div>

        {/* Right Panel - Preview */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center">
                <Eye className="mr-2 h-4 w-4" />
                Template Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-muted p-4 rounded-md font-mono text-sm whitespace-pre-wrap min-h-[200px]">
                {substituteVariables(currentTemplate, previewVariables)}
              </div>
            </CardContent>
          </Card>

          {/* Preview Variables */}
          {variables.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Preview Variables</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {variables.map((variable) => (
                  <div key={variable}>
                    <label className="text-sm font-medium">{variable}</label>
                    <Input
                      value={previewVariables[variable] || ''}
                      onChange={(e) => handlePreviewVariableChange(variable, e.target.value)}
                      placeholder={`Enter ${variable}...`}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}