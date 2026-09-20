'use client';

import { FormEvent, useState } from 'react';
import { Gamepad2, LockKeyhole, UserRound, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AdminLogin() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed.');
      router.push('/admin');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.');
    } finally { setLoading(false); }
  }

  return <main className="grid min-h-screen place-items-center px-5 py-10">
    <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-cyan-300/15 bg-[#050a10]/90 shadow-2xl lg:grid-cols-2">
      <div className="gridbg hidden p-10 lg:flex lg:flex-col lg:justify-between">
        <div><div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/5 px-3 py-2 text-xs font-black tracking-widest text-ice"><Zap className="h-3.5 w-3.5"/> ADMIN CONTROL</div><h1 className="text-6xl font-black leading-none">VS<br/><span className="text-ice">COMMAND</span><br/>CENTER</h1></div>
        <p className="text-xs font-black tracking-[.3em] text-slate-600">BOOKINGS // REVENUE // STATION CONTROL</p>
      </div>
      <div className="p-7 sm:p-10">
        <div className="mb-8 flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-xl bg-cyan-300/10 text-ice"><Gamepad2/></div><div><p className="text-xs font-black tracking-widest text-ice">VS GAMING ARENA</p><h2 className="text-2xl font-black">Admin Login</h2></div></div>
        <form onSubmit={submit} className="space-y-5">
          <label className="block"><span className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">Username</span><div className="relative"><UserRound className="absolute left-3 top-3.5 h-4 w-4 text-slate-600"/><input className="w-full rounded-xl border border-white/10 bg-[#0a1016] p-3 pl-10 text-sm text-white outline-none" value={username} onChange={e=>setUsername(e.target.value)} autoComplete="username"/></div></label>
          <label className="block"><span className="mb-2 block text-xs font-black uppercase tracking-wider text-slate-500">Password</span><div className="relative"><LockKeyhole className="absolute left-3 top-3.5 h-4 w-4 text-slate-600"/><input type="password" className="w-full rounded-xl border border-white/10 bg-[#0a1016] p-3 pl-10 text-sm text-white outline-none" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password"/></div></label>
          {error && <div className="rounded-xl border border-red-400/20 bg-red-400/5 p-3 text-sm font-bold text-red-300">{error}</div>}
          <button className="btn btn-primary w-full" disabled={loading}>{loading?'AUTHENTICATING...':'ENTER COMMAND CENTER'}</button>
        </form>
        <p className="mt-6 text-center text-xs text-slate-600">Admin credentials are stored only in your server environment.</p>
      </div>
    </div>
  </main>;
}
