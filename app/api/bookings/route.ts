import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

function isValidPhone(phone: string) {
  return /^[6-9]\d{9}$/.test(phone.replace(/\s+/g, ''));
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  const stationCode = searchParams.get('station');
  if (!date) return NextResponse.json({ error: 'date is required' }, { status: 400 });

  const dayStart = new Date(`${date}T00:00:00+05:30`);
  const dayEnd = new Date(`${date}T23:59:59+05:30`);
  const bookings = await prisma.booking.findMany({
    where: {
      ...(stationCode ? { station: { code: stationCode } } : {}),
      status: { in: ['PENDING', 'CONFIRMED'] },
      startAt: { lt: dayEnd },
      endAt: { gt: dayStart },
    },
    include: { station: true },
    orderBy: { startAt: 'asc' },
  });
  return NextResponse.json(bookings);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = String(body.name ?? '').trim();
    const phone = String(body.phone ?? '').replace(/\s+/g, '');
    const stationCode = String(body.stationCode ?? '').trim();
    const date = String(body.date ?? '').trim();
    const time = String(body.time ?? '').trim();
    const durationMinutes = Number(body.durationMinutes ?? (Number(body.duration) * 60));

    if (!name || !isValidPhone(phone) || !stationCode || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time) || !Number.isInteger(durationMinutes) || durationMinutes < 30 || durationMinutes > 240 || durationMinutes % 30 !== 0) {
      return NextResponse.json({ error: 'Please provide valid name, Indian mobile number, date, time, station and a duration from 30 minutes to 4 hours.' }, { status: 400 });
    }

    const startAt = new Date(`${date}T${time}:00+05:30`);
    if (Number.isNaN(startAt.getTime())) return NextResponse.json({ error: 'Invalid date or time.' }, { status: 400 });
    const endAt = new Date(startAt.getTime() + durationMinutes * 60 * 1000);
    const closingTime = new Date(`${date}T23:00:00+05:30`);
    if (endAt.getTime() > closingTime.getTime()) return NextResponse.json({ error: 'This session would run past closing time. Please choose an earlier start time.' }, { status: 400 });
    if (startAt.getTime() < Date.now() - 60_000) return NextResponse.json({ error: 'Booking time cannot be in the past.' }, { status: 400 });

    const result = await prisma.$transaction(async (tx) => {
      const station = await tx.station.findUnique({ where: { code: stationCode } });
      if (!station || !station.active) throw new Error('STATION_NOT_FOUND');

      const conflict = await tx.booking.findFirst({
        where: {
          stationId: station.id,
          status: { in: ['PENDING', 'CONFIRMED'] },
          startAt: { lt: endAt },
          endAt: { gt: startAt },
        },
      });
      if (conflict) throw new Error('TIME_UNAVAILABLE');

      const customer = await tx.customer.upsert({
        where: { phone },
        update: { name },
        create: { name, phone },
      });

      const total = Math.round((station.rate * durationMinutes) / 60);
      const advanceAmount = Math.ceil(total * 0.5);
      const booking = await tx.booking.create({
        data: {
          bookingNo: `VS-${Date.now().toString().slice(-8)}`,
          customerId: customer.id,
          stationId: station.id,
          startAt,
          endAt,
          duration: Math.ceil(durationMinutes / 60),
          durationMinutes,
          rate: station.rate,
          total,
          advanceAmount,
          paidAmount: 0,
          paymentStatus: 'PENDING',
          status: 'PENDING',
        },
        include: { station: true, customer: true },
      });
      return booking;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'TIME_UNAVAILABLE') return NextResponse.json({ error: 'That station is already booked for the selected time.' }, { status: 409 });
    if (error instanceof Error && error.message === 'STATION_NOT_FOUND') return NextResponse.json({ error: 'Selected station was not found or is inactive.' }, { status: 404 });
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') return NextResponse.json({ error: 'Another booking was created at the same time. Please try again.' }, { status: 409 });
    console.error(error);
    return NextResponse.json({ error: 'Unable to create booking. Check your database connection.' }, { status: 500 });
  }
}
