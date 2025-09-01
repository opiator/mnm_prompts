import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { CreateDatasetItemRequest } from '@/types';

// GET /api/datasets/[id]/items - Get all items in a dataset
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const items = await prisma.datasetItem.findMany({
      where: { datasetId: id },
      orderBy: { createdAt: 'desc' },
    });

    const itemsWithParsedData = items.map(item => ({
      ...item,
      data: JSON.parse(item.data),
    }));

    return NextResponse.json(itemsWithParsedData);
  } catch (error) {
    console.error('Error fetching dataset items:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dataset items' },
      { status: 500 }
    );
  }
}

// POST /api/datasets/[id]/items - Add an item to a dataset
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body: CreateDatasetItemRequest = await request.json();
    const { data } = body;

    if (!data) {
      return NextResponse.json(
        { error: 'Data is required' },
        { status: 400 }
      );
    }

    // Check if dataset exists
    const dataset = await prisma.dataset.findUnique({
      where: { id },
    });

    if (!dataset) {
      return NextResponse.json(
        { error: 'Dataset not found' },
        { status: 404 }
      );
    }

    const item = await prisma.datasetItem.create({
      data: {
        datasetId: id,
        data: JSON.stringify(data),
      },
    });

    // Update dataset's updatedAt
    await prisma.dataset.update({
      where: { id },
      data: { updatedAt: new Date() },
    });

    const itemWithParsedData = {
      ...item,
      data: JSON.parse(item.data),
    };

    return NextResponse.json(itemWithParsedData, { status: 201 });
  } catch (error) {
    console.error('Error creating dataset item:', error);
    return NextResponse.json(
      { error: 'Failed to create dataset item' },
      { status: 500 }
    );
  }
}