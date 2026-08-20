import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !(session.user as any).restaurantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await req.json();
    const { action, amount, notes } = body; // action: "ADD", "DEDUCT", "SET"

    if (!action || amount === undefined) {
      return NextResponse.json({ error: 'Action and amount are required' }, { status: 400 });
    }

    const { id } = await params;

    const material = await prisma.rawMaterial.findUnique({
      where: { id: id }
    });

    if (!material) {
      return NextResponse.json({ error: 'Raw material not found' }, { status: 404 });
    }

    let newStock = material.current_stock;
    const numAmount = Number(amount);

    if (action === 'ADD') newStock += numAmount;
    else if (action === 'DEDUCT') newStock -= numAmount;
    else if (action === 'SET') newStock = numAmount;
    
    // Prevent negative stock for manual adjustments (optional, but good practice)
    if (newStock < 0) newStock = 0;

    const updated = await prisma.$transaction(async (tx) => {
      const updatedMaterial = await tx.rawMaterial.update({
        where: { id: id },
        data: { current_stock: newStock },
      });

      await tx.inventoryLog.create({
        data: {
          raw_material_id: id,
          action,
          quantity: numAmount,
          previous_stock: material.current_stock,
          new_stock: newStock,
          notes,
          performed_by: session.user.id,
        },
      });

      return updatedMaterial;
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('PUT /api/inventory/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update stock' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !(session.user as any).restaurantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Soft delete by setting is_active to false to preserve history
    const material = await prisma.rawMaterial.update({
      where: { id: id },
      data: { is_active: false },
    });

    return NextResponse.json(material);
  } catch (error) {
    console.error('DELETE /api/inventory/[id] error:', error);
    return NextResponse.json({ error: 'Failed to delete material' }, { status: 500 });
  }
}
