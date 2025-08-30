import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { CreatePromptRequest } from '@/types';

// GET /api/prompts - List all prompts
export async function GET() {
  try {
    const prompts = await prisma.prompt.findMany({
      include: {
        versions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const promptsWithParsedData = prompts.map(prompt => ({
      ...prompt,
      tags: prompt.tags ? JSON.parse(prompt.tags) : [],
      versions: prompt.versions.map(version => ({
        ...version,
        metadata: version.metadata ? JSON.parse(version.metadata) : null,
      })),
    }));

    return NextResponse.json(promptsWithParsedData);
  } catch (error) {
    console.error('Error fetching prompts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch prompts' },
      { status: 500 }
    );
  }
}

// POST /api/prompts - Create a new prompt
export async function POST(request: Request) {
  try {
    const body: CreatePromptRequest = await request.json();
    const { name, description, template, tags, changeDescription } = body;

    if (!name || !template) {
      return NextResponse.json(
        { error: 'Name and template are required' },
        { status: 400 }
      );
    }

    // Generate commit hash (simplified)
    const commit = Math.random().toString(36).substring(2, 9);

    const prompt = await prisma.prompt.create({
      data: {
        name,
        description,
        tags: tags ? JSON.stringify(tags) : null,
        versions: {
          create: {
            template,
            commit,
            changeDescription,
          },
        },
      },
      include: {
        versions: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    const promptWithParsedData = {
      ...prompt,
      tags: prompt.tags ? JSON.parse(prompt.tags) : [],
      versions: prompt.versions.map(version => ({
        ...version,
        metadata: version.metadata ? JSON.parse(version.metadata) : null,
      })),
    };

    return NextResponse.json(promptWithParsedData, { status: 201 });
  } catch (error: any) {
    console.error('Error creating prompt:', error);
    
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A prompt with this name already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create prompt' },
      { status: 500 }
    );
  }
}