import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const stations = await prisma.station.findMany({ where: { active: true }, orderBy: { code: 'asc' } });
  return NextResponse.json(stations);
}
