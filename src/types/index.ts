// Database models
export interface Prompt {
  id: string;
  name: string;
  description?: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
  versions?: PromptVersion[];
}

export interface PromptVersion {
  id: string;
  promptId: string;
  template: string;
  commit: string;
  changeDescription?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface Dataset {
  id: string;
  name: string;
  description?: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
  items?: DatasetItem[];
}

export interface DatasetItem {
  id: string;
  datasetId: string;
  data: Record<string, any>;
  createdAt: Date;
}

export interface ProviderKey {
  id: string;
  provider: string;
  name?: string;
  apiKey: string;
  baseUrl?: string;
  headers?: Record<string, string>;
  createdAt: Date;
}

// API Request/Response types
export interface CreatePromptRequest {
  name: string;
  description?: string;
  template: string;
  tags?: string[];
  changeDescription?: string;
  responseSchema?: string;
}

export interface UpdatePromptRequest {
  name?: string;
  description?: string;
  tags?: string[];
}

export interface CreatePromptVersionRequest {
  template: string;
  changeDescription?: string;
  metadata?: Record<string, any>;
  responseSchema?: string; // JSON schema for structured output
}

export interface CreateDatasetRequest {
  name: string;
  description?: string;
  tags?: string[];
}

export interface CreateDatasetItemRequest {
  data: Record<string, any>;
}

export interface CreateProviderKeyRequest {
  provider: string;
  name?: string;
  apiKey: string;
  baseUrl?: string;
  headers?: Record<string, string>;
}

// Playground types
export interface PlaygroundMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface PlaygroundRequest {
  promptId?: string;
  template?: string;
  messages?: PlaygroundMessage[];
  provider: string;
  model: string;
  variables?: Record<string, string>;
  config?: {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
  };
}

export interface PlaygroundResponse {
  id: string;
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  provider: string;
  rawRequest?: {
    url: string;
    method: string;
    headers: Record<string, string>;
    body: any;
  };
}

export type LLMProvider = 'openai' | 'anthropic';

export interface ModelConfig {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
}