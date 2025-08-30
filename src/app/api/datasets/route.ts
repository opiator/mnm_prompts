import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { CreateDatasetRequest } from '@/types';

// GET /api/datasets - List all datasets
export async function GET() {
  try {
    const datasets = await prisma.dataset.findMany({
      include: {
        _count: {
          select: { items: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const datasetsWithParsedData = datasets.map(dataset => ({
      ...dataset,
      tags: dataset.tags ? JSON.parse(dataset.tags) : [],
      itemCount: dataset._count.items,
    }));

    return NextResponse.json(datasetsWithParsedData);
  } catch (error) {
    console.error('Error fetching datasets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch datasets' },
      { status: 500 }
    );
  }
}

// POST /api/datasets - Create a new dataset
export async function POST(request: Request) {
  try {
    const body: CreateDatasetRequest = await request.json();
    const { name, description, tags } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const dataset = await prisma.dataset.create({
      data: {
        name,
        description,
        tags: tags ? JSON.stringify(tags) : null,
      },
      include: {
        _count: {
          select: { items: true },
        },
      },
    });

    const datasetWithParsedData = {
      ...dataset,
      tags: dataset.tags ? JSON.parse(dataset.tags) : [],
      itemCount: dataset._count.items,
    };

    return NextResponse.json(datasetWithParsedData, { status: 201 });
  } catch (error: any) {
    console.error('Error creating dataset:', error);

    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A dataset with this name already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create dataset' },
      { status: 500 }
    );
  }
}