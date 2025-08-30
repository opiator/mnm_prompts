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

    // Execute the request based on provider
    let result: PlaygroundResponse;

    try {
      if (provider === 'openai') {
        result = await executeOpenAI(providerConfig, model, finalTemplate, messages, config);
      } else if (provider === 'anthropic') {
        result = await executeAnthropic(providerConfig, model, finalTemplate, messages, config);
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
  config: any
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

  const response = await openai.chat.completions.create({
    model,
    messages: requestMessages as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
    temperature: config.temperature ?? 0.7,
    max_tokens: config.maxTokens ?? 1000,
    top_p: config.topP ?? 1,
  });

  const choice = response.choices[0];
  if (!choice) {
    throw new Error('No response from OpenAI');
  }

  return {
    id: response.id,
    content: choice.message.content || '',
    usage: response.usage ? {
      promptTokens: response.usage.prompt_tokens,
      completionTokens: response.usage.completion_tokens,
      totalTokens: response.usage.total_tokens,
    } : undefined,
    model: response.model,
    provider: 'openai',
  };
}

async function executeAnthropic(
  providerConfig: any,
  model: string,
  template: string,
  messages: any[] | undefined,
  config: any
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

  const response = await anthropic.messages.create({
    model,
    messages: requestMessages as Anthropic.MessageParam[],
    max_tokens: config.maxTokens ?? 1000,
    temperature: config.temperature ?? 0.7,
    top_p: config.topP ?? 1,
  });

  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Anthropic');
  }

  return {
    id: response.id,
    content: content.text,
    usage: response.usage ? {
      promptTokens: response.usage.input_tokens,
      completionTokens: response.usage.output_tokens,
      totalTokens: response.usage.input_tokens + response.usage.output_tokens,
    } : undefined,
    model: response.model,
    provider: 'anthropic',
  };
}