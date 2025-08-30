import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { CreatePromptVersionRequest } from '@/types';

// GET /api/prompts/[id]/versions - Get all versions of a prompt
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const versions = await prisma.promptVersion.findMany({
      where: { promptId: params.id },
      orderBy: { createdAt: 'desc' },
    });

    const versionsWithParsedData = versions.map(version => ({
      ...version,
      metadata: version.metadata ? JSON.parse(version.metadata) : null,
    }));

    return NextResponse.json(versionsWithParsedData);
  } catch (error) {
    console.error('Error fetching prompt versions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch prompt versions' },
      { status: 500 }
    );
  }
}

// POST /api/prompts/[id]/versions - Create a new version of a prompt
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body: CreatePromptVersionRequest = await request.json();
    const { template, changeDescription, metadata } = body;

    if (!template) {
      return NextResponse.json(
        { error: 'Template is required' },
        { status: 400 }
      );
    }

    // Check if prompt exists
    const prompt = await prisma.prompt.findUnique({
      where: { id: params.id },
    });

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt not found' },
        { status: 404 }
      );
    }

    // Generate commit hash (simplified)
    const commit = Math.random().toString(36).substring(2, 9);

    const version = await prisma.promptVersion.create({
      data: {
        promptId: params.id,
        template,
        commit,
        changeDescription,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });

    // Update prompt's updatedAt
    await prisma.prompt.update({
      where: { id: params.id },
      data: { updatedAt: new Date() },
    });

    const versionWithParsedData = {
      ...version,
      metadata: version.metadata ? JSON.parse(version.metadata) : null,
    };

    return NextResponse.json(versionWithParsedData, { status: 201 });
  } catch (error: any) {
    console.error('Error creating prompt version:', error);

    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A version with this commit already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create prompt version' },
      { status: 500 }
    );
  }
}