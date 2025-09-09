import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/prompts/[id]/versions/[versionId] - Get a specific version of a prompt
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  try {
    const { id, versionId } = await params;
    
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

    // Get the specific version
    const version = await prisma.promptVersion.findFirst({
      where: { 
        id: versionId,
        promptId: id 
      },
    });

    if (!version) {
      return NextResponse.json(
        { error: 'Version not found' },
        { status: 404 }
      );
    }

    const versionWithParsedData = {
      ...version,
      metadata: version.metadata ? JSON.parse(version.metadata) : null,
    };

    return NextResponse.json(versionWithParsedData);
  } catch (error) {
    console.error('Error fetching prompt version:', error);
    return NextResponse.json(
      { error: 'Failed to fetch prompt version' },
      { status: 500 }
    );
  }
}

