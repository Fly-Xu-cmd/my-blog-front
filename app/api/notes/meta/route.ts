import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkAuth } from '../auth';

export async function GET() {
  const isAuthorized = await checkAuth();
  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const categories = await prisma.category.findMany({
      select: { id: true, name: true }
    });
    
    const tags = await prisma.tag.findMany({
      select: { id: true, name: true }
    });

    const notes = await prisma.note.findMany({
      select: { syncId: true }
    });

    return NextResponse.json({
      categories,
      tags,
      serverSyncIds: notes.map((n) => n.syncId)
    }, { status: 200 });
  } catch (error) {
    console.error('Failed to fetch metadata:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
