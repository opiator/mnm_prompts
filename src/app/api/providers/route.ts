import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { CreateProviderKeyRequest } from '@/types';

// GET /api/providers - List all provider keys
export async function GET() {
  try {
    const providers = await prisma.providerKey.findMany({
      select: {
        id: true,
        provider: true,
        name: true,
        baseUrl: true,
        createdAt: true,
        // Don't return API keys for security
      },
      orderBy: { createdAt: 'desc' },
    });

    const providersWithParsedData = providers.map(provider => ({
      ...provider,
      headers: {}, // Don't expose headers either
    }));

    return NextResponse.json(providersWithParsedData);
  } catch (error) {
    console.error('Error fetching providers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch providers' },
      { status: 500 }
    );
  }
}

// POST /api/providers - Create or update a provider key
export async function POST(request: Request) {
  try {
    const body: CreateProviderKeyRequest = await request.json();
    const { provider, name, apiKey, baseUrl, headers } = body;

    if (!provider || !apiKey) {
      return NextResponse.json(
        { error: 'Provider and API key are required' },
        { status: 400 }
      );
    }

    const providerKey = await prisma.providerKey.upsert({
      where: { provider },
      update: {
        name,
        apiKey,
        baseUrl,
        headers: headers ? JSON.stringify(headers) : null,
      },
      create: {
        provider,
        name,
        apiKey,
        baseUrl,
        headers: headers ? JSON.stringify(headers) : null,
      },
      select: {
        id: true,
        provider: true,
        name: true,
        baseUrl: true,
        createdAt: true,
      },
    });

    return NextResponse.json(providerKey, { status: 201 });
  } catch (error) {
    console.error('Error creating/updating provider:', error);
    return NextResponse.json(
      { error: 'Failed to create/update provider' },
      { status: 500 }
    );
  }
}