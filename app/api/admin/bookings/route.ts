import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdminAuthenticated } from '@/lib/admin-auth';

const bookingStatuses = ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW'] as const;
const paymentStatuses = ['PENDING', 'ADVANCE_PAID', 'FULLY_PAID', 'REFUNDED'] as const;
const IST = '+05:30';

export async function GET(request: NextRequest) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date'); const from = searchParams.get('from'); const to = searchParams.get('to');
  const stationCode = searchParams.get('station'); const status = searchParams.get('status'); const paymentStatus = searchParams.get('paymentStatus'); const q = String(searchParams.get('q') ?? '').trim();
  const where: any = {};
  if (date) { where.startAt = { lt: new Date(`${date}T23:59:59${IST}`) }; where.endAt = { gt: new Date(`${date}T00:00:00${IST}`) }; }
  else if (from || to) { where.startAt = {}; where.endAt = {}; if(from) where.startAt.lt = new Date(`${from}T00:00:00${IST}`); if(to) where.endAt.gt = new Date(`${to}T23:59:59${IST}`); }
  if (stationCode) where.station = { code: stationCode };
  if (status && bookingStatuses.includes(status as any)) where.status = status;
  if (paymentStatus && paymentStatuses.includes(paymentStatus as any)) where.paymentStatus = paymentStatus;
  if(q){ where.OR = [{ bookingNo:{contains:q,mode:'insensitive'} },{customer:{name:{contains:q,mode:'insensitive'}}},{customer:{phone:{contains:q}}}]; }
  const bookings = await prisma.booking.findMany({where,include:{station:true,customer:true},orderBy:{startAt:'asc'},take:1000});
  return NextResponse.json(bookings);
}

export async function PATCH(request: NextRequest) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  try {
    const body = await request.json(); const bookingId = String(body.id ?? '').trim();
    const status = body.status ? String(body.status).trim() : ''; const paymentStatus = body.paymentStatus ? String(body.paymentStatus).trim() : '';
    if(!bookingId) return NextResponse.json({error:'Booking ID is required.'},{status:400});
    if(status && !bookingStatuses.includes(status as any)) return NextResponse.json({error:'Invalid booking status.'},{status:400});
    if(paymentStatus && !paymentStatuses.includes(paymentStatus as any)) return NextResponse.json({error:'Invalid payment status.'},{status:400});
    const existing = await prisma.booking.findUnique({where:{id:bookingId},include:{station:true,customer:true}});
    if(!existing) return NextResponse.json({error:'Booking not found.'},{status:404});
    const data:any={}; if(status) data.status=status;
    if(paymentStatus==='ADVANCE_PAID'){data.paymentStatus='ADVANCE_PAID';data.paidAmount=existing.advanceAmount;if(!status&&existing.status==='PENDING')data.status='CONFIRMED';}
    else if(paymentStatus==='FULLY_PAID'){data.paymentStatus='FULLY_PAID';data.paidAmount=existing.total;if(!status&&existing.status==='PENDING')data.status='CONFIRMED';}
    else if(paymentStatus==='REFUNDED'){data.paymentStatus='REFUNDED';data.paidAmount=0;}
    else if(paymentStatus==='PENDING'){data.paymentStatus='PENDING';data.paidAmount=0;if(!status&&existing.status==='CONFIRMED')data.status='PENDING';}

    const reschedule = body.reschedule;
    if(reschedule){
      const stationCode=String(reschedule.stationCode??existing.station.code); const date=String(reschedule.date??''); const time=String(reschedule.time??''); const durationMinutes=Number(reschedule.durationMinutes??existing.durationMinutes);
      if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!/^\d{2}:\d{2}$/.test(time)||!Number.isInteger(durationMinutes)||durationMinutes<30||durationMinutes>240||durationMinutes%30!==0) return NextResponse.json({error:'Invalid reschedule details.'},{status:400});
      const startAt=new Date(`${date}T${time}:00${IST}`); const endAt=new Date(startAt.getTime()+durationMinutes*60000); const closing=new Date(`${date}T23:00:00${IST}`);
      if(endAt>closing) return NextResponse.json({error:'New session must finish by 11:00 PM.'},{status:400}); if(startAt.getTime()<Date.now()-60000) return NextResponse.json({error:'New time cannot be in the past.'},{status:400});
      const station=await prisma.station.findUnique({where:{code:stationCode}}); if(!station||!station.active)return NextResponse.json({error:'Station not found or inactive.'},{status:404});
      const conflict=await prisma.booking.findFirst({where:{id:{not:existing.id},stationId:station.id,status:{in:['PENDING','CONFIRMED']},startAt:{lt:endAt},endAt:{gt:startAt}}}); if(conflict)return NextResponse.json({error:'That station is already booked for the new time.'},{status:409});
      data.stationId=station.id; data.startAt=startAt; data.endAt=endAt; data.durationMinutes=durationMinutes; data.duration=Math.ceil(durationMinutes/60); data.rate=station.rate; data.total=Math.round(station.rate*durationMinutes/60); data.advanceAmount=Math.ceil(data.total*0.5);
      if(existing.paymentStatus==='ADVANCE_PAID') data.paidAmount=Math.min(existing.paidAmount,data.total); else if(existing.paymentStatus==='FULLY_PAID') data.paidAmount=data.total;
    }
    if(!status&&!paymentStatus&&!reschedule) return NextResponse.json({error:'No update was requested.'},{status:400});
    const booking=await prisma.booking.update({where:{id:bookingId},data,include:{station:true,customer:true}}); return NextResponse.json(booking);
  } catch(error){console.error(error);return NextResponse.json({error:'Booking could not be updated.'},{status:400});}
}
