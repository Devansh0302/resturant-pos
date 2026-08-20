import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/orders/[id]/kot - Generate KOT ticket
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        order_items: {
          where: { status: 'PENDING' },
          include: { menu_item: { select: { name: true, food_type: true } } },
        },
        table: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const pendingItems = order.order_items;
    if (pendingItems.length === 0) {
      return NextResponse.json({ message: 'No pending items for KOT' }, { status: 200 });
    }

    // Count existing KOTs for this order
    const kotCount = await prisma.kOTTicket.count({ where: { order_id: id } });
    const kot_number = `KOT-${(kotCount + 1).toString().padStart(2, '0')}`;

    // Create KOT ticket
    const kot = await prisma.kOTTicket.create({
      data: {
        order_id: id,
        kot_number,
        items: JSON.stringify(pendingItems.map(item => ({
          name: item.menu_item.name,
          quantity: item.quantity,
          food_type: item.menu_item.food_type,
          notes: item.notes,
        }))),
      },
    });

    // Update item statuses to IN_KITCHEN
    await prisma.orderItem.updateMany({
      where: { order_id: id, status: 'PENDING' },
      data: { status: 'IN_KITCHEN' },
    });

    // Clear KOT requested flag
    await prisma.order.update({
      where: { id },
      data: { kot_requested: false }
    });

    // --- INVENTORY DEDUCTION LOGIC ---
    try {
      // For each pending item, find recipes and deduct raw materials
      for (const item of pendingItems) {
        const recipes = await prisma.recipe.findMany({
          where: { menu_item_id: item.menu_item_id },
        });

        for (const recipe of recipes) {
          const totalDeduction = recipe.quantity_needed * item.quantity;
          
          const material = await prisma.rawMaterial.findUnique({
            where: { id: recipe.raw_material_id }
          });

          if (material) {
            const newStock = material.current_stock - totalDeduction;
            
            await prisma.rawMaterial.update({
              where: { id: material.id },
              data: { current_stock: newStock }
            });

            await prisma.inventoryLog.create({
              data: {
                raw_material_id: material.id,
                action: 'ORDER_CONSUMPTION',
                quantity: totalDeduction,
                previous_stock: material.current_stock,
                new_stock: newStock,
                notes: `Consumed by KOT ${kot_number} (Order ${id})`,
                performed_by: 'SYSTEM',
              }
            });

            // If stock hits 0 or below, auto-disable dependent menu items
            if (newStock <= 0) {
              const dependentRecipes = await prisma.recipe.findMany({
                where: { raw_material_id: material.id }
              });
              
              const menuItemIds = dependentRecipes.map(r => r.menu_item_id);
              
              if (menuItemIds.length > 0) {
                await prisma.menuItem.updateMany({
                  where: { id: { in: menuItemIds } },
                  data: { is_available: false }
                });
              }
            }
          }
        }
      }
    } catch (invError) {
      console.error('Inventory deduction failed:', invError);
      // We don't throw here to avoid failing the KOT generation if inventory is misconfigured
    }
    // --- END INVENTORY DEDUCTION ---

    return NextResponse.json({ kot, table: order.table?.table_number || (order.order_type === 'TAKEAWAY' ? 'Takeaway' : 'Online') });
  } catch (error) {
    console.error('POST /api/orders/[id]/kot error:', error);
    return NextResponse.json({ error: 'Failed to generate KOT' }, { status: 500 });
  }
}
