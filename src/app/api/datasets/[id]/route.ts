import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { CreateDatasetRequest } from '@/types';

// GET /api/datasets/[id] - Get a specific dataset
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const dataset = await prisma.dataset.findUnique({
      where: { id: params.id },
      include: {
        items: {
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: { items: true },
        },
      },
    });

    if (!dataset) {
      return NextResponse.json(
        { error: 'Dataset not found' },
        { status: 404 }
      );
    }

    const datasetWithParsedData = {
      ...dataset,
      tags: dataset.tags ? JSON.parse(dataset.tags) : [],
      items: dataset.items.map(item => ({
        ...item,
        data: JSON.parse(item.data),
      })),
      itemCount: dataset._count.items,
    };

    return NextResponse.json(datasetWithParsedData);
  } catch (error) {
    console.error('Error fetching dataset:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dataset' },
      { status: 500 }
    );
  }
}

// PUT /api/datasets/[id] - Update a dataset
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body: CreateDatasetRequest = await request.json();
    const { name, description, tags } = body;

    const dataset = await prisma.dataset.update({
      where: { id: params.id },
      data: {
        name,
        description,
        tags: tags ? JSON.stringify(tags) : undefined,
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

    return NextResponse.json(datasetWithParsedData);
  } catch (error: any) {
    console.error('Error updating dataset:', error);

    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Dataset not found' },
        { status: 404 }
      );
    }

    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A dataset with this name already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update dataset' },
      { status: 500 }
    );
  }
}

// DELETE /api/datasets/[id] - Delete a dataset
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.dataset.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: 'Dataset deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting dataset:', error);

    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Dataset not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to delete dataset' },
      { status: 500 }
    );
  }
}