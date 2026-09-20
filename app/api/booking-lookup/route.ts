import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const bookingNo = String(searchParams.get('bookingNo') ?? '').trim().toUpperCase();
  const phone = String(searchParams.get('phone') ?? '').replace(/\s+/g, '');
  if (!bookingNo && !phone) return NextResponse.json({ error: 'Enter a booking ID or phone number.' }, { status: 400 });

  const booking = await prisma.booking.findFirst({
    where: bookingNo ? { bookingNo } : { customer: { phone } },
    include: { station: true, customer: true },
    orderBy: { startAt: 'desc' },
  });
  if (!booking) return NextResponse.json({ error: 'No booking found.' }, { status: 404 });

  return NextResponse.json({
    bookingNo: booking.bookingNo,
    status: booking.status,
    paymentStatus: booking.paymentStatus,
    customer: booking.customer,
    station: booking.station,
    startAt: booking.startAt,
    endAt: booking.endAt,
    durationMinutes: booking.durationMinutes,
    total: booking.total,
    advanceAmount: booking.advanceAmount,
    paidAmount: booking.paidAmount,
    balance: Math.max(booking.total - booking.paidAmount, 0),
  });
}
