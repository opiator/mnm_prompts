import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { PlaygroundRequest, PlaygroundResponse } from '@/types';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { substituteVariables } from '@/lib/utils';
import { buildApiRequest } from '@/lib/api-request-builder';

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

  let response;
  // Construct endpoint, avoiding double /v1 if baseUrl already includes it
  const baseUrl = providerConfig.baseUrl || 'https://api.openai.com';
  const endpoint = baseUrl.endsWith('/v1') 
    ? `${baseUrl}/responses` 
    : `${baseUrl}/v1/responses`;

  // Always use /v1/responses endpoint for OpenAI
  
  // Declare variables for response processing
  let content: string = '';
  let responseId: string = '';
  let responseModel: string = '';
  let usage: any = undefined;
  
  try {
    console.log('DEBUG: Always using OpenAI /v1/responses endpoint');
    
    // Prepare request for /v1/responses endpoint
    const responsesParams: any = {
      model,
      input: requestMessages,
      temperature: config.temperature ?? 0.7,
      max_output_tokens: config.maxTokens ?? 1000,
      top_p: config.topP ?? 1,
      store: false,
    };

    // Add structured output if schema is provided
    if (responseSchema) {
      try {
        const originalSchema = JSON.parse(responseSchema);
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
        
        responsesParams.text = {
          format: {
            type: "json_schema",
            name: responseName, 
            strict: true,
            schema: schema
          }
        };
        console.log('DEBUG: Set responsesParams.text to:', JSON.stringify(responsesParams.text, null, 2));
      } catch (error) {
        console.warn('Invalid response schema, using regular text output:', error);
      }
    } else {
      console.log('DEBUG: No response schema, using regular text output');
    }

    // Make direct HTTP call to /v1/responses
    console.log(endpoint);
    const httpResponse = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${providerConfig.apiKey}`,
        ...((providerConfig.baseUrl && providerConfig.headers) || {})
      },
      body: JSON.stringify(responsesParams)
    });

    if (!httpResponse.ok) {
      let errorMessage;
      try {
        const errorData = await httpResponse.json();
        errorMessage = errorData.error?.message || httpResponse.statusText;
      } catch {
        errorMessage = `HTTP ${httpResponse.status}: ${httpResponse.statusText}`;
      }
      throw new Error(`OpenAI /v1/responses error: ${errorMessage}`);
    }

    const responseText = await httpResponse.text();
    console.log('DEBUG: Raw response status:', httpResponse.status);
    console.log('DEBUG: Raw response headers:', Object.fromEntries(httpResponse.headers.entries()));
    console.log('DEBUG: Raw response body (first 500 chars):', responseText.substring(0, 500));
    
    try {
      response = JSON.parse(responseText);
      console.log('DEBUG: Successfully parsed /v1/responses JSON response');
    } catch (parseError) {
      console.error('DEBUG: Failed to parse /v1/responses JSON response');
      console.error('DEBUG: Parse error:', parseError);
      console.error('DEBUG: Full response body:', responseText);
      throw new Error(`Invalid JSON response from /v1/responses endpoint: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
    }
    
    // Extract content from /v1/responses format
    console.log('DEBUG: Full OpenAI response:', JSON.stringify(response, null, 2));
    console.log('DEBUG: response.output exists:', !!response.output);
    console.log('DEBUG: response.output length:', response.output?.length);
    
    // Check for the correct response structure: response.output[0].content[0].text
    if (response.output && response.output.length > 0 && 
        response.output[0].content && response.output[0].content.length > 0) {
      
      const outputText = response.output[0].content[0].text;
      console.log('DEBUG: Found output text:', outputText);
      
      if (outputText) {
        // Parse the JSON string from the text field
        try {
          let responseContent = JSON.parse(outputText);
          console.log('DEBUG: Parsed response content:', responseContent);
          
          // If we wrapped an array schema, unwrap it
          if (responseSchema) {
            try {
              const originalSchema = JSON.parse(responseSchema);
              if (originalSchema.type === 'array' && responseContent && typeof responseContent === 'object') {
                // Check for common wrapper property names
                if ('items' in responseContent) {
                  responseContent = (responseContent as any).items;
                  console.log('DEBUG: Unwrapped array from /v1/responses structured response using "items" property');
                } else if ('classifications' in responseContent) {
                  responseContent = (responseContent as any).classifications;
                  console.log('DEBUG: Unwrapped array from /v1/responses structured response using "classifications" property');
                } else if ('results' in responseContent) {
                  responseContent = (responseContent as any).results;
                  console.log('DEBUG: Unwrapped array from /v1/responses structured response using "results" property');
                } else {
                  console.log('DEBUG: Array schema detected but no known wrapper property found, using response as-is');
                }
              }
            } catch (error) {
              console.warn('DEBUG: Could not unwrap array response, using as-is');
            }
          }
          
          content = JSON.stringify(responseContent, null, 2);
          console.log('DEBUG: Extracted structured content from /v1/responses');
        } catch (parseError) {
          console.error('DEBUG: Failed to parse output text as JSON:', parseError);
          content = outputText; // Fallback to raw text
        }
      } else {
        content = '';
        console.warn('DEBUG: No text found in output content');
      }
    } else {
      // Fallback: check if response has a different structure
      console.log('DEBUG: No output structure found, checking for alternative response format...');
      console.log('DEBUG: Response structure analysis:');
      console.log('DEBUG: - response has output property:', 'output' in response);
      console.log('DEBUG: - response has text property:', 'text' in response);
      console.log('DEBUG: - response has choices property:', 'choices' in response);
      console.log('DEBUG: - response has content property:', 'content' in response);
      
      if ('text' in response && response.text) {
        // Check if response.text has the old structure
        if (response.text.content) {
          let responseContent = response.text.content;
          content = JSON.stringify(responseContent, null, 2);
          console.log('DEBUG: Found content in response.text.content format');
        } else if (typeof response.text === 'string') {
          content = response.text;
          console.log('DEBUG: Found content in response.text as string');
        } else {
          content = JSON.stringify(response.text, null, 2);
          console.log('DEBUG: Found content in response.text as object');
        }
      } else if ('choices' in response && response.choices && response.choices.length > 0) {
        // Fallback to chat completions format
        const choice = response.choices[0];
        if (choice && choice.message) {
          content = choice.message.content || '';
          console.log('DEBUG: Found content in choices[0].message.content format');
        }
      } else if ('content' in response) {
        // Direct content property
        content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content, null, 2);
        console.log('DEBUG: Found content in direct content property');
      } else {
        content = '';
        console.warn('DEBUG: No recognizable content found in /v1/responses response');
      }
    }
    
    // Set response metadata
    responseId = response.id;
    responseModel = response.model;
    usage = response.usage ? {
      promptTokens: response.usage.prompt_tokens,
      completionTokens: response.usage.completion_tokens,
      totalTokens: response.usage.total_tokens,
    } : undefined;
    
  } catch (error) {
    console.error('DEBUG: /v1/responses endpoint failed:', error);
    throw error; // No fallback - let it fail so we can debug
  }

  // Use shared utility to build raw request for consistency with frontend
  const rawRequest = buildApiRequest({
    provider: 'openai',
    model,
    template: template || '',
    variables: {},
    config: {
      temperature: config.temperature ?? 0.7,
      maxTokens: config.maxTokens ?? 1000,
      topP: config.topP ?? 1
    },
    providerConfig: {
      baseUrl: providerConfig.baseUrl || undefined,
      apiKey: providerConfig.apiKey || '',
      headers: providerConfig.headers || {}
    },
    responseSchema,
    messages
  });

  console.log('DEBUG: Final content being returned:', content);
  console.log('DEBUG: Content type:', typeof content);
  console.log('DEBUG: Content length:', content?.length);
  console.log('DEBUG: First 200 chars of content:', content?.substring(0, 200));
  
  return {
    id: responseId,
    content,
    usage,
    model: responseModel,
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
    // Note: Anthropic Claude models don't allow both temperature and top_p
    // Only temperature is used
  };

  // Add structured output via tool calling if schema is provided
  if (responseSchema) {
    try {
      const originalSchema = JSON.parse(responseSchema);
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
      
      requestParams.tools = [{
        name: toolName,
        description: toolDescription,
        input_schema: schema
      }];
      requestParams.tool_choice = {
        type: "tool",
        name: toolName
      };
      console.log('DEBUG: Added Anthropic structured output (tool calling) to request');
    } catch (error) {
      console.warn('Invalid response schema, ignoring structured output:', error);
    }
  } else {
    console.log('DEBUG: No response schema for Anthropic, using regular completion');
  }

  const response = await anthropic.messages.create(requestParams);

  // Use shared utility to build raw request for consistency with frontend
  const rawRequest = buildApiRequest({
    provider: 'anthropic',
    model,
    template: template || '',
    variables: {},
    config: {
      temperature: config.temperature ?? 0.7,
      maxTokens: config.maxTokens ?? 1000,
      // topP is not used for Anthropic as they don't allow both temperature and top_p
    },
    providerConfig: {
      baseUrl: providerConfig.baseUrl || undefined,
      apiKey: providerConfig.apiKey || '',
      headers: providerConfig.headers || {}
    },
    responseSchema,
    messages
  });

  // Handle structured output (tool calling) vs regular text
  let responseContent: string;
  
  if (responseSchema && response.content.length > 0) {
    // Check if we got a tool use response
    const toolUseContent = response.content.find(c => c.type === 'tool_use');
    if (toolUseContent && 'input' in toolUseContent) {
      // Return the structured JSON response
      let responseData = toolUseContent.input;
      
      // If we wrapped an array schema, unwrap it
      try {
        const originalSchema = JSON.parse(responseSchema);
        if (originalSchema.type === 'array' && responseData && typeof responseData === 'object') {
          // Check for common wrapper property names
          if ('items' in responseData) {
            responseData = (responseData as any).items;
            console.log('DEBUG: Unwrapped array from Anthropic structured response using "items" property');
          } else if ('classifications' in responseData) {
            responseData = (responseData as any).classifications;
            console.log('DEBUG: Unwrapped array from Anthropic structured response using "classifications" property');
          } else if ('results' in responseData) {
            responseData = (responseData as any).results;
            console.log('DEBUG: Unwrapped array from Anthropic structured response using "results" property');
          } else {
            console.log('DEBUG: Array schema detected but no known wrapper property found, using response as-is');
          }
        }
      } catch (error) {
        console.warn('DEBUG: Could not unwrap array response from Anthropic, using as-is');
      }
      
      responseContent = JSON.stringify(responseData, null, 2);
      console.log('DEBUG: Extracted structured content from Anthropic tool response');
    } else {
      // Fallback to first text content
      const textContent = response.content.find(c => c.type === 'text');
      responseContent = textContent && 'text' in textContent ? textContent.text : '';
      console.log('DEBUG: Fallback to text content from Anthropic response');
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