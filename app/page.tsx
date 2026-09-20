'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, CalendarDays, CheckCircle2, Clock3, Gamepad2, MapPin, MessageCircle, Phone, ShieldCheck, Trophy, Users, Zap } from 'lucide-react';

const stations = [
  { id: 'VS-01', title: '43" + Steering', rate: 200, tag: 'RACING', desc: 'Wheel-ready setup for racing and simulator sessions.', hardware: 'PS4 Pro + Steering Wheel' },
  { id: 'VS-02', title: '55" Gaming Station', rate: 150, tag: 'MULTIPLAYER', desc: 'Big-screen PS5 setup for competitive and multiplayer sessions.', hardware: 'PS5 + 55" Display' },
  { id: 'VS-03', title: '75" Giant Screen', rate: 200, tag: 'PREMIUM', desc: 'Premium large-screen setup for football, WWE and squad battles.', hardware: 'PS5 + 75" Display' },
];

const games = [
  ['GTA V', 'Open-world chaos, squad challenges and free-roam sessions.'],
  ['EA SPORTS FC', 'Football rivalries, local multiplayer and tournament battles.'],
  ['WWE 2K26', 'Build your dream matchups and settle the rivalry in the ring.'],
  ['Cricket 26', 'Fast-paced cricket sessions for solo and multiplayer battles.'],
  ['Racing & Simulator', 'Wheel-ready racing sessions built around VS-01.'],
  ['More multiplayer games', 'Ask at the arena for the latest multiplayer and party options.'],
];

const openMinutes = 10 * 60;
const closeMinutes = 23 * 60;

function todayIndia() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
}

function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m} min`;
  if (!m) return `${h} hr${h > 1 ? 's' : ''}`;
  return `${h} hr ${m} min`;
}

function formatTime(slot: string) {
  if (!slot || !slot.includes(':')) return 'Invalid time';
  const [h, m] = slot.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return 'Invalid time';
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${suffix}`;
}

