import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const menuItemId = searchParams.get('menu_item_id');

    if (!menuItemId) {
      return NextResponse.json({ error: 'menu_item_id is required' }, { status: 400 });
    }

    const recipes = await prisma.recipe.findMany({
      where: { menu_item_id: menuItemId },
      include: { raw_material: true },
    });

    return NextResponse.json(recipes);
  } catch (error) {
    console.error('GET /api/recipes error:', error);
    return NextResponse.json({ error: 'Failed to fetch recipes' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { menu_item_id, ingredients } = body; // ingredients: [{ raw_material_id, quantity_needed }]

    if (!menu_item_id || !Array.isArray(ingredients)) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
    }

    // Wrap in a transaction to replace the old recipe entirely
    const updatedRecipes = await prisma.$transaction(async (tx) => {
      // 1. Delete all existing recipes for this menu item
      await tx.recipe.deleteMany({
        where: { menu_item_id },
      });

      // 2. Create the new recipe links
      if (ingredients.length > 0) {
        await tx.recipe.createMany({
          data: ingredients.map((ing: any) => ({
            menu_item_id,
            raw_material_id: ing.raw_material_id,
            quantity_needed: Number(ing.quantity_needed),
          })),
        });
      }

      // 3. Return the new recipes
      return tx.recipe.findMany({
        where: { menu_item_id },
        include: { raw_material: true },
      });
    });

    return NextResponse.json(updatedRecipes);
  } catch (error) {
    console.error('POST /api/recipes error:', error);
    return NextResponse.json({ error: 'Failed to update recipes' }, { status: 500 });
  }
}
