import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { CreatePromptVersionRequest } from '@/types';

// GET /api/prompts/[id]/versions - Get all versions of a prompt
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const versions = await prisma.promptVersion.findMany({
      where: { promptId: id },
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body: CreatePromptVersionRequest = await request.json();
    const { template, changeDescription, metadata, responseSchema } = body;

    if (!template) {
      return NextResponse.json(
        { error: 'Template is required' },
        { status: 400 }
      );
    }

    // Check if prompt exists
    const prompt = await prisma.prompt.findUnique({
      where: { id },
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
        promptId: id,
        template,
        commit,
        changeDescription,
        metadata: metadata ? JSON.stringify(metadata) : null,
        responseSchema,
      },
    });

    // Update prompt's updatedAt
    await prisma.prompt.update({
      where: { id },
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

// DELETE /api/prompts/[id]/versions - Delete a specific version
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const url = new URL(request.url);
    const versionId = url.searchParams.get('versionId');

    if (!versionId) {
      return NextResponse.json(
        { error: 'Version ID is required' },
        { status: 400 }
      );
    }

    // First check if the prompt exists
    const prompt = await prisma.prompt.findUnique({
      where: { id },
    });

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt not found' },
        { status: 404 }
      );
    }

    // Check if this is the only version (we don't want to delete the last version)
    const versionCount = await prisma.promptVersion.count({
      where: { promptId: id },
    });

    if (versionCount <= 1) {
      return NextResponse.json(
        { error: 'Cannot delete the last version of a prompt' },
        { status: 400 }
      );
    }

    // Delete the specific version
    await prisma.promptVersion.delete({
      where: { 
        id: versionId,
        promptId: id 
      },
    });

    // Update prompt's updatedAt
    await prisma.prompt.update({
      where: { id },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({ message: 'Version deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting prompt version:', error);

    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Version not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to delete prompt version' },
      { status: 500 }
    );
  }
}