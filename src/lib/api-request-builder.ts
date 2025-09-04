import { substituteVariables } from '@/lib/utils';

export interface ApiRequestConfig {
  provider: string;
  model: string;
  template: string;
  variables: Record<string, string>;
  config: {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
  };
  providerConfig: {
    baseUrl?: string;
    apiKey: string;
    headers?: Record<string, string>;
  };
  responseSchema?: string | null;
  messages?: any[];
}

export interface RawRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: any;
}

export function buildApiRequest(config: ApiRequestConfig): RawRequest {
  const processedTemplate = substituteVariables(config.template, config.variables);
  
  if (config.provider === 'openai') {
    return buildOpenAIRequest(config, processedTemplate);
  } else if (config.provider === 'anthropic') {
    return buildAnthropicRequest(config, processedTemplate);
  } else {
    throw new Error(`Unsupported provider: ${config.provider}`);
  }
}

function buildOpenAIRequest(config: ApiRequestConfig, processedTemplate: string): RawRequest {
  const baseUrl = config.providerConfig.baseUrl || 'https://api.openai.com';
  const endpoint = baseUrl.endsWith('/v1') 
    ? `${baseUrl}/responses` 
    : `${baseUrl}/v1/responses`;

  const requestMessages = config.messages || [
    {
      role: 'user',
      content: processedTemplate,
    },
  ];

  const requestBody: any = {
    model: config.model,
    input: requestMessages,
    temperature: config.config.temperature ?? 0.7,
    max_output_tokens: config.config.maxTokens ?? 1000,
    top_p: config.config.topP ?? 1,
    store: false,
  };

  // Add structured output if schema is provided
  if (config.responseSchema) {
    try {
      const originalSchema = JSON.parse(config.responseSchema);
      let schema = originalSchema;
      
      console.log('DEBUG: Original schema type:', originalSchema.type);
      console.log('DEBUG: Original schema:', JSON.stringify(originalSchema, null, 2));
      
      // For /v1/responses, OpenAI requires root schema to be object type
      // If we have an array schema, wrap it in an object
      if (originalSchema.type === 'array') {
        schema = {
          type: "object",
          properties: {
            items: originalSchema
          },
          required: ["items"],
          additionalProperties: false
        };
        console.log('DEBUG: Wrapped array schema in object');
      }
      
      console.log('DEBUG: Final schema being sent:', JSON.stringify(schema, null, 2));
      
      // Generate a descriptive name based on the schema
      const responseName = originalSchema.title?.toLowerCase().replace(/[^a-z0-9]/g, '_') || "structured_response";
      
      requestBody.text = {
        format: {
          type: "json_schema",
          name: responseName, 
          strict: true,
          schema: schema
        }
      };
    } catch (error) {
      console.error('DEBUG: Error parsing response schema:', error);
      // Invalid schema, ignore structured output
    }
  }

  return {
    url: endpoint,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer sk-...${config.providerConfig.apiKey?.slice(-4) || 'KEY'}`,
      ...(config.providerConfig.baseUrl && config.providerConfig.headers ? config.providerConfig.headers : {})
    },
    body: requestBody
  };
}

function buildAnthropicRequest(config: ApiRequestConfig, processedTemplate: string): RawRequest {
  const baseUrl = config.providerConfig.baseUrl || 'https://api.anthropic.com';
  const endpoint = `${baseUrl}/v1/messages`;

  const requestMessages = config.messages || [
    {
      role: 'user',
      content: processedTemplate,
    },
  ];

  const requestBody: any = {
    model: config.model,
    messages: requestMessages,
    max_tokens: config.config.maxTokens ?? 1000,
    temperature: config.config.temperature ?? 0.7,
    top_p: config.config.topP ?? 1,
  };

  // Add structured output via tool calling if schema is provided
  if (config.responseSchema) {
    try {
      const originalSchema = JSON.parse(config.responseSchema);
      let schema = originalSchema;
      
      console.log('DEBUG: Original schema type:', originalSchema.type);
      console.log('DEBUG: Original schema:', JSON.stringify(originalSchema, null, 2));
      
      // Anthropic tool calling also requires root schema to be object type
      // If we have an array schema, wrap it in an object
      if (originalSchema.type === 'array') {
        schema = {
          type: "object",
          properties: {
            items: originalSchema
          },
          required: ["items"],
          additionalProperties: false
        };
        console.log('DEBUG: Wrapped array schema in object for Anthropic');
      }
      
      console.log('DEBUG: Final schema being sent to Anthropic:', JSON.stringify(schema, null, 2));
      
      // Generate a descriptive tool name based on the schema
      const toolName = originalSchema.title?.toLowerCase().replace(/[^a-z0-9]/g, '_') || "structured_response";
      const toolDescription = originalSchema.description || "Provide a structured response matching the specified schema";
      
      requestBody.tools = [{
        name: toolName,
        description: toolDescription,
        input_schema: schema
      }];
      requestBody.tool_choice = {
        type: "tool",
        name: toolName
      };
    } catch (error) {
      console.error('DEBUG: Error parsing response schema:', error);
      // Invalid schema, ignore structured output
    }
  }

  return {
    url: endpoint,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': `sk-...${config.providerConfig.apiKey?.slice(-4) || 'KEY'}`,
      'anthropic-version': '2023-06-01',
      ...(config.providerConfig.baseUrl && config.providerConfig.headers ? config.providerConfig.headers : {})
    },
    body: requestBody
  };
}