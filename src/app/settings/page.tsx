'use client';

import { useState } from 'react';
import { Eye, EyeOff, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useProviders, useCreateProviderKey } from '@/hooks/use-providers';
import { toast } from 'sonner';

const SUPPORTED_PROVIDERS = [
  { id: 'openai', name: 'OpenAI', baseUrl: 'https://api.openai.com/v1' },
  { id: 'anthropic', name: 'Anthropic', baseUrl: 'https://api.anthropic.com' },
] as const;

export default function SettingsPage() {
  const [newProvider, setNewProvider] = useState<{
    provider: string;
    name: string;
    apiKey: string;
    baseUrl: string;
    showApiKey: boolean;
  }>({
    provider: '',
    name: '',
    apiKey: '',
    baseUrl: '',
    showApiKey: false,
  });

  const { data: providers, isLoading } = useProviders();
  const createProviderMutation = useCreateProviderKey();

  const handleProviderChange = (providerId: string) => {
    const providerInfo = SUPPORTED_PROVIDERS.find(p => p.id === providerId);
    setNewProvider(prev => ({
      ...prev,
      provider: providerId,
      name: providerInfo?.name || '',
      baseUrl: providerInfo?.baseUrl || '',
    }));
  };

  const handleSaveProvider = async () => {
    if (!newProvider.provider || !newProvider.apiKey) {
      toast.error('Provider and API key are required');
      return;
    }

    try {
      await createProviderMutation.mutateAsync({
        provider: newProvider.provider,
        name: newProvider.name,
        apiKey: newProvider.apiKey,
        baseUrl: newProvider.baseUrl || undefined,
      });

      toast.success('Provider configuration saved');
      setNewProvider({
        provider: '',
        name: '',
        apiKey: '',
        baseUrl: '',
        showApiKey: false,
      });
    } catch (error) {
      toast.error('Failed to save provider configuration');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Configure your API keys and provider settings
        </p>
      </div>

      {/* Existing Providers */}
      <Card>
        <CardHeader>
          <CardTitle>Configured Providers</CardTitle>
          <CardDescription>
            Your currently configured LLM providers
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading providers...</p>
          ) : providers && providers.length > 0 ? (
            <div className="space-y-4">
              {providers.map((provider) => (
                <div 
                  key={provider.id} 
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div>
                    <h3 className="font-medium">
                      {provider.name || provider.provider}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Provider: {provider.provider}
                    </p>
                    {provider.baseUrl && (
                      <p className="text-sm text-muted-foreground">
                        Base URL: {provider.baseUrl}
                      </p>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    API Key configured ✓
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                No providers configured yet. Add your first provider below.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add New Provider */}
      <Card>
        <CardHeader>
          <CardTitle>Add Provider</CardTitle>
          <CardDescription>
            Configure a new LLM provider for use in the playground
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="provider">Provider</Label>
              <Select 
                value={newProvider.provider} 
                onValueChange={handleProviderChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_PROVIDERS.map((provider) => (
                    <SelectItem key={provider.id} value={provider.id}>
                      {provider.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="name">Display Name</Label>
              <Input
                id="name"
                value={newProvider.name}
                onChange={(e) => setNewProvider(prev => ({ ...prev, name: e.target.value }))}
                placeholder="My OpenAI"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="apiKey">API Key</Label>
            <div className="relative">
              <Input
                id="apiKey"
                type={newProvider.showApiKey ? 'text' : 'password'}
                value={newProvider.apiKey}
                onChange={(e) => setNewProvider(prev => ({ ...prev, apiKey: e.target.value }))}
                placeholder="sk-..."
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setNewProvider(prev => ({ ...prev, showApiKey: !prev.showApiKey }))}
              >
                {newProvider.showApiKey ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div>
            <Label htmlFor="baseUrl">Base URL (Optional)</Label>
            <Input
              id="baseUrl"
              value={newProvider.baseUrl}
              onChange={(e) => setNewProvider(prev => ({ ...prev, baseUrl: e.target.value }))}
              placeholder="https://api.openai.com/v1"
            />
          </div>

          <Button 
            onClick={handleSaveProvider}
            disabled={createProviderMutation.isPending || !newProvider.provider || !newProvider.apiKey}
            className="w-full"
          >
            {createProviderMutation.isPending ? 'Saving...' : 'Save Provider'}
          </Button>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Getting API Keys</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-medium mb-2">OpenAI</h3>
            <p className="text-sm text-muted-foreground">
              Get your API key from{' '}
              <a 
                href="https://platform.openai.com/api-keys" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                platform.openai.com/api-keys
              </a>
            </p>
          </div>
          <div>
            <h3 className="font-medium mb-2">Anthropic</h3>
            <p className="text-sm text-muted-foreground">
              Get your API key from{' '}
              <a 
                href="https://console.anthropic.com/settings/keys" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                console.anthropic.com/settings/keys
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}