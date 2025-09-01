import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { PlaygroundRequest, PlaygroundResponse } from '@/types';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { substituteVariables } from '@/lib/utils';

export async function POST(request: Request) {
  try {
    const body: PlaygroundRequest = await request.json();
    const {
      promptId,
      template,
      messages,
      provider,
      model,
      variables = {},
      config = {},
    } = body;

    if (!provider || !model) {
      return NextResponse.json(
        { error: 'Provider and model are required' },
        { status: 400 }
      );
    }

    // Get provider configuration
    const providerConfig = await prisma.providerKey.findUnique({
      where: { provider },
    });

    if (!providerConfig) {
      return NextResponse.json(
        { error: `Provider ${provider} is not configured. Please add it in Settings.` },
        { status: 400 }
      );
    }

    let finalTemplate = template || '';

    // If promptId is provided, get the latest template
    if (promptId && !template) {
      const prompt = await prisma.prompt.findUnique({
        where: { id: promptId },
        include: {
          versions: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });

      if (!prompt || !prompt.versions[0]) {
        return NextResponse.json(
          { error: 'Prompt not found' },
          { status: 404 }
        );
      }

      finalTemplate = prompt.versions[0].template;
    }

    if (!finalTemplate && !messages) {
      return NextResponse.json(
        { error: 'Template or messages are required' },
        { status: 400 }
      );
    }

    // Substitute variables in template
    if (finalTemplate && Object.keys(variables).length > 0) {
      finalTemplate = substituteVariables(finalTemplate, variables);
    }

    // Get response schema if prompt has one
    let responseSchema: string | null = null;
    if (promptId) {
      const prompt = await prisma.prompt.findUnique({
        where: { id: promptId },
        include: {
          versions: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });

      responseSchema = prompt?.versions[0]?.responseSchema || null;
      console.log('DEBUG: Prompt ID:', promptId);
      console.log('DEBUG: Found response schema:', responseSchema ? 'YES' : 'NO');
      console.log('DEBUG: Response schema content:', responseSchema);
    } else {
      console.log('DEBUG: No promptId provided, skipping response schema');
    }

    // Execute the request based on provider
    let result: PlaygroundResponse;

    try {
      if (provider === 'openai') {
        result = await executeOpenAI(providerConfig, model, finalTemplate, messages, config, responseSchema);
      } else if (provider === 'anthropic') {
        result = await executeAnthropic(providerConfig, model, finalTemplate, messages, config, responseSchema);
      } else {
        return NextResponse.json(
          { error: `Provider ${provider} is not supported` },
          { status: 400 }
        );
      }

      return NextResponse.json(result);
    } catch (providerError: any) {
      console.error('Provider error:', providerError);
      return NextResponse.json(
        { 
          error: 'LLM provider error', 
          details: providerError.message || 'Unknown provider error' 
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Playground execution error:', error);
    return NextResponse.json(
      { error: 'Failed to execute playground request' },
      { status: 500 }
    );
  }
}

async function executeOpenAI(
  providerConfig: any,
  model: string,
  template: string,
  messages: any[] | undefined,
  config: any,
  responseSchema: string | null
): Promise<PlaygroundResponse> {
  const openai = new OpenAI({
    apiKey: providerConfig.apiKey,
    baseURL: providerConfig.baseUrl || undefined,
  });

  const requestMessages = messages || [
    {
      role: 'user',
      content: template,
    },
  ];

  // Build request parameters
  const requestParams: any = {
    model,
    messages: requestMessages as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
    temperature: config.temperature ?? 0.7,
    max_tokens: config.maxTokens ?? 1000,
    top_p: config.topP ?? 1,
  };

  // Add structured output if schema is provided
  if (responseSchema) {
    try {
      const schema = JSON.parse(responseSchema);
      
      // OpenAI requires root schema to be type "object", not "array"
      // If we have an array schema, wrap it in an object
      let processedSchema = schema;
      if (schema.type === 'array') {
        processedSchema = {
          type: "object",
          properties: {
            items: {
              ...schema,
              description: schema.description || "Array of items matching the specified schema"
            }
          },
          required: ["items"],
          additionalProperties: false
        };
        console.log('DEBUG: Wrapped array schema in object for OpenAI compatibility');
      }
      
      requestParams.response_format = {
        type: "json_schema",
        json_schema: {
          name: "structured_response",
          schema: processedSchema,
          strict: true
        }
      };
      console.log('DEBUG: Added OpenAI structured output to request');
      console.log('DEBUG: Original schema type:', schema.type);
      console.log('DEBUG: Processed schema:', processedSchema);
    } catch (error) {
      console.warn('Invalid response schema, ignoring structured output:', error);
    }
  } else {
    console.log('DEBUG: No response schema for OpenAI, using regular completion');
  }

  const response = await openai.chat.completions.create(requestParams);

  // Capture raw request details (mask API key for security)
  const rawRequest = {
    url: `${providerConfig.baseUrl || 'https://api.openai.com'}/v1/chat/completions`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer sk-...${providerConfig.apiKey.slice(-4)}`,
      ...((providerConfig.baseUrl && providerConfig.headers) || {})
    },
    body: requestParams
  };

  const choice = response.choices[0];
  if (!choice) {
    throw new Error('No response from OpenAI');
  }

  let content = choice.message.content || '';
  
  // If we wrapped an array schema, extract the array from the response
  if (responseSchema) {
    try {
      const originalSchema = JSON.parse(responseSchema);
      if (originalSchema.type === 'array') {
        const parsed = JSON.parse(content);
        if (parsed && parsed.items) {
          // Extract the array from the wrapped object and stringify it
          content = JSON.stringify(parsed.items, null, 2);
          console.log('DEBUG: Extracted array from wrapped OpenAI response');
        }
      }
    } catch (error) {
      console.warn('DEBUG: Could not unwrap array response, returning as-is');
    }
  }

  return {
    id: response.id,
    content,
    usage: response.usage ? {
      promptTokens: response.usage.prompt_tokens,
      completionTokens: response.usage.completion_tokens,
      totalTokens: response.usage.total_tokens,
    } : undefined,
    model: response.model,
    provider: 'openai',
    rawRequest,
  };
}

async function executeAnthropic(
  providerConfig: any,
  model: string,
  template: string,
  messages: any[] | undefined,
  config: any,
  responseSchema: string | null
): Promise<PlaygroundResponse> {
  const anthropic = new Anthropic({
    apiKey: providerConfig.apiKey,
    baseURL: providerConfig.baseUrl || undefined,
  });

  // Convert messages to Anthropic format
  let requestMessages = messages || [];
  
  if (!messages && template) {
    requestMessages = [
      {
        role: 'user',
        content: template,
      },
    ];
  }

  // Anthropic requires at least one message
  if (requestMessages.length === 0) {
    throw new Error('At least one message is required for Anthropic');
  }

  // Build request parameters
  const requestParams: any = {
    model,
    messages: requestMessages as Anthropic.MessageParam[],
    max_tokens: config.maxTokens ?? 1000,
    temperature: config.temperature ?? 0.7,
    top_p: config.topP ?? 1,
  };

  // Add structured output via tool calling if schema is provided
  if (responseSchema) {
    try {
      const schema = JSON.parse(responseSchema);
      requestParams.tools = [{
        name: "structured_response",
        description: "Provide a structured response matching the specified schema",
        input_schema: schema
      }];
      requestParams.tool_choice = {
        type: "tool",
        name: "structured_response"
      };
      console.log('DEBUG: Added Anthropic structured output (tool calling) to request');
      console.log('DEBUG: Schema:', schema);
    } catch (error) {
      console.warn('Invalid response schema, ignoring structured output:', error);
    }
  } else {
    console.log('DEBUG: No response schema for Anthropic, using regular completion');
  }

  const response = await anthropic.messages.create(requestParams);

  // Capture raw request details (mask API key for security)
  const rawRequest = {
    url: `${providerConfig.baseUrl || 'https://api.anthropic.com'}/v1/messages`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': `sk-...${providerConfig.apiKey.slice(-4)}`,
      'anthropic-version': '2023-06-01',
      ...((providerConfig.baseUrl && providerConfig.headers) || {})
    },
    body: requestParams
  };

  // Handle structured output (tool calling) vs regular text
  let responseContent: string;
  
  if (responseSchema && response.content.length > 0) {
    // Check if we got a tool use response
    const toolUseContent = response.content.find(c => c.type === 'tool_use');
    if (toolUseContent && 'input' in toolUseContent) {
      // Return the structured JSON response
      responseContent = JSON.stringify(toolUseContent.input, null, 2);
    } else {
      // Fallback to first text content
      const textContent = response.content.find(c => c.type === 'text');
      responseContent = textContent && 'text' in textContent ? textContent.text : '';
    }
  } else {
    // Regular text response
    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Anthropic');
    }
    responseContent = content.text;
  }

  return {
    id: response.id,
    content: responseContent,
    usage: response.usage ? {
      promptTokens: response.usage.input_tokens,
      completionTokens: response.usage.output_tokens,
      totalTokens: response.usage.input_tokens + response.usage.output_tokens,
    } : undefined,
    model: response.model,
    provider: 'anthropic',
    rawRequest,
  };
}