import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Database, PlayCircle, Settings } from "lucide-react";

export default function Home() {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-foreground mb-4">
          Welcome to MNM Prompts
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Manage your LLM prompts, create datasets, and test them in an interactive playground.
          Build better AI applications with organized prompt management and testing.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Prompts
            </CardTitle>
            <CardDescription>
              Create and version your prompts with templates and variables
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <a href="/prompts">Manage Prompts</a>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Datasets
            </CardTitle>
            <CardDescription>
              Store test data and variables for prompt testing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <a href="/datasets">Manage Datasets</a>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PlayCircle className="h-5 w-5" />
              Playground
            </CardTitle>
            <CardDescription>
              Test prompts with different models and datasets
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <a href="/playground">Open Playground</a>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Settings
            </CardTitle>
            <CardDescription>
              Configure API keys and model providers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full" variant="outline">
              <a href="/settings">Configure Settings</a>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="bg-muted/50 rounded-lg p-8 text-center">
        <h2 className="text-2xl font-semibold mb-4">Quick Start</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          <div>
            <h3 className="font-semibold mb-2">1. Set up providers</h3>
            <p className="text-muted-foreground text-sm">
              Add your API keys for OpenAI, Anthropic, or other providers in Settings.
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">2. Create prompts</h3>
            <p className="text-muted-foreground text-sm">
              Build prompt templates with variables like {`{{name}}`} for dynamic content.
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">3. Test in playground</h3>
            <p className="text-muted-foreground text-sm">
              Use datasets to test prompts with different inputs and compare results.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
