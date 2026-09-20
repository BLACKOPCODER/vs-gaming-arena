import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdminAuthenticated } from '@/lib/admin-auth';

const IST = '+05:30';

export async function GET(request: NextRequest) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date') || new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const dayStart = new Date(`${date}T00:00:00${IST}`);
  const dayEnd = new Date(`${date}T23:59:59${IST}`);
  const now = new Date();
  const [bookings, stations] = await Promise.all([
    prisma.booking.findMany({ where: { startAt: { lt: dayEnd }, endAt: { gt: dayStart } }, include: { station: true, customer: true }, orderBy: { startAt: 'asc' } }),
    prisma.station.findMany({ where: { active: true }, orderBy: { code: 'asc' } }),
  ]);
  const valid = bookings.filter(b => !['CANCELLED', 'NO_SHOW'].includes(b.status));
  const completed = bookings.filter(b => b.status === 'COMPLETED');
  const playing = bookings.filter(b => b.status === 'CONFIRMED' && b.startAt <= now && b.endAt > now);
  const upcoming = bookings.filter(b => !['CANCELLED', 'NO_SHOW'].includes(b.status) && b.endAt > now).slice(0, 8);
  const customers = new Set(bookings.map(b => b.customer.phone));
  const hourly = Array.from({ length: 13 }, (_, i) => {
    const hour = i + 10;
    const start = new Date(`${date}T${String(hour).padStart(2, '0')}:00:00${IST}`);
    const end = new Date(start.getTime() + 60 * 60000);
    const count = valid.filter(b => b.startAt < end && b.endAt > start).length;
    return { hour, label: new Date(start).toLocaleTimeString('en-IN', { hour: 'numeric', hour12: true, timeZone: 'Asia/Kolkata' }), count };
  });
  const stationStats = stations.map(station => {
    const list = valid.filter(b => b.stationId === station.id);
    return { code: station.code, name: station.name, rate: station.rate, bookings: list.length, revenue: list.reduce((s, b) => s + b.total, 0), playing: playing.some(b => b.stationId === station.id) };
  });
  return NextResponse.json({ date, metrics: { bookings: bookings.length, sales: valid.reduce((s, b) => s + b.total, 0), collected: valid.reduce((s, b) => s + b.paidAmount, 0), outstanding: valid.reduce((s, b) => s + Math.max(0, b.total - b.paidAmount), 0), advancePending: valid.filter(b => b.paymentStatus === 'PENDING').reduce((s, b) => s + b.advanceAmount, 0), completed: completed.length, playing: playing.length, customers: customers.size }, stations: stationStats, upcoming: upcoming.map(b => ({ id: b.id, bookingNo: b.bookingNo, customer: b.customer.name, station: b.station.code, startAt: b.startAt, endAt: b.endAt, status: b.status, total: b.total, paidAmount: b.paidAmount })), hourly });
}
