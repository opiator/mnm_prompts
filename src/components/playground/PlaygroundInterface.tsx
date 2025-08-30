'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Play, Settings, AlertCircle } from 'lucide-react';
import { useProviders } from '@/hooks/use-providers';
import { usePrompts } from '@/hooks/use-prompts';
import { useDatasets, useDataset } from '@/hooks/use-datasets';
import { usePlaygroundExecution } from '@/hooks/use-playground';
import { extractVariables, substituteVariables } from '@/lib/utils';
import { toast } from 'sonner';

const OPENAI_MODELS = [
  'gpt-4o',
  'gpt-4o-mini', 
  'gpt-4-turbo',
  'gpt-3.5-turbo',
];

const ANTHROPIC_MODELS = [
  'claude-3-5-sonnet-20241022',
  'claude-3-5-haiku-20241022',
  'claude-3-opus-20240229',
  'claude-3-sonnet-20240229',
  'claude-3-haiku-20240307',
];

export function PlaygroundInterface() {
  const searchParams = useSearchParams();
  const [template, setTemplate] = useState('You are a helpful assistant. Help the user with: {{question}}');
  const [provider, setProvider] = useState('');
  const [model, setModel] = useState('');
  const [selectedPrompt, setSelectedPrompt] = useState('');
  const [selectedDataset, setSelectedDataset] = useState('');
  const [selectedDatasetItem, setSelectedDatasetItem] = useState('');
  const [manualVariables, setManualVariables] = useState<Record<string, string>>({});
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(1000);
  const [result, setResult] = useState<string>('');

  const { data: providers } = useProviders();
  const { data: prompts } = usePrompts();
  const { data: datasets } = useDatasets();
  const { data: selectedDatasetData } = useDataset(selectedDataset);
  const playgroundMutation = usePlaygroundExecution();

  // Handle URL parameter for pre-selecting a prompt
  useEffect(() => {
    const promptParam = searchParams.get('prompt');
    if (promptParam && prompts) {
      const prompt = prompts.find(p => p.id === promptParam);
      if (prompt && prompt.versions && prompt.versions[0]) {
        setTemplate(prompt.versions[0].template);
        setSelectedPrompt(promptParam);
      }
    }
  }, [searchParams, prompts]);

  const variables = extractVariables(template);
  const availableModels = provider === 'openai' ? OPENAI_MODELS : 
                         provider === 'anthropic' ? ANTHROPIC_MODELS : [];

  // Get current dataset items if dataset is selected
  const datasetItems = selectedDatasetData?.items || [];
  
  // Get variables from selected dataset item
  const currentDatasetItem = datasetItems.find(item => item.id === selectedDatasetItem);
  const datasetVariables = currentDatasetItem ? 
    Object.keys(currentDatasetItem.data).reduce((acc, key) => {
      acc[key] = String(currentDatasetItem.data[key]);
      return acc;
    }, {} as Record<string, string>) : {};

  // Final variables = dataset + manual (manual overrides dataset only if not empty)
  const finalVariables = { ...datasetVariables };
  Object.entries(manualVariables).forEach(([key, value]) => {
    if (value && value.trim() !== '') {
      finalVariables[key] = value;
    }
  });

  const handlePromptSelect = (promptId: string) => {
    const prompt = prompts?.find(p => p.id === promptId);
    if (prompt && prompt.versions && prompt.versions[0]) {
      setTemplate(prompt.versions[0].template);
      setSelectedPrompt(promptId);
    }
  };

  const handleDatasetChange = (datasetId: string) => {
    setSelectedDataset(datasetId);
    // Reset selected item when dataset changes
    setSelectedDatasetItem('');
    // Clear manual variables to allow dataset values to show
    setManualVariables({});
  };

  const handleDatasetItemChange = (itemId: string) => {
    setSelectedDatasetItem(itemId);
    // Clear manual variables when selecting dataset item so dataset values take precedence
    setManualVariables({});
  };

  const handleExecute = async () => {
    if (!provider || !model) {
      toast.error('Please select a provider and model');
      return;
    }

    try {
      const response = await playgroundMutation.mutateAsync({
        template,
        provider,
        model,
        variables: finalVariables,
        config: {
          temperature,
          maxTokens,
        },
      });

      setResult(response.content);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Execution failed');
    }
  };

  // Check if providers are configured
  const hasProviders = providers && providers.length > 0;

  if (!hasProviders) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Playground</h1>
          <p className="text-muted-foreground">
            Test your prompts with different models and datasets
          </p>
        </div>

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="text-center max-w-md">
              <AlertCircle className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No Providers Configured</h3>
              <p className="text-muted-foreground mb-6">
                You need to configure at least one LLM provider to use the playground. 
                Add your API keys in the settings.
              </p>
              <Button asChild>
                <a href="/settings">
                  <Settings className="mr-2 h-4 w-4" />
                  Configure Providers
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Playground</h1>
        <p className="text-muted-foreground">
          Test your prompts with different models and datasets
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Panel - Input */}
        <div className="space-y-6">
          {/* Prompt Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Prompt Template</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Load from existing prompt</Label>
                <Select value={selectedPrompt} onValueChange={handlePromptSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a prompt..." />
                  </SelectTrigger>
                  <SelectContent>
                    {prompts?.map((prompt) => (
                      <SelectItem key={prompt.id} value={prompt.id}>
                        {prompt.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Template</Label>
                <Textarea
                  value={template}
                  onChange={(e) => setTemplate(e.target.value)}
                  placeholder="Enter your prompt template here..."
                  className="font-mono text-sm min-h-[200px]"
                />
              </div>

              {variables.length > 0 && (
                <div>
                  <Label>Variables found:</Label>
                  <div className="flex gap-1 flex-wrap mt-1">
                    {variables.map((variable) => (
                      <Badge key={variable} variant="secondary">
                        {variable}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Dataset & Variables */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Variables & Datasets</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {variables.length > 0 && (
                <div>
                  <Label>Variables in template:</Label>
                  <div className="flex gap-1 flex-wrap mt-1">
                    {variables.map((variable) => (
                      <Badge key={variable} variant="secondary">
                        {variable}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Dataset</Label>
                  <Select value={selectedDataset} onValueChange={handleDatasetChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select dataset..." />
                    </SelectTrigger>
                    <SelectContent>
                      {datasets?.map((dataset) => (
                        <SelectItem key={dataset.id} value={dataset.id}>
                          {dataset.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Dataset Item</Label>
                  <Select 
                    value={selectedDatasetItem} 
                    onValueChange={handleDatasetItemChange}
                    disabled={!selectedDataset}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select item..." />
                    </SelectTrigger>
                    <SelectContent>
                      {datasetItems.map((item, index) => (
                        <SelectItem key={item.id} value={item.id}>
                          Item {index + 1}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {variables.length > 0 && (
                <>
                  <Separator />

                  <div>
                    <Label>Variable Values</Label>
                    <div className="space-y-2 mt-2">
                      {variables.map((variable) => (
                        <div key={variable}>
                          <Label className="text-sm">{variable}</Label>
                          <Input
                            value={manualVariables[variable] || ''}
                            onChange={(e) => setManualVariables(prev => ({
                              ...prev,
                              [variable]: e.target.value
                            }))}
                            placeholder={datasetVariables[variable] || `Enter ${variable}...`}
                          />
                          {datasetVariables[variable] && (
                            <p className="text-xs text-muted-foreground">
                              Dataset value: {datasetVariables[variable]}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {variables.length === 0 && (
                <div className="text-center py-4 text-muted-foreground">
                  <p className="text-sm">
                    No variables detected in the template. Use {`{{variable_name}}`} syntax to add variables.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Model Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Model Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Provider</Label>
                  <Select value={provider} onValueChange={setProvider}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select provider..." />
                    </SelectTrigger>
                    <SelectContent>
                      {providers.map((p) => (
                        <SelectItem key={p.id} value={p.provider}>
                          {p.name || p.provider}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Model</Label>
                  <Select value={model} onValueChange={setModel} disabled={!provider}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select model..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableModels.map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Temperature: {temperature}</Label>
                  <Input
                    type="number"
                    min="0"
                    max="2"
                    step="0.1"
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  />
                </div>

                <div>
                  <Label>Max Tokens: {maxTokens}</Label>
                  <Input
                    type="number"
                    min="1"
                    max="4000"
                    value={maxTokens}
                    onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                  />
                </div>
              </div>

              <Button
                onClick={handleExecute}
                disabled={playgroundMutation.isPending || !provider || !model}
                className="w-full"
              >
                {playgroundMutation.isPending ? (
                  'Executing...'
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Execute
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Panel - Output */}
        <div className="space-y-6">
          {/* Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-muted p-4 rounded-md font-mono text-sm whitespace-pre-wrap">
                {substituteVariables(template, finalVariables)}
              </div>
            </CardContent>
          </Card>

          {/* Results */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Response</CardTitle>
            </CardHeader>
            <CardContent>
              {result ? (
                <div className="bg-muted p-4 rounded-md whitespace-pre-wrap">
                  {result}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Execute a prompt to see the response here
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}