import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// DELETE /api/datasets/[id]/items/[itemId] - Delete a dataset item
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { id, itemId } = await params;
    
    await prisma.datasetItem.delete({
      where: {
        id: itemId,
        datasetId: id,
      },
    });

    // Update dataset's updatedAt
    await prisma.dataset.update({
      where: { id },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({ message: 'Dataset item deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting dataset item:', error);

    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Dataset item not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to delete dataset item' },
      { status: 500 }
    );
  }
}

// PUT /api/datasets/[id]/items/[itemId] - Update a dataset item
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { id, itemId } = await params;
    const { data } = await request.json();

    if (!data) {
      return NextResponse.json(
        { error: 'Data is required' },
        { status: 400 }
      );
    }

    const item = await prisma.datasetItem.update({
      where: {
        id: itemId,
        datasetId: id,
      },
      data: {
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

    return NextResponse.json(itemWithParsedData);
  } catch (error: any) {
    console.error('Error updating dataset item:', error);

    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Dataset item not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update dataset item' },
      { status: 500 }
    );
  }
}