function addMinutesToTime(slot: string, durationMinutes: number) {
  if (!slot || !slot.includes(':')) return '';
  const [h, m] = slot.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return '';
  const total = h * 60 + m + durationMinutes;
  const endHour = Math.floor(total / 60) % 24;
  const endMinute = total % 60;
  return `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;
}

export default function Home() {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [station, setStation] = useState('VS-01');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState('');
  const [bookingNo, setBookingNo] = useState('');
  const [bookingDetails, setBookingDetails] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [availabilityError, setAvailabilityError] = useState('');

  const selected = stations.find(s => s.id === station)!;
  const total = Math.round((selected.rate * durationMinutes) / 60);
  const advanceAmount = Math.ceil(total * 0.5);
  const minDate = todayIndia();

  const timeSlots = useMemo(() => {
    const slots: string[] = [];
    for (let mins = openMinutes; mins <= closeMinutes - 30; mins += 30) {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
    return slots;
  }, []);

  const stationBookings = useMemo(() => bookings.filter(b => b.station?.code === station), [bookings, station]);

  const isSlotAvailable = (slot: string) => {
    if (!date) return false;
    const start = new Date(`${date}T${slot}:00+05:30`);
    const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
    const closing = new Date(`${date}T23:00:00+05:30`);
    if (start.getTime() < Date.now() - 60000) return false;
    if (end.getTime() > closing.getTime()) return false;
    return !stationBookings.some(b => new Date(b.startAt).getTime() < end.getTime() && new Date(b.endAt).getTime() > start.getTime());
  };

  useEffect(() => {
    if (!date) { setBookings([]); setTime(''); return; }
    let cancelled = false;
    setLoadingAvailability(true);
    setAvailabilityError('');
    fetch(`/api/bookings?date=${encodeURIComponent(date)}`)
      .then(r => r.ok ? r.json() : Promise.reject(new Error('Could not load availability.')))
      .then(data => { if (!cancelled) setBookings(data); })
      .catch(e => { if (!cancelled) { setBookings([]); setAvailabilityError(e instanceof Error ? e.message : 'Could not load availability.'); } })
      .finally(() => { if (!cancelled) setLoadingAvailability(false); });
    return () => { cancelled = true; };
  }, [date]);

  useEffect(() => { if (time && !isSlotAvailable(time)) setTime(''); }, [station, durationMinutes, bookings, date]);

  async function submitBooking() {
    setStatus(''); setBookingNo(''); setBookingDetails(null); setSubmitting(true);
    try {
      const res = await fetch('/api/bookings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, phone, stationCode: station, date, time, durationMinutes }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Booking failed');
      setBookingNo(data.bookingNo);
      setBookingDetails(data);
      setStatus(`Booking request received for ${data.customer.name}. Please pay the 50% advance of ₹${Math.ceil(data.total * 0.5)} to confirm your booking.`);
      const refresh = await fetch(`/api/bookings?date=${encodeURIComponent(date)}`);
      if (refresh.ok) setBookings(await refresh.json());
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Booking failed.');
    } finally { setSubmitting(false); }
  }

  const canBook = Boolean(name.trim() && /^[6-9]\d{9}$/.test(phone) && date && time && isSlotAvailable(time) && !submitting);
  const whatsappText = bookingDetails
    ? encodeURIComponent(
        `Hello VS GAMING ARENA! My booking is confirmed.\n\n` +
        `Booking ID: ${bookingDetails.bookingNo}\n` +
        `Player: ${bookingDetails.customer.name}\n` +
        `Station: ${bookingDetails.station.name}\n` +
        `Date: ${date}\n` +
        `Time: ${formatTime(time)}\n` +
        `Duration: ${formatDuration(durationMinutes)}\n` +
        `Total: ₹${bookingDetails.total}\n` +
        `50% Advance: ₹${advanceAmount}\n\n` +
        `I will make the 50% advance payment to secure my booking.`
      )
    : '';

  return <main>
    <nav className="fixed top-0 z-50 w-full border-b border-white/5 bg-[#05070a]/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
        <a href="#home" className="text-xl font-black tracking-tight">VS <span className="text-ice">GAMING ARENA</span></a>
        <div className="hidden gap-7 text-sm font-bold text-slate-300 md:flex"><a href="#games">Games</a><a href="#pricing">Pricing</a><a href="#booking">Book</a><a href="#contact">Contact</a></div>
        <a className="btn btn-primary text-sm" href="#booking">Book Now <ArrowRight className="ml-2 h-4 w-4" /></a>
      </div>
    </nav>

    <section id="home" className="gridbg relative overflow-hidden pt-32">
      <div className="absolute left-1/2 top-10 h-96 w-96 -translate-x-1/2 rounded-full bg-cyan-400/10 blur-3xl" />
      <div className="relative mx-auto grid max-w-7xl gap-12 px-5 pb-24 pt-14 lg:grid-cols-2 lg:items-center">
        <div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/5 px-3 py-2 text-xs font-black tracking-widest text-ice"><Zap className="h-3.5 w-3.5" /> PLAY. COMPETE. DOMINATE.</div>
          <h1 className="max-w-3xl text-5xl font-black leading-[.95] tracking-tight sm:text-7xl">YOUR GAME.<br /><span className="text-ice">YOUR SQUAD.</span><br />YOUR ARENA.</h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-400">A high-energy gaming arena built for competitive matches, racing battles, football rivalries, WWE showdowns and squad gaming.</p>
          <div className="mt-8 flex flex-wrap gap-3"><a href="#booking" className="btn btn-primary">Book a Session <ArrowRight className="ml-2 h-4 w-4" /></a><a href="#pricing" className="btn btn-ghost">View Pricing</a></div>
          <div className="mt-10 grid max-w-lg grid-cols-3 gap-3"><Stat icon={<Gamepad2 />} value="3" label="Gaming Stations" /><Stat icon={<Trophy />} value="3" label="Screen Setups" /><Stat icon={<Users />} value="1–4+" label="Squad Play" /></div>
        </div>
        <div className="glass neon relative min-h-[430px] overflow-hidden rounded-3xl p-5"><div className="absolute inset-0 gridbg opacity-60" /><div className="relative flex h-full flex-col justify-between"><div className="flex justify-between"><span className="rounded-full border border-cyan-300/20 px-3 py-1 text-xs font-bold text-ice">VS // ARENA</span><span className="text-xs font-bold text-slate-500">LIVE BOOKING</span></div><div className="mx-auto w-full max-w-md rounded-2xl border border-cyan-300/20 bg-[#071016]/90 p-5 shadow-2xl"><div className="mb-4 flex items-center justify-between"><div><p className="text-xs font-bold text-slate-500">NEXT SESSION</p><p className="mt-1 text-2xl font-black">READY TO PLAY?</p></div><Gamepad2 className="h-9 w-9 text-ice" /></div><div className="space-y-2">{stations.map(s => <div key={s.id} className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[.03] p-3"><div><p className="text-sm font-black">{s.id} · {s.title}</p><p className="text-xs text-slate-500">{s.hardware}</p></div><span className="text-sm font-black text-ice">₹{s.rate}/hr</span></div>)}</div></div><p className="text-center text-xs font-bold uppercase tracking-[.3em] text-slate-600">ICE BLUE // GAMING MODE // ONLINE</p></div></div>
      </div>
    </section>

    <section id="games" className="mx-auto max-w-7xl px-5 py-24"><SectionTitle eyebrow="CHOOSE YOUR BATTLE" title="GAMES // EXPERIENCES" /><div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{games.map(([g, desc]) => <div key={g} className="glass group rounded-2xl p-6 transition hover:-translate-y-1 hover:border-cyan-300/30"><div className="mb-8 flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-300/10 text-ice"><Gamepad2 /></div><p className="text-lg font-black">{g}</p><p className="mt-2 text-sm leading-6 text-slate-500">{desc}</p><a href="#booking" className="mt-5 inline-block text-xs font-black tracking-widest text-ice opacity-80">BOOK A SESSION →</a></div>)}</div></section>

    <section id="pricing" className="border-y border-white/5 bg-[#070b10] py-24"><div className="mx-auto max-w-7xl px-5"><SectionTitle eyebrow="SELECT YOUR LOADOUT" title="STATION SELECT" /><div className="mt-10 grid gap-5 md:grid-cols-3">{stations.map((s, i) => <div key={s.id} className={`glass rounded-3xl p-7 ${i === 0 ? 'neon' : ''}`}><div className="flex items-start justify-between"><div><p className="text-xs font-black tracking-widest text-ice">{s.id}</p><h3 className="mt-2 text-2xl font-black">{s.title}</h3></div><span className="rounded-full bg-cyan-300/10 px-3 py-1 text-[10px] font-black text-ice">{s.tag}</span></div><p className="mt-2 text-xs font-bold text-slate-600">{s.hardware}</p><p className="mt-4 min-h-12 text-sm leading-6 text-slate-500">{s.desc}</p><div className="mt-7 border-t border-white/5 pt-6"><span className="text-4xl font-black">₹{s.rate}</span><span className="ml-2 text-slate-500">/ hour</span><p className="mt-2 text-xs text-slate-600">30 min: ₹{s.rate / 2} · 90 min: ₹{Math.round(s.rate * 1.5)}</p></div><a href="#booking" onClick={() => setStation(s.id)} className="btn btn-ghost mt-6 w-full">Book this setup</a></div>)}</div><p className="mt-5 text-center text-xs text-slate-600">30-minute slots · Pro-rata billing · Live PostgreSQL availability</p></div></section>

    <section id="booking" className="mx-auto max-w-7xl px-5 py-24"><div className="grid gap-10 lg:grid-cols-[1.1fr_.9fr]">
      <div><SectionTitle eyebrow="MISSION BOOKING" title="LOCK IN YOUR SESSION" /><p className="mt-5 max-w-xl text-slate-400">Choose your station, date, 30-minute start time and session length. Availability is checked live against PostgreSQL before your booking request is created.</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Field label="Name"><input placeholder="Player name" value={name} onChange={e => setName(e.target.value)} /></Field>
          <Field label="Mobile number"><input inputMode="numeric" maxLength={10} placeholder="10-digit mobile" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} /></Field>
          <Field label="Date"><input type="date" value={date} min={minDate} onChange={e => setDate(e.target.value)} /></Field>
          <Field label="Duration"><select value={durationMinutes} onChange={e => setDurationMinutes(Number(e.target.value))}>{[30,60,90,120,150,180,210,240].map(m => <option key={m} value={m}>{formatDuration(m)}</option>)}</select></Field>
          <Field label="Start time"><select value={time} onChange={e => setTime(e.target.value)} disabled={!date || loadingAvailability}><option value="">{!date ? 'Select date first' : loadingAvailability ? 'Checking availability...' : 'Select available time'}</option>{timeSlots.map(slot => <option key={slot} value={slot} disabled={!isSlotAvailable(slot)}>{formatTime(slot)} — {isSlotAvailable(slot) ? 'AVAILABLE' : 'BOOKED'}</option>)}</select></Field>
          <Field label="Station"><select value={station} onChange={e => setStation(e.target.value)}>{stations.map(s => <option key={s.id} value={s.id}>{s.id} — {s.title}</option>)}</select></Field>
        </div>
        <div className="mt-5 rounded-2xl border border-cyan-300/10 bg-cyan-300/[.03] p-4"><div className="flex items-center justify-between"><p className="text-xs font-black tracking-widest text-ice">LIVE AVAILABILITY</p><span className="text-[10px] font-bold text-slate-500">{date ? `${stationBookings.length} booking(s) on selected date` : 'Select a date'}</span></div>{availabilityError && <p className="mt-2 text-xs text-red-300">{availabilityError}</p>}<div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6">{timeSlots.map(slot => <button type="button" key={slot} disabled={!date || !isSlotAvailable(slot)} onClick={() => setTime(slot)} className={`rounded-lg border px-2 py-2 text-[11px] font-black transition ${time === slot ? 'border-cyan-300 bg-cyan-300/15 text-ice' : isSlotAvailable(slot) ? 'border-white/10 bg-white/[.03] text-slate-300 hover:border-cyan-300/30' : 'cursor-not-allowed border-white/5 bg-white/[.01] text-slate-700 line-through'}`}>{formatTime(slot)}</button>)}</div><p className="mt-3 text-[11px] text-slate-600">Greyed-out times are unavailable because of an existing booking, the current time, or the 11 PM closing limit.</p></div>
      </div>
      <div className="glass rounded-3xl p-7"><p className="text-xs font-black tracking-widest text-ice">BOOKING SUMMARY</p><div className="mt-6 space-y-4"><Summary label="Station" value={selected.title} /><Summary label="Date" value={date || 'Select a date'} /><Summary label="Time" value={time ? formatTime(time) : 'Select a time'} /><Summary label="Duration" value={formatDuration(durationMinutes)} /><Summary label="Rate" value={`₹${selected.rate}/hr`} /><div className="my-5 border-t border-white/5" /><div className="flex items-end justify-between"><span className="font-bold text-slate-400">Estimated total</span><span className="text-4xl font-black text-ice">₹{total}</span></div></div><button disabled={!canBook} onClick={submitBooking} className="btn btn-primary mt-7 w-full disabled:cursor-not-allowed disabled:opacity-40">{submitting ? 'Submitting...' : 'Request booking'} <ArrowRight className="ml-2 h-4 w-4" /></button>{status && !bookingNo && <div className="mt-4 rounded-xl border border-red-300/20 bg-red-300/5 p-4 text-sm text-red-200">{status}</div>}<p className="mt-3 text-center text-[11px] leading-5 text-slate-600">Your booking request is written to PostgreSQL. Pay the 50% advance and contact the arena if you need payment confirmation.</p></div>
    </div></section>

    {bookingNo && bookingDetails && <section className="mx-auto max-w-4xl px-5 pb-24"><div className="glass neon rounded-3xl p-7 sm:p-10"><div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-full bg-cyan-300/10 text-ice"><CheckCircle2 /></div><div><p className="text-xs font-black tracking-widest text-ice">BOOKING REQUEST RECEIVED</p><h2 className="mt-1 text-3xl font-black">PAY 50% TO CONFIRM.</h2></div></div><div className="mt-8 grid gap-3 sm:grid-cols-2"><Summary label="Booking ID" value={bookingNo} /><Summary label="Player" value={bookingDetails.customer.name} /><Summary label="Station" value={bookingDetails.station.name} /><Summary label="Date" value={date} /><Summary label="Session" value={`${formatTime(time)} – ${formatTime(addMinutesToTime(time, durationMinutes))}`} /><Summary label="Duration" value={formatDuration(durationMinutes)} /><Summary label="Total" value={`₹${bookingDetails.total}`} /></div><div className="mt-7 rounded-2xl border border-yellow-300/25 bg-yellow-300/[.05] p-6 text-center"><p className="text-sm font-black uppercase tracking-[.18em] text-yellow-300">50% Advance Payment Required</p><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-300">Please make a 50% advance payment to confirm and secure your booking. Your slot is held as a pending booking until the advance is received.</p><p className="mt-4 text-xs font-bold uppercase tracking-widest text-slate-500">Advance Amount</p><p className="mt-1 text-4xl font-black text-yellow-300">₹{advanceAmount}</p><div className="mx-auto mt-5 w-fit rounded-2xl bg-white p-3 shadow-xl"><img src="/payment-qr.jpeg" alt="VS GAMING ARENA payment QR code" className="h-56 w-56 object-contain" /></div><p className="mt-3 text-xs text-slate-500">Scan the QR code using your UPI app</p><p className="mt-2 text-sm font-bold text-white">UPI ID: <span className="text-ice">paytm.s3tq53k@pty</span></p></div><div className="mt-7 flex flex-wrap gap-3"><a className="btn btn-primary" href={`https://wa.me/918983679372?text=${whatsappText}`} target="_blank" rel="noreferrer"><MessageCircle className="mr-2 h-4 w-4" /> WhatsApp booking</a><a className="btn btn-ghost" href="tel:+918983679372"><Phone className="mr-2 h-4 w-4" /> Call arena</a><button className="btn btn-ghost" onClick={() => { setBookingNo(''); setBookingDetails(null); setStatus(''); }}>Make another booking</button></div></div></section>}

    <section className="border-y border-white/5 bg-[#070b10] py-20"><div className="mx-auto grid max-w-7xl gap-6 px-5 md:grid-cols-3"><Feature icon={<ShieldCheck />} title="Fair & transparent" text="Clear station-based hourly rates with automatic 30-minute pro-rata pricing." /><Feature icon={<CalendarDays />} title="Book ahead" text="Reserve your preferred station and time before you arrive." /><Feature icon={<Clock3 />} title="Built for sessions" text="Live availability, overlap protection and admin session tracking." /></div></section>

    <footer id="contact" className="mx-auto max-w-7xl px-5 py-16"><div className="grid gap-10 md:grid-cols-2"><div><p className="text-2xl font-black">VS <span className="text-ice">GAMING ARENA</span></p><p className="mt-4 max-w-md text-sm leading-7 text-slate-500">PS5 // RACING // FOOTBALL // WWE // CRICKET // MULTIPLAYER</p></div><div className="md:text-right"><p className="font-black">CONTACT</p><p className="mt-3 flex items-start gap-2 text-sm text-slate-500 md:justify-end"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-ice" /> Beside Datta Mandir, above Aditi Urban Bank, Motinagar, Pusad</p><p className="mt-2 flex items-center gap-2 text-sm text-slate-500 md:justify-end"><Phone className="h-4 w-4 text-ice" /> 8983679372</p><p className="mt-2 text-sm text-slate-500 md:justify-end">Instagram: @vs.gamingzone</p></div></div><div className="mt-12 border-t border-white/5 pt-6 text-xs text-slate-700">© 2026 VS Gaming Arena. All rights reserved.</div></footer>
  </main>;
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) { return <div className="glass rounded-xl p-3"><div className="text-ice">{icon}</div><p className="mt-2 text-xl font-black">{value}</p><p className="text-[10px] font-bold text-slate-600">{label}</p></div>; }
function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) { return <div><p className="text-xs font-black tracking-[.25em] text-ice">{eyebrow}</p><h2 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">{title}</h2></div>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">{label}</span><div className="[&_input]:w-full [&_input]:rounded-xl [&_input]:border [&_input]:border-white/10 [&_input]:bg-[#0a1016] [&_input]:p-3 [&_input]:text-sm [&_input]:text-white [&_input]:outline-none [&_select]:w-full [&_select]:rounded-xl [&_select]:border [&_select]:border-white/10 [&_select]:bg-[#0a1016] [&_select]:p-3 [&_select]:text-sm [&_select]:text-white">{children}</div></label>; }
function Summary({ label, value }: { label: string; value: string }) { return <div className="flex justify-between gap-4 text-sm"><span className="text-slate-500">{label}</span><span className="text-right font-bold">{value}</span></div>; }
function Feature({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) { return <div className="glass rounded-2xl p-6"><div className="mb-4 text-ice">{icon}</div><h3 className="font-black">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{text}</p></div>; }
