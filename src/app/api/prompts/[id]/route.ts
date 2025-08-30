import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { UpdatePromptRequest } from '@/types';

// GET /api/prompts/[id] - Get a specific prompt
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const prompt = await prisma.prompt.findUnique({
      where: { id: params.id },
      include: {
        versions: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt not found' },
        { status: 404 }
      );
    }

    const promptWithParsedData = {
      ...prompt,
      tags: prompt.tags ? JSON.parse(prompt.tags) : [],
      versions: prompt.versions.map(version => ({
        ...version,
        metadata: version.metadata ? JSON.parse(version.metadata) : null,
      })),
    };

    return NextResponse.json(promptWithParsedData);
  } catch (error) {
    console.error('Error fetching prompt:', error);
    return NextResponse.json(
      { error: 'Failed to fetch prompt' },
      { status: 500 }
    );
  }
}

// PUT /api/prompts/[id] - Update a prompt
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body: UpdatePromptRequest = await request.json();
    const { name, description, tags } = body;

    const prompt = await prisma.prompt.update({
      where: { id: params.id },
      data: {
        name,
        description,
        tags: tags ? JSON.stringify(tags) : undefined,
      },
      include: {
        versions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
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

    return NextResponse.json(promptWithParsedData);
  } catch (error: any) {
    console.error('Error updating prompt:', error);

    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Prompt not found' },
        { status: 404 }
      );
    }

    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A prompt with this name already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update prompt' },
      { status: 500 }
    );
  }
}

// DELETE /api/prompts/[id] - Delete a prompt
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.prompt.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: 'Prompt deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting prompt:', error);

    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Prompt not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to delete prompt' },
      { status: 500 }
    );
  }
